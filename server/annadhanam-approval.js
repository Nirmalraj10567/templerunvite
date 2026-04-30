const express = require('express');
const router = express.Router();
const { sendNotification } = require('./config/firebase-notification');

module.exports = function(deps = {}) {
  const { db } = deps;

  // Get all pending annadhanam requests for approval
  router.get('/pending', async (req, res) => {
    try {
      const { page = 1, pageSize = 10, search = '' } = req.query;
      const offset = (page - 1) * pageSize;
      const templeId = req.user?.templeId || req.user?.temple_id || 1; // Get temple ID from user context

      let query = db('annadhanam')
        .where('status', 'pending')
        .where('temple_id', templeId) // Filter by temple ID
        .select(
          'id',
          'receipt_number',
          'name',
          'mobile_number',
          'time',
          'from_date',
          'to_date',
          'remarks',
          'submitted_by_mobile',
          'submitted_at',
          'created_at',
          'status'
        );

      if (search) {
        query = query.where(function() {
          this.where('name', 'like', `%${search}%`)
              .orWhere('mobile_number', 'like', `%${search}%`)
              .orWhere('receipt_number', 'like', `%${search}%`);
        });
      }

      const requests = await query
        .orderBy('submitted_at', 'asc')
        .limit(pageSize)
        .offset(offset);

      const total = await db('annadhanam')
        .where('status', 'pending')
        .where('temple_id', templeId) // Filter by temple ID
        .count('* as count')
        .first();

      res.json({ 
        success: true, 
        data: requests,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total: total.count,
          totalPages: Math.ceil(total.count / pageSize)
        }
      });

    } catch (err) {
      console.error('GET /api/annadhanam-approval/pending error:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  });

  // Get single annadhanam request for approval
  router.get('/request/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const templeId = req.user?.templeId || req.user?.temple_id || 1; // Get temple ID from user context

      const request = await db('annadhanam')
        .where('id', id)
        .where('temple_id', templeId) // Filter by temple ID
        .first();

      if (!request) {
        return res.status(404).json({ 
          success: false, 
          error: 'Request not found' 
        });
      }

      // Get approval logs
      const logs = await db('annadhanam_approval_logs as l')
        .leftJoin('users as u', 'l.performed_by', 'u.id')
        .where('l.annadhanam_id', id)
        .orderBy('l.performed_at', 'desc')
        .select(
          'l.id',
          'l.annadhanam_id',
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

      res.json({ 
        success: true, 
        data: { ...request, logs } 
      });

    } catch (err) {
      console.error('GET /api/annadhanam-approval/request/:id error:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  });

  // Approve annadhanam request
  router.put('/approve/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { admin_notes } = req.body;
      const approvedBy = req.user.id;
      const templeId = req.user?.templeId || req.user?.temple_id || 1; // Get temple ID from user context

      const request = await db('annadhanam')
        .where('id', id)
        .where('status', 'pending')
        .where('temple_id', templeId) // Filter by temple ID
        .first();

      if (!request) {
        return res.status(404).json({ 
          success: false, 
          error: 'Request not found or already processed' 
        });
      }

      // Update request status to approved
      await db('annadhanam')
        .where('id', id)
        .update({
          status: 'approved',
          approved_by: approvedBy,
          approved_at: new Date(),
          admin_notes: admin_notes || null,
          created_by: approvedBy,
          updated_at: new Date()
        });

      // Send FCM notification to the submitter
      try {
        const mobileNumber = request.submitted_by_mobile || request.mobile_number;
        if (mobileNumber) {
          const userRecord = await db('user_registrations')
            .where('mobile_number', mobileNumber)
            .whereNotNull('fcm_token')
            .first();
          
          if (userRecord && userRecord.fcm_token) {
            await sendNotification(
              userRecord.fcm_token,
              'Annadhanam Approved!',
              `Your Annadhanam request (${request.receipt_number || 'N/A'}) has been approved.`,
              {
                type: 'annadhanam_approved',
                annadhanamId: String(id),
                status: 'approved',
                templeId: String(templeId)
              }
            );
            console.log(`✓ Sent approval notification to ${mobileNumber}`);
          }
        }
      } catch (notifyErr) {
        console.warn('Failed to send FCM notification:', notifyErr.message);
      }

      // Send FCM notification to ALL temple users
      try {
        const templeUsers = await db('user_registrations')
          .where('temple_id', templeId)
          .whereNotNull('fcm_token')
          .select('fcm_token');
        
        const tokens = templeUsers.map(u => u.fcm_token).filter(Boolean);
        
        if (tokens.length > 0) {
          await sendNotification(
            tokens,
            'Annadhanam Approved',
            `An Annadhanam request (${request.receipt_number || 'N/A'}) has been approved.`,
            {
              type: 'annadhanam_approved_all',
              annadhanamId: String(id),
              status: 'approved',
              templeId: String(templeId)
            }
          );
          console.log(`✓ Sent approval notification to ${tokens.length} users in temple ${templeId}`);
        }
      } catch (notifyErr) {
        console.warn('Failed to send approval notification to all:', notifyErr.message);
      }

      // Log the approval
      await db('annadhanam_approval_logs').insert({
        annadhanam_id: id,
        action: 'approved',
        performed_by: approvedBy,
        performed_at: new Date(),
        notes: admin_notes || 'Request approved',
        old_status: 'pending',
        new_status: 'approved'
      });

      res.json({ 
        success: true, 
        message: 'Request approved successfully' 
      });

    } catch (err) {
      console.error('PUT /api/annadhanam-approval/approve/:id error:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  });

  // Reject annadhanam request
  router.put('/reject/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { rejection_reason, admin_notes } = req.body;
      const rejectedBy = req.user.id;
      const templeId = req.user?.templeId || req.user?.temple_id || 1; // Get temple ID from user context

      if (!rejection_reason) {
        return res.status(400).json({ 
          success: false, 
          error: 'Rejection reason is required' 
        });
      }

      const request = await db('annadhanam')
        .where('id', id)
        .where('status', 'pending')
        .where('temple_id', templeId) // Filter by temple ID
        .first();

      if (!request) {
        return res.status(404).json({ 
          success: false, 
          error: 'Request not found or already processed' 
        });
      }

      // Update request status to rejected
      await db('annadhanam')
        .where('id', id)
        .update({
          status: 'rejected',
          approved_by: rejectedBy,
          approved_at: new Date(),
          rejection_reason: rejection_reason,
          admin_notes: admin_notes || null,
          updated_at: new Date()
        });

      // Send FCM notification to the submitter (rejection)
      try {
        const mobileNumber = request.submitted_by_mobile || request.mobile_number;
        if (mobileNumber) {
          const userRecord = await db('user_registrations')
            .where('mobile_number', mobileNumber)
            .whereNotNull('fcm_token')
            .first();
          
          if (userRecord && userRecord.fcm_token) {
            await sendNotification(
              userRecord.fcm_token,
              'Annadhanam Rejected',
              `Your Annadhanam request (${request.receipt_number || 'N/A'}) was rejected. Reason: ${rejection_reason}`,
              {
                type: 'annadhanam_rejected',
                annadhanamId: String(id),
                status: 'rejected',
                reason: rejection_reason,
                templeId: String(templeId)
              }
            );
            console.log(`✓ Sent rejection notification to ${mobileNumber}`);
          }
        }
      } catch (notifyErr) {
        console.warn('Failed to send FCM notification:', notifyErr.message);
      }

      // Send FCM notification to ALL temple users (rejection)
      try {
        const templeUsers = await db('user_registrations')
          .where('temple_id', templeId)
          .whereNotNull('fcm_token')
          .select('fcm_token');
        
        const tokens = templeUsers.map(u => u.fcm_token).filter(Boolean);
        
        if (tokens.length > 0) {
          await sendNotification(
            tokens,
            'Annadhanam Rejected',
            `An Annadhanam request (${request.receipt_number || 'N/A'}) was rejected.`,
            {
              type: 'annadhanam_rejected_all',
              annadhanamId: String(id),
              status: 'rejected',
              templeId: String(templeId)
            }
          );
          console.log(`✓ Sent rejection notification to ${tokens.length} users in temple ${templeId}`);
        }
      } catch (notifyErr) {
        console.warn('Failed to send rejection notification to all:', notifyErr.message);
      }

      // Log the rejection
      await db('annadhanam_approval_logs').insert({
        annadhanam_id: id,
        action: 'rejected',
        performed_by: rejectedBy,
        performed_at: new Date(),
        notes: `Rejected: ${rejection_reason}`,
        old_status: 'pending',
        new_status: 'rejected'
      });

      res.json({ 
        success: true, 
        message: 'Request rejected successfully' 
      });

    } catch (err) {
      console.error('PUT /api/annadhanam-approval/reject/:id error:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  });

  // Get approval statistics
  router.get('/stats', async (req, res) => {
    try {
      const stats = await db('annadhanam')
        .select('status')
        .count('* as count')
        .groupBy('status');

      const statusCounts = {
        pending: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0
      };

      stats.forEach(stat => {
        statusCounts[stat.status] = stat.count;
      });

      // Get recent activity (last 7 days)
      const recentActivity = await db('annadhanam_approval_logs')
        .where('performed_at', '>=', db.raw("DATE_SUB(NOW(), INTERVAL 7 DAY)"))
        .select('action')
        .count('* as count')
        .groupBy('action');

      res.json({ 
        success: true, 
        data: {
          status_counts: statusCounts,
          recent_activity: recentActivity,
          total_requests: Object.values(statusCounts).reduce((a, b) => a + (Number(b)||0), 0)
        }
      });

    } catch (err) {
      console.error('GET /api/annadhanam-approval/stats error:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  });

  // Bulk approve/reject requests
  router.put('/bulk-action', async (req, res) => {
    try {
      const { action, request_ids, reason, admin_notes } = req.body;
      const performedBy = req.user.id;
      const templeId = req.user?.templeId || req.user?.temple_id || 1; // Get temple ID from user context

      if (!action || !request_ids || !Array.isArray(request_ids) || request_ids.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid request data' 
        });
      }

      if (action === 'reject' && !reason) {
        return res.status(400).json({ 
          success: false, 
          error: 'Rejection reason is required' 
        });
      }

      const results = {
        approved: 0,
        rejected: 0,
        errors: []
      };

      for (const requestId of request_ids) {
        try {
          const request = await db('annadhanam')
            .where('id', requestId)
            .where('status', 'pending')
            .where('temple_id', templeId) // Filter by temple ID
            .first();

          if (!request) {
            results.errors.push(`Request ${requestId} not found or already processed`);
            continue;
          }

          if (action === 'approve') {
            await db('annadhanam')
              .where('id', requestId)
              .update({
                status: 'approved',
                approved_by: performedBy,
                approved_at: new Date(),
                admin_notes: admin_notes || null,
                created_by: performedBy,
                updated_at: new Date()
              });

            results.approved++;

          } else if (action === 'reject') {
            await db('annadhanam')
              .where('id', requestId)
              .update({
                status: 'rejected',
                approved_by: performedBy,
                approved_at: new Date(),
                rejection_reason: reason,
                admin_notes: admin_notes || null,
                updated_at: new Date()
              });

            results.rejected++;
          }

          // Log the action
          await db('annadhanam_approval_logs').insert({
            annadhanam_id: requestId,
            action: action === 'approve' ? 'approved' : 'rejected',
            performed_by: performedBy,
            performed_at: new Date(),
            notes: action === 'approve' ? (admin_notes || 'Bulk approved') : `Bulk rejected: ${reason}`,
            old_status: 'pending',
            new_status: action === 'approve' ? 'approved' : 'rejected'
          });

        } catch (error) {
          results.errors.push(`Error processing request ${requestId}: ${error.message}`);
        }
      }

      res.json({ 
        success: true, 
        message: `Bulk ${action} completed`,
        data: results
      });

    } catch (err) {
      console.error('PUT /api/annadhanam-approval/bulk-action error:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  });

  // Get approval statistics
  router.get('/stats', async (req, res) => {
    try {
      const templeId = req.user?.templeId || req.user?.temple_id || 1; // Get temple ID from user context

      // Get status counts
      const statusCounts = await db('annadhanam')
        .where('temple_id', templeId)
        .select('status')
        .count('* as count')
        .groupBy('status');

      // Convert to object format
      const counts = {
        pending: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0
      };

      statusCounts.forEach(row => {
        if (row.status in counts) {
          counts[row.status] = parseInt(row.count);
        }
      });

      // Get total requests
      const totalResult = await db('annadhanam')
        .where('temple_id', templeId)
        .count('* as total')
        .first();

      const totalRequests = parseInt(totalResult.total);

      // Get recent activity (last 7 days)
      const recentActivity = await db('annadhanam_approval_logs as l')
        .leftJoin('annadhanam as a', 'l.annadhanam_id', 'a.id')
        .where('a.temple_id', templeId)
        .where('l.performed_at', '>=', db.raw('DATE_SUB(NOW(), INTERVAL 7 DAY)'))
        .select('l.action')
        .count('* as count')
        .groupBy('l.action');

      res.json({
        success: true,
        data: {
          status_counts: counts,
          total_requests: totalRequests,
          recent_activity: recentActivity.map(row => ({
            action: row.action,
            count: parseInt(row.count)
          }))
        }
      });

    } catch (err) {
      console.error('GET /api/annadhanam-approval/stats error:', err);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Update stats endpoint (for manual stats editing)
  router.post('/update-stats', async (req, res) => {
    try {
      const { pending, approved, rejected, log_action, log_notes } = req.body;
      const performedBy = req.user.id;

      // Log the stats update
      await db('annadhanam_approval_logs').insert({
        annadhanam_id: null, // Stats update doesn't relate to specific annadhanam
        action: log_action || 'stats_update',
        performed_by: performedBy,
        performed_at: new Date(),
        notes: log_notes || 'Stats updated manually',
        old_status: null,
        new_status: null
      });

      res.json({
        success: true,
        message: 'Stats updated successfully'
      });

    } catch (err) {
      console.error('POST /api/annadhanam-approval/update-stats error:', err);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  return router;
};
