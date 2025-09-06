const express = require('express');
const router = express.Router();

module.exports = function(deps = {}) {
  const { db } = deps;

  // GET /api/donations-approval/pending - list pending donation approval requests
  router.get('/pending', async (req, res) => {
    try {
      const { page = 1, pageSize = 10, search = '' } = req.query;
      const limit = parseInt(pageSize);
      const offset = (parseInt(page) - 1) * limit;

      let query = db('donations')
        .where('approval_status', 'pending')
        .select(
          'id',
          'product_name',
          'description',
          'price',
          'quantity',
          'category',
          'donor_name',
          'donor_contact',
          'donation_date',
          'status',
          'approval_status',
          'submitted_by_mobile',
          'submitted_at',
          'notes',
          'created_at'
        )
        .orderBy('submitted_at', 'asc');

      if (search) {
        query = query.where(function() {
          this.where('product_name', 'like', `%${search}%`)
            .orWhere('donor_name', 'like', `%${search}%`)
            .orWhere('donor_contact', 'like', `%${search}%`);
        });
      }

      const requests = await query.limit(limit).offset(offset);
      const totalRow = await db('donations').where('approval_status', 'pending').count('* as count').first();

      res.json({
        success: true,
        data: requests,
        pagination: {
          page: parseInt(page),
          pageSize: limit,
          total: Number(totalRow?.count || 0),
          totalPages: Math.ceil(Number(totalRow?.count || 0) / limit)
        }
      });
    } catch (err) {
      console.error('GET /api/donations-approval/pending error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // GET /api/donations-approval/request/:id - details with logs
  router.get('/request/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const request = await db('donations').where('id', id).first();
      if (!request) {
        return res.status(404).json({ success: false, error: 'Request not found' });
      }

      const logs = await db('donations_approval_logs as l')
        .leftJoin('users as u', 'l.performed_by', 'u.id')
        .where('l.donation_id', id)
        .orderBy('l.performed_at', 'desc')
        .select(
          'l.id',
          'l.donation_id',
          'l.action',
          'l.performed_by',
          'l.performed_at',
          'l.notes',
          'l.old_status',
          'l.new_status',
          db.raw('COALESCE(u.full_name, u.username) as performed_by_name'),
          'u.username as performed_by_username',
          'u.full_name as performed_by_full_name'
        );

      res.json({ success: true, data: { ...request, logs } });
    } catch (err) {
      console.error('GET /api/donations-approval/request/:id error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // PUT /api/donations-approval/approve/:id
  router.put('/approve/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { admin_notes } = req.body;
      const approvedBy = req.user.id;

      const request = await db('donations')
        .where('id', id)
        .where('approval_status', 'pending')
        .first();

      if (!request) {
        return res.status(404).json({ success: false, error: 'Request not found or already processed' });
      }

      await db('donations')
        .where('id', id)
        .update({
          approval_status: 'approved',
          approved_by: approvedBy,
          approved_at: new Date(),
          admin_notes: admin_notes || null,
          updated_at: new Date()
        });

      await db('donations_approval_logs').insert({
        donation_id: id,
        action: 'approved',
        performed_by: approvedBy,
        performed_at: new Date(),
        notes: admin_notes || 'Request approved',
        old_status: 'pending',
        new_status: 'approved'
      });

      res.json({ success: true, message: 'Request approved successfully' });
    } catch (err) {
      console.error('PUT /api/donations-approval/approve/:id error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // PUT /api/donations-approval/reject/:id
  router.put('/reject/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { rejection_reason, admin_notes } = req.body;
      const rejectedBy = req.user.id;

      if (!rejection_reason) {
        return res.status(400).json({ success: false, error: 'Rejection reason is required' });
      }

      const request = await db('donations')
        .where('id', id)
        .where('approval_status', 'pending')
        .first();

      if (!request) {
        return res.status(404).json({ success: false, error: 'Request not found or already processed' });
      }

      await db('donations')
        .where('id', id)
        .update({
          approval_status: 'rejected',
          approved_by: rejectedBy,
          approved_at: new Date(),
          rejection_reason: rejection_reason,
          admin_notes: admin_notes || null,
          updated_at: new Date()
        });

      await db('donations_approval_logs').insert({
        donation_id: id,
        action: 'rejected',
        performed_by: rejectedBy,
        performed_at: new Date(),
        notes: `Rejected: ${rejection_reason}`,
        old_status: 'pending',
        new_status: 'rejected'
      });

      res.json({ success: true, message: 'Request rejected successfully' });
    } catch (err) {
      console.error('PUT /api/donations-approval/reject/:id error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // PUT /api/donations-approval/bulk-action
  router.put('/bulk-action', async (req, res) => {
    try {
      const { action, request_ids, reason, admin_notes } = req.body;
      const performedBy = req.user.id;

      if (!action || !Array.isArray(request_ids) || request_ids.length === 0) {
        return res.status(400).json({ success: false, error: 'Invalid request data' });
      }
      if (action === 'reject' && !reason) {
        return res.status(400).json({ success: false, error: 'Rejection reason is required' });
      }

      const results = { approved: 0, rejected: 0, errors: [] };
      for (const requestId of request_ids) {
        try {
          const request = await db('donations')
            .where('id', requestId)
            .where('approval_status', 'pending')
            .first();
          if (!request) {
            results.errors.push(`Request ${requestId} not found or already processed`);
            continue;
          }

          if (action === 'approve') {
            await db('donations')
              .where('id', requestId)
              .update({
                approval_status: 'approved',
                approved_by: performedBy,
                approved_at: new Date(),
                admin_notes: admin_notes || null,
                updated_at: new Date()
              });
            results.approved++;
          } else if (action === 'reject') {
            await db('donations')
              .where('id', requestId)
              .update({
                approval_status: 'rejected',
                approved_by: performedBy,
                approved_at: new Date(),
                rejection_reason: reason,
                admin_notes: admin_notes || null,
                updated_at: new Date()
              });
            results.rejected++;
          }

          await db('donations_approval_logs').insert({
            donation_id: requestId,
            action: action === 'approve' ? 'approved' : 'rejected',
            performed_by: performedBy,
            performed_at: new Date(),
            notes: action === 'approve' ? (admin_notes || 'Bulk approved') : `Bulk rejected: ${reason}`,
            old_status: 'pending',
            new_status: action === 'approve' ? 'approved' : 'rejected'
          });
        } catch (e) {
          results.errors.push(`Error processing request ${requestId}: ${e.message}`);
        }
      }

      res.json({ success: true, message: `Bulk ${action} completed`, data: results });
    } catch (err) {
      console.error('PUT /api/donations-approval/bulk-action error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // GET /api/donations-approval/stats
  router.get('/stats', async (req, res) => {
    try {
      const statsRows = await db('donations')
        .select('approval_status as status')
        .count('* as count')
        .groupBy('approval_status');

      const statusCounts = { pending: 0, approved: 0, rejected: 0, cancelled: 0 };
      for (const r of statsRows) {
        statusCounts[r.status] = Number(r.count || 0);
      }

      const recentActivity = await db('donations_approval_logs')
        .where('performed_at', '>=', db.raw("datetime('now', '-7 days')"))
        .select('action')
        .count('* as count')
        .groupBy('action');

      res.json({ success: true, data: { status_counts: statusCounts, recent_activity: recentActivity, total_requests: Object.values(statusCounts).reduce((a,b)=>a+Number(b||0),0) } });
    } catch (err) {
      console.error('GET /api/donations-approval/stats error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  return router;
};
