const express = require('express');
const router = express.Router();

module.exports = function(deps = {}) {
  const { db } = deps;

  // Submit pooja request from mobile
  router.post('/submit', async (req, res) => {
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

      // Check for double booking
      const conflictingBooking = await db('pooja')
        .where('temple_id', 1) // Default temple
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
        temple_id: 1,
        receipt_number,
        name,
        mobile_number,
        time,
        from_date,
        to_date,
        remarks,
        status: 'pending',
        submitted_by_mobile: submitted_by_mobile || mobile_number,
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
        notes: `Submitted from mobile by ${submitted_by_mobile || mobile_number}`,
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
  router.get('/my-requests', async (req, res) => {
    try {
      const { mobile_number } = req.query;

      if (!mobile_number) {
        return res.status(400).json({ 
          success: false, 
          error: 'Mobile number is required' 
        });
      }

      const requests = await db('pooja')
        .where('submitted_by_mobile', mobile_number)
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
  router.get('/request/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { mobile_number } = req.query;

      if (!mobile_number) {
        return res.status(400).json({ 
          success: false, 
          error: 'Mobile number is required' 
        });
      }

      const request = await db('pooja')
        .where('id', id)
        .where('submitted_by_mobile', mobile_number)
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
  router.put('/cancel/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { mobile_number, reason } = req.body;

      if (!mobile_number) {
        return res.status(400).json({ 
          success: false, 
          error: 'Mobile number is required' 
        });
      }

      const request = await db('pooja')
        .where('id', id)
        .where('submitted_by_mobile', mobile_number)
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
        notes: `Cancelled by user: ${reason || 'No reason provided'}`,
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
  router.get('/available-slots', async (req, res) => {
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

  return router;
};
