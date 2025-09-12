const express = require('express');
const multer = require('multer');
const path = require('path');
const PDFDocument = require('pdfkit');
const router = express.Router();
const db = require('../../db');
const { authenticateToken, authorizePermission } = require('../../middleware');

// Configure storage for tax photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../../public/uploads/tax-photos/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// POST endpoint for tax registrations
router.post('/', authenticateToken, authorizePermission('tax_registrations', 'edit'), upload.single('photo'), async (req, res) => {
  try {
    const formData = req.body;
    const errors = validateFormData(formData);
    
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors,
        message: 'Please fix the highlighted fields'
      });
    }
    
    // Process cleaned data
    const cleanedData = {
      ...formData,
      mobileNumber: formData.mobileNumber.replace(/\D/g, ''),
      aadhaarNumber: formData.aadhaarNumber?.replace(/\D/g, '') || null,
      photoPath: req.file ? `/uploads/tax-photos/${req.file.filename}` : null
    };

    // Persist to user_tax_registrations
    const effectiveTempleId = req.user.templeId;
    const year = Number(cleanedData.year || new Date().getFullYear());
    const amountPaid = Number(cleanedData.amountPaid || 0);
    const outstandingAmount = Number(cleanedData.outstandingAmount || 0);
    const taxAmount = Number(cleanedData.taxAmount || 0);

    const insertPayload = {
      temple_id: effectiveTempleId,
      reference_number: cleanedData.referenceNumber || '',
      date: cleanedData.date || new Date().toISOString().slice(0,10),
      year,
      name: cleanedData.name || '',
      alternative_name: cleanedData.alternativeName || '',
      wife_name: cleanedData.wifeName || '',
      education: cleanedData.education || '',
      occupation: cleanedData.occupation || '',
      father_name: cleanedData.fatherName || '',
      address: cleanedData.address || '',
      birth_date: cleanedData.birthDate || '',
      village: cleanedData.village || '',
      mobile_number: cleanedData.mobileNumber || '',
      aadhaar_number: cleanedData.aadhaarNumber || null,
      pan_number: cleanedData.panNumber || '',
      clan: cleanedData.clan || '',
      group: cleanedData.group || '',
      postal_code: cleanedData.postalCode || '',
      male_heirs: Number(cleanedData.maleHeirs || 0),
      female_heirs: Number(cleanedData.femaleHeirs || 0),
      tax_amount: taxAmount,
      amount_paid: amountPaid,
      outstanding_amount: outstandingAmount,
      transfer_to_account: cleanedData.transferTo || cleanedData.transfer_to || '',
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    };

    const [registrationId] = await db('user_tax_registrations').insert(insertPayload);

    // Mirror to journal: INCOME A/C -> selected account (or CASH A/C)
    try {
      const hasJournal = await db.schema.hasTable('journal_entries');
      if (hasJournal && amountPaid > 0) {
        const fromAccount = 'INCOME A/C';
        const toAccount = insertPayload.transfer_to_account || 'CASH A/C';
        await db('journal_entries').insert({
          date: insertPayload.date,
          from_account: fromAccount,
          to_account: toAccount,
          amount: amountPaid,
          entry_type: 'transfer',
          remarks: `TAX ${year} - ${insertPayload.name}`,
          reference_type: 'tax_registration',
          reference_id: registrationId,
          temple_id: effectiveTempleId,
          created_by: req.user.id,
          created_at: db.fn.now(),
        });
      }
    } catch (e) {
      console.warn('Failed to mirror tax registration into journal:', e);
    }

    res.json({ success: true, id: registrationId, message: 'Tax registration submitted successfully' });
    
  } catch (error) {
    console.error('Tax registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET list with pagination and filters
router.get('/', authenticateToken, authorizePermission('tax_registrations', 'view'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const search = (req.query.search || '').toString().trim();
    const pending = req.query.pending === '1' || req.query.pending === 'true';
    const paid = req.query.paid === '1' || req.query.paid === 'true';

    // Base query for this temple
    let q = db('user_tax_registrations').where('temple_id', req.user.templeId);

    // Text search across fields
    if (search) {
      q = q.andWhere(builder => {
        builder
          .where('name', 'like', `%${search}%`)
          .orWhere('mobile_number', 'like', `%${search}%`)
          .orWhere('aadhaar_number', 'like', `%${search}%`)
          .orWhere('reference_number', 'like', `%${search}%`)
          .orWhere('village', 'like', `%${search}%`);
      });
    }

    // Status filter
    if (pending && !paid) {
      q = q.andWhere(builder => {
        builder.whereRaw('(COALESCE(outstanding_amount, tax_amount - amount_paid)) > 0');
      });
    } else if (paid && !pending) {
      q = q.andWhere(builder => {
        builder.whereRaw('(COALESCE(outstanding_amount, tax_amount - amount_paid)) <= 0');
      });
    }

    // Count total
    const totalRow = await q.clone().count({ c: '*' }).first();
    const total = Number(totalRow?.c || totalRow?.count || 0);

    // Page
    const rows = await q
      .clone()
      .orderBy('created_at', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .select('*');

    res.json({ success: true, data: rows, total, page, pageSize });
  } catch (err) {
    console.error('Error listing /api/tax-registrations:', err);
    res.status(500).json({ error: 'Failed to fetch tax registrations' });
  }
});

// GET single registration PDF (redirects to existing receipt generator using current JWT)
router.get('/:id/pdf', authenticateToken, authorizePermission('tax_registrations', 'view'), async (req, res) => {
  try {
    const token = (req.headers['authorization'] || '').split(' ')[1];
    if (!token) return res.status(400).json({ error: 'Missing token' });
    const { id } = req.params;
    return res.redirect(`/api/tax-registrations/${id}/receipt.pdf?token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error('Error redirecting to receipt PDF:', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// GET export all as a simple consolidated PDF
router.get('/export/pdf', authenticateToken, authorizePermission('tax_registrations', 'view'), async (req, res) => {
  try {
    const search = (req.query.search || '').toString().trim();
    const pending = req.query.pending === '1' || req.query.pending === 'true';
    const paid = req.query.paid === '1' || req.query.paid === 'true';

    let q = db('user_tax_registrations').where('temple_id', req.user.templeId);
    if (search) {
      q = q.andWhere(builder => {
        builder
          .where('name', 'like', `%${search}%`)
          .orWhere('mobile_number', 'like', `%${search}%`)
          .orWhere('aadhaar_number', 'like', `%${search}%`)
          .orWhere('reference_number', 'like', `%${search}%`)
          .orWhere('village', 'like', `%${search}%`);
      });
    }
    if (pending && !paid) {
      q = q.andWhereRaw('(COALESCE(outstanding_amount, tax_amount - amount_paid)) > 0');
    } else if (paid && !pending) {
      q = q.andWhereRaw('(COALESCE(outstanding_amount, tax_amount - amount_paid)) <= 0');
    }

    const rows = await q.orderBy('created_at', 'desc').limit(1000);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=tax-registrations.pdf');
    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    doc.pipe(res);

    doc.fontSize(16).text('Tax Registrations', { align: 'center' });
    doc.moveDown();

    rows.forEach((r, idx) => {
      const tax = Number(r.tax_amount || 0);
      const paidAmt = Number(r.amount_paid || 0);
      const outstanding = (r.outstanding_amount != null) ? Number(r.outstanding_amount) : Math.max(0, tax - paidAmt);
      doc.fontSize(10).text(
        `${idx + 1}. ${r.name} | Mobile: ${r.mobile_number || '-'} | Ref: ${r.reference_number || '-'} | Village: ${r.village || '-'} | Paid: ₹${paidAmt} / Tax: ₹${tax} | ${outstanding > 0 ? 'Pending' : 'Paid'}`
      );
    });

    doc.end();
  } catch (err) {
    console.error('Error exporting tax registrations PDF:', err);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

// Form validation logic
function validateFormData(data) {
  const errors = {};
  const requiredFields = [
    'name', 'fatherName', 'address', 'mobileNumber'
  ];
  
  requiredFields.forEach(field => {
    if (!data[field] || !data[field].toString().trim()) {
      errors[field] = `${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`;
    }
  });
  
  if (data.mobileNumber && data.mobileNumber.replace(/\D/g, '').length !== 10) {
    errors.mobileNumber = 'Mobile number must be 10 digits';
  }
  
  return errors;
}

// Database save placeholder no longer used

module.exports = router;
