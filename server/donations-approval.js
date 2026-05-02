const express = require('express');
const router = express.Router();
const { sendNotification } = require('./config/firebase-notification');

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

// Send FCM notification to ALL temple users (approval)
      try {
        const templeUsers = await db('user_registrations')
          .where('temple_id', request.temple_id)
          .whereNotNull('fcm_token')
          .select('fcm_token');
        
        const tokens = templeUsers.map(u => u.fcm_token).filter(Boolean);
        
        if (tokens.length > 0) {
          const date = request.donation_date || request.entry_date || 'N/A';
          let message = '';
          if (request.donation_type === 'product') {
            message = `${request.donor_name} gave ${request.quantity || ''} ${request.unit || ''} ${request.product_name || 'product'} for Donation on ${date}`;
          } else if (request.donation_type === 'money') {
            message = `${request.donor_name} donated ₹${request.price || request.amount} for Donation on ${date}`;
          } else {
            message = `${request.donor_name} gave donation on ${date}`;
          }
          
          await sendNotification(
            tokens,
            'Donation Approved!',
            message,
            {
              type: 'donation_approved',
              donationId: String(id),
              status: 'approved',
              templeId: String(request.temple_id)
            }
          );
          console.log(`✓ Sent approval notification to ${tokens.length} users in temple ${request.temple_id}`);
        }
      } catch (notifyErr) {
        console.warn('Failed to send approval notification:', notifyErr.message);
      }
      
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

      // Send FCM notification to the submitter (rejection)
      try {
        const mobileNumber = request.submitted_by_mobile || request.donor_contact;
        if (mobileNumber) {
          const userRecord = await db('user_registrations')
            .where('mobile_number', mobileNumber)
            .whereNotNull('fcm_token')
            .first();
          
          if (userRecord && userRecord.fcm_token) {
            await sendNotification(
              userRecord.fcm_token,
              'Donation Rejected',
              `Your donation request (${request.receipt_number || 'N/A'}) was rejected. Reason: ${rejection_reason}`,
              {
                type: 'donation_rejected',
                donationId: String(id),
                status: 'rejected',
                reason: rejection_reason,
                templeId: String(request.temple_id)
              }
            );
            console.log(`✓ Sent rejection notification to ${mobileNumber}`);
          }
        }
      } catch (notifyErr) {
        console.warn('Failed to send FCM notification:', notifyErr.message);
      }
      
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
        .where('performed_at', '>=', db.raw("DATE_SUB(NOW(), INTERVAL 7 DAY)"))
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
