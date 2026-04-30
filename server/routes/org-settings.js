const express = require('express');

module.exports = function createOrgSettingsRouter({ db, authenticateToken, authorizePermission }) {
  const router = express.Router();

  async function ensureOrgSettingsTable() {
    try {
      const has = await db.schema.hasTable('org_settings');
      if (!has) {
        await db.schema.createTable('org_settings', (table) => {
          table.increments('id').primary();
          table.integer('temple_id').notNullable().unique();
          table.string('org_name', 255);
          table.string('contact_email', 255);
          table.timestamp('created_at').defaultTo(db.fn.now());
          table.timestamp('updated_at').defaultTo(db.fn.now());
        });
        console.log('Created org_settings table');
      }
    } catch (e) {
      console.error('Error ensuring org_settings table:', e);
    }
  }

  // Get org settings for current user's temple
  router.get('/', authenticateToken, authorizePermission('setting', 'view'), async (req, res) => {
    try {
      await ensureOrgSettingsTable();
      const templeId = req.user.templeId;
      const row = await db('org_settings').where({ temple_id: templeId }).first();
      res.json({ success: true, data: row || {} });
    } catch (err) {
      console.error('GET /api/org-settings error:', err);
      res.status(500).json({ error: 'Failed to load organization settings' });
    }
  });

  // Update org settings
  router.put('/', authenticateToken, authorizePermission('setting', 'edit'), async (req, res) => {
    try {
      await ensureOrgSettingsTable();
      const templeId = req.user.templeId;
      const { org_name, contact_email } = req.body || {};

      const payload = {
        org_name: org_name ?? null,
        contact_email: contact_email ?? null,
        updated_at: db.fn.now(),
      };

      const exists = await db('org_settings').where({ temple_id: templeId }).first();
      if (exists) {
        await db('org_settings').where({ temple_id: templeId }).update(payload);
      } else {
        await db('org_settings').insert({ temple_id: templeId, ...payload, created_at: db.fn.now() });
      }

      const row = await db('org_settings').where({ temple_id: templeId }).first();
      res.json({ success: true, data: row });
    } catch (err) {
      console.error('PUT /api/org-settings error:', err);
      res.status(500).json({ error: 'Failed to save organization settings' });
    }
  });

  return router;
};