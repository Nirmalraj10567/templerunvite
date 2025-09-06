const express = require('express');
const router = express.Router();

module.exports = function(deps = {}) {
  const { db } = deps;

  // Submit annadhanam request from mobile
  router.post('/submit', async (req, res) => {
    try {
      const {
        receipt_number,
        name,
        mobile_number,
        food,
        peoples,
        time,
        from_date,
        to_date,
        remarks,
        submitted_by_mobile
      } = req.body || {};

      // Validate required fields
      if (!receipt_number || !name || !mobile_number || !food || !peoples || !time || !from_date || !to_date) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      if (!/^\d{10}$/.test(mobile_number)) {
        return res.status(400).json({ success: false, error: 'Mobile number must be 10 digits' });
      }

      if (parseInt(peoples, 10) < 1) {
        return res.status(400).json({ success: false, error: 'Number of people must be at least 1' });
      }

      if (new Date(from_date) > new Date(to_date)) {
        return res.status(400).json({ success: false, error: 'From date cannot be later than to date' });
      }

      // Check for duplicate receipt number
      const existing = await db('annadhanam')
        .where('receipt_number', receipt_number)
        .first();
      if (existing) {
        return res.status(400).json({ success: false, error: 'Receipt number already exists' });
      }

      const now = new Date();
      const [id] = await db('annadhanam').insert({
        temple_id: 1,
        receipt_number,
        name,
        mobile_number,
        food,
        peoples: parseInt(peoples, 10),
        time,
        from_date,
        to_date,
        remarks,
        status: 'pending',
        submitted_by_mobile: submitted_by_mobile || mobile_number,
        submitted_at: now,
        created_by: null,
        created_at: now,
        updated_at: now
      });

      // Log submission
      try {
        await db('annadhanam_approval_logs').insert({
          annadhanam_id: id,
          action: 'submitted',
          performed_by: null,
          performed_at: now,
          notes: `Submitted from mobile by ${submitted_by_mobile || mobile_number}`,
          old_status: null,
          new_status: 'pending'
        });
      } catch (e) {
        // logs table may not exist yet; ignore
      }

      res.json({ success: true, message: 'Annadhanam request submitted successfully. Awaiting approval.', data: { id, status: 'pending' } });
    } catch (err) {
      console.error('POST /api/annadhanam-mobile/submit error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Get user's submitted annadhanam requests
  router.get('/my-requests', async (req, res) => {
    try {
      const { mobile_number } = req.query;
      if (!mobile_number) {
        return res.status(400).json({ success: false, error: 'Mobile number is required' });
      }

      const rows = await db('annadhanam')
        .where('submitted_by_mobile', mobile_number)
        .select(
          'id',
          'receipt_number',
          'name',
          'mobile_number',
          'food',
          'peoples',
          'time',
          'from_date',
          'to_date',
          'remarks',
          'status',
          'submitted_by_mobile',
          'submitted_at',
          'approved_at',
          'rejection_reason',
          'admin_notes'
        )
        .orderBy('submitted_at', 'desc');

      res.json({ success: true, data: rows });
    } catch (err) {
      console.error('GET /api/annadhanam-mobile/my-requests error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Get single request details
  router.get('/request/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { mobile_number } = req.query;
      if (!mobile_number) {
        return res.status(400).json({ success: false, error: 'Mobile number is required' });
      }

      const request = await db('annadhanam')
        .where('id', id)
        .where('submitted_by_mobile', mobile_number)
        .first();

      if (!request) {
        return res.status(404).json({ success: false, error: 'Request not found' });
      }

      let logs = [];
      try {
        logs = await db('annadhanam_approval_logs')
          .where('annadhanam_id', id)
          .orderBy('performed_at', 'desc');
      } catch {}

      res.json({ success: true, data: { ...request, logs } });
    } catch (err) {
      console.error('GET /api/annadhanam-mobile/request/:id error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Cancel request (only if pending)
  router.put('/cancel/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { mobile_number, reason } = req.body || {};
      if (!mobile_number) {
        return res.status(400).json({ success: false, error: 'Mobile number is required' });
      }

      const reqRow = await db('annadhanam')
        .where('id', id)
        .where('submitted_by_mobile', mobile_number)
        .where('status', 'pending')
        .first();
      
      if (!reqRow) {
        return res.status(404).json({ success: false, error: 'Request not found or cannot be cancelled' });
      }

      const now = new Date();
      await db('annadhanam')
        .where('id', id)
        .update({ status: 'cancelled', updated_at: now });

      try {
        await db('annadhanam_approval_logs').insert({
          annadhanam_id: id,
          action: 'cancelled',
          performed_by: null,
          performed_at: now,
          notes: `Cancelled by user: ${reason || 'No reason provided'}`,
          old_status: 'pending',
          new_status: 'cancelled'
        });
      } catch {}

      res.json({ success: true, message: 'Request cancelled successfully' });
    } catch (err) {
      console.error('PUT /api/annadhanam-mobile/cancel/:id error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Fetch annadhanam entries by mobile number (not limited to submitter)
  // Example: GET /api/annadhanam-mobile/by-mobile?mobile_number=9876543210&status=approved&from_date=2025-09-01&to_date=2025-09-30
  router.get('/by-mobile', async (req, res) => {
    try {
      const { mobile_number, status, from_date, to_date } = req.query;
      if (!mobile_number) {
        return res.status(400).json({ success: false, error: 'Mobile number is required' });
      }

      let query = db('annadhanam')
        .where('mobile_number', mobile_number)
        .orderBy('from_date', 'desc')
        .select(
          'id',
          'receipt_number',
          'name',
          'mobile_number',
          'food',
          'peoples',
          'time',
          'from_date',
          'to_date',
          'remarks',
          'status',
          'submitted_by_mobile',
          'submitted_at',
          'approved_at',
          'rejection_reason',
          'admin_notes',
          'created_at'
        );

      if (status && status !== 'all') {
        query = query.andWhere('status', status);
      }
      if (from_date) {
        query = query.andWhere('from_date', '>=', from_date);
      }
      if (to_date) {
        query = query.andWhere('to_date', '<=', to_date);
      }

      const results = await query;
      res.json({ success: true, data: results });
    } catch (err) {
      console.error('GET /api/annadhanam-mobile/by-mobile error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Fetch the latest annadhanam entry for a mobile number
  // Example: GET /api/annadhanam-mobile/latest?mobile_number=9876543210
  router.get('/latest', async (req, res) => {
    try {
      const { mobile_number } = req.query;
      if (!mobile_number) {
        return res.status(400).json({ success: false, error: 'Mobile number is required' });
      }

      const latest = await db('annadhanam')
        .where('mobile_number', mobile_number)
        .orderBy('created_at', 'desc')
        .first(
          'id',
          'receipt_number',
          'name',
          'mobile_number',
          'food',
          'peoples',
          'time',
          'from_date',
          'to_date',
          'remarks',
          'status',
          'submitted_by_mobile',
          'submitted_at',
          'approved_at',
          'rejection_reason',
          'admin_notes',
          'created_at'
        );

      if (!latest) {
        return res.json({ success: true, data: null });
      }
      
      res.json({ success: true, data: latest });
    } catch (err) {
      console.error('GET /api/annadhanam-mobile/latest error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  return router;
};
