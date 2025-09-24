const express = require('express');
const router = express.Router();

module.exports = function({ db }) {
  // Submit hall booking request from mobile
  router.post('/submit', async (req, res) => {
    try {
      const {
        register_no,
        date,
        time,
        event,
        subdivision,
        name,
        address,
        village,
        mobile,
        advance_amount,
        total_amount,
        balance_amount,
        remarks,
        submitted_by_mobile,
        temple_id,
        templeId
      } = req.body;

      // Basic validations
      if (!date || !time || !name || !mobile) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      // Resolve a valid templeId (accept from body if provided; validate against temples table)
      let resolvedTempleId = Number(temple_id || templeId) || null;
      try {
        if (resolvedTempleId) {
          const t = await db('temples').where({ id: resolvedTempleId }).first();
          if (!t) resolvedTempleId = null;
        }
        if (!resolvedTempleId) {
          // fallback: pick the first available temple id, else 1
          let row = null;
          try { row = await db('temples').min({ id: 'id' }).first(); } catch {}
          resolvedTempleId = Number(row?.id) || 1;
        }
      } catch (e) {
        // If temples table not accessible, fallback to 1
        resolvedTempleId = 1;
      }

      // Optional: Prevent double-booking for same time/date when already approved
      const conflicting = await db('marriage_hall_bookings')
        .where('temple_id', resolvedTempleId)
        .where('status', 'approved')
        .andWhere({ date, time })
        .first();
      if (conflicting) {
        return res.status(400).json({ success: false, error: 'Selected time already booked' });
      }

      const [id] = await db('marriage_hall_bookings').insert({
        temple_id: resolvedTempleId,
        register_no: register_no || null,
        date,
        time,
        event: event || null,
        subdivision: subdivision || null,
        name,
        address: address || null,
        village: village || null,
        mobile,
        advance_amount: advance_amount || null,
        total_amount: total_amount || null,
        balance_amount: balance_amount || null,
        remarks: remarks || null,
        status: 'pending',
        submitted_by_mobile: submitted_by_mobile || mobile,
        submitted_at: new Date(),
        approved_by: null,
        approved_at: null,
        rejection_reason: null,
        admin_notes: null,
        created_at: new Date(),
        updated_at: new Date()
      });

      await db('hall_approval_logs').insert({
        booking_id: id,
        action: 'submitted',
        performed_by: null,
        performed_at: new Date(),
        notes: `Submitted from mobile by ${submitted_by_mobile || mobile}`,
        old_status: null,
        new_status: 'pending'
      });

      res.json({ success: true, message: 'Hall booking submitted. Awaiting approval.', data: { id, status: 'pending' } });
    } catch (err) {
      console.error('POST /api/hall-mobile/submit error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // List my submissions
  router.get('/my-requests', async (req, res) => {
    try {
      const { mobile } = req.query;
      if (!mobile) return res.status(400).json({ success: false, error: 'Mobile is required' });

      const rows = await db('marriage_hall_bookings')
        .where('submitted_by_mobile', mobile)
        .orderBy('submitted_at', 'desc')
        .select('*');

      res.json({ success: true, data: rows });
    } catch (err) {
      console.error('GET /api/hall-mobile/my-requests error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Get one request details + logs
  router.get('/request/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { mobile } = req.query;
      if (!mobile) return res.status(400).json({ success: false, error: 'Mobile is required' });

      const request = await db('marriage_hall_bookings')
        .where({ id })
        .andWhere('submitted_by_mobile', mobile)
        .first();
      if (!request) return res.status(404).json({ success: false, error: 'Request not found' });

      const logs = await db('hall_approval_logs')
        .where('booking_id', id)
        .orderBy('performed_at', 'desc');

      res.json({ success: true, data: { ...request, logs } });
    } catch (err) {
      console.error('GET /api/hall-mobile/request/:id error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Cancel if pending
  router.put('/cancel/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { mobile, reason } = req.body;
      if (!mobile) return res.status(400).json({ success: false, error: 'Mobile is required' });

      const existing = await db('marriage_hall_bookings')
        .where({ id })
        .andWhere('submitted_by_mobile', mobile)
        .andWhere('status', 'pending')
        .first();
      if (!existing) return res.status(404).json({ success: false, error: 'Request not found or cannot be cancelled' });

      await db('marriage_hall_bookings')
        .where({ id })
        .update({ status: 'cancelled', updated_at: new Date() });

      await db('hall_approval_logs').insert({
        booking_id: id,
        action: 'cancelled',
        performed_by: null,
        performed_at: new Date(),
        notes: `Cancelled by user: ${reason || 'No reason provided'}`,
        old_status: 'pending',
        new_status: 'cancelled'
      });

      res.json({ success: true, message: 'Request cancelled successfully' });
    } catch (err) {
      console.error('PUT /api/hall-mobile/cancel/:id error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Get latest and next register number for hall bookings
  // Example response: { success: true, data: { year: '2025', last_register_no: '2025-0012', next_register_no: '2025-0013' } }
  router.get('/latest-receipt', async (req, res) => {
    try {
      const templeId = Number(req.query.temple_id || req.query.templeId || 1);
      const now = new Date();
      const year = String(now.getFullYear());

      // Try to find the highest register_no for the current year for this temple
      const last = await db('marriage_hall_bookings')
        .where('temple_id', templeId)
        .whereNotNull('register_no')
        .andWhere('register_no', 'like', `${year}-%`)
        .orderBy('register_no', 'desc')
        .first();

      let seq = 0;
      let lastRegisterNo = null;
      if (last && last.register_no) {
        lastRegisterNo = last.register_no;
        const parts = String(last.register_no).split('-');
        const n = Number(parts[1]);
        if (Number.isFinite(n)) seq = n;
      }

      // Fallback if we couldn't parse seq from last register_no
      if (!Number.isFinite(seq) || seq <= 0) {
        const countRow = await db('marriage_hall_bookings')
          .where('temple_id', templeId)
          .andWhere('date', 'like', `${year}%`)
          .count({ c: '*' })
          .first();
        const c = Number(countRow?.c || countRow?.count || 0);
        seq = c;
      }

      const nextSeq = seq + 1;
      const nextRegisterNo = `${year}-${String(nextSeq).padStart(4, '0')}`;

      return res.json({
        success: true,
        data: {
          year,
          last_register_no: lastRegisterNo,
          next_register_no: nextRegisterNo,
          temple_id: templeId,
        }
      });
    } catch (err) {
      console.error('GET /api/hall-mobile/latest-receipt error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  return router;
};
