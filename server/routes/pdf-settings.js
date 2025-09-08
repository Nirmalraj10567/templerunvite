const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

module.exports = function createPdfSettingsRouter({ db, authenticateToken, authorizePermission }) {
  const router = express.Router();

  // Ensure upload dir exists
  const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'settings');
  fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname) || '.png';
      cb(null, `logo_t${req.user.templeId}_${Date.now()}${ext}`);
    }
  });
  const upload = multer({ storage });

  // Get settings for current user's temple
  router.get('/api/pdf-settings', authenticateToken, authorizePermission('pdf_settings', 'view'), async (req, res) => {
    try {
      const templeId = req.user.templeId;
      const row = await db('pdf_settings').where({ temple_id: templeId }).first();
      res.json({ success: true, data: row || {} });
    } catch (err) {
      console.error('GET /api/pdf-settings error:', err);
      res.status(500).json({ error: 'Failed to load settings' });
    }
  });

  // Update titles/subheader and optional external logo_url
  router.put('/api/pdf-settings', authenticateToken, authorizePermission('pdf_settings', 'edit'), async (req, res) => {
    try {
      const templeId = req.user.templeId;
      const { title_main, title_sub, title_line2, subheader, tax_subheader, logo_url } = req.body || {};
      const exists = await db('pdf_settings').where({ temple_id: templeId }).first();
      const payload = {
        title_main: title_main ?? null,
        title_sub: title_sub ?? null,
        title_line2: title_line2 ?? null,
        subheader: subheader ?? null,
        tax_subheader: tax_subheader ?? exists?.tax_subheader ?? null,
        logo_url: logo_url ?? exists?.logo_url ?? null,
        updated_at: db.fn.now(),
      };
      if (exists) {
        await db('pdf_settings').where({ temple_id: templeId }).update(payload);
      } else {
        await db('pdf_settings').insert({ temple_id: templeId, ...payload, created_at: db.fn.now() });
      }
      const row = await db('pdf_settings').where({ temple_id: templeId }).first();
      res.json({ success: true, data: row });
    } catch (err) {
      console.error('PUT /api/pdf-settings error:', err);
      res.status(500).json({ error: 'Failed to save settings' });
    }
  });

  // Upload a logo image and store its relative URL
  router.post('/api/pdf-settings/logo', authenticateToken, authorizePermission('pdf_settings', 'edit'), upload.single('logo'), async (req, res) => {
    try {
      const templeId = req.user.templeId;
      const file = req.file;
      if (!file) return res.status(400).json({ error: 'No file uploaded' });
      // Build public URL
      const rel = `/public/uploads/settings/${path.basename(file.path)}`;
      const exists = await db('pdf_settings').where({ temple_id: templeId }).first();
      if (exists) {
        await db('pdf_settings').where({ temple_id: templeId }).update({ logo_url: rel, updated_at: db.fn.now() });
      } else {
        await db('pdf_settings').insert({ temple_id: templeId, logo_url: rel, created_at: db.fn.now(), updated_at: db.fn.now() });
      }
      const row = await db('pdf_settings').where({ temple_id: templeId }).first();
      res.json({ success: true, data: row });
    } catch (err) {
      console.error('POST /api/pdf-settings/logo error:', err);
      res.status(500).json({ error: 'Failed to upload logo' });
    }
  });

  return router;
}
