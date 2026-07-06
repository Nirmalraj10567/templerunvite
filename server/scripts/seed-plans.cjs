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

const featureDefinitions = [
  { feature_key: 'max_members', feature_type: 'number', feature_label: 'Max Members', category: 'limits', sort_order: 1, default_value: '50' },
  { feature_key: 'max_monthly_transactions', feature_type: 'number', feature_label: 'Monthly Transactions', category: 'limits', sort_order: 2, default_value: '200' },
  { feature_key: 'max_admin_users', feature_type: 'number', feature_label: 'Admin Users', category: 'limits', sort_order: 3, default_value: '1' },
  { feature_key: 'module_hall_booking', feature_type: 'boolean', feature_label: 'Hall Booking Module', category: 'modules', sort_order: 10, default_value: 'false' },
  { feature_key: 'module_accounting', feature_type: 'boolean', feature_label: 'Accounting Module (Ledger, Daybook, P&L, Balance Sheet)', category: 'modules', sort_order: 11, default_value: 'false' },
  { feature_key: 'module_reports_full', feature_type: 'boolean', feature_label: 'Full Reports Suite', category: 'modules', sort_order: 12, default_value: 'false' },
  { feature_key: 'module_events', feature_type: 'boolean', feature_label: 'Events Module', category: 'modules', sort_order: 13, default_value: 'true' },
  { feature_key: 'module_tax', feature_type: 'boolean', feature_label: 'Tax Registrations', category: 'modules', sort_order: 14, default_value: 'true' },
  { feature_key: 'module_property', feature_type: 'boolean', feature_label: 'Property Module', category: 'modules', sort_order: 15, default_value: 'true' },
  { feature_key: 'module_marriage', feature_type: 'boolean', feature_label: 'Marriage Register', category: 'modules', sort_order: 16, default_value: 'true' },
  { feature_key: 'module_kanikalar', feature_type: 'boolean', feature_label: 'Kanikalar Module', category: 'modules', sort_order: 17, default_value: 'true' },
  { feature_key: 'module_asset', feature_type: 'boolean', feature_label: 'Asset Management', category: 'modules', sort_order: 18, default_value: 'true' },
  { feature_key: 'data_export_excel', feature_type: 'boolean', feature_label: 'Excel Export', category: 'addons', sort_order: 20, default_value: 'false' },
  { feature_key: 'data_export_csv', feature_type: 'boolean', feature_label: 'CSV Export', category: 'addons', sort_order: 21, default_value: 'false' },
  { feature_key: 'custom_branding', feature_type: 'boolean', feature_label: 'Custom Branding', category: 'addons', sort_order: 22, default_value: 'false' },
  { feature_key: 'api_access', feature_type: 'boolean', feature_label: 'API Access', category: 'addons', sort_order: 23, default_value: 'false' },
  { feature_key: 'priority_support', feature_type: 'select', feature_label: 'Support Level', category: 'support', sort_order: 30, options: JSON.stringify(['None', 'Email', 'Phone']), default_value: 'None' },
];

const plans = [
  {
    name: 'Starter',
    slug: 'starter',
    description: 'Essential tools for small temples getting started with digital management.',
    badge: null,
    monthly_price: 0,
    annual_price: 0,
    features: JSON.stringify({
      max_members: 100,
      max_monthly_transactions: 500,
      max_admin_users: 2,
      module_hall_booking: false,
      module_accounting: false,
      module_reports_full: false,
      module_events: true,
      module_tax: true,
      module_property: true,
      module_marriage: true,
      module_kanikalar: true,
      module_asset: true,
      data_export_excel: false,
      data_export_csv: false,
      custom_branding: false,
      api_access: false,
      priority_support: 'None',
    }),
    sort_order: 1,
    is_active: true,
    is_free: true,
  },
  {
    name: 'Standard',
    slug: 'standard',
    description: 'Perfect for growing temples needing hall booking and more capacity.',
    badge: 'Popular',
    monthly_price: 99900,
    annual_price: 999000,
    features: JSON.stringify({
      max_members: 1000,
      max_monthly_transactions: 5000,
      max_admin_users: 5,
      module_hall_booking: true,
      module_accounting: false,
      module_reports_full: false,
      module_events: true,
      module_tax: true,
      module_property: true,
      module_marriage: true,
      module_kanikalar: true,
      module_asset: true,
      data_export_excel: true,
      data_export_csv: false,
      custom_branding: false,
      api_access: false,
      priority_support: 'Email',
    }),
    sort_order: 2,
    is_active: true,
    is_free: false,
  },
  {
    name: 'Premium',
    slug: 'premium',
    description: 'Complete temple management with accounting, exports, and priority support.',
    badge: 'Best Value',
    monthly_price: 199900,
    annual_price: 1999000,
    features: JSON.stringify({
      max_members: -1,
      max_monthly_transactions: -1,
      max_admin_users: -1,
      module_hall_booking: true,
      module_accounting: true,
      module_reports_full: true,
      module_events: true,
      module_tax: true,
      module_property: true,
      module_marriage: true,
      module_kanikalar: true,
      module_asset: true,
      data_export_excel: true,
      data_export_csv: true,
      custom_branding: true,
      api_access: true,
      priority_support: 'Phone',
    }),
    sort_order: 3,
    is_active: true,
    is_free: false,
  },
];

async function seed() {
  try {
    console.log('Seeding feature definitions...');
    for (const fd of featureDefinitions) {
      const existing = await db('feature_definitions').where('feature_key', fd.feature_key).first();
      if (!existing) {
        await db('feature_definitions').insert(fd);
        console.log(`  Created feature: ${fd.feature_key}`);
      } else {
        console.log(`  Skipped (exists): ${fd.feature_key}`);
      }
    }

    console.log('Seeding plans...');
    for (const plan of plans) {
      const existing = await db('plans').where('slug', plan.slug).first();
      if (!existing) {
        await db('plans').insert(plan);
        console.log(`  Created plan: ${plan.name}`);
      } else {
        console.log(`  Skipped (exists): ${plan.name}`);
      }
    }

    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
