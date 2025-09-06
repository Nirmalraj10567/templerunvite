const express = require('express');

module.exports = function createRegistrationsRouter({ db, authenticateToken, authorizePermission, retryOnBusy, generateRegistrationReceipt }) {
  const router = express.Router();

  // List registrations with pagination and search
  router.get('/',
    authenticateToken,
    authorizePermission('user_registrations', 'view'),
    async (req, res) => {
      try {
        const templeId = Number(req.query.templeId) || req.user.templeId;
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
        const search = String(req.query.search || '').trim();

        const baseQuery = db('user_registrations').where('temple_id', templeId);
        if (search) {
          baseQuery.andWhere(builder => {
            builder
              .orWhere('name', 'like', `%${search}%`)
              .orWhere('mobile_number', 'like', `%${search}%`)
              .orWhere('aadhaar_number', 'like', `%${search}%`)
              .orWhere('reference_number', 'like', `%${search}%`);
          });
        }

        const [{ count }] = await baseQuery.clone().count({ count: '*' });
        const rows = await baseQuery
          .clone()
          .orderBy('created_at', 'desc')
          .limit(pageSize)
          .offset((page - 1) * pageSize);

        res.json({ success: true, data: rows, page, pageSize, total: Number(count) });
      } catch (err) {
        console.error('Error listing registrations:', err);
        res.status(500).json({ error: 'Database error while listing registrations.' });
      }
    }
  );

  // Export single general registration as PDF
  router.get('/:id/pdf',
    authenticateToken,
    authorizePermission('user_registrations', 'view'),
    async (req, res) => {
      const { id } = req.params;
      const templeId = req.user.templeId;
      let PDFDocument;
      try {
        PDFDocument = require('pdfkit');
      } catch (e) {
        return res.status(501).json({ error: "PDF export not enabled. Run 'npm i pdfkit' in server/ and restart." });
      }

      try {
        const row = await db('user_registrations')
          .where({ id, temple_id: templeId })
          .first();
        if (!row) return res.status(404).json({ error: 'Registration not found or access denied.' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=registration-${row.id}.pdf`);

        const doc = new PDFDocument({ size: 'A4', margin: 36 });
        doc.pipe(res);

        doc.fontSize(16).text('User Registration / பதிவு', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).text(`Temple ID: ${templeId} | Ref: ${row.reference_number || '-'} | ID: ${row.id}`);
        doc.moveDown(0.5);
        doc.moveTo(36, doc.y).lineTo(559, doc.y).stroke();
        doc.moveDown(0.5);

        const field = (en, ta, val) => {
          doc.fontSize(11).text(`${en} / ${ta}: `, { continued: true });
          doc.font('Helvetica-Bold').text(val ?? '-');
          doc.font('Helvetica');
        };

        field('Name', 'பெயர்', row.name);
        field('Father Name', 'தந்தை', row.father_name || '-');
        field('Mobile', 'கைபேசி', row.mobile_number);
        field('Aadhaar', 'ஆதார்', row.aadhaar_number || '-');
        field('Village', 'கிராமம்', row.village || '-');
        field('Address', 'முகவரி', row.address || '-');
        field('Subdivision', 'உட்பிரிவு', row.subdivision || '-');
        field('Reference No', 'குறிப்பு எண்', row.reference_number || '-');
        field('Created', 'உருவாக்கப்பட்டது', row.created_at ? new Date(row.created_at).toLocaleString() : '-');

        doc.end();
      } catch (err) {
        console.error('Error exporting registration PDF:', err);
        res.status(500).json({ error: 'Failed to generate PDF.' });
      }
    }
  );

  // Export multiple/filtered general registrations as a single PDF (one per page)
  router.get('/export/pdf',
    authenticateToken,
    authorizePermission('user_registrations', 'view'),
    async (req, res) => {
      const templeId = req.user.templeId;
      let PDFDocument;
      try {
        PDFDocument = require('pdfkit');
      } catch (e) {
        return res.status(501).json({ error: "PDF export not enabled. Run 'npm i pdfkit' in server/ and restart." });
      }

      try {
        const search = String(req.query.search || '').trim();
        const ids = String(req.query.ids || '').trim();

        const q = db('user_registrations').where('temple_id', templeId);
        if (search) {
          q.andWhere(builder => {
            builder
              .orWhere('name', 'like', `%${search}%`)
              .orWhere('mobile_number', 'like', `%${search}%`)
              .orWhere('aadhaar_number', 'like', `%${search}%`)
              .orWhere('reference_number', 'like', `%${search}%`);
          });
        }
        if (ids) {
          const arr = ids.split(',').map(s => parseInt(s, 10)).filter(n => !isNaN(n));
          if (arr.length) q.andWhereIn('id', arr);
        }

        const rows = await q.orderBy('created_at', 'desc').limit(1000);
        if (!rows.length) return res.status(404).json({ error: 'No records to export.' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename=registrations.pdf');

        const doc = new PDFDocument({ size: 'A4', margin: 36 });
        doc.pipe(res);

        const field = (en, ta, val) => {
          doc.fontSize(11).text(`${en} / ${ta}: `, { continued: true });
          doc.font('Helvetica-Bold').text(val ?? '-');
          doc.font('Helvetica');
        };

        rows.forEach((row, index) => {
          if (index > 0) doc.addPage();
          doc.fontSize(16).text('User Registration / பதிவு', { align: 'center' });
          doc.moveDown(0.5);
          doc.fontSize(10).text(`Temple ID: ${templeId} | Ref: ${row.reference_number || '-'} | ID: ${row.id}`);
          doc.moveDown(0.5);
          doc.moveTo(36, doc.y).lineTo(559, doc.y).stroke();
          doc.moveDown(0.5);

          field('Name', 'பெயர்', row.name);
          field('Father Name', 'தந்தை', row.father_name || '-');
          field('Mobile', 'கைபேசி', row.mobile_number);
          field('Aadhaar', 'ஆதார்', row.aadhaar_number || '-');
          field('Village', 'கிராமம்', row.village || '-');
          field('Address', 'முகவரி', row.address || '-');
          field('Subdivision', 'உட்பிரிவு', row.subdivision || '-');
          field('Reference No', 'குறிப்பு எண்', row.reference_number || '-');
          field('Created', 'உருவாக்கப்பட்டது', row.created_at ? new Date(row.created_at).toLocaleString() : '-');
        });

        doc.end();
      } catch (err) {
        console.error('Error exporting registrations PDF:', err);
        res.status(500).json({ error: 'Failed to generate PDF.' });
      }
    }
  );

  // Create registration
  router.post('/', 
    authenticateToken, 
    authorizePermission('user_registrations', 'edit'), 
    async (req, res) => {
      const {
        referenceNumber,
        date,
        subdivision,
        name,
        alternativeName,
        wifeName,
        education,
        occupation,
        fatherName,
        address,
        birthDate,
        village,
        mobileNumber,
        aadhaarNumber,
        panNumber,
        clan,
        group,
        postalCode,
        maleHeirs,
        femaleHeirs,
        templeId
      } = req.body;

      if (!name || !(templeId || req.user.templeId)) {
        return res.status(400).json({ error: 'Name and templeId are required.' });
      }

      try {
        const effectiveTempleId = Number(templeId || req.user.templeId);
        const [id] = await retryOnBusy(() => db('user_registrations')
          .insert({
            reference_number: referenceNumber || '',
            date: date || new Date().toISOString().split('T')[0],
            subdivision: subdivision || '',
            name: String(name).trim(),
            alternative_name: alternativeName || '',
            wife_name: wifeName || '',
            education: education || '',
            occupation: occupation || '',
            father_name: fatherName || '',
            address: address || '',
            birth_date: birthDate || '',
            village: village || '',
            mobile_number: mobileNumber || '',
            aadhaar_number: aadhaarNumber || null,
            pan_number: panNumber || '',
            clan: clan || '',
            group: group || '',
            postal_code: postalCode || '',
            male_heirs: maleHeirs || 0,
            female_heirs: femaleHeirs || 0,
            temple_id: effectiveTempleId,
            created_at: db.fn.now(),
            updated_at: db.fn.now()
          })
          .returning('id')
        );

        res.status(201).json({ success: true, id });
      } catch (err) {
        console.error('Error creating registration:', err);
        res.status(500).json({ error: 'Database error while creating registration.' });
      }
    }
  );

  // Update registration
  router.put('/:id', 
    authenticateToken, 
    authorizePermission('user_registrations', 'edit'), 
    async (req, res) => {
      const { id } = req.params;
      const effectiveTempleId = req.user.templeId;
      try {
        const existing = await db('user_registrations')
          .where({ id, temple_id: effectiveTempleId })
          .first();
        if (!existing) {
          return res.status(404).json({ error: 'Registration not found or access denied.' });
        }

        const payload = req.body || {};
        const map = {
          reference_number: payload.referenceNumber,
          date: payload.date,
          subdivision: payload.subdivision,
          name: payload.name && String(payload.name).trim(),
          alternative_name: payload.alternativeName,
          wife_name: payload.wifeName,
          education: payload.education,
          occupation: payload.occupation,
          father_name: payload.fatherName,
          address: payload.address,
          birth_date: payload.birthDate,
          village: payload.village,
          mobile_number: payload.mobileNumber,
          aadhaar_number: payload.aadhaarNumber ?? null,
          pan_number: payload.panNumber,
          clan: payload.clan,
          group: payload.group,
          postal_code: payload.postalCode,
          male_heirs: payload.maleHeirs,
          female_heirs: payload.femaleHeirs,
          updated_at: db.fn.now()
        };

        Object.keys(map).forEach(k => map[k] === undefined && delete map[k]);

        await db('user_registrations')
          .where({ id, temple_id: effectiveTempleId })
          .update(map);

        res.json({ success: true });
      } catch (err) {
        console.error('Error updating registration:', err);
        res.status(500).json({ error: 'Database error while updating registration.' });
      }
    }
  );

  // Delete registration
  router.delete('/:id', 
    authenticateToken, 
    authorizePermission('user_registrations', 'full'), 
    async (req, res) => {
      const { id } = req.params;
      const effectiveTempleId = req.user.templeId;
      try {
        const existing = await db('user_registrations')
          .where({ id, temple_id: effectiveTempleId })
          .first();
        if (!existing) {
          return res.status(404).json({ error: 'Registration not found or access denied.' });
        }

        await db('user_registrations').where({ id, temple_id: effectiveTempleId }).del();
        res.json({ success: true });
      } catch (err) {
        console.error('Error deleting registration:', err);
        res.status(500).json({ error: 'Database error while deleting registration.' });
      }
    }
  );

  // Collect payment for registration -> creates ledger entry linked via registration_id
  router.post('/:id/payment', 
    authenticateToken, 
    authorizePermission('user_registrations', 'edit'), 
    async (req, res) => {
      const { id } = req.params;
      const effectiveTempleId = req.user.templeId;
      const { amount, paid_amount, donation_amount, date } = req.body || {};

      if (!amount) {
        return res.status(400).json({ error: 'Amount is required.' });
      }

      try {
        const registration = await db('user_registrations')
          .where({ id, temple_id: effectiveTempleId })
          .first();
        if (!registration) {
          return res.status(404).json({ error: 'Registration not found or access denied.' });
        }

        const receipt_no = await generateRegistrationReceipt(db, effectiveTempleId, date && String(date).replace(/-/g, ''));
        const today = date || new Date().toISOString().split('T')[0];
        const status = (parseFloat(paid_amount || 0) >= parseFloat(amount)) ? 'paid' : 'pending';

        const [ledgerId] = await db('ledger_entries')
          .insert({
            receipt_no,
            date: today,
            donor_name: registration.name,
            village: registration.village || '',
            mobile: registration.mobile_number || '',
            amount: parseFloat(amount),
            paid_amount: parseFloat(paid_amount || 0),
            donation_amount: parseFloat(donation_amount || 0),
            year: String(new Date(today).getFullYear()),
            status,
            temple_id: effectiveTempleId,
            registration_id: registration.id,
            created_at: db.fn.now(),
            updated_at: db.fn.now()
          })
          .returning('id');

        res.status(201).json({ success: true, ledgerId, receipt_no, status });
      } catch (err) {
        console.error('Error creating registration payment:', err);
        res.status(500).json({ error: 'Database error while creating registration payment.' });
      }
    }
  );

  return router;
};
