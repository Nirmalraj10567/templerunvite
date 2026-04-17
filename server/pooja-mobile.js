const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

module.exports = function(deps = {}) {
  const { db, authenticateToken } = deps;
  const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';

  // Get next receipt number (auth-based)
  if (authenticateToken) {
    router.get('/next-receipt-no', authenticateToken, async (req, res) => {
      try {
        const templeId = req.user?.templeId;
        const year = new Date().getFullYear();
        
        // First try to get the latest with year prefix for this temple (exclude cancelled/rejected)
        let latest = await db('pooja')
          .where('temple_id', templeId)
          .whereNotNull('receipt_number')
          .andWhere('receipt_number', '!=', '')
          .andWhere('receipt_number', 'like', `${year}-%`)
          .whereNotIn('status', ['cancelled', 'rejected'])
          .select('receipt_number')
          .orderBy('receipt_number', 'desc')
          .first();

        // If no result for this temple, check all temples (exclude cancelled/rejected)
        if (!latest) {
          latest = await db('pooja')
            .whereNotNull('receipt_number')
            .andWhere('receipt_number', '!=', '')
            .andWhere('receipt_number', 'like', `${year}-%`)
            .whereNotIn('status', ['cancelled', 'rejected'])
            .select('receipt_number')
            .orderBy('receipt_number', 'desc')
            .first();
        }

        let nextNumber = 1;
        if (latest?.receipt_number) {
          const parts = latest.receipt_number.split('-');
          if (parts.length >= 2) {
            const num = parseInt(parts[1], 10);
            if (!isNaN(num)) nextNumber = num + 1;
          }
        }

        const nextReceiptNo = `${year}-${String(nextNumber).padStart(4, '0')}`;
        res.json({ success: true, next_receipt_no: nextReceiptNo });
      } catch (err) {
        console.error('GET /pooja-mobile/next-receipt-no error:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    });
  }

  // Require mobile token like 'Bearer mobile_<userId>_<timestamp>'
  const verifyMobileToken = (req, res, next) => {
    try {
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.split(' ')[1] || '';
      if (!token) {
        return res.status(401).json({ success: false, error: 'Missing Authorization token' });
      }

      // Support legacy/custom mobile_ token
      if (token.startsWith('mobile_')) {
        const parts = token.split('_');
        const userId = parseInt(parts[1], 10);
        if (!Number.isFinite(userId)) {
          return res.status(401).json({ success: false, error: 'Invalid mobile token format' });
        }
        req.userId = userId;
        return next();
      }

      // Otherwise treat as JWT
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded || !Number.isFinite(Number(decoded.id))) {
          return res.status(401).json({ success: false, error: 'Invalid JWT token' });
        }
        req.userId = Number(decoded.id);
        if (decoded.templeId && Number.isFinite(Number(decoded.templeId))) {
          req.templeId = Number(decoded.templeId);
        }
        return next();
      } catch (err) {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
      }
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
  };

  // Attach user's mobile_number from DB into req.userMobile for convenience
  const attachUserMobile = async (req, res, next) => {
    try {
      const user = await db('user_registrations').where('id', req.userId).first();
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      req.userMobile = user.mobile_number;
      next();
    } catch (e) {
      console.error('attachUserMobile error:', e);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  };

  // Submit pooja request from mobile
  router.post('/submit', verifyMobileToken, attachUserMobile, async (req, res) => {
    try {
      const {
        receipt_number,
        name,
        mobile_number,
        time,
        from_date,
        to_date,
        remarks,
        submitted_by_mobile
      } = req.body;

      // Validate required fields
      if (!receipt_number || !name || !mobile_number || !time || !from_date || !to_date) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields' 
        });
      }

      // Check for duplicate receipt number
      const existingReceipt = await db('pooja')
        .where('receipt_number', receipt_number)
        .first();
      
      if (existingReceipt) {
        return res.status(400).json({ 
          success: false, 
          error: 'Receipt number already exists' 
        });
      }

      // Resolve a valid temple id
      let templeId = Number(req.body?.temple_id) || null;
      try {
        if (templeId) {
          const t = await db('temples').where({ id: templeId }).first();
          if (!t) templeId = null;
        }
        if (!templeId) {
          // fallback: pick the first available temple id, else 1
          let row = null;
          try { row = await db('temples').min({ id: 'id' }).first(); } catch {}
          templeId = Number(row?.id) || 1;
        }
      } catch (e) {
        // If temples table not accessible, fallback to 1
        templeId = 1;
      }

      // Check for double booking
      const conflictingBooking = await db('pooja')
        .where('temple_id', templeId)
        .where('status', 'approved')
        .where(function() {
          this.whereBetween('from_date', [from_date, to_date])
              .orWhereBetween('to_date', [from_date, to_date])
              .orWhere(function() {
                this.where('from_date', '<=', from_date)
                    .andWhere('to_date', '>=', to_date);
              });
        })
        .where('time', time)
        .first();

      if (conflictingBooking) {
        return res.status(400).json({ 
          success: false, 
          error: 'Time slot already booked. Please choose a different time or date.' 
        });
      }

      // Insert pooja request
      const [poojaId] = await db('pooja').insert({
        temple_id: templeId,
        receipt_number,
        name,
        mobile_number: req.userMobile,
        time,
        from_date,
        to_date,
        remarks,
        status: 'pending',
        submitted_by_mobile: req.userMobile,
        submitted_at: new Date(),
        created_by: null, // Will be set when approved
        created_at: new Date(),
        updated_at: new Date()
      });

      // Log the submission
      await db('pooja_approval_logs').insert({
        pooja_id: poojaId,
        action: 'submitted',
        performed_by: null,
        performed_at: new Date(),
        notes: `Submitted from mobile by ${req.userMobile}`,
        old_status: null,
        new_status: 'pending'
      });

      res.json({ 
        success: true, 
        message: 'Pooja request submitted successfully. Awaiting approval.',
        data: { id: poojaId, status: 'pending' }
      });

    } catch (err) {
      console.error('POST /api/pooja-mobile/submit error:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  });

  // Get user's submitted pooja requests
  router.get('/my-requests', verifyMobileToken, attachUserMobile, async (req, res) => {
    try {
      // Use the mobile derived from token

      const requests = await db('pooja')
        .where('submitted_by_mobile', req.userMobile)
        .select(
          'id',
          'receipt_number',
          'name',
          'mobile_number',
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

      res.json({ 
        success: true, 
        data: requests 
      });

    } catch (err) {
      console.error('GET /api/pooja-mobile/my-requests error:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  });

  // Get single pooja request details
  router.get('/request/:id', verifyMobileToken, attachUserMobile, async (req, res) => {
    try {
      const { id } = req.params;

      const request = await db('pooja')
        .where('id', id)
        .where('submitted_by_mobile', req.userMobile)
        .first();

      if (!request) {
        return res.status(404).json({ 
          success: false, 
          error: 'Request not found' 
        });
      }

      // Get approval logs
      const logs = await db('pooja_approval_logs')
        .where('pooja_id', id)
        .orderBy('performed_at', 'desc');

      res.json({ 
        success: true, 
        data: { ...request, logs } 
      });

    } catch (err) {
      console.error('GET /api/pooja-mobile/request/:id error:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  });

  // Cancel pooja request (only if pending)
  router.put('/cancel/:id', verifyMobileToken, attachUserMobile, async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const request = await db('pooja')
        .where('id', id)
        .where('submitted_by_mobile', req.userMobile)
        .where('status', 'pending')
        .first();

      if (!request) {
        return res.status(404).json({ 
          success: false, 
          error: 'Request not found or cannot be cancelled' 
        });
      }

      // Update status to cancelled
      await db('pooja')
        .where('id', id)
        .update({
          status: 'cancelled',
          updated_at: new Date()
        });

      // Log the cancellation
      await db('pooja_approval_logs').insert({
        pooja_id: id,
        action: 'cancelled',
        performed_by: null,
        performed_at: new Date(),
        notes: `Cancelled by user ${req.userMobile}: ${reason || 'No reason provided'}`,
        old_status: 'pending',
        new_status: 'cancelled'
      });

      res.json({ 
        success: true, 
        message: 'Request cancelled successfully' 
      });

    } catch (err) {
      console.error('PUT /api/pooja-mobile/cancel/:id error:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  });

  // Get available time slots for a date range
  router.get('/available-slots', verifyMobileToken, attachUserMobile, async (req, res) => {
    try {
      const { from_date, to_date } = req.query;

      if (!from_date || !to_date) {
        return res.status(400).json({ 
          success: false, 
          error: 'From date and to date are required' 
        });
      }

      // Get all approved bookings in the date range
      const bookings = await db('pooja')
        .where('temple_id', 1)
        .where('status', 'approved')
        .where(function() {
          this.whereBetween('from_date', [from_date, to_date])
              .orWhereBetween('to_date', [from_date, to_date])
              .orWhere(function() {
                this.where('from_date', '<=', from_date)
                    .andWhere('to_date', '>=', to_date);
              });
        })
        .select('from_date', 'to_date', 'time');

      // Generate available time slots (every 30 minutes from 6 AM to 10 PM)
      const timeSlots = [];
      for (let hour = 6; hour <= 22; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          timeSlots.push(timeString);
        }
      }

      // Filter out booked time slots
      const bookedTimes = bookings.map(booking => booking.time);
      const availableSlots = timeSlots.filter(slot => !bookedTimes.includes(slot));

      res.json({ 
        success: true, 
        data: {
          available_slots: availableSlots,
          booked_slots: bookedTimes,
          total_available: availableSlots.length,
          total_booked: bookedTimes.length
        }
      });

    } catch (err) {
      console.error('GET /api/pooja-mobile/available-slots error:', err);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  });

  // Get the latest receipt for a temple (by templeId from query or token)
  router.get('/latest-receipt-by-temple', verifyMobileToken, async (req, res) => {
    try {
      const qTempleId = Number(req.query.templeId);
      const templeId = Number.isFinite(qTempleId) ? qTempleId : (Number(req.templeId) || 1);

      const latest = await db('pooja')
        .where('temple_id', templeId)
        .select('id', 'receipt_number', 'submitted_at', 'status')
        .orderBy([{ column: 'submitted_at', order: 'desc' }, { column: 'id', order: 'desc' }])
        .first();

      if (!latest) {
        return res.json({
          success: true,
          message: `No receipts found for temple ${templeId}`,
          data: null,
          temple_id: templeId
        });
      }

      res.json({ success: true, data: latest, temple_id: templeId });
    } catch (err) {
      console.error('GET /api/pooja-mobile/latest-receipt-by-temple error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Get latest and suggested next receipt number for a temple
  router.get('/next-receipt-by-temple', verifyMobileToken, async (req, res) => {
    try {
      const qTempleId = Number(req.query.templeId);
      const templeId = Number.isFinite(qTempleId) ? qTempleId : (Number(req.templeId) || 1);

      // Find the latest receipt by submitted_at then id
      const latest = await db('pooja')
        .where('temple_id', templeId)
        .whereNotNull('receipt_number')
        .andWhere('receipt_number', '!=', '')
        .select('id', 'receipt_number', 'submitted_at')
        .orderBy([{ column: 'submitted_at', order: 'desc' }, { column: 'id', order: 'desc' }])
        .first();

      const latestNumber = latest ? String(latest.receipt_number) : null;

      // Suggest a next number only if the latest is a pure integer
      let nextNumber = null;
      if (latestNumber && /^\d+$/.test(latestNumber)) {
        nextNumber = String(Number(latestNumber) + 1);
      }

      return res.json({
        success: true,
        temple_id: templeId,
        latest_receipt_number: latestNumber && /^\d+$/.test(latestNumber) ? String(Number(latestNumber) + 1) : latestNumber,
        next_receipt_number: nextNumber
      });
    } catch (err) {
      console.error('GET /api/pooja-mobile/next-receipt-by-temple error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

      // Get the latest receipt submitted by this mobile user
      router.get('/latest-receipt', verifyMobileToken, attachUserMobile, async (req, res) => {
        try {
          const latest = await db('pooja')
            .where('submitted_by_mobile', req.userMobile)
            .select('id', 'receipt_number', 'submitted_at', 'status')
            .orderBy([{ column: 'submitted_at', order: 'desc' }, { column: 'id', order: 'desc' }])
            .first();

          if (!latest) {
            return res.json({
              success: true,
              message: 'No receipts found for this mobile user',
              data: null
            });
          }

          res.json({ success: true, data: latest });
        } catch (err) {
          console.error('GET /api/pooja-mobile/latest-receipt error:', err);
          res.status(500).json({ success: false, error: 'Internal server error' });
        }
      });

      return router;
    };
