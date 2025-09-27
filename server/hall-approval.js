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
      const logs = await db('hall_approval_logs as l')
        .leftJoin('users as u', 'l.performed_by', 'u.id')
        .where('l.booking_id', id)
        .orderBy('l.performed_at', 'desc')
        .select(
          'l.id',
          'l.booking_id',
          'l.action',
          'l.performed_by',
          'l.performed_at',
          'l.notes',
          'l.old_status',
          'l.new_status',
          db.raw("COALESCE(u.full_name, u.username, u.mobile) as performed_by_name")
        );
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

  // Get logs for a specific hall booking
  router.get('/:id/logs', authorizePermission('hall_approval', 'view'), async (req, res) => {
    try {
      const { id } = req.params;
      const logs = await db('hall_approval_logs as l')
        .leftJoin('users as u', 'l.performed_by', 'u.id')
        .where('l.booking_id', id)
        .orderBy('l.performed_at', 'desc')
        .select(
          'l.id',
          'l.action',
          'l.performed_at as created_at',
          'l.performed_by as created_by',
          'l.notes',
          'l.old_status',
          'l.new_status',
          db.raw("COALESCE(u.full_name, u.username, u.mobile) as performed_by_name")
        );
      
      // Format the logs to match the expected structure
      const formattedLogs = logs.map(log => ({
        id: log.id,
        action: log.action,
        created_at: log.created_at,
        created_by: log.created_by,
        details: {
          notes: log.notes,
          old_status: log.old_status,
          new_status: log.new_status,
          performed_by_name: log.performed_by_name,
          full_payload: {
            id: log.id,
            action: log.action,
            performed_at: log.created_at,
            performed_by: log.created_by,
            created_by: log.created_by,
            notes: log.notes,
            old_status: log.old_status,
            new_status: log.new_status,
            performed_by_name: log.performed_by_name
          }
        }
      }));

      res.json({ success: true, data: formattedLogs });
    } catch (err) {
      console.error('GET /api/hall-approval/:id/logs error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Get all hall logs with pagination
  router.get('/logs', authorizePermission('hall_approval', 'view'), async (req, res) => {
    try {
      const { page = 1, pageSize = 50 } = req.query;
      const offset = (page - 1) * pageSize;

      // Get total count
      const totalResult = await db('hall_approval_logs as l')
        .count('* as total')
        .first();
      const total = parseInt(totalResult.total);

      // Get logs with hall booking details
      const logs = await db('hall_approval_logs as l')
        .leftJoin('marriage_hall_bookings as h', 'l.booking_id', 'h.id')
        .leftJoin('users as u', 'l.performed_by', 'u.id')
        .orderBy('l.performed_at', 'desc')
        .limit(pageSize)
        .offset(offset)
        .select(
          'l.id',
          'l.booking_id as hall_id',
          'l.action',
          'l.performed_at as created_at',
          'l.performed_by as created_by',
          'l.notes',
          'l.old_status',
          'l.new_status',
          'h.name as hall_name',
          'h.register_no as register_number',
          db.raw("COALESCE(u.full_name, u.username, u.mobile) as performed_by_name")
        );

      // Format the logs to match the expected structure
      const formattedLogs = logs.map(log => ({
        id: log.id,
        hall_id: log.hall_id,
        action: log.action,
        created_at: log.created_at,
        created_by: log.created_by,
        hall_name: log.hall_name,
        register_number: log.register_number,
        details: {
          notes: log.notes,
          old_status: log.old_status,
          new_status: log.new_status,
          performed_by_name: log.performed_by_name,
          full_payload: {
            id: log.id,
            hall_id: log.hall_id,
            action: log.action,
            performed_at: log.created_at,
            performed_by: log.created_by,
            created_by: log.created_by,
            notes: log.notes,
            old_status: log.old_status,
            new_status: log.new_status,
            hall_name: log.hall_name,
            register_number: log.register_number,
            performed_by_name: log.performed_by_name
          }
        }
      }));

      res.json({ 
        success: true, 
        data: formattedLogs,
        total: total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      });
    } catch (err) {
      console.error('GET /api/hall-approval/logs error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  return router;
};
