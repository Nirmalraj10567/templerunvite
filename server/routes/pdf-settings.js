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

  // Update titles/subheader, optional external logo_url, watermark and module-specific labels
  router.put('/api/pdf-settings', authenticateToken, authorizePermission('pdf_settings', 'edit'), async (req, res) => {
    try {
      const templeId = req.user.templeId;
      const {
        title_main,
        title_sub,
        title_line2,
        subheader,
        tax_subheader,
        annadhanam_subheader,
        hall_subheader,
        logo_url,
        watermark_text,
        annadhanam_receipt_label,
        annadhanam_date_label,
        annadhanam_year_label,
        annadhanam_cell_label,
        annadhanam_collector_label,
        hall_receipt_label,
        hall_date_label,
        hall_year_label,
        hall_cell_label,
        hall_collector_label,
      } = req.body || {};
      const exists = await db('pdf_settings').where({ temple_id: templeId }).first();
      const payload = {
        title_main: title_main ?? null,
        title_sub: title_sub ?? null,
        title_line2: title_line2 ?? null,
        subheader: subheader ?? null,
        tax_subheader: tax_subheader ?? exists?.tax_subheader ?? null,
        annadhanam_subheader: annadhanam_subheader ?? exists?.annadhanam_subheader ?? null,
        hall_subheader: hall_subheader ?? exists?.hall_subheader ?? null,
        logo_url: logo_url ?? exists?.logo_url ?? null,
        watermark_text: watermark_text ?? exists?.watermark_text ?? null,
        annadhanam_receipt_label: annadhanam_receipt_label ?? exists?.annadhanam_receipt_label ?? null,
        annadhanam_date_label: annadhanam_date_label ?? exists?.annadhanam_date_label ?? null,
        annadhanam_year_label: annadhanam_year_label ?? exists?.annadhanam_year_label ?? null,
        annadhanam_cell_label: annadhanam_cell_label ?? exists?.annadhanam_cell_label ?? null,
        annadhanam_collector_label: annadhanam_collector_label ?? exists?.annadhanam_collector_label ?? null,
        hall_receipt_label: hall_receipt_label ?? exists?.hall_receipt_label ?? null,
        hall_date_label: hall_date_label ?? exists?.hall_date_label ?? null,
        hall_year_label: hall_year_label ?? exists?.hall_year_label ?? null,
        hall_cell_label: hall_cell_label ?? exists?.hall_cell_label ?? null,
        hall_collector_label: hall_collector_label ?? exists?.hall_collector_label ?? null,
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
