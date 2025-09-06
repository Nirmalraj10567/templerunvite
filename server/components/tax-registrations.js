const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const db = require('../db');
const { authenticateToken } = require('../middleware');
const { exportTaxRegistrationPDF, generateTaxRegistrationPDF } = require('./tax-pdf-export');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../public/uploads/registrations');
fs.mkdirSync(uploadsDir, { recursive: true });

// Export single tax registration PDF
router.get('/:id/pdf', authenticateToken, async (req, res) => {
  return exportTaxRegistrationPDF(req, res, db);
});

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || '') || '.jpg';
    const ts = Date.now();
    cb(null, `tax_${ts}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    // 100KB like the frontend hint, but slightly higher to account for headers
    fileSize: 150 * 1024,
  }
});

// Helper to safely parse numbers
function toNumber(value, def = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : def;
}

// Create a tax registration (multipart/form-data)
router.post('/', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    const b = req.body || {};

    // Map incoming fields (camelCase from frontend) to DB snake_case
    const payload = {
      temple_id: req.user.templeId,
      reference_number: b.referenceNumber || null,
      date: b.date || null,
      subdivision: b.subdivision || null,
      name: b.name || null,
      alternative_name: b.alternativeName || null,
      father_name: b.fatherName || null,
      address: b.address || null,
      village: b.village || null,
      mobile_number: b.mobileNumber || null, // already digits-only on FE
      aadhaar_number: b.aadhaarNumber || null, // digits-only on FE
      clan: b.clan || null,
      group: b.group || null,
      wife_name: b.wifeName || null,
      education: b.education || null,
      occupation: b.occupation || null,
      birth_date: b.birthDate || null,
      pan_number: b.panNumber || null,
      postal_code: b.postalCode || null,
      male_heirs: toNumber(b.maleHeirs, 0),
      female_heirs: toNumber(b.femaleHeirs, 0),
      year: toNumber(b.year, new Date().getFullYear()),
      tax_amount: toNumber(b.taxAmount, 0),
      amount_paid: toNumber(b.amountPaid, 0),
      outstanding_amount: toNumber(b.outstandingAmount, 0),
      transfer_to_account: b.transfer_to_account || b.transferTo || null,
      donation_amount: toNumber(b.donationAmount, 0),
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    };

    // Basic validation
    if (!payload.name || !payload.father_name || !payload.address) {
      return res.status(400).json({ error: 'Missing required fields: name, fatherName, address' });
    }

    // Optional photo handling - store relative path for reference if needed later
    if (req.file) {
      // You can store photo path in a dedicated column if desired. For now, keep on filesystem.
      payload.note = `Photo uploaded: /public/uploads/registrations/${req.file.filename}`;
    }

    // Insert into DB
    const inserted = await db('user_tax_registrations').insert(payload).returning('*');
    // SQLite returning('*') may return array of inserted id or object depending on version
    const row = Array.isArray(inserted) ? (inserted[0] || inserted) : inserted;

    // If returning('*') didn't give the row, fetch it
    let data = row;
    if (!row || typeof row === 'number') {
      const id = typeof row === 'number' ? row : undefined;
      data = await db('user_tax_registrations').where({ id: id }).first();
    }

    return res.json({ success: true, id: data.id, data });
  } catch (err) {
    console.error('Error creating tax registration:', err);
    return res.status(500).json({ error: 'Failed to create tax registration' });
  }
});

// List tax registrations with pagination/search to support TaxUserListPage
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, search = '', pending } = req.query;
    const pg = Math.max(parseInt(page, 10) || 1, 1);
    const ps = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const offset = (pg - 1) * ps;

    let query = db('user_tax_registrations')
      .where('temple_id', req.user.templeId)
      .modify((qb) => {
        if (search) {
          qb.andWhere((b) => {
            b.where('name', 'like', `%${search}%`)
             .orWhere('mobile_number', 'like', `%${search}%`)
             .orWhere('aadhaar_number', 'like', `%${search}%`)
             .orWhere('reference_number', 'like', `%${search}%`);
          });
        }
        if (pending === '1') {
          // Consider pending as outstanding amount > 0
          qb.andWhereRaw('(COALESCE(outstanding_amount, 0) > 0)');
        }
      });

    const [{ count }] = await query.clone().count({ count: '*' });
    const rows = await query
      .clone()
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(ps)
      .offset(offset);

    res.json({ success: true, data: rows, total: Number(count), page: pg, pageSize: ps });
  } catch (err) {
    console.error('Error fetching tax registrations list:', err);
    res.status(500).json({ error: 'Failed to fetch tax registrations' });
  }
});

// Export multiple/filtered tax registrations as a single PDF (one per page)
router.get('/export/pdf', authenticateToken, async (req, res) => {
  const { search = '', pending } = req.query;
  let PDFDocument;
  try {
    PDFDocument = require('pdfkit');
  } catch (e) {
    return res.status(501).json({ error: "PDF export not enabled. Run 'npm i pdfkit' in server/ and restart." });
  }

  try {
    let query = db('user_tax_registrations')
      .where('temple_id', req.user.templeId)
      .modify((qb) => {
        if (search) {
          qb.andWhere((b) => {
            b.where('name', 'like', `%${search}%`)
             .orWhere('mobile_number', 'like', `%${search}%`)
             .orWhere('aadhaar_number', 'like', `%${search}%`)
             .orWhere('reference_number', 'like', `%${search}%`);
          });
        }
        if (pending === '1') {
          qb.andWhereRaw('(COALESCE(outstanding_amount, 0) > 0)');
        }
      })
      .orderBy('created_at', 'desc')
      .limit(1000);

    const rows = await query.select('*');
    if (!rows.length) return res.status(404).json({ error: 'No records to export.' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=tax-registrations.pdf');

    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    doc.pipe(res);

    const field = (doc, en, ta, val) => {
      doc.fontSize(11).text(`${en} / ${ta}: `, { continued: true });
      doc.font('Helvetica-Bold').text(val ?? '-');
      doc.font('Helvetica');
    };

    rows.forEach((row, index) => {
      if (index > 0) doc.addPage();
      doc.fontSize(16).text('Tax Registration / வரி பதிவு', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Temple ID: ${req.user.templeId} | Ref: ${row.reference_number || '-'} | ID: ${row.id}`);
      doc.moveDown(0.5);
      doc.moveTo(36, doc.y).lineTo(559, doc.y).stroke();
      doc.moveDown(0.5);

      field(doc, 'Name', 'பெயர்', row.name);
      field(doc, 'Father Name', 'தந்தை', row.father_name);
      field(doc, 'Mobile', 'கைபேசி', row.mobile_number);
      field(doc, 'Aadhaar', 'ஆதார்', row.aadhaar_number || '-');
      field(doc, 'Village', 'கிராமம்', row.village || '-');
      field(doc, 'Address', 'முகவரி', row.address || '-');
      field(doc, 'Subdivision', 'உட்பிரிவு', row.subdivision || '-');
      field(doc, 'Year', 'வருடம்', row.year);
      field(doc, 'Reference No', 'குறிப்பு எண்', row.reference_number || '-');
      field(doc, 'Tax Amount', 'வரி தொகை', `₹${Number(row.tax_amount || 0).toFixed(2)}`);
      field(doc, 'Amount Paid', 'செலுத்தியது', `₹${Number(row.amount_paid || 0).toFixed(2)}`);
      const outstanding = Number(row.outstanding_amount ?? Math.max(0, (row.tax_amount||0) - (row.amount_paid||0)));
      field(doc, 'Outstanding', 'நிலுவை', `₹${outstanding.toFixed(2)}`);
      field(doc, 'Created', 'உருவாக்கப்பட்டது', row.created_at ? new Date(row.created_at).toLocaleString() : '-');
    });

    doc.end();
  } catch (err) {
    console.error('Error exporting tax registrations PDF:', err);
    res.status(500).json({ error: 'Failed to generate PDF.' });
  }
});

module.exports = router;
