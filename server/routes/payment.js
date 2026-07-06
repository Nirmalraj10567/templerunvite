const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');
const { getRazorpayInstance } = require('../utils/razorpay');

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

// POST /api/payment/create-order
router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    const templeId = req.user.templeId;
    if (!templeId) {
      return res.status(400).json({ success: false, error: 'No temple associated with user' });
    }

    const { plan_id, billing_cycle } = req.body;
    if (!plan_id || !billing_cycle) {
      return res.status(400).json({ success: false, error: 'plan_id and billing_cycle are required' });
    }

    const plan = await db('plans').where('id', plan_id).where('is_active', 1).first();
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Plan not found or inactive' });
    }

    const amountInPaise = billing_cycle === 'annual'
      ? Math.round(plan.annual_price)
      : Math.round(plan.monthly_price);

    const receipt = `rcpt_${templeId}_${Date.now()}`;

    const api = getRazorpayInstance();
    const razorpayOrder = await api.orders.create({
      receipt,
      amount: amountInPaise,
      currency: 'INR',
      payment_capture: 1
    });

    await db('payments').insert({
      temple_id: templeId,
      subscription_id: null,
      amount: amountInPaise,
      billing_cycle,
      status: 'pending',
      razorpay_order_id: razorpayOrder.id,
      razorpay_payment_id: null,
      razorpay_signature: null,
      plan_id,
      notes: `Order created for ${plan.name} (${billing_cycle})`,
      created_by: req.user.id
    });

    res.json({
      success: true,
      data: {
        order_id: razorpayOrder.id,
        amount: amountInPaise,
        currency: 'INR',
        key: process.env.RAZORPAY_KEY_ID,
        plan_id: plan.id,
        plan_name: plan.name,
        billing_cycle
      }
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/payment/verify
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const templeId = req.user.templeId;
    if (!templeId) {
      return res.status(400).json({ success: false, error: 'No temple associated with user' });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan_id, billing_cycle } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: razorpay_order_id, razorpay_payment_id, razorpay_signature'
      });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Payment signature verification failed' });
    }

    // Find the payment record
    const payment = await db('payments').where('razorpay_order_id', razorpay_order_id).first();
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const planId = plan_id || payment.plan_id;
    const cycle = billing_cycle || payment.billing_cycle;

    // Compute period end
    const now = new Date();
    const periodEnd = new Date(now);
    if (cycle === 'annual') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Update payment and activate subscription in a transaction
    await db.transaction(async (trx) => {
      await trx('payments').where('id', payment.id).update({
        razorpay_payment_id: razorpay_payment_id,
        razorpay_signature: razorpay_signature,
        status: 'paid',
        paid_at: now.toISOString().split('T')[0]
      });

      const existingSub = await trx('subscriptions').where('temple_id', templeId).first();
      if (existingSub) {
        await trx('subscriptions').where('temple_id', templeId).update({
          plan_id: planId,
          billing_cycle: cycle,
          status: 'active',
          current_period_start: now.toISOString().split('T')[0],
          current_period_end: periodEnd.toISOString().split('T')[0],
          updated_at: trx.fn.now()
        });
      } else {
        await trx('subscriptions').insert({
          temple_id: templeId,
          plan_id: planId,
          billing_cycle: cycle,
          status: 'active',
          current_period_start: now.toISOString().split('T')[0],
          current_period_end: periodEnd.toISOString().split('T')[0]
        });
      }

      // Link payment to subscription
      const sub = await trx('subscriptions').where('temple_id', templeId).first();
      if (sub) {
        await trx('payments').where('id', payment.id).update({ subscription_id: sub.id });
      }
    });

    res.json({
      success: true,
      message: 'Payment verified and plan activated successfully',
      data: {
        plan_id: planId,
        billing_cycle: cycle,
        valid_until: periodEnd.toISOString().split('T')[0]
      }
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/payment/history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const templeId = req.user.templeId;
    if (!templeId) {
      return res.status(400).json({ success: false, error: 'No temple associated with user' });
    }

    const payments = await db('payments')
      .where('temple_id', templeId)
      .orderBy('created_at', 'desc');

    res.json({ success: true, data: payments });
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
