const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { compressImage } = require('../middlewares/imageCompression');

module.exports = function createPdfSettingsRouter({ db, authenticateToken, authorizePermission }) {
  const router = express.Router();

  // Ensure pdf_settings table has all required columns
  async function ensurePdfSettingsTable() {
    try {
      const has = await db.schema.hasTable('pdf_settings');
      if (!has) {
        await db.schema.createTable('pdf_settings', (table) => {
          table.increments('id').primary();
          table.integer('temple_id').notNullable();
          table.string('title_main', 255);
          table.string('title_sub', 255);
          table.string('title_line2', 512);
          table.string('subheader', 255);
          table.string('logo_url', 512);
          table.timestamp('created_at').defaultTo(db.fn.now());
          table.timestamp('updated_at').defaultTo(db.fn.now());
          table.unique(['temple_id']);
        });
        console.log('Created pdf_settings table');
      }

      // Add missing columns if they don't exist
      const requiredColumns = [
        'tax_subheader', 'annadhanam_subheader', 'hall_subheader', 'pooja_subheader',
        'watermark_text', 'tax_receipt_label', 'tax_date_label', 'tax_year_label',
        'tax_cell_label', 'tax_collector_label', 'annadhanam_receipt_label',
        'annadhanam_date_label', 'annadhanam_year_label', 'annadhanam_cell_label',
        'annadhanam_collector_label', 'hall_receipt_label', 'hall_date_label',
        'hall_year_label', 'hall_cell_label', 'hall_collector_label',
        'pooja_receipt_label', 'pooja_date_label', 'pooja_year_label',
        'pooja_cell_label', 'pooja_collector_label'
      ];

      for (const column of requiredColumns) {
        const hasColumn = await db.schema.hasColumn('pdf_settings', column).catch(() => false);
        if (!hasColumn) {
          try {
            await db.schema.table('pdf_settings', (table) => {
              table.string(column, 255);
            });
            console.log(`Added column ${column} to pdf_settings table`);
          } catch (e) {
            console.log(`Note: Could not add ${column} to pdf_settings:`, e.message);
          }
        }
      }
    } catch (e) {
      console.error('Error ensuring pdf_settings table:', e);
    }
  }

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

  // Test route to verify router is working
  router.get('/test', (req, res) => {
    res.json({ success: true, message: 'PDF Settings router is working' });
  });

  // Get settings for current user's temple
  router.get('/', authenticateToken, authorizePermission('pdf_settings', 'view'), async (req, res) => {
    try {
      await ensurePdfSettingsTable();
      const templeId = req.user.templeId;
      const row = await db('pdf_settings').where({ temple_id: templeId }).first();
      res.json({ success: true, data: row || {} });
    } catch (err) {
      console.error('GET /api/pdf-settings error:', err);
      res.status(500).json({ error: 'Failed to load settings' });
    }
  });

  // Update titles/subheader, optional external logo_url, watermark and module-specific labels
  router.put('/', authenticateToken, authorizePermission('pdf_settings', 'edit'), async (req, res) => {
    try {
      console.log('PDF Settings PUT request received:', req.body);
      await ensurePdfSettingsTable();
      const templeId = req.user.templeId;
      const {
        title_main,
        title_sub,
        title_line2,
        subheader,
        tax_subheader,
        tax_receipt_label,
        tax_date_label,
        tax_year_label,
        tax_cell_label,
        tax_collector_label,
        annadhanam_subheader,
        pooja_subheader,
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
        pooja_receipt_label,
        pooja_date_label,
        pooja_year_label,
        pooja_cell_label,
        pooja_collector_label,
      } = req.body || {};
      const exists = await db('pdf_settings').where({ temple_id: templeId }).first();
      const payload = {
        title_main: title_main ?? null,
        title_sub: title_sub ?? null,
        title_line2: title_line2 ?? null,
        subheader: subheader ?? null,
        tax_subheader: tax_subheader ?? exists?.tax_subheader ?? null,
        tax_receipt_label: tax_receipt_label ?? exists?.tax_receipt_label ?? null,
        tax_date_label: tax_date_label ?? exists?.tax_date_label ?? null,
        tax_year_label: tax_year_label ?? exists?.tax_year_label ?? null,
        tax_cell_label: tax_cell_label ?? exists?.tax_cell_label ?? null,
        tax_collector_label: tax_collector_label ?? exists?.tax_collector_label ?? null,
        annadhanam_subheader: annadhanam_subheader ?? exists?.annadhanam_subheader ?? null,
        pooja_subheader: pooja_subheader ?? exists?.pooja_subheader ?? null,
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
        pooja_receipt_label: pooja_receipt_label ?? exists?.pooja_receipt_label ?? null,
        pooja_date_label: pooja_date_label ?? exists?.pooja_date_label ?? null,
        pooja_year_label: pooja_year_label ?? exists?.pooja_year_label ?? null,
        pooja_cell_label: pooja_cell_label ?? exists?.pooja_cell_label ?? null,
        pooja_collector_label: pooja_collector_label ?? exists?.pooja_collector_label ?? null,
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
  router.post('/logo', authenticateToken, authorizePermission('pdf_settings', 'edit'), upload.single('logo'), compressImage, async (req, res) => {
    try {
      await ensurePdfSettingsTable();
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
