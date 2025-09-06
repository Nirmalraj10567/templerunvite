const express = require('express');
const router = express.Router();

module.exports = function(deps = {}) {
  const { db } = deps;

  // List with optional search and date filter
  router.get('/', async (req, res) => {
    try {
      const { q, from, to, page = 1, pageSize = 20 } = req.query;
      const pg = Math.max(parseInt(page, 10) || 1, 1);
      const ps = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
      const offset = (pg - 1) * ps;

      const query = db('pooja')
        .where('temple_id', req.user.templeId)
        .modify((qb) => {
          if (q) {
            qb.andWhere((b) => {
              b.where('name', 'like', `%${q}%`)
                .orWhere('receipt_number', 'like', `%${q}%`)
                .orWhere('mobile_number', 'like', `%${q}%`);
            });
          }
          if (from) qb.andWhere('from_date', '>=', from);
          if (to) qb.andWhere('to_date', '<=', to);
        })
        .orderBy('from_date', 'desc')
        .limit(ps)
        .offset(offset);

      const rows = await query;
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error('GET /api/pooja error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get bookings for calendar view
  router.get('/bookings', async (req, res) => {
    try {
      const { year, month } = req.query;
      const templeId = req.user.templeId || 1;
      
      console.log('📅 Bookings request:', { year, month, templeId });
      
      if (!year || !month) {
        return res.status(400).json({ error: 'Year and month are required' });
      }

      // Get all bookings that overlap with the specified month
      // Use a simpler approach: get all bookings and filter in JavaScript
      const allBookings = await db('pooja')
        .where('temple_id', templeId)
        .select('id', 'receipt_number', 'name', 'from_date', 'to_date', 'time')
        .orderBy('from_date', 'asc');
      
      console.log('📊 All bookings found:', allBookings.length);
      
      // Filter bookings that overlap with the specified month
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0); // Last day of the month
      
      console.log('📅 Month range:', { monthStart: monthStart.toISOString(), monthEnd: monthEnd.toISOString() });
      
      const bookings = allBookings.filter(booking => {
        const bookingStart = new Date(booking.from_date);
        const bookingEnd = new Date(booking.to_date);
        
        // Check if booking overlaps with the month
        const overlaps = bookingStart <= monthEnd && bookingEnd >= monthStart;
        
        if (overlaps) {
          console.log('✅ Overlapping booking:', {
            id: booking.id,
            receipt_number: booking.receipt_number,
            from_date: booking.from_date,
            to_date: booking.to_date
          });
        }
        
        return overlaps;
      });

      console.log('📋 Filtered bookings:', bookings.length);
      res.json({ success: true, data: bookings });
    } catch (err) {
      console.error('GET /api/pooja/bookings error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get single pooja entry
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const row = await db('pooja')
        .where({ id })
        .andWhere('temple_id', req.user.templeId)
        .first();
      
      if (!row) {
        return res.status(404).json({ error: 'Pooja entry not found' });
      }
      
      res.json({ success: true, data: row });
    } catch (err) {
      console.error('GET /api/pooja/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create pooja entry
  router.post('/', async (req, res) => {
    try {
      const p = req.body || {};
      
      // Validate required fields
      if (!p.name || !p.mobileNumber || !p.time || !p.fromDate || !p.toDate) {
        return res.status(400).json({ 
          error: 'Missing required fields: name, mobileNumber, time, fromDate, toDate' 
        });
      }

      // Validate date range
      if (new Date(p.fromDate) > new Date(p.toDate)) {
        return res.status(400).json({ 
          error: 'From date cannot be later than to date' 
        });
      }

      // Validate mobile number format
      if (!/^[0-9]{10}$/.test(p.mobileNumber)) {
        return res.status(400).json({ 
          error: 'Mobile number must be 10 digits' 
        });
      }

      const record = {
        temple_id: req.user.templeId,
        receipt_number: p.receiptNumber || null,
        name: p.name,
        mobile_number: p.mobileNumber,
        time: p.time,
        from_date: p.fromDate,
        to_date: p.toDate,
        remarks: p.remarks || null,
        created_by: req.user.id,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      };

      const inserted = await db('pooja').insert(record).returning('*');
      res.json({ success: true, data: inserted[0] });
    } catch (err) {
      console.error('POST /api/pooja error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update pooja entry
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const p = req.body || {};
      
      // Validate required fields
      if (!p.name || !p.mobileNumber || !p.time || !p.fromDate || !p.toDate) {
        return res.status(400).json({ 
          error: 'Missing required fields: name, mobileNumber, time, fromDate, toDate' 
        });
      }

      // Validate date range
      if (new Date(p.fromDate) > new Date(p.toDate)) {
        return res.status(400).json({ 
          error: 'From date cannot be later than to date' 
        });
      }

      // Validate mobile number format
      if (!/^[0-9]{10}$/.test(p.mobileNumber)) {
        return res.status(400).json({ 
          error: 'Mobile number must be 10 digits' 
        });
      }
      
      const updateData = {
        receipt_number: p.receiptNumber || null,
        name: p.name,
        mobile_number: p.mobileNumber,
        time: p.time,
        from_date: p.fromDate,
        to_date: p.toDate,
        remarks: p.remarks || null,
        updated_at: db.fn.now(),
      };

      const result = await db('pooja')
        .where({ id })
        .andWhere('temple_id', req.user.templeId)
        .update(updateData);
      
      if (!result) {
        return res.status(404).json({ error: 'Pooja entry not found' });
      }
      
      const pooja = await db('pooja').where({ id }).first();
      res.json({ success: true, data: pooja });
    } catch (err) {
      console.error('PUT /api/pooja/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete pooja entry
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await db('pooja')
        .where({ id })
        .andWhere('temple_id', req.user.templeId)
        .del();
      
      if (!result) {
        return res.status(404).json({ error: 'Pooja entry not found' });
      }
      
      res.json({ success: true });
    } catch (err) {
      console.error('DELETE /api/pooja/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Export to CSV
  router.get('/export', async (req, res) => {
    try {
      const rows = await db('pooja')
        .where('temple_id', req.user.templeId)
        .orderBy('from_date', 'desc');
      
      const headers = [
        'id,receipt_number,name,mobile_number,time,from_date,to_date,remarks,created_at'
      ];
      
      const csv = rows.map(r => [
        r.id, 
        r.receipt_number, 
        r.name,
        r.mobile_number,
        r.time, 
        r.from_date, 
        r.to_date, 
        (r.remarks || '').replaceAll(',', ' '),
        r.created_at
      ].join(',')).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="pooja.csv"');
      res.send(headers.join('\n') + '\n' + csv);
    } catch (err) {
      console.error('GET /api/pooja/export error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get statistics
  router.get('/stats/summary', async (req, res) => {
    try {
      const { from, to } = req.query;
      
      let query = db('pooja')
        .where('temple_id', req.user.templeId);
      
      if (from) query = query.andWhere('from_date', '>=', from);
      if (to) query = query.andWhere('to_date', '<=', to);
      
      const stats = await query
        .select(
          db.raw('COUNT(*) as total_entries'),
          db.raw('COUNT(DISTINCT name) as unique_people'),
          db.raw('AVG(julianday(to_date) - julianday(from_date) + 1) as avg_duration_days')
        )
        .first();
      
      res.json({ success: true, data: stats });
    } catch (err) {
      console.error('GET /api/pooja/stats/summary error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
