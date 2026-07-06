const express = require('express');
const router = express.Router();
const db = require('../../db');

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

function requireSuperAdmin(req, res, next) {
  if (req.user.role !== 'superadmin' && req.user.mobile !== '9999999999') {
    return res.status(403).json({ error: 'Superadmin access required' });
  }
  next();
}

router.use(authenticateToken, requireSuperAdmin);

router.get('/plans', async (req, res) => {
  try {
    const plans = await db('plans').orderBy('sort_order', 'asc').select('*');
    const mapped = plans.map(p => ({
      ...p,
      features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features,
    }));
    res.json({ success: true, data: mapped });
  } catch (err) {
    console.error('GET /api/admin/plans error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch plans' });
  }
});

router.post('/plans', async (req, res) => {
  try {
    const { name, slug, description, badge, monthly_price, annual_price, features, sort_order, is_active, is_free } = req.body;
    if (!name || !slug) return res.status(400).json({ success: false, error: 'name and slug required' });

    const existing = await db('plans').where('slug', slug).first();
    if (existing) return res.status(409).json({ success: false, error: 'Plan with this slug already exists' });

    const [id] = await db('plans').insert({
      name, slug, description, badge,
      monthly_price: monthly_price ?? 0,
      annual_price: annual_price ?? 0,
      features: features ? JSON.stringify(features) : '{}',
      sort_order: sort_order ?? 0,
      is_active: is_active ?? 1,
      is_free: is_free ?? 0,
    });

    res.status(201).json({ success: true, data: { id }, message: 'Plan created' });
  } catch (err) {
    console.error('POST /api/admin/plans error:', err);
    res.status(500).json({ success: false, error: 'Failed to create plan' });
  }
});

router.put('/plans/:id', async (req, res) => {
  try {
    const { name, slug, description, badge, monthly_price, annual_price, features, sort_order, is_active, is_free } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (slug !== undefined) update.slug = slug;
    if (description !== undefined) update.description = description;
    if (badge !== undefined) update.badge = badge;
    if (monthly_price !== undefined) update.monthly_price = monthly_price;
    if (annual_price !== undefined) update.annual_price = annual_price;
    if (features !== undefined) update.features = JSON.stringify(features);
    if (sort_order !== undefined) update.sort_order = sort_order;
    if (is_active !== undefined) update.is_active = is_active;
    if (is_free !== undefined) update.is_free = is_free;
    update.updated_at = db.fn.now();

    const affected = await db('plans').where('id', req.params.id).update(update);
    if (!affected) return res.status(404).json({ success: false, error: 'Plan not found' });
    res.json({ success: true, message: 'Plan updated' });
  } catch (err) {
    console.error('PUT /api/admin/plans/:id error:', err);
    res.status(500).json({ success: false, error: 'Failed to update plan' });
  }
});

router.delete('/plans/:id', async (req, res) => {
  try {
    const affected = await db('plans').where('id', req.params.id).del();
    if (!affected) return res.status(404).json({ success: false, error: 'Plan not found' });
    res.json({ success: true, message: 'Plan deleted' });
  } catch (err) {
    console.error('DELETE /api/admin/plans/:id error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete plan' });
  }
});

router.get('/feature-definitions', async (req, res) => {
  try {
    const features = await db('feature_definitions').orderBy('sort_order', 'asc').select('*');
    res.json({ success: true, data: features });
  } catch (err) {
    console.error('GET /api/admin/feature-definitions error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch feature definitions' });
  }
});

router.post('/feature-definitions', async (req, res) => {
  try {
    const { feature_key, feature_type, feature_label, description, category, options, default_value, sort_order } = req.body;
    if (!feature_key || !feature_label) return res.status(400).json({ success: false, error: 'feature_key and feature_label required' });

    const [id] = await db('feature_definitions').insert({
      feature_key, feature_type: feature_type || 'boolean', feature_label, description,
      category: category || 'modules',
      options: options ? JSON.stringify(options) : null,
      default_value,
      sort_order: sort_order ?? 0,
    });

    res.status(201).json({ success: true, data: { id }, message: 'Feature definition created' });
  } catch (err) {
    console.error('POST /api/admin/feature-definitions error:', err);
    res.status(500).json({ success: false, error: 'Failed to create feature definition' });
  }
});

router.put('/feature-definitions/:id', async (req, res) => {
  try {
    const { feature_key, feature_type, feature_label, description, category, options, default_value, sort_order, is_active } = req.body;
    const update = {};
    if (feature_key !== undefined) update.feature_key = feature_key;
    if (feature_type !== undefined) update.feature_type = feature_type;
    if (feature_label !== undefined) update.feature_label = feature_label;
    if (description !== undefined) update.description = description;
    if (category !== undefined) update.category = category;
    if (options !== undefined) update.options = JSON.stringify(options);
    if (default_value !== undefined) update.default_value = default_value;
    if (sort_order !== undefined) update.sort_order = sort_order;
    if (is_active !== undefined) update.is_active = is_active;

    const affected = await db('feature_definitions').where('id', req.params.id).update(update);
    if (!affected) return res.status(404).json({ success: false, error: 'Feature definition not found' });
    res.json({ success: true, message: 'Feature definition updated' });
  } catch (err) {
    console.error('PUT /api/admin/feature-definitions/:id error:', err);
    res.status(500).json({ success: false, error: 'Failed to update feature definition' });
  }
});

router.delete('/feature-definitions/:id', async (req, res) => {
  try {
    const affected = await db('feature_definitions').where('id', req.params.id).del();
    if (!affected) return res.status(404).json({ success: false, error: 'Feature definition not found' });
    res.json({ success: true, message: 'Feature definition deleted' });
  } catch (err) {
    console.error('DELETE /api/admin/feature-definitions/:id error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete feature definition' });
  }
});

router.get('/subscriptions', async (req, res) => {
  try {
    const subs = await db('subscriptions')
      .join('plans', 'subscriptions.plan_id', 'plans.id')
      .join('temples', 'subscriptions.temple_id', 'temples.id')
      .select(
        'subscriptions.*',
        'plans.name as plan_name',
        'plans.slug as plan_slug',
        'plans.monthly_price',
        'plans.annual_price',
        'temples.name as temple_name'
      )
      .orderBy('subscriptions.created_at', 'desc');
    res.json({ success: true, data: subs });
  } catch (err) {
    console.error('GET /api/admin/subscriptions error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch subscriptions' });
  }
});

router.get('/pending-requests', async (req, res) => {
  try {
    const pending = await db('subscriptions')
      .join('plans', 'subscriptions.plan_id', 'plans.id')
      .join('temples', 'subscriptions.temple_id', 'temples.id')
      .where('subscriptions.status', 'pending')
      .select(
        'subscriptions.*',
        'plans.name as plan_name',
        'plans.monthly_price',
        'plans.annual_price',
        'temples.name as temple_name'
      )
      .orderBy('subscriptions.created_at', 'desc');
    res.json({ success: true, data: pending });
  } catch (err) {
    console.error('GET /api/admin/pending-requests error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch pending requests' });
  }
});

router.post('/approve-plan-change', async (req, res) => {
  try {
    const { subscription_id, plan_id, billing_cycle, status } = req.body;
    if (!subscription_id) return res.status(400).json({ success: false, error: 'subscription_id required' });

    const update = { status: status || 'active', updated_at: db.fn.now() };
    if (plan_id) update.plan_id = plan_id;
    if (billing_cycle) update.billing_cycle = billing_cycle;

    const now = new Date();
    const cycle = billing_cycle || 'monthly';
    const periodEnd = new Date(now);
    if (cycle === 'monthly') periodEnd.setMonth(periodEnd.getMonth() + 1);
    else periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    update.current_period_start = now.toISOString().split('T')[0];
    update.current_period_end = periodEnd.toISOString().split('T')[0];

    const affected = await db('subscriptions').where('id', subscription_id).update(update);
    if (!affected) return res.status(404).json({ success: false, error: 'Subscription not found' });
    res.json({ success: true, message: 'Plan change approved' });
  } catch (err) {
    console.error('POST /api/admin/approve-plan-change error:', err);
    res.status(500).json({ success: false, error: 'Failed to approve plan change' });
  }
});

router.post('/record-payment', async (req, res) => {
  try {
    const { temple_id, subscription_id, amount, billing_cycle, notes } = req.body;
    if (!temple_id || !amount) return res.status(400).json({ success: false, error: 'temple_id and amount required' });

    await db('payments').insert({
      temple_id,
      subscription_id: subscription_id || null,
      amount,
      billing_cycle: billing_cycle || 'monthly',
      status: 'paid',
      paid_at: new Date().toISOString().split('T')[0],
      notes: notes || null,
      created_by: req.user.id,
    });

    if (subscription_id) {
      await db('subscriptions').where('id', subscription_id).update({ status: 'active', updated_at: db.fn.now() });
    }

    res.json({ success: true, message: 'Payment recorded' });
  } catch (err) {
    console.error('POST /api/admin/record-payment error:', err);
    res.status(500).json({ success: false, error: 'Failed to record payment' });
  }
});

router.post('/subscription/force-update', async (req, res) => {
  try {
    const { temple_id, plan_id, billing_cycle, status, current_period_end } = req.body;
    if (!temple_id || !plan_id) return res.status(400).json({ success: false, error: 'temple_id and plan_id required' });

    const existing = await db('subscriptions').where('temple_id', temple_id).first();
    const update = {
      plan_id,
      billing_cycle: billing_cycle || 'monthly',
      status: status || 'active',
      updated_at: db.fn.now(),
    };
    if (current_period_end) update.current_period_end = current_period_end;

    if (existing) {
      await db('subscriptions').where('temple_id', temple_id).update(update);
    } else {
      update.temple_id = temple_id;
      update.current_period_start = new Date().toISOString().split('T')[0];
      if (!update.current_period_end) {
        const end = new Date();
        end.setMonth(end.getMonth() + 1);
        update.current_period_end = end.toISOString().split('T')[0];
      }
      await db('subscriptions').insert(update);
    }
    res.json({ success: true, message: 'Subscription force updated' });
  } catch (err) {
    console.error('POST /api/admin/subscription/force-update error:', err);
    res.status(500).json({ success: false, error: 'Failed to force update subscription' });
  }
});

module.exports = router;
