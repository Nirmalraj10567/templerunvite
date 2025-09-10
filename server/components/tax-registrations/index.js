const express = require('express');
const multer = require('multer');
const path = require('path');
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
