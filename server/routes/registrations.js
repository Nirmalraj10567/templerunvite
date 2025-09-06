const express = require('express');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware');
const { exportRegistrationsToPdf, exportSingleRegistrationToPdf } = require('../utils/pdfExport');

function createRegistrationsRouter(db) {
  const router = express.Router();

  const validateRegistration = (payload) => {
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
    
    // Additional format validation
    if (payload.mobileNumber && !/^\d{10}$/.test(payload.mobileNumber.replace(/\D/g, ''))) {
      errors.mobileNumber = 'Mobile number must be 10 digits';
    }
    
    return Object.keys(errors).length ? errors : null;
  };

  // POST endpoint for new registrations
  router.post('/', authenticateToken, async (req, res) => {
    try {
      console.log('Received registration request with body:', req.body);
      console.log('Files in request:', req.files);

      if (!req.body) {
        console.warn('Request body is empty!');
      }

      const payload = req.body;
      
      console.log('Payload before validation:', payload);
      
      const validationErrors = validateRegistration(payload);
      if (validationErrors) {
        return res.status(400).json({
          error: 'Validation failed',
          errors: validationErrors,
          message: 'Please fix the highlighted fields',
          receivedBody: req.body,
          timestamp: new Date().toISOString()
        });
      }

      // Insert registration
      const [id] = await db('user_registrations').insert({
        temple_id: req.user.templeId,
        reference_number: payload.referenceNumber,
        date: payload.date,
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
          
          const fileName = `${id}${path.extname(req.file.originalname) || '.jpg'}`;
          const uploadPath = path.join(uploadDir, fileName);
          
          await fs.promises.rename(req.file.path, uploadPath);
          
          await db('user_registrations')
            .where({ id })
            .update({ 
              photo_path: `/uploads/registrations/${fileName}`,
              updated_at: db.fn.now() 
            });
        } catch (err) {
          console.error('Photo upload error:', err);
        }
      }

      res.json({ success: true, id });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Failed to save registration' });
    }
  });

  // GET list with pagination and search
  router.get('/', authenticateToken, async (req, res) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
      const search = String(req.query.search || '').trim();

      const base = db('user_registrations').where('temple_id', req.user.templeId);
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
      const q = db('user_registrations').where('temple_id', req.user.templeId);
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

  // Photo upload endpoint
  router.post('/:id/photo', authenticateToken, async (req, res) => {
    try {
      if (!req.files || !req.files.photo) {
        return res.status(400).json({ error: 'No photo uploaded' });
      }
      
      const photo = req.files.photo;
      if (photo.size > 100 * 1024) { // 100KB limit
        return res.status(400).json({ error: 'Photo must be less than 100KB' });
      }
      
      const registrationId = req.params.id;
      const uploadPath = path.join(__dirname, '../../public/uploads/registrations', `${registrationId}.jpg`);
      
      await photo.mv(uploadPath);
      
      // Update registration record with photo path
      await db('user_registrations')
        .where({ id: registrationId })
        .update({ 
          photo_path: `/uploads/registrations/${registrationId}.jpg`,
          updated_at: db.fn.now() 
        });
      
      res.json({ success: true });
    } catch (err) {
      console.error('Photo upload error:', err);
      res.status(500).json({ error: 'Failed to upload photo' });
    }
  });

  // CSV export
  router.get('/export/csv', authenticateToken, async (req, res) => {
    try {
      const { search } = req.query;
      const q = db('user_registrations').where('temple_id', req.user.templeId);
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

  return router;
}

module.exports = createRegistrationsRouter;
