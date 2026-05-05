const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware');
const { exportRegistrationsToPdf, exportSingleRegistrationToPdf } = require('../utils/pdfExport');

// Permissive token decoder: accepts any valid JWT (admin or member)
// Does NOT enforce permissions — just ensures a valid, non-expired token is present
function decodeAnyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  const secrets = [
    process.env.JWT_SECRET,
    'dev-insecure-secret-change-me',
  ].filter(Boolean);

  for (const secret of secrets) {
    try {
      req.user = jwt.verify(token, secret);
      return next();
    } catch (e) {
      // try next secret
    }
  }
  return res.status(401).json({ error: 'Invalid or expired token' });
}

function createRegistrationsRouter(db) {
  const router = express.Router();

  const validateRegistration = async (payload, templeId) => {
    const errors = {};
    
    // Only validate core required fields
    const requiredFields = [
      { field: 'name', message: 'Name is required' },
      { field: 'fatherName', message: 'Father\'s name is required' },
      { field: 'mobileNumber', message: 'Mobile number is required' },
      { field: 'address', message: 'Address is required' }
    ];
    
    requiredFields.forEach(({field, message}) => {
      if (!payload[field]?.toString().trim()) {
        errors[field] = message;
      }
    });
    
    // FAMILY CHAIN VALIDATION: Verify if new person's name exists in heirs list of family head
    if (payload.parentReferenceId || payload.familyHeadReference) {
      const parentRef = payload.parentReferenceId || payload.familyHeadReference;
      try {
        // Get the family head's tax registration
        const familyRecord = await db('user_tax_registrations')
          .where({ reference_number: parentRef, temple_id: templeId })
          .first();
        
        if (!familyRecord) {
          errors.familyReference = `Family reference ${parentRef} not found in tax registrations`;
        } else {
          // Get the heirs of this family head
          const familyHeirs = await db('user_tax_registrations')
            .where({ parent_reference_id: parentRef, temple_id: templeId })
            .orWhere({ family_head_reference: parentRef, temple_id: templeId })
            .whereNot({ reference_number: parentRef })
            .select('name');
          
          // Also get heirs from heirs table if exists
          const heirsFromTable = await db('user_heirs')
            .whereIn('registration_id', function() {
              this.select('id').from('user_tax_registrations')
                .where({ reference_number: parentRef, temple_id: templeId });
            })
            .select('name');
          
          // Combine all heir names
          const allHeirNames = [
            ...familyHeirs.map(h => h.name?.toLowerCase().trim()),
            ...heirsFromTable.map(h => h.name?.toLowerCase().trim())
          ].filter(Boolean);
          
          // Add family head's name as possible father match
          const familyHeadName = familyRecord.name?.toLowerCase().trim();
          
          // Check if new user's name matches any heir OR if father name matches family head
          const userName = payload.name?.toLowerCase().trim();
          const userFatherName = payload.fatherName?.toLowerCase().trim();
          
          const nameInHeirsList = allHeirNames.some(heirName => 
            heirName && (heirName.includes(userName) || userName?.includes(heirName))
          );
          
          const fatherIsFamilyHead = userFatherName && familyHeadName && 
            (userFatherName === familyHeadName || 
             userFatherName.includes(familyHeadName) || 
             familyHeadName.includes(userFatherName));
          
          // Verify clan matches if both provided
          const clanMatches = !payload.clan || !familyRecord.clan || 
            payload.clan.toLowerCase() === familyRecord.clan.toLowerCase();
          
          if (!clanMatches) {
            errors.clanMismatch = `Clan mismatch: Your clan "${payload.clan}" does not match family clan "${familyRecord.clan}"`;
          }
          
          // If name not in heirs list AND father doesn't match family head, warn
          if (!nameInHeirsList && !fatherIsFamilyHead && userName) {
            errors.familyVerification = 
              `"${payload.name}" is not listed as a heir of ${familyRecord.name}. ` +
              `Found heirs: ${allHeirNames.length > 0 ? allHeirNames.slice(0, 5).join(', ') : 'None'}. ` +
              `Please verify family link or check if the person is registered as a child first.`;
          }
        }
      } catch (e) {
        console.error('Family validation error:', e);
      }
    }
    
    // Additional format validation
    if (payload.mobileNumber && !/^\d{10}$/.test(payload.mobileNumber.replace(/\D/g, ''))) {
      errors.mobileNumber = 'Mobile number must be 10 digits';
    }
    
    return Object.keys(errors).length ? errors : null;
  };

  // GET /api/registrations/next-ref?date=YYYY-MM-DD
  router.get('/next-ref', authenticateToken, async (req, res) => {
    try {
      const dStr = (req.query.date && String(req.query.date).slice(0,10)) || new Date().toISOString().slice(0,10);
      const year = Number(dStr.slice(0,4));
      let nextRef = `${year}-0001`;
      const last = await db('user_registrations')
        .where({ temple_id: req.user.templeId })
        .andWhere('reference_number', 'like', `${year}-%`)
        .orderBy('reference_number', 'desc')
        .first();
      if (last && last.reference_number) {
        const m = String(last.reference_number).match(new RegExp(`^${year}-([0-9]+)$`));
        const seq = m ? parseInt(m[1], 10) : 0;
        const next = (Number.isFinite(seq) ? seq : 0) + 1;
        nextRef = `${year}-${String(next).padStart(4, '0')}`;
      }
      res.json({ success: true, reference_number: nextRef });
    } catch (err) {
      console.error('Next ref error:', err);
      res.status(500).json({ error: 'Failed to compute next reference number' });
    }
  });

  // POST endpoint for new registrations (auto-generate reference_number as YYYY-0001 per calendar year)
  router.post('/', authenticateToken, async (req, res) => {
    try {
      console.log('Received registration request with body:', req.body);
      console.log('Files in request:', req.files);

      if (!req.body) {
        console.warn('Request body is empty!');
      }

      const payload = req.body;
      
      console.log('Payload before validation:', payload);
      
      const validationErrors = await validateRegistration(payload, req.user.templeId);
      if (validationErrors) {
        return res.status(400).json({
          error: 'Validation failed',
          errors: validationErrors,
          message: 'Please fix the highlighted fields',
          receivedBody: req.body,
          timestamp: new Date().toISOString()
        });
      }

      // Derive registration date and compute next reference number for the calendar year
      const dateStr = (payload.date && String(payload.date).slice(0, 10)) || new Date().toISOString().slice(0, 10);
      const year = Number(dateStr.slice(0, 4));
      // Find highest reference_number like YYYY-XXXX for this temple and year
      let nextRef = `${year}-0001`;
      try {
        const last = await db('user_registrations')
          .where({ temple_id: req.user.templeId })
          .andWhere('reference_number', 'like', `${year}-%`)
          .orderBy('reference_number', 'desc')
          .first();
        if (last && last.reference_number) {
          const m = String(last.reference_number).match(new RegExp(`^${year}-([0-9]+)$`));
          const seq = m ? parseInt(m[1], 10) : 0;
          const next = (Number.isFinite(seq) ? seq : 0) + 1;
          nextRef = `${year}-${String(next).padStart(4, '0')}`;
        }
      } catch (e) {
        // Fallback keeps default nextRef
      }

      // Insert registration with family chain fields
      const [id] = await db('user_registrations').insert({
        temple_id: req.user.templeId,
        reference_number: nextRef,
        date: dateStr,
        subdivision: payload.subdivision,
        name: payload.name,
        alternative_name: payload.alternativeName,
        wife_name: payload.wifeName,
        education: payload.education,
        occupation: payload.occupation,
        father_name: payload.fatherName,
        address: payload.address,
        birth_date: payload.birthDate,
        village: payload.village,
        mobile_number: payload.mobileNumber.replace(/\D/g, ''),
        aadhaar_number: payload.aadhaarNumber?.replace(/\D/g, ''),
        pan_number: payload.panNumber,
        clan: payload.clan,
        group: payload.group || '',
        postal_code: payload.postalCode,
        male_heirs: payload.maleHeirs || 0,
        female_heirs: payload.femaleHeirs || 0,
        // Family chain fields
        parent_reference_id: payload.parentReferenceId || null,
        family_head_reference: payload.familyHeadReference || payload.parentReferenceId || null,
        relationship_type: payload.relationshipType || 'self',
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });

      // Save heirs if provided (as JSON string or array)
      try {
        const heirsRaw = req.body.heirs;
        let heirs = [];
        if (Array.isArray(heirsRaw)) heirs = heirsRaw;
        else if (typeof heirsRaw === 'string' && heirsRaw.trim()) heirs = JSON.parse(heirsRaw);
        if (Array.isArray(heirs) && heirs.length) {
          const rows = heirs.map((h, i) => ({
            registration_id: id,
            serial_number: Number(h.serialNumber || i + 1),
            name: String(h.name || '').trim(),
            race: h.race || null,
            marital_status: h.maritalStatus || null,
            education: h.education || null,
            birth_date: h.birthDate || null,
            created_at: db.fn.now(),
            updated_at: db.fn.now(),
          })).filter(r => r.name);
          if (rows.length) await db('user_heirs').insert(rows);
        }
      } catch (e) {
        console.warn('Heirs save skipped:', e.message);
      }

// Handle photo upload
      if (req.file) {
        try {
          const uploadDir = path.join(__dirname, '../../public/uploads/registrations');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }

          // Ensure uploaded file is a valid image before moving
          const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
          if (!allowedTypes.includes(req.file.mimetype)) {
            console.warn('Invalid image type:', req.file.mimetype);
          } else {
            const fileName = `${id}.jpg`; // Always use .jpg for consistency
            const uploadPath = path.join(uploadDir, fileName);
           
            await fs.promises.rename(req.file.path, uploadPath);
           
            await db('user_registrations')
              .where({ id })
              .update({ 
                photo_path: `/uploads/registrations/${fileName}`,
                updated_at: db.fn.now() 
              });
          }
        } catch (err) {
          console.error('Photo upload error:', err);
        }
      }

      res.json({ success: true, id, reference_number: nextRef });
    } catch (err) {
      console.error('Registration error:', err);
      console.error('Stack:', err.stack);
      res.status(500).json({ error: 'Failed to save registration', details: err.message });
    }
  });

  // GET list with pagination and search
  router.get('/', authenticateToken, async (req, res) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
      const search = String(req.query.search || '').trim();

      const base = db('user_registrations')
        .where('temple_id', req.user.templeId)
        .whereNotNull('reference_number');
      if (search) {
        base.andWhere((qb) => {
          qb.orWhere('name', 'like', `%${search}%`)
            .orWhere('mobile_number', 'like', `%${search.replace(/\D/g, '')}%`)
            .orWhere('aadhaar_number', 'like', `%${search.replace(/\D/g, '')}%`)
            .orWhere('reference_number', 'like', `%${search}%`);
        });
      }

      const countRow = await base.clone().count({ count: '*' }).first();
      const total = Number(countRow?.count || 0);
      const rows = await base
        .clone()
        .orderBy('created_at', 'desc')
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      res.json({ success: true, data: rows, page, pageSize, total });
    } catch (err) {
      console.error('Registration list error:', err);
      res.status(500).json({ error: 'Failed to list registrations' });
    }
  });

  // ========== MEMBER PROFILE API ==========
  // GET /api/registrations/member/profile
  // Public via token: accepts any valid JWT (admin, member, etc.) — no permission check
  router.get('/member/profile', decodeAnyToken, async (req, res) => {
    try {
      const memberId = req.user.id;
      const member = await db('user_registrations').where('id', memberId).first();
      if (!member) return res.status(404).json({ error: 'Member profile not found' });
      res.json({ success: true, member });
    } catch (err) {
      console.error('Error fetching member profile:', err);
      res.status(500).json({ error: 'Database error' });
    }
  });

  // GET single by ID
  router.get('/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const row = await db('user_registrations')
        .where({ id, temple_id: req.user.templeId })
        .first();
      if (!row) return res.status(404).json({ error: 'Registration not found' });
      const heirs = await db('user_heirs').where({ registration_id: id }).orderBy('serial_number');
      res.json({ success: true, data: { ...row, heirs } });
    } catch (err) {
      console.error('Get registration error:', err);
      res.status(500).json({ error: 'Failed to fetch registration' });
    }
  });

  // PUT update
  router.put('/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const exists = await db('user_registrations')
        .where({ id, temple_id: req.user.templeId })
        .first();
      if (!exists) return res.status(404).json({ error: 'Registration not found' });

      const p = req.body || {};
      const update = {
        reference_number: p.referenceNumber,
        date: p.date,
        subdivision: p.subdivision,
        name: p.name && String(p.name).trim(),
        alternative_name: p.alternativeName,
        wife_name: p.wifeName,
        education: p.education,
        occupation: p.occupation,
        father_name: p.fatherName,
        address: p.address,
        birth_date: p.birthDate,
        village: p.village,
        mobile_number: p.mobileNumber && String(p.mobileNumber).replace(/\D/g, ''),
        aadhaar_number: p.aadhaarNumber != null ? String(p.aadhaarNumber).replace(/\D/g, '') : undefined,
        pan_number: p.panNumber,
        clan: p.clan,
        group: p.group,
        postal_code: p.postalCode,
        male_heirs: p.maleHeirs,
        female_heirs: p.femaleHeirs,
        updated_at: db.fn.now(),
      };
      Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

      await db('user_registrations')
        .where({ id, temple_id: req.user.templeId })
        .update(update);
      // Upsert heirs if provided
      try {
        const heirsRaw = req.body.heirs;
        let heirs = [];
        if (Array.isArray(heirsRaw)) heirs = heirsRaw;
        else if (typeof heirsRaw === 'string' && heirsRaw.trim()) heirs = JSON.parse(heirsRaw);
        if (Array.isArray(heirs)) {
          await db('user_heirs').where({ registration_id: id }).del();
          const rows = heirs.map((h, i) => ({
            registration_id: id,
            serial_number: Number(h.serialNumber || i + 1),
            name: String(h.name || '').trim(),
            race: h.race || null,
            marital_status: h.maritalStatus || null,
            education: h.education || null,
            birth_date: h.birthDate || null,
            created_at: db.fn.now(),
            updated_at: db.fn.now(),
          })).filter(r => r.name);
          if (rows.length) await db('user_heirs').insert(rows);
        }
      } catch (e) {
        console.warn('Heirs update skipped:', e.message);
      }

      // Handle photo upload if provided
      console.log('PUT endpoint - req.file:', req.file ? 'Present' : 'Not present');
      if (req.file) {
        console.log('PUT endpoint - Processing photo upload:', req.file.filename, req.file.size);
        try {
          const uploadDir = path.join(__dirname, '../../public/uploads/registrations');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          
          const fileName = `${id}.jpg`; // Always use .jpg for consistency
          const uploadPath = path.join(uploadDir, fileName);
          
          await fs.promises.rename(req.file.path, uploadPath);
          
          await db('user_registrations')
            .where({ id })
            .update({ 
              photo_path: `/uploads/registrations/${fileName}`,
              updated_at: db.fn.now() 
            });
        } catch (err) {
          console.error('Photo upload error during update:', err);
        }
      }

      const row = await db('user_registrations').where({ id }).first();
      const heirs = await db('user_heirs').where({ registration_id: id }).orderBy('serial_number');
      res.json({ success: true, data: { ...row, heirs } });
    } catch (err) {
      console.error('Update registration error:', err);
      res.status(500).json({ error: 'Failed to update registration' });
    }
  });

  // DELETE
  router.delete('/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const del = await db('user_registrations')
        .where({ id, temple_id: req.user.templeId })
        .del();
      if (!del) return res.status(404).json({ error: 'Registration not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('Delete registration error:', err);
      res.status(500).json({ error: 'Failed to delete registration' });
    }
  });

  // PATCH status (block/unblock)
  router.patch('/:id/status', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body || {};
      if (!['active', 'blocked', 'inactive'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      const exists = await db('user_registrations')
        .where({ id, temple_id: req.user.templeId })
        .first();
      if (!exists) return res.status(404).json({ error: 'Registration not found' });
      await db('user_registrations')
        .where({ id, temple_id: req.user.templeId })
        .update({ status, updated_at: db.fn.now() });
      res.json({ success: true });
    } catch (err) {
      console.error('Update status error:', err);
      res.status(500).json({ error: 'Failed to update status' });
    }
  });

  // Existing PDF export routes
  router.get('/export-pdf', authenticateToken, async (req, res) => {
    try {
      const registrations = await db('user_registrations')
        .where('temple_id', req.user.templeId)
        .whereNotNull('reference_number')
        .select('*');
      await exportRegistrationsToPdf(registrations, res);
    } catch (error) {
      console.error('Error in registrations export:', error);
      res.status(500).json({ 
        error: 'Failed to generate registrations PDF',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Alias to match frontend path /export/pdf
  router.get('/export/pdf', authenticateToken, async (req, res) => {
    try {
      const { search } = req.query;
      const q = db('user_registrations')
        .where('temple_id', req.user.templeId)
        .whereNotNull('reference_number');
      if (search) {
        q.andWhere((b) => {
          b.orWhere('name', 'like', `%${search}%`)
            .orWhere('mobile_number', 'like', `%${String(search).replace(/\D/g, '')}%`)
            .orWhere('aadhaar_number', 'like', `%${String(search).replace(/\D/g, '')}%`)
            .orWhere('reference_number', 'like', `%${search}%`);
        });
      }
      const registrations = await q.orderBy('created_at', 'desc').limit(1000).select('*');
      await exportRegistrationsToPdf(registrations, res);
    } catch (error) {
      console.error('Error in registrations export alias:', error);
      res.status(500).json({ error: 'Failed to generate registrations PDF' });
    }
  });

  router.get('/:id/pdf', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const registration = await db('user_registrations')
        .where({ id, temple_id: req.user.templeId })
        .first();
      if (!registration) return res.status(404).json({ error: 'Registration not found' });
      await exportSingleRegistrationToPdf(registration, res);
    } catch (error) {
      console.error('Error in single registration PDF export:', error);
      res.status(500).json({ 
        error: 'Failed to generate registration PDF',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Photo upload endpoint (with compression)
  router.post('/:id/photo', authenticateToken, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No photo uploaded' });
      }
      
      const photo = req.file;
      
      // Check file type
      if (!photo.mimetype.startsWith('image/')) {
        return res.status(400).json({ error: 'Only image files are allowed' });
      }
      
      const registrationId = req.params.id;
      const uploadPath = path.join(__dirname, '../../public/uploads/registrations', `${registrationId}.jpg`);
      
      // Ensure upload directory exists
      const uploadDir = path.dirname(uploadPath);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // Move the compressed file to final location
      fs.renameSync(photo.path, uploadPath);
      
      // Update registration record with photo path
      await db('user_registrations')
        .where({ id: registrationId })
        .update({ 
          photo_path: `/uploads/registrations/${registrationId}.jpg`,
          updated_at: db.fn.now() 
        });
      
      res.json({ 
        success: true, 
        message: 'Photo uploaded and compressed successfully',
        originalSize: photo.originalSize || 'unknown',
        compressedSize: photo.size
      });
    } catch (err) {
      console.error('Photo upload error:', err);
      res.status(500).json({ error: 'Failed to upload photo' });
    }
  });

  // CSV export
  router.get('/export/csv', authenticateToken, async (req, res) => {
    try {
      const { search } = req.query;
      const q = db('user_registrations')
        .where('temple_id', req.user.templeId)
        .whereNotNull('reference_number');
      if (search) {
        q.andWhere((b) => {
          b.orWhere('name', 'like', `%${search}%`)
            .orWhere('mobile_number', 'like', `%${String(search).replace(/\D/g, '')}%`)
            .orWhere('aadhaar_number', 'like', `%${String(search).replace(/\D/g, '')}%`)
            .orWhere('reference_number', 'like', `%${search}%`);
        });
      }
      const rows = await q.orderBy('created_at', 'desc').limit(5000).select('*');
      const headers = [
        'id','reference_number','date','subdivision','name','father_name','mobile_number','aadhaar_number','village','address','postal_code','education','occupation','clan','group','male_heirs','female_heirs','status','created_at'
      ];
      const csvRows = rows.map(r => [
        r.id,
        safeCsv(r.reference_number),
        safeCsv(r.date),
        safeCsv(r.subdivision),
        safeCsv(r.name),
        safeCsv(r.father_name),
        safeCsv(r.mobile_number),
        safeCsv(r.aadhaar_number),
        safeCsv(r.village),
        safeCsv(r.address),
        safeCsv(r.postal_code),
        safeCsv(r.education),
        safeCsv(r.occupation),
        safeCsv(r.clan),
        safeCsv(r.group),
        r.male_heirs ?? 0,
        r.female_heirs ?? 0,
        safeCsv(r.status),
        safeCsv(r.created_at)
      ].join(','));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="registrations.csv"');
      res.send(headers.join(',') + '\n' + csvRows.join('\n'));
    } catch (err) {
      console.error('Error exporting registrations CSV:', err);
      res.status(500).json({ error: 'Failed to export CSV' });
    }
  });

  function safeCsv(v) {
    if (v == null) return '';
    const s = String(v).replaceAll('"', '""');
    if (s.includes(',') || s.includes('\n') || s.includes('"')) return '"' + s + '"';
    return s;
  }

  // PUT /api/registrations/member/profile
  router.put('/member/profile', authenticateToken, async (req, res) => {
    const fields = ['name', 'father_name', 'mother_name', 'date_of_birth', 'gender', 'mobile_number',
      'alternative_mobile', 'email', 'alternative_email', 'address', 'city', 'state', 'pincode',
      'aadhar_number', 'pan_number', 'gothram', 'masthram', 'birth_star', 'rasi', 'alternative_name',
      'education_id', 'occupation_id', 'annual_income', 'family_members', 'heir_name', 'heir_relation',
      'relationship_with_temple', 'suggestions'];
    const updateData = {};
    fields.forEach(f => { if (req.body[f] !== undefined) updateData[f] = req.body[f]; });
    updateData.updated_at = db.fn.now();

    try {
      const updatedRows = await db('user_registrations').where('id', req.user.id).update(updateData).returning('*');
      res.json({ success: true, member: updatedRows[0] });
    } catch (err) {
      console.error('Error updating member profile:', err);
      res.status(500).json({ error: 'Database error' });
    }
  });

  // ========== ADMIN MEMBER PROFILE API ==========
  // GET /api/registrations/member/:id
  router.get('/member/:id', authenticateToken, async (req, res) => {
    try {
      const member = await db('user_registrations').where('id', req.params.id).first();
      if (!member) return res.status(404).json({ error: 'Member not found' });
      res.json({ success: true, member });
    } catch (err) {
      console.error('Error fetching member:', err);
      res.status(500).json({ error: 'Database error' });
    }
  });

  // PUT /api/registrations/member/:id
  router.put('/member/:id', authenticateToken, async (req, res) => {
    const fields = ['name', 'father_name', 'mother_name', 'date_of_birth', 'gender', 'mobile_number',
      'alternative_mobile', 'email', 'alternative_email', 'address', 'city', 'state', 'pincode',
      'aadhar_number', 'pan_number', 'gothram', 'masthram', 'birth_star', 'rasi', 'alternative_name',
      'education_id', 'occupation_id', 'annual_income', 'family_members', 'heir_name', 'heir_relation',
      'relationship_with_temple', 'suggestions'];
    const updateData = {};
    fields.forEach(f => { if (req.body[f] !== undefined) updateData[f] = req.body[f]; });
    updateData.updated_at = db.fn.now();

    try {
      const updatedRows = await db('user_registrations')
        .where('id', req.params.id)
        .where('temple_id', req.user.templeId)
        .update(updateData)
        .returning('*');
      if (!updatedRows.length) return res.status(404).json({ error: 'Member not found or access denied' });
      res.json({ success: true, member: updatedRows[0] });
    } catch (err) {
      console.error('Error updating member:', err);
      res.status(500).json({ error: 'Database error' });
    }
  });

  // GET /api/registrations/members (admin - list with pagination/search)
  router.get('/members', authenticateToken, async (req, res) => {
    const { page = 1, pageSize = 20, search = '' } = req.query;
    try {
      let q = db('user_registrations').where('temple_id', req.user.templeId);
      if (search) {
        q = q.where((b) => {
          b.orWhere('name', 'like', `%${search}%`)
            .orWhere('mobile_number', 'like', `%${String(search).replace(/\D/g, '')}%`)
            .orWhere('aadhaar_number', 'like', `%${String(search).replace(/\D/g, '')}%`)
            .orWhere('reference_number', 'like', `%${search}%`);
        });
      }
      const total = await q.clone().count('id as count').first().then(r => Number(r?.count || 0));
      const members = await q.clone()
        .orderBy('created_at', 'desc')
        .limit(Number(pageSize))
        .offset((Number(page) - 1) * Number(pageSize))
        .select('*');
      res.json({ success: true, members, page: Number(page), pageSize: Number(pageSize), total });
    } catch (err) {
      console.error('Error listing members:', err);
      res.status(500).json({ error: 'Database error' });
    }
  });

  // ========== ADMIN MEMBER LIST (simplified) ==========
  // GET /api/registrations/members-list
  router.get('/members-list', authenticateToken, async (req, res) => {
    try {
      const members = await db('user_registrations')
        .where('temple_id', req.user.templeId)
        .select('id', 'name', 'father_name', 'mobile_number', 'email', 'created_at')
        .orderBy('created_at', 'desc');
      res.json({ success: true, members });
    } catch (err) {
      console.error('Error fetching members list:', err);
      res.status(500).json({ error: 'Database error' });
    }
  });

  return router;
}
module.exports = createRegistrationsRouter;
