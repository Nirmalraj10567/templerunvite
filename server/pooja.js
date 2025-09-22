const express = require('express');
const router = express.Router();

// Helper function to extract numeric part from receipt number
const getNumericPart = (receiptNumber) => {
  if (!receiptNumber) return 0;
  const match = receiptNumber.match(/(\d{4})-(\d+)$/);
  return match ? parseInt(match[2], 10) : 0;
};

module.exports = function(deps = {}) {
  const { db } = deps;

  // Get the latest receipt number
  router.get('/latest-receipt', async (req, res) => {
    try {
      const latestPooja = await db('pooja')
        .whereNotNull('receipt_number')
        .where('receipt_number', 'like', `${new Date().getFullYear()}%`)
        .orderBy('id', 'desc')
        .first();
      
      if (latestPooja && latestPooja.receipt_number) {
        return res.json({ 
          success: true, 
          latestReceipt: latestPooja.receipt_number 
        });
      }
      
      // If no receipt found for current year, return format with 0
      res.json({ 
        success: true, 
        latestReceipt: `${new Date().getFullYear()}-0000`
      });
    } catch (error) {
      console.error('Error fetching latest receipt:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch latest receipt number' 
      });
    }
  });

  // List with optional search and date filter
  router.get('/', async (req, res) => {
    try {
      const { q, from, to, page = 1, pageSize = 20, status } = req.query;
      const pg = Math.max(parseInt(page, 10) || 1, 1);
      const ps = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
      const offset = (pg - 1) * ps;
      
      // Check if submitted_by exists to avoid SQLITE_ERROR
      let hasSubmittedBy = false;
      try {
        hasSubmittedBy = await db.schema.hasColumn('pooja', 'submitted_by');
      } catch {}

      // Base query
      let query = db('pooja');
      if (hasSubmittedBy) {
        query = query
          .leftJoin('users', 'pooja.submitted_by', 'users.id')
          .select(
            'pooja.*',
            db.raw("COALESCE(users.full_name, users.username, users.mobile) as submitted_by_name"),
            'users.mobile as submitted_by_mobile'
          );
      } else {
        query = query.select('pooja.*');
      }
      query = query.orderBy('pooja.id', 'desc');

      // Apply filters
      if (q) {
        const searchTerm = `%${q}%`;
        query = query.where(function() {
          this.where('pooja.name', 'like', searchTerm)
            .orWhere('pooja.mobile_number', 'like', searchTerm)
            .orWhere('pooja.receipt_number', 'like', searchTerm);
        });
      }

      if (from) {
        query = query.where('pooja.from_date', '>=', from);
      }

      if (to) {
        query = query.where('pooja.to_date', '<=', to);
      }

      if (status) {
        query = query.where('pooja.status', status);
      }

      // Get total count
      const totalQuery = query.clone().clearSelect().count('* as count').first();
      const [data, totalResult] = await Promise.all([
        query.offset(offset).limit(ps),
        totalQuery
      ]);

      const total = parseInt(totalResult.count, 10);
      const totalPages = Math.ceil(total / ps);

      res.json({
        success: true,
        data,
        pagination: {
          total,
          page: pg,
          pageSize: ps,
          totalPages,
          hasNextPage: pg < totalPages,
          hasPreviousPage: pg > 1
        }
      });
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
        transfer_to_account: p.transfer_to_account || p.transferTo || 'INCOME A/C',
        amount: p.amount != null && p.amount !== '' ? Number(p.amount) : null,
        created_by: req.user.id,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      };

      const inserted = await db('pooja').insert(record).returning('*');
      const row = inserted[0];

      // Mirror to journal so balances reflect in reports
      try {
        const hasJournal = await db.schema.hasTable('journal_entries');
        const amountNum = Number(p.amount || row.amount || 0);
        console.log('🔍 Pooja journal mirror check:', { 
          hasJournal, 
          amountNum, 
          amount: p.amount, 
          rowAmount: row.amount,
          fromAccount: p.fromAccount,
          transferTo: p.transferTo,
          poojaId: row.id
        });
        
        if (hasJournal && !isNaN(amountNum) && amountNum > 0) {
          const fromAccount = p.fromAccount || 'POOJA A/C';
          const toAccount = row.transfer_to_account || p.transferTo || 'INCOME A/C';
          
          // Prevent duplicate mirror just in case
          const existing = await db('journal_entries')
            .where({ reference_type: 'pooja', reference_id: row.id, temple_id: row.temple_id })
            .first();
            
          if (!existing) {
            const journalEntry = {
              // Use today's date so the amount reflects in today's balance/daily reports
              date: new Date().toISOString().slice(0,10),
              from_account: fromAccount,
              to_account: toAccount,
              amount: amountNum,
              entry_type: 'transfer',
              remarks: row.remarks || null,
              reference_type: 'pooja',
              reference_id: row.id,
              temple_id: row.temple_id,
              created_by: row.created_by,
              created_at: db.fn.now(),
            };
            
            console.log('📝 Inserting journal entry:', journalEntry);
            await db('journal_entries').insert(journalEntry);
            console.log('✅ Pooja journal entry created successfully for pooja ID:', row.id);
          } else {
            console.log('⚠️ Journal entry already exists for pooja:', row.id);
          }
        } else {
          console.log('❌ Pooja journal mirror skipped:', { 
            hasJournal, 
            amountNum, 
            isValidAmount: !isNaN(amountNum) && amountNum > 0,
            reason: !hasJournal ? 'No journal table' : amountNum <= 0 ? 'Amount is zero or negative' : 'Unknown'
          });
        }
      } catch (e) {
        console.error('❌ Failed to mirror pooja into journal_entries:', e);
        // Do not fail the main request
      }

      res.json({ success: true, data: row });
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
        transfer_to_account: p.transfer_to_account ?? p.transferTo ?? 'INCOME A/C',
        amount: p.amount != null && p.amount !== '' ? Number(p.amount) : undefined,
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

      // Sync journal mirror: delete old and recreate if amount present
      try {
        const hasJournal = await db.schema.hasTable('journal_entries');
        if (hasJournal) {
          await db('journal_entries')
            .where({ reference_type: 'pooja', reference_id: Number(id), temple_id: req.user.templeId })
            .del();
          const amountNum = Number(p.amount || pooja.amount || 0);
          if (!isNaN(amountNum) && amountNum > 0) {
            const fromAccount = p.fromAccount || 'POOJA A/C';
            const toAccount = pooja.transfer_to_account || p.transferTo || 'INCOME A/C';
            await db('journal_entries').insert({
              // Use today's date so the amount reflects in today's balance/daily reports
              date: new Date().toISOString().slice(0,10),
              from_account: fromAccount,
              to_account: toAccount,
              amount: amountNum,
              entry_type: 'transfer',
              remarks: pooja.remarks || null,
              reference_type: 'pooja',
              reference_id: Number(id),
              temple_id: req.user.templeId,
              created_by: req.user.id,
              created_at: db.fn.now(),
            });
          }
        }
      } catch (e) {
        console.error('Failed to sync journal mirror for pooja update:', e);
      }

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
      
      // Cleanup mirrored journal entries
      try {
        const hasJournal = await db.schema.hasTable('journal_entries');
        if (hasJournal) {
          await db('journal_entries')
            .where({ reference_type: 'pooja', reference_id: Number(id), temple_id: req.user.templeId })
            .del();
        }
      } catch (e) {
        console.warn('Failed to cleanup journal mirror for pooja delete:', id, e);
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
        'id,receipt_number,name,mobile_number,time,from_date,to_date,remarks,transfer_to_account,amount,created_at'
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
        (r.transfer_to_account || '').replaceAll(',', ' '),
        r.amount != null ? r.amount : '',
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
