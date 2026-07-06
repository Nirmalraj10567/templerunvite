const express = require('express');
const router = express.Router();
const db = require('../db');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

async function getCurrentSubscription(templeId) {
  const sub = await db('subscriptions').where('temple_id', templeId).first();
  if (!sub) return null;
  const plan = await db('plans').where('id', sub.plan_id).first();
  if (!plan) return null;
  plan.features = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features;
  return { ...sub, plan };
}

async function computeUsage(templeId) {
  const usage = {};
  try {
    const memberCount = await db('members').where('temple_id', templeId).count({ c: '*' }).first();
    usage.max_members = Number(memberCount?.c || 0);
  } catch { usage.max_members = 0; }
  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    let txnCount = 0;
    for (const table of ['donation_products', 'money_donations', 'pooja', 'hall_bookings']) {
      try {
        const row = await db(table).where('temple_id', templeId)
          .whereBetween('created_at', [firstDay, lastDay])
          .count({ c: '*' }).first();
        txnCount += Number(row?.c || 0);
      } catch { /* table may not exist */ }
    }
    usage.max_monthly_transactions = txnCount;
  } catch { usage.max_monthly_transactions = 0; }
  try {
    const adminCount = await db('users').where('temple_id', templeId).where('role', 'admin').count({ c: '*' }).first();
    usage.max_admin_users = Number(adminCount?.c || 0);
  } catch { usage.max_admin_users = 0; }
  return usage;
}

router.get('/', authenticateToken, async (req, res) => {
  try {
    const templeId = req.user.templeId;
    if (!templeId) return res.status(400).json({ success: false, error: 'No temple associated with user' });
    const subscription = await getCurrentSubscription(templeId);
    const usage = await computeUsage(templeId);
    const plans = await db('plans').where('is_active', 1).orderBy('sort_order', 'asc').select('*');
    const mappedPlans = plans.map(p => ({
      ...p,
      features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features,
    }));
    res.json({ success: true, data: { subscription, usage, plans: mappedPlans } });
  } catch (err) {
    console.error('GET /api/subscription error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch subscription' });
  }
});

router.post('/select', authenticateToken, async (req, res) => {
  try {
    const templeId = req.user.templeId;
    if (!templeId) return res.status(400).json({ success: false, error: 'No temple associated' });
    const { plan_id, billing_cycle } = req.body;
    if (!plan_id || !billing_cycle) return res.status(400).json({ success: false, error: 'plan_id and billing_cycle required' });
    if (!['monthly', 'annual'].includes(billing_cycle)) return res.status(400).json({ success: false, error: 'billing_cycle must be monthly or annual' });

    const plan = await db('plans').where('id', plan_id).where('is_active', 1).first();
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' });

    const existing = await db('subscriptions').where('temple_id', templeId).first();
    if (existing) {
      await db('subscriptions').where('temple_id', templeId).update({
        plan_id,
        billing_cycle,
        status: 'pending',
        updated_at: db.fn.now(),
      });
    } else {
      const now = new Date();
      const periodEnd = new Date(now);
      if (billing_cycle === 'monthly') periodEnd.setMonth(periodEnd.getMonth() + 1);
      else periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      await db('subscriptions').insert({
        temple_id: templeId,
        plan_id,
        billing_cycle,
        status: plan.is_free ? 'active' : 'pending',
        current_period_start: now.toISOString().split('T')[0],
        current_period_end: periodEnd.toISOString().split('T')[0],
      });
    }

    res.json({ success: true, message: plan.is_free ? 'Plan activated' : 'Plan change request submitted. Awaiting admin approval.' });
  } catch (err) {
    console.error('POST /api/subscription/select error:', err);
    res.status(500).json({ success: false, error: 'Failed to select plan' });
  }
});

router.get('/payments', authenticateToken, async (req, res) => {
  try {
    const templeId = req.user.templeId;
    if (!templeId) return res.status(400).json({ success: false, error: 'No temple associated' });
    const payments = await db('payments').where('temple_id', templeId).orderBy('created_at', 'desc');
    res.json({ success: true, data: payments });
  } catch (err) {
    console.error('GET /api/subscription/payments error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch payments' });
  }
});

router.post('/cancel', authenticateToken, async (req, res) => {
  try {
    const templeId = req.user.templeId;
    if (!templeId) return res.status(400).json({ success: false, error: 'No temple associated' });
    const sub = await db('subscriptions').where('temple_id', templeId).first();
    if (!sub) return res.status(404).json({ success: false, error: 'No active subscription' });
    await db('subscriptions').where('temple_id', templeId).update({ status: 'cancelled', updated_at: db.fn.now() });
    res.json({ success: true, message: 'Subscription cancelled at period end' });
  } catch (err) {
    console.error('POST /api/subscription/cancel error:', err);
    res.status(500).json({ success: false, error: 'Failed to cancel subscription' });
  }
});

module.exports = router;
