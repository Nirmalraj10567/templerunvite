const db = require('../db');

function requireFeature(featureKey) {
  return async (req, res, next) => {
    try {
      const templeId = req.user?.templeId;
      if (!templeId) return next();

      const sub = await db('subscriptions').where('temple_id', templeId).where('status', 'active').first();
      if (!sub) {
        const trialSub = await db('subscriptions').where('temple_id', templeId).whereNotNull('trial_ends_at').first();
        if (trialSub && new Date(trialSub.trial_ends_at) >= new Date()) {
          const trialPlan = await db('plans').where('id', trialSub.plan_id).first();
          if (trialPlan) {
            const features = typeof trialPlan.features === 'string' ? JSON.parse(trialPlan.features) : trialPlan.features;
            if (features[featureKey]) return next();
          }
          return res.status(403).json({ error: 'FEATURE_NOT_AVAILABLE', upgradeUrl: '/pricing', message: `This feature requires a plan with "${featureKey}" enabled` });
        }
        return res.status(403).json({ error: 'NO_ACTIVE_SUBSCRIPTION', upgradeUrl: '/pricing', message: 'An active subscription is required' });
      }

      const plan = await db('plans').where('id', sub.plan_id).first();
      if (!plan) return res.status(403).json({ error: 'PLAN_NOT_FOUND', upgradeUrl: '/pricing' });

      const features = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features;

      if (sub.status !== 'active') {
        return res.status(403).json({ error: 'SUBSCRIPTION_NOT_ACTIVE', upgradeUrl: '/pricing', message: 'Your subscription is not active' });
      }

      if (sub.current_period_end && new Date(sub.current_period_end) < new Date()) {
        return res.status(403).json({ error: 'SUBSCRIPTION_EXPIRED', upgradeUrl: '/pricing', message: 'Your subscription has expired' });
      }

      const featureValue = features[featureKey];
      if (featureValue === undefined) {
        return next();
      }

      if (typeof featureValue === 'boolean' && featureValue) return next();
      if (typeof featureValue === 'number' && featureValue !== 0 && featureValue !== -1) return next();
      if (featureValue === -1) return next();

      return res.status(403).json({ error: 'FEATURE_NOT_AVAILABLE', upgradeUrl: '/pricing', message: `This feature requires a plan with "${featureKey}" enabled` });
    } catch (err) {
      console.error('Subscription middleware error:', err);
      res.status(500).json({ error: 'Internal server error checking subscription' });
    }
  };
}

module.exports = { requireFeature };
