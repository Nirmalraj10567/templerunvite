const express = require('express');

module.exports = function userSettingsRouterFactory({ db, authenticateToken }) {
  const router = express.Router();

  // Attach JSON parsing if not globally applied (it is in backend.js, but harmless)
  router.use(express.json());

  // Helper to get settings row or defaults
  const getDefaults = () => ({
    landing_route: '/dashboard',
    sidebar_collapsed_default: false,
    hidden_menu_keys: [],
    quick_actions: [],
    shortcuts: {},
    language: null,
    theme: null,
  });

  // GET /api/user-settings/me
  router.get('/api/user-settings/me', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      let row = await db('user_settings').where({ user_id: userId }).first();
      if (!row) {
        return res.json({ success: true, data: getDefaults() });
      }
      let hidden = [];
      let actions = [];
      let shortcuts = {};
      try { hidden = row.hidden_menu_keys ? JSON.parse(row.hidden_menu_keys) : []; } catch {}
      try { actions = row.quick_actions ? JSON.parse(row.quick_actions) : []; } catch {}
      try { shortcuts = row.shortcuts ? JSON.parse(row.shortcuts) : {}; } catch {}
      return res.json({
        success: true,
        data: {
          landing_route: row.landing_route || '/dashboard',
          sidebar_collapsed_default: !!row.sidebar_collapsed_default,
          hidden_menu_keys: Array.isArray(hidden) ? hidden : [],
          quick_actions: Array.isArray(actions) ? actions : [],
          shortcuts: shortcuts && typeof shortcuts === 'object' ? shortcuts : {},
          language: row.language || null,
          theme: row.theme || null,
        }
      });
    } catch (e) {
      console.error('GET /api/user-settings/me error:', e);
      res.status(500).json({ error: 'Failed to fetch user settings' });
    }
  });

  // PUT /api/user-settings/me (partial update)
  router.put('/api/user-settings/me', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const body = req.body || {};

      const payload = {};
      if (body.landing_route !== undefined) payload.landing_route = String(body.landing_route || '/dashboard');
      if (body.sidebar_collapsed_default !== undefined) payload.sidebar_collapsed_default = !!body.sidebar_collapsed_default;
      if (body.language !== undefined) payload.language = body.language || null;
      if (body.theme !== undefined) payload.theme = body.theme || null;
      if (body.hidden_menu_keys !== undefined) payload.hidden_menu_keys = JSON.stringify(Array.isArray(body.hidden_menu_keys) ? body.hidden_menu_keys : []);
      if (body.quick_actions !== undefined) payload.quick_actions = JSON.stringify(Array.isArray(body.quick_actions) ? body.quick_actions : []);
      if (body.shortcuts !== undefined) {
        const obj = body.shortcuts && typeof body.shortcuts === 'object' ? body.shortcuts : {};
        payload.shortcuts = JSON.stringify(obj);
      }
      payload.updated_at = db.fn.now();

      const exists = await db('user_settings').where({ user_id: userId }).first();
      if (exists) {
        await db('user_settings').where({ user_id: userId }).update(payload);
      } else {
        await db('user_settings').insert({ user_id: userId, ...payload, created_at: db.fn.now() });
      }

      res.json({ success: true });
    } catch (e) {
      console.error('PUT /api/user-settings/me error:', e);
      res.status(500).json({ error: 'Failed to update user settings' });
    }
  });

  return router;
};
