const express = require('express');
const router = express.Router();

module.exports = function({ db, authenticateToken, authorizePermission }) {
  // All routes here require JWT and specific permission
  router.use(authenticateToken);

  // List requests
  router.get('/requests', authorizePermission('hall_approval', 'view'), async (req, res) => {
    try {
      const { status, mobile, date, time } = req.query;
      let q = db('marriage_hall_bookings').select('*').orderBy('submitted_at', 'desc');
      if (status) q = q.where('status', status);
      if (mobile) q = q.where('mobile', 'like', `%${mobile}%`);
      if (date) q = q.where('date', date);
      if (time) q = q.where('time', time);
      const rows = await q;
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error('GET /api/hall-approval/requests error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Get single request
  router.get('/request/:id', authorizePermission('hall_approval', 'view'), async (req, res) => {
    try {
      const { id } = req.params;
      const row = await db('marriage_hall_bookings').where({ id }).first();
      if (!row) return res.status(404).json({ success: false, error: 'Not found' });
      const logs = await db('hall_approval_logs').where('booking_id', id).orderBy('performed_at', 'desc');
      res.json({ success: true, data: { ...row, logs } });
    } catch (err) {
      console.error('GET /api/hall-approval/request/:id error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Approve a request
  router.put('/approve/:id', authorizePermission('hall_approval', 'edit'), async (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const existing = await db('marriage_hall_bookings').where({ id }).first();
      if (!existing) return res.status(404).json({ success: false, error: 'Request not found' });
      if (existing.status !== 'pending') return res.status(400).json({ success: false, error: 'Only pending requests can be approved' });

      // Ensure not double-booked at approval time
      const conflict = await db('marriage_hall_bookings')
        .where('id', '!=', id)
        .andWhere({ date: existing.date, time: existing.time })
        .andWhere('status', 'approved')
        .first();
      if (conflict) return res.status(400).json({ success: false, error: 'Slot already booked for this date/time' });

      await db('marriage_hall_bookings').where({ id }).update({
        status: 'approved',
        approved_by: req.user.id,
        approved_at: new Date(),
        admin_notes: notes || null,
        updated_at: new Date()
      });

      await db('hall_approval_logs').insert({
        booking_id: id,
        action: 'approved',
        performed_by: req.user.id,
        performed_at: new Date(),
        notes: notes || null,
        old_status: 'pending',
        new_status: 'approved'
      });

      res.json({ success: true, message: 'Approved successfully' });
    } catch (err) {
      console.error('PUT /api/hall-approval/approve/:id error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Reject a request
  router.put('/reject/:id', authorizePermission('hall_approval', 'edit'), async (req, res) => {
    try {
      const { id } = req.params;
      const { reason, notes } = req.body;
      const existing = await db('marriage_hall_bookings').where({ id }).first();
      if (!existing) return res.status(404).json({ success: false, error: 'Request not found' });
      if (existing.status !== 'pending') return res.status(400).json({ success: false, error: 'Only pending requests can be rejected' });

      await db('marriage_hall_bookings').where({ id }).update({
        status: 'rejected',
        approved_by: req.user.id,
        approved_at: new Date(),
        rejection_reason: reason || null,
        admin_notes: notes || null,
        updated_at: new Date()
      });

      await db('hall_approval_logs').insert({
        booking_id: id,
        action: 'rejected',
        performed_by: req.user.id,
        performed_at: new Date(),
        notes: notes || null,
        old_status: 'pending',
        new_status: 'rejected'
      });

      res.json({ success: true, message: 'Rejected successfully' });
    } catch (err) {
      console.error('PUT /api/hall-approval/reject/:id error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  return router;
};
