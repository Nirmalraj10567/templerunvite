const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const plans = await db('plans')
      .where('is_active', 1)
      .orderBy('sort_order', 'asc')
      .select('*');

    const mapped = plans.map(p => ({
      ...p,
      features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features,
    }));

    res.json({ success: true, data: mapped });
  } catch (err) {
    console.error('GET /api/plans error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch plans' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const plan = await db('plans').where('slug', req.params.slug).where('is_active', 1).first();
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' });
    plan.features = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features;
    res.json({ success: true, data: plan });
  } catch (err) {
    console.error('GET /api/plans/:slug error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch plan' });
  }
});

module.exports = router;
