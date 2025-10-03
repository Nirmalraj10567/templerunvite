const express = require('express');
const multer = require('multer');
const path = require('path');
const PDFDocument = require('pdfkit');
const router = express.Router();
const db = require('../../db');
const { authenticateToken, authorizePermission } = require('../../middleware');
const { compressImage } = require('../../middlewares/imageCompression');

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

// GET single tax registration
router.get('/:id', authenticateToken, authorizePermission('tax_registrations', 'view'), async (req, res) => {
  try {
    const { id } = req.params;
    const templeId = req.user.templeId;
    
    const registration = await db('user_tax_registrations')
      .where({ id: Number(id), temple_id: templeId })
      .first();
    
    if (!registration) {
      return res.status(404).json({ error: 'Tax registration not found or access denied.' });
    }

    res.json({ success: true, data: registration });
  } catch (err) {
    console.error('Error fetching tax registration:', err);
    res.status(500).json({ error: 'Database error while fetching tax registration.' });
  }
});

// GET logs for a specific tax registration
router.get('/:id/logs', authenticateToken, authorizePermission('tax_registrations', 'view'), async (req, res) => {
  try {
    const { id } = req.params;
    const templeId = req.user.templeId;
    // Ensure table exists (best-effort)
    try {
      const has = await db.schema.hasTable('user_tax_registration_logs');
      if (!has) return res.json({ success: true, data: [] });
    } catch {}
    const rows = await db('user_tax_registration_logs')
      .where({ tax_registration_id: Number(id), temple_id: templeId })
      .orderBy('created_at', 'desc')
      .select('*');
    const data = rows.map((r) => ({
      id: r.id,
      action: r.action,
      created_by: r.created_by,
      created_at: r.created_at,
      details: (() => { try { return r.details ? JSON.parse(r.details) : null; } catch { return r.details; } })(),
    }));
    res.json({ success: true, data });
  } catch (e) {
    console.error('Error fetching /api/tax-registrations/:id/logs:', e);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Simple logger for tax registration changes
async function logTaxRegistrationAction({ taxRegistrationId, templeId, userId, action, details }) {
  try {
    await db('user_tax_registration_logs').insert({
      tax_registration_id: Number(taxRegistrationId),
      temple_id: Number(templeId),
      created_by: userId ? Number(userId) : null,
      action,
      details: details ? JSON.stringify(details) : null,
      created_at: db.fn.now(),
    });
  } catch (e) {
    // Best-effort logging; do not block main flow
    // eslint-disable-next-line no-console
    console.warn('Failed to write user_tax_registration_logs:', e.message);
  }
}

// GET all logs for current temple (optional pagination)
router.get('/logs', authenticateToken, authorizePermission('tax_registrations', 'view'), async (req, res) => {
  try {
    const templeId = req.user.templeId;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize, 10) || 50));

    // Ensure table exists
    try {
      const has = await db.schema.hasTable('user_tax_registration_logs');
      if (!has) return res.json({ success: true, data: [], total: 0, page, pageSize });
    } catch {}

    const base = db('user_tax_registration_logs as l')
      .leftJoin('user_tax_registrations as r', 'r.id', 'l.tax_registration_id')
      .where('l.temple_id', templeId);

    const totalRow = await base.clone().count({ c: '*' }).first();
    const total = Number(totalRow?.c || totalRow?.count || 0);

    const rows = await base
      .clone()
      .orderBy('l.created_at', 'desc')
      .orderBy('l.id', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .select(
        'l.*',
        'r.name as registration_name',
        'r.reference_number as registration_ref'
      );

    const data = rows.map((r) => ({
      id: r.id,
      tax_registration_id: r.tax_registration_id,
      action: r.action,
      created_by: r.created_by,
      created_at: r.created_at,
      registration_name: r.registration_name || null,
      registration_ref: r.registration_ref || null,
      details: (() => { try { return r.details ? JSON.parse(r.details) : null; } catch { return r.details; } })(),
    }));

    res.json({ success: true, data, total, page, pageSize });
  } catch (e) {
    console.error('Error fetching /api/tax-registrations/logs:', e);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// POST endpoint for tax registrations
router.post('/', authenticateToken, authorizePermission('tax_registrations', 'edit'), upload.single('photo'), compressImage, async (req, res) => {
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

    // Ensure required DB columns exist (database-agnostic)
    try {
      const ensureColumn = async (table, col, builderCb, rawSql) => {
        try {
          const exists = await db.schema.hasColumn(table, col);
          if (!exists) {
            try {
              await db.schema.alterTable(table, builderCb);
            } catch (e1) {
              if (rawSql) {
                try { await db.raw(rawSql); } catch (e2) {}
              }
            }
          }
        } catch (e) {
          // Fallback to raw alter if hasColumn not supported
          if (rawSql) {
            try { await db.raw(rawSql); } catch (e2) {}
          }
        }
      };
      await ensureColumn(
        'user_tax_registrations',
        'from_account',
        (t) => { try { t.text('from_account'); } catch (e) {} },
        'ALTER TABLE user_tax_registrations ADD COLUMN from_account TEXT'
      );
      await ensureColumn(
        'user_tax_registrations',
        'transfer_to_account',
        (t) => { try { t.text('transfer_to_account'); } catch (e) {} },
        'ALTER TABLE user_tax_registrations ADD COLUMN transfer_to_account TEXT'
      );
    } catch (e) { /* ignore */ }

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
      from_account: cleanedData.fromAccount || cleanedData.from_account || 'TAX A/C',
      transfer_to_account: cleanedData.transferTo || cleanedData.transfer_to || 'INCOME A/C',
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    };

    const [registrationId] = await db('user_tax_registrations').insert(insertPayload);

    // Fetch full inserted row for logging (full data dump)
    let insertedRow = null;
    try {
      insertedRow = await db('user_tax_registrations')
        .where({ id: registrationId, temple_id: effectiveTempleId })
        .first();
    } catch {}

    // Log creation with full row snapshot
    await logTaxRegistrationAction({
      taxRegistrationId: registrationId,
      templeId: effectiveTempleId,
      userId: req.user?.id,
      action: 'create',
      details: insertedRow || { ...insertPayload, id: registrationId },
    });

    // Mirror to journal: INCOME A/C -> selected account (or CASH A/C)
    try {
      const hasJournal = await db.schema.hasTable('journal_entries');
      if (hasJournal && amountPaid > 0) {
        const fromAccount = insertPayload.from_account || 'TAX A/C';
        const toAccount = insertPayload.transfer_to_account || 'INCOME A/C';
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

// UPDATE a tax registration
router.put('/:id', authenticateToken, authorizePermission('tax_registrations', 'edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const templeId = req.user.templeId;
    const body = req.body || {};

    // Map incoming fields (from frontend) to DB columns
    const updates = {};
    if (body.name !== undefined) updates.name = String(body.name || '');
    if (body.mobile_number !== undefined) updates.mobile_number = (body.mobile_number || '').toString();
    if (body.aadhaar_number !== undefined) updates.aadhaar_number = body.aadhaar_number ? String(body.aadhaar_number).replace(/\D/g, '') : null;
    if (body.reference_number !== undefined) updates.reference_number = String(body.reference_number || '');
    if (body.village !== undefined) updates.village = String(body.village || '');
    if (body.tax_amount !== undefined) updates.tax_amount = Number(body.tax_amount) || 0;
    if (body.amount_paid !== undefined) updates.amount_paid = Number(body.amount_paid) || 0;
    if (body.outstanding_amount !== undefined) updates.outstanding_amount = Number(body.outstanding_amount);

    // Recompute outstanding if not explicitly provided but tax/paid provided
    if (updates.outstanding_amount === undefined && (updates.tax_amount !== undefined || updates.amount_paid !== undefined)) {
      // Fetch current row to compute based on latest values
      const current = await db('user_tax_registrations')
        .where({ id: Number(id), temple_id: templeId })
        .first();
      if (!current) return res.status(404).json({ error: 'Tax registration not found' });
      const tax = updates.tax_amount !== undefined ? Number(updates.tax_amount) : Number(current.tax_amount || 0);
      const paid = updates.amount_paid !== undefined ? Number(updates.amount_paid) : Number(current.amount_paid || 0);
      updates.outstanding_amount = Math.max(0, tax - paid);
    }

    // Fetch current row BEFORE applying updates for full-dump logging
    const beforeRow = await db('user_tax_registrations')
      .where({ id: Number(id), temple_id: templeId })
      .first();

    updates.updated_at = db.fn.now();

    const count = await db('user_tax_registrations')
      .where({ id: Number(id), temple_id: templeId })
      .update(updates);

    if (!count) return res.status(404).json({ error: 'Tax registration not found' });

    const row = await db('user_tax_registrations')
      .where({ id: Number(id), temple_id: templeId })
      .first();

    // Log update with full before/after dumps
    await logTaxRegistrationAction({
      taxRegistrationId: id,
      templeId,
      userId: req.user?.id,
      action: 'update',
      details: { before: beforeRow || null, after: row || null },
    });

    // Mirror to journal_entries
    try {
      const hasJournal = await db.schema.hasTable('journal_entries');
      if (hasJournal) {
        const existingJE = await db('journal_entries')
          .where({ reference_type: 'tax_registration', reference_id: Number(id), temple_id: templeId })
          .first();

        const amountPaidNow = Number(row?.amount_paid || 0);
        const dateNow = row?.date || new Date().toISOString().slice(0,10);
        const fromAccount = row?.from_account || 'TAX A/C';
        const toAccount = row?.transfer_to_account || 'INCOME A/C';
        const remarks = `TAX ${row?.year || ''} - ${row?.name || ''}`.trim();

        if (amountPaidNow > 0) {
          if (existingJE) {
            await db('journal_entries')
              .where({ id: existingJE.id })
              .update({
                date: dateNow,
                from_account: fromAccount,
                to_account: toAccount,
                amount: amountPaidNow,
                remarks,
                updated_at: db.fn.now(),
              });
          } else {
            await db('journal_entries').insert({
              date: dateNow,
              from_account: fromAccount,
              to_account: toAccount,
              amount: amountPaidNow,
              entry_type: 'transfer',
              remarks,
              reference_type: 'tax_registration',
              reference_id: Number(id),
              temple_id: templeId,
              created_by: req.user.id,
              created_at: db.fn.now(),
            });
          }
        } else if (existingJE) {
          // If paid is now 0, remove the journal entry
          await db('journal_entries').where({ id: existingJE.id }).del();
        }
      }
    } catch (e) {
      console.warn('Failed to mirror update into journal:', e.message);
    }

    res.json({ success: true, data: row });
  } catch (err) {
    console.error('Error updating tax registration:', err);
    res.status(500).json({ error: 'Failed to update tax registration' });
  }
});

// DELETE a tax registration
router.delete('/:id', authenticateToken, authorizePermission('tax_registrations', 'edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const templeId = req.user.templeId;

    // Check exists and belongs to user's temple
    const existing = await db('user_tax_registrations')
      .where({ id: Number(id), temple_id: templeId })
      .first();
    if (!existing) return res.status(404).json({ error: 'Tax registration not found' });

    // Delete related journal entry if present (best-effort)
    try {
      const hasJournal = await db.schema.hasTable('journal_entries');
      if (hasJournal) {
        await db('journal_entries')
          .where({ reference_type: 'tax_registration', reference_id: Number(id), temple_id: templeId })
          .del();
      }
    } catch (e) {
      // ignore
    }

    await db('user_tax_registrations')
      .where({ id: Number(id), temple_id: templeId })
      .del();

    // Log deletion with full data dump of deleted row
    await logTaxRegistrationAction({
      taxRegistrationId: id,
      templeId,
      userId: req.user?.id,
      action: 'delete',
      details: existing || { id: Number(id) },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting tax registration:', err);
    res.status(500).json({ error: 'Failed to delete tax registration' });
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
