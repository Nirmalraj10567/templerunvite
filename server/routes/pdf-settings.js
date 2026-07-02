const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { compressImage } = require('../middlewares/imageCompression');
const PDFDocument = require('pdfkit');
const https = require('https');

module.exports = function createPdfSettingsRouter({ db, authenticateToken, authorizePermission, verifyQueryToken }) {
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

  // PDF Preview Route
  router.get('/preview.pdf', verifyQueryToken, async (req, res) => {
    try {
      const { type } = req.query;
      const templeId = req.user.templeId;
      const settings = await db('pdf_settings').where({ temple_id: templeId }).first().catch(() => null);

      const doc = new PDFDocument({ size: 'A5', layout: 'landscape', margin: 24, bufferPages: true });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=preview_${type || 'sample'}.pdf`);
      doc.pipe(res);

      // Fonts
      let tamilFontPath = path.join(__dirname, '..', 'fonts', 'NotoSansTamil-Regular.ttf');
      let tamilBoldFontPath = path.join(__dirname, '..', 'fonts', 'NotoSansTamil-Bold.ttf');
      let hasTamilFont = false;
      let hasTamilBoldFont = false;
      try {
        if (fs.existsSync(tamilFontPath)) { doc.registerFont('Tamil', tamilFontPath); hasTamilFont = true; }
        if (fs.existsSync(tamilBoldFontPath)) { doc.registerFont('TamilBold', tamilBoldFontPath); hasTamilBoldFont = true; }
      } catch {}
      const F_REG = hasTamilFont ? 'Tamil' : 'Helvetica';
      const F_BOLD = hasTamilBoldFont ? 'TamilBold' : (hasTamilFont ? 'Tamil' : 'Helvetica-Bold');

      const drawBold = (text, x, y, size, options = {}) => {
        const safeText = String(text || '').replace(/₹/g, 'ரூ');
        if (hasTamilBoldFont) {
          doc.font(F_BOLD).fontSize(size).text(safeText, x, y, options);
        } else {
          doc.font(F_REG).fontSize(size).text(safeText, x, y, options);
          doc.text(safeText, x + 0.35, y, options);
        }
      };
      const drawReg = (text, x, y, size, options = {}) => {
        const safeText = String(text || '').replace(/₹/g, 'ரூ');
        doc.font(F_REG).fontSize(size).text(safeText, x, y, options);
      };

      // Header settings
      const titleSub = settings?.title_sub || 'அருள்மிகு நல்லகுமாரசுவாமி துணை';
      const titleLine2 = settings?.title_line2 || 'நாமக்கல் மாவட்டம், திருச்செங்கோடு வட்டம், கூத்தம்பூண்டி கிராமம்';
      const titleMain = settings?.title_main || 'அருள்மிகு நல்லகுமாரசுவாமி திருக்கோவில்';
      
      let subHeader = settings?.subheader || 'ரசீது';
      let L = {
        receipt: 'ரசீது எண்',
        date: 'தேதி',
        year: 'வருடம்',
        cell: 'செல்',
        collector: 'வசூலிப்பாளர்',
      };

      if (type === 'tax') {
        subHeader = settings?.tax_subheader || settings?.subheader || 'வரி ரசீது';
        L = {
          receipt: settings?.tax_receipt_label || 'ரசீது எண்',
          date: settings?.tax_date_label || 'தேதி',
          year: settings?.tax_year_label || 'வருடம்',
          cell: settings?.tax_cell_label || 'செல்',
          collector: settings?.tax_collector_label || 'வசூலிப்பாளர்',
        };
      } else if (type === 'annadhanam') {
        subHeader = settings?.annadhanam_subheader || settings?.subheader || 'அன்னதான ரசீது';
        L = {
          receipt: settings?.annadhanam_receipt_label || 'ரசீது எண்',
          date: settings?.annadhanam_date_label || 'தேதி',
          year: settings?.annadhanam_year_label || 'வருடம்',
          cell: settings?.annadhanam_cell_label || 'செல்',
          collector: settings?.annadhanam_collector_label || 'வசூலிப்பாளர்',
        };
      } else if (type === 'hall') {
        subHeader = settings?.hall_subheader || settings?.subheader || 'மண்டப ரசீது';
        L = {
          receipt: settings?.hall_receipt_label || 'ரசீது எண்',
          date: settings?.hall_date_label || 'தேதி',
          year: settings?.hall_year_label || 'வருடம்',
          cell: settings?.hall_cell_label || 'செல்',
          collector: settings?.hall_collector_label || 'வசூலிப்பாளர்',
        };
      } else if (type === 'pooja') {
        subHeader = settings?.pooja_subheader || settings?.subheader || 'பூஜை ரசீது';
        L = {
          receipt: settings?.pooja_receipt_label || 'ரசீது எண்',
          date: settings?.pooja_date_label || 'தேதி',
          year: settings?.pooja_year_label || 'வருடம்',
          cell: settings?.pooja_cell_label || 'செல்',
          collector: settings?.pooja_collector_label || 'வசூலிப்பாளர்',
        };
      }

      // Logo
      let logoBuffer = null;
      try {
        const logoUrl = settings?.logo_url;
        if (logoUrl) {
          if (/^https?:\/\//i.test(logoUrl)) {
            logoBuffer = await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('Logo timeout')), 3000);
              https.get(logoUrl, (r) => {
                const chunks = [];
                r.on('data', (d) => chunks.push(d));
                r.on('end', () => { clearTimeout(timeout); resolve(Buffer.concat(chunks)); });
                r.on('error', (e) => { clearTimeout(timeout); reject(e); });
              }).on('error', (e) => { clearTimeout(timeout); reject(e); });
            });
          } else {
            const rel = logoUrl.replace(/^[\/]+/, '');
            const localPath = path.join(__dirname, '..', '..', rel);
            if (fs.existsSync(localPath)) logoBuffer = fs.readFileSync(localPath);
          }
        }
      } catch {}

      // Render
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const marginLeft = doc.page.margins.left;
      const marginRight = doc.page.margins.right;
      const marginTop = doc.page.margins.top;
      const marginBottom = doc.page.margins.bottom;
      const contentWidth = pageWidth - marginLeft - marginRight;

      doc.lineWidth(2).rect(marginLeft - 6, marginTop - 6, contentWidth + 12, pageHeight - marginTop - marginBottom + 12).stroke();

      const headerHeight = 100;
      const headerY = marginTop + 4;
      doc.lineWidth(1.5).rect(marginLeft, headerY, contentWidth, headerHeight).stroke();

      let logoWidth = 0;
      if (logoBuffer) {
        logoWidth = 70;
        doc.image(logoBuffer, marginLeft + 10, headerY + 15, { width: logoWidth, height: logoWidth, fit: [logoWidth, logoWidth] });
      }

      const textStartX = marginLeft + logoWidth + 20;
      const textWidth = contentWidth - logoWidth - 30;
      let textY = headerY + 15;
      doc.font(F_BOLD).fontSize(11).text(titleSub, textStartX, textY, { width: textWidth, align: 'center' });
      textY += 18;
      doc.font(F_REG).fontSize(9).text(titleLine2, textStartX, textY, { width: textWidth, align: 'center' });
      textY += 24;
      doc.font(F_BOLD).fontSize(15).text(titleMain, textStartX, textY, { width: textWidth, align: 'center' });

      const stripY = headerY + headerHeight + 15;
      doc.lineWidth(1.5).rect(marginLeft, stripY, contentWidth, 40).stroke();
      drawReg(`${L.receipt}: 001 (SAMPLE)`, marginLeft + 10, stripY + 14, 12);
      drawBold(subHeader, marginLeft, stripY + 14, 14, { width: contentWidth, align: 'center' });
      drawReg(`${L.date}: ${new Date().toLocaleDateString('en-GB')}`, marginLeft, stripY + 14, 11, { width: contentWidth - 10, align: 'right' });

      doc.font(F_REG).fontSize(12).text('உயர்திரு/திருமதி .......................................................................................', marginLeft + 10, stripY + 80);
      doc.text('அவர்களிடமிருந்து ...................................................................................', marginLeft + 10, stripY + 110);
      doc.text(`${subHeader} தொகையாக ரூபாய் ....................................................................`, marginLeft + 10, stripY + 140);
      doc.text('மட்டும் நன்றியுடன் பெற்றுக்கொள்ளப்பட்டது.', marginLeft + 10, stripY + 170);

      const rupeeBoxX = marginLeft + 10;
      const rupeeBoxY = pageHeight - marginBottom - 50;
      doc.lineWidth(1.5).rect(rupeeBoxX, rupeeBoxY, 150, 40).stroke();
      drawBold('ரூ 1,000.00', rupeeBoxX + 10, rupeeBoxY + 12, 16);

      drawReg(L.collector, contentWidth - 80, rupeeBoxY + 15, 12);

      if (settings?.watermark_text) {
        doc.font(F_REG).fontSize(8).fillColor('gray').text(settings.watermark_text, marginLeft, rupeeBoxY - 15, { width: contentWidth, align: 'center' });
      }

      doc.end();
    } catch (err) {
      console.error('PDF Preview error:', err);
      res.status(500).send('Error generating preview');
    }
  });

  return router;
}
