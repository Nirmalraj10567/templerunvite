#!/usr/bin/env node
const knex = require('knex');
const path = require('path');

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'root',
    database: process.env.MYSQL_DATABASE || 'temp',
    timezone: process.env.MYSQL_TIMEZONE || 'Z',
  },
  pool: { min: 2, max: 10 },
});

async function migrate() {
  try {
    const premiumPlan = await db('plans').where('slug', 'premium').first();
    if (!premiumPlan) {
      console.error('Premium plan not found. Run seed-plans.cjs first.');
      process.exit(1);
    }

    const temples = await db('temples').select('id');
    console.log(`Found ${temples.length} temples to migrate...`);

    let created = 0;
    let skipped = 0;

    for (const temple of temples) {
      const existing = await db('subscriptions').where('temple_id', temple.id).first();
      if (existing) {
        skipped++;
        continue;
      }

      const now = new Date();
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + 30);
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + 30);

      await db('subscriptions').insert({
        temple_id: temple.id,
        plan_id: premiumPlan.id,
        billing_cycle: 'monthly',
        status: 'active',
        current_period_start: now.toISOString().split('T')[0],
        current_period_end: periodEnd.toISOString().split('T')[0],
        trial_ends_at: trialEnd.toISOString().split('T')[0],
      });
      created++;
    }

    console.log(`Done! Created ${created} subscriptions, skipped ${skipped} existing.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
