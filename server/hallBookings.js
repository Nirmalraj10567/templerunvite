const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');

module.exports = function (deps = {}) {
  const { db } = deps;

  // Helper to write hall booking logs
  async function logHallBookingAction({ hallBookingId, templeId, userId, action, details }) {
    try {
      const has = await db.schema.hasTable('hall_booking_logs');
      if (!has) {
        console.warn('hall_booking_logs table does not exist, creating it...');
        // Create the table if it doesn't exist
        await db.schema.createTable('hall_booking_logs', (table) => {
          table.increments('id').primary();
          table.integer('temple_id').notNullable().index();
          table.integer('hall_booking_id').notNullable().index();
          table.string('action').notNullable(); // create | update | delete
          table.text('details'); // JSON string with full snapshot/diff
          table.integer('created_by').nullable().index();
          table.timestamp('created_at').defaultTo(db.fn.now());
        });
        console.log('Created hall_booking_logs table');
      }
      
      const logData = {
        hall_booking_id: Number(hallBookingId),
        temple_id: Number(templeId),
        created_by: userId ? Number(userId) : null,
        action,
        details: details ? JSON.stringify(details) : null,
        created_at: db.fn.now(),
      };
      
      console.log('Inserting hall booking log:', logData);
      await db('hall_booking_logs').insert(logData);
      console.log('Successfully inserted hall booking log');
    } catch (e) {
      console.error('Failed to write hall_booking_logs:', e.message);
      console.error('Error details:', e);
      throw e; // Re-throw to let caller handle
    }
  }

  // Ensure optional columns exist on marriage_hall_bookings table
  // Adds: cleaning, chair, eb, gas, ac (numeric); check_in_date, check_in_time, check_out_date, check_out_time (string)
  async function ensureHallExtrasColumns() {
    try {
      const hasTable = await db.schema.hasTable('marriage_hall_bookings');
      if (!hasTable) return; // nothing to do

      const ensureColumn = async (name, type) => {
        const exists = await db.schema.hasColumn('marriage_hall_bookings', name);
        if (!exists) {
          await db.schema.alterTable('marriage_hall_bookings', (t) => {
            if (type === 'number') t.decimal(name, 12, 2).nullable();
            else t.string(name).nullable();
          });
        }
      };

      // Monetary optional charges
      await ensureColumn('cleaning', 'number');
      await ensureColumn('chair', 'number');
      await ensureColumn('eb', 'number');
      await ensureColumn('gas', 'number');
      await ensureColumn('ac', 'number');

      // Check-in / Check-out
      await ensureColumn('check_in_date', 'string');
      await ensureColumn('check_in_time', 'string');
      await ensureColumn('check_out_date', 'string');
      await ensureColumn('check_out_time', 'string');
    } catch (e) {
      console.warn('ensureHallExtrasColumns skipped due to error:', e.message);
    }
  }

  // Get all logs for the current temple (MUST be before /:id route)
  router.get('/logs', async (req, res) => {
    try {
      console.log('🔍 Fetching all hall booking logs');
      console.log('User temple ID:', req.user.templeId);
      console.log('Query params:', req.query);
      
      const templeId = req.user.templeId;
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize, 10) || 50));
      const has = await db.schema.hasTable('hall_booking_logs');
      console.log('Table exists:', has);
      
      if (!has) {
        console.log('⚠️ hall_booking_logs table does not exist');
        return res.json({ success: true, data: [], total: 0, page, pageSize });
      }
      
      console.log('Building query for temple_id:', templeId);
      const base = db('hall_booking_logs as l')
        .leftJoin('marriage_hall_bookings as h', 'h.id', 'l.hall_booking_id')
        .where('l.temple_id', templeId);
      
      console.log('Counting total logs...');
      const totalRow = await base.clone().count({ c: '*' }).first();
      const total = Number(totalRow?.c || totalRow?.count || 0);
      console.log('Total logs found:', total);
      
      console.log('Fetching logs with pagination...');
      const rows = await base.clone()
        .orderBy('l.created_at', 'desc')
        .orderBy('l.id', 'desc')
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .select('l.*', 'h.name as hall_booking_name', 'h.register_no as receipt_number');
      
      console.log('Query results:', rows.length, 'logs');
      console.log('Sample log data:', rows.slice(0, 2));
      
      const data = rows.map(r => ({
        id: r.id,
        hall_booking_id: r.hall_booking_id,
        action: r.action,
        created_at: r.created_at,
        created_by: r.created_by,
        hall_booking_name: r.hall_booking_name || null,
        receipt_number: r.receipt_number || null,
        details: (() => { try { return r.details ? JSON.parse(r.details) : null; } catch { return r.details; } })(),
      }));
      
      res.json({ success: true, data, total, page, pageSize });
    } catch (e) {
      console.error('Error fetching /api/hall-bookings/logs:', e);
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  });

  // Get logs for a specific hall booking entry
  router.get('/:id/logs', async (req, res) => {
    try {
      console.log('🔍 Fetching logs for hall booking ID:', req.params.id);
      console.log('User temple ID:', req.user.templeId);
      
      const { id } = req.params;
      const templeId = req.user.templeId;
      const has = await db.schema.hasTable('hall_booking_logs');
      console.log('Table exists:', has);
      
      if (!has) {
        console.log('⚠️ hall_booking_logs table does not exist');
        return res.json({ success: true, data: [] });
      }

      console.log('Querying logs for hall_booking_id:', id, 'temple_id:', templeId);
      const logs = await db('hall_booking_logs')
        .where({ hall_booking_id: id, temple_id: templeId })
        .orderBy('created_at', 'desc')
        .select('*');
      
      console.log('Found logs:', logs.length);
      console.log('Logs data:', logs);

      const data = logs.map(log => ({
        id: log.id,
        action: log.action,
        created_at: log.created_at,
        created_by: log.created_by,
        details: (() => { try { return log.details ? JSON.parse(log.details) : null; } catch { return log.details; } })(),
      }));

      res.json({ success: true, data });
    } catch (e) {
      console.error('Error fetching /api/hall-bookings/:id/logs:', e);
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  });

  // List with optional search and date filter
  router.get('/', async (req, res) => {
    try {
      const { q, from, to, page = 1, pageSize = 20 } = req.query;
      const pg = Math.max(parseInt(page, 10) || 1, 1);
      const ps = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
      const offset = (pg - 1) * ps;

      const query = db('marriage_hall_bookings')
        .where('temple_id', req.user.templeId)
        .modify((qb) => {
          if (q) {
            qb.andWhere((b) => {
              b.where('name', 'like', `%${q}%`)
                .orWhere('register_no', 'like', `%${q}%`)
                .orWhere('village', 'like', `%${q}%`)
                .orWhere('mobile', 'like', `%${q}%`)
                .orWhere('event', 'like', `%${q}%`);
            });
          }
          if (from) qb.andWhere('date', '>=', from);
          if (to) qb.andWhere('date', '<=', to);
        })
        .orderBy('date', 'desc')
        .limit(ps)
        .offset(offset);

      const rows = await query;
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error('GET /api/hall-bookings error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Export ALL to PDF (supports same filters as list)
  router.get('/export-pdf', async (req, res) => {
    try {
      const { q, from, to } = req.query;
      const rows = await db('marriage_hall_bookings')
        .where('temple_id', req.user.templeId)
        .modify((qb) => {
          if (q) {
            qb.andWhere((b) => {
              b.where('name', 'like', `%${q}%`)
                .orWhere('register_no', 'like', `%${q}%`)
                .orWhere('village', 'like', `%${q}%`)
                .orWhere('mobile', 'like', `%${q}%`)
                .orWhere('event', 'like', `%${q}%`);
            });
          }
          if (from) qb.andWhere('date', '>=', from);
          if (to) qb.andWhere('date', '<=', to);
        })
        .orderBy('date', 'desc');

      const doc = new PDFDocument({ margin: 36, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="hall_bookings.pdf"');
      doc.pipe(res);

      doc.fontSize(16).font('Helvetica-Bold').text('Marriage Hall Bookings', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').text(`Total: ${rows.length}`, { align: 'center' });
      doc.moveDown();

      // Table header
      const cols = [
        { label: 'Date', width: 70 },
        { label: 'Time', width: 50 },
        { label: 'Receipt', width: 70 },
        { label: 'Event', width: 90 },
        { label: 'Name', width: 120 },
        { label: 'Mobile', width: 80 },
        { label: 'Total', width: 60 },
      ];
      const startX = 36;
      let y = doc.y;
      doc.font('Helvetica-Bold').fontSize(9);
      let x = startX;
      cols.forEach(c => { doc.text(c.label, x, y, { width: c.width }); x += c.width; });
      y += 14;
      doc.moveTo(startX, y).lineTo(559, y).strokeColor('#cccccc').lineWidth(1).stroke();
      y += 6;
      doc.font('Helvetica').fontSize(9);

      const toNum = (v) => { if (!v) return 0; const n = parseInt(String(v).replace(/[^0-9-]/g, ''), 10); return isNaN(n) ? 0 : n; };
      let totalSum = 0, advanceSum = 0, balanceSum = 0;

      for (const r of rows) {
        if (y > 780) { doc.addPage(); y = 36; }
        x = startX;
        doc.text(r.date || '', x, y, { width: cols[0].width }); x += cols[0].width;
        doc.text(r.time || '', x, y, { width: cols[1].width }); x += cols[1].width;
        doc.text(r.register_no || '', x, y, { width: cols[2].width }); x += cols[2].width;
        doc.text(r.event || '', x, y, { width: cols[3].width }); x += cols[3].width;
        doc.text(r.name || '', x, y, { width: cols[4].width }); x += cols[4].width;
        doc.text(r.mobile || '', x, y, { width: cols[5].width }); x += cols[5].width;
        const tot = toNum(r.total_amount);
        doc.text(tot.toLocaleString(), x, y, { width: cols[6].width, align: 'right' });
        totalSum += tot;
        advanceSum += toNum(r.advance_amount);
        balanceSum += toNum(r.balance_amount);
        y += 16;
      }

      doc.moveDown(1.5);
      doc.font('Helvetica-Bold').text(`Totals:  Advance ${advanceSum.toLocaleString()}   Total ${totalSum.toLocaleString()}   Balance ${balanceSum.toLocaleString()}`, { align: 'right' });
      doc.end();
    } catch (err) {
      console.error('GET /api/hall-bookings/export-pdf error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Export single booking to PDF
  router.get('/:id/pdf', async (req, res) => {
    try {
      const { id } = req.params;
      const r = await db('marriage_hall_bookings')
        .where({ id })
        .andWhere('temple_id', req.user.templeId)
        .first();
      if (!r) return res.status(404).json({ error: 'Hall booking not found' });

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="hall_booking_${r.id}.pdf"`);
      doc.pipe(res);

      const hr = () => { doc.moveDown(0.3); const yy = doc.y; doc.moveTo(50, yy).lineTo(550, yy).strokeColor('#cccccc').lineWidth(1).stroke(); doc.moveDown(0.3); };
      const row = (k, v) => { doc.font('Helvetica-Bold').fontSize(11).text(k + ': ', { continued: true }); doc.font('Helvetica').text(v || ''); };

      doc.font('Helvetica-Bold').fontSize(18).text('Marriage Hall Booking', { align: 'center' });
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(11).text(`Receipt: ${r.register_no || ''}`, { align: 'center' });
      hr();

      doc.fontSize(12).text('Booking Details');
      hr();
      row('Date', r.date || '');
      row('Time', r.time || '');
      row('Event', r.event || '');
      row('Subdivision', r.subdivision || '');

      doc.moveDown();
      doc.fontSize(12).text('Person');
      hr();
      row('Name', r.name || '');
      row('Mobile', r.mobile || '');
      row('Village', r.village || '');
      row('Address', r.address || '');

      doc.moveDown();
      doc.fontSize(12).text('Amounts');
      hr();
      const toNum = (v) => { if (!v) return 0; const n = parseInt(String(v).replace(/[^0-9-]/g, ''), 10); return isNaN(n) ? 0 : n; };
      row('Advance', toNum(r.advance_amount).toLocaleString());
      row('Total', toNum(r.total_amount).toLocaleString());
      row('Balance', toNum(r.balance_amount).toLocaleString());
      row('Remarks', r.remarks || '');

      doc.end();
    } catch (err) {
      console.error('GET /api/hall-bookings/:id/pdf error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create hall booking
  router.post('/', async (req, res) => {
    try {
      await ensureHallExtrasColumns();
      const p = req.body || {};
      const record = {
        temple_id: req.user.templeId,
        register_no: p.registerNo || null,
        date: p.date || null,
        time: p.time || null,
        event: p.event || null,
        hall_id: p.hallId || null,
        event_id: p.eventId || null,
        subdivision: p.subdivision || null,
        name: p.name || null,
        address: p.address || null,
        village: p.village || null,
        mobile: p.mobile || null,
        advance_amount: p.advanceAmount || null,
        total_amount: p.totalAmount || null,
        balance_amount: p.balanceAmount || null,
        remarks: p.remarks || null,
        transfer_to_account: p.transfer_to_account || p.transferTo || null,
        // Optional extras
        cleaning: p.cleaning || null,
        chair: p.chair || null,
        eb: p.eb || null,
        gas: p.gas || null,
        ac: p.ac || null,
        // Check-in/out
        check_in_date: p.checkInDate || null,
        check_in_time: p.checkInTime || null,
        check_out_date: p.checkOutDate || null,
        check_out_time: p.checkOutTime || null,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      };
      const inserted = await db('marriage_hall_bookings').insert(record).returning('*');
      let row = inserted && inserted[0];
      // MySQL may return only the insert id as a number
      if (typeof row === 'number') {
        const newId = row;
        row = await db('marriage_hall_bookings').where({ id: newId }).first();
      } else if (row && typeof row === 'object' && row.id == null && inserted && inserted.insertId) {
        // Some drivers expose insertId differently
        row = await db('marriage_hall_bookings').where({ id: inserted.insertId }).first();
      }

      // Mirror to ledger as a credit so balances reflect revenue collection
      try {
        const under = row.transfer_to_account || p.transferTo || 'CASH A/C';
        const amountNum = Number(p.advanceAmount || p.totalAmount || 0);
        if (!isNaN(amountNum) && amountNum > 0) {
          await db('ledger_entries').insert({
            date: row.date || new Date().toISOString().slice(0, 10),
            name: row.name ? `Hall Booking - ${row.name}${row.event ? ' (' + row.event + ')' : ''}` : 'Hall Booking',
            type: 'credit',
            under,
            amount: amountNum,
            remarks: row.remarks || null,
            temple_id: row.temple_id,
            created_at: db.fn.now(),
            updated_at: db.fn.now(),
          });
        }
      } catch (e) {
        console.error('Failed to insert ledger entry for hall booking:', e);
        // Do not fail the main request
      }

      // Mirror to journal: INCOME A/C -> CASH A/C (matching existing pattern)
      try {
        const amountNum = Number(p.advanceAmount || p.totalAmount || 0);

        if (row && row.id && amountNum > 0) {
          const entryData = {
            date: row.date || new Date().toISOString().slice(0, 10),
            from_account: 'HALL A/C',
            to_account: 'INCOME A/C',
            amount: amountNum,
            entry_type: 'transfer',
            remarks: row.remarks || p.remarks || `Hall booking payment - ${row.name || 'Unknown'}`,
            reference_type: 'hall_booking',
            reference_id: row.id,
            temple_id: row.temple_id,
            created_by: req.user?.id || 1,
            created_at: db.fn.now()
          };

          console.log('🔍 Hall booking journal mirror debug - Inserting entry:', entryData);
          await db('journal_entries').insert(entryData);
          console.log(`✅ Journal entry created for hall booking ${row.id}`);
        } else {
          console.log('⚠️ Skipping journal entry for hall booking:', { hasRow: !!row, hasId: !!row?.id, amount: amountNum });
        }
      } catch (e) {
        console.error('❌ Failed to mirror hall booking into journal_entries:', e.message);
        console.error('❌ Full error:', e);
      }

      // Log creation with full snapshot
      try {
        await logHallBookingAction({
          hallBookingId: row.id,
          templeId: req.user.templeId,
          userId: req.user.id,
          action: 'create',
          details: row,
        });
        console.log('Successfully logged hall booking creation for ID:', row.id);
      } catch (logError) {
        console.error('Failed to log hall booking creation:', logError);
        // Don't fail the request if logging fails, but log the error
      }

      res.json({ success: true, data: row });
    } catch (err) {
      console.error('POST /api/hall-bookings error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update hall booking
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const idNum = Number(id);

      // Validate ID is a valid number
      if (isNaN(idNum) || idNum <= 0) {
        console.error('Invalid hall booking ID for update:', id);
        return res.status(400).json({ error: 'Invalid booking ID' });
      }

      const p = req.body || {};
      await ensureHallExtrasColumns();

      const updateData = {
        register_no: p.registerNo || null,
        date: p.date || null,
        time: p.time || null,
        event: p.event || null,
        hall_id: p.hallId || null,
        event_id: p.eventId || null,
        subdivision: p.subdivision || null,
        name: p.name || null,
        address: p.address || null,
        village: p.village || null,
        mobile: p.mobile || null,
        advance_amount: p.advanceAmount || null,
        total_amount: p.totalAmount || null,
        balance_amount: p.balanceAmount || null,
        remarks: p.remarks || null,
        transfer_to_account: p.transfer_to_account ?? p.transferTo,
        // Optional extras
        cleaning: p.cleaning || null,
        chair: p.chair || null,
        eb: p.eb || null,
        gas: p.gas || null,
        ac: p.ac || null,
        // Check-in/out
        check_in_date: p.checkInDate || null,
        check_in_time: p.checkInTime || null,
        check_out_date: p.checkOutDate || null,
        check_out_time: p.checkOutTime || null,
        updated_at: db.fn.now(),
      };

      const result = await db('marriage_hall_bookings')
        .where({ id: idNum })
        .andWhere('temple_id', req.user.templeId)
        .update(updateData);

      if (!result) {
        return res.status(404).json({ error: 'Hall booking not found' });
      }

      const booking = await db('marriage_hall_bookings').where({ id: idNum }).first();

      // Sync journal mirror on update
      try {
        const amountNum = Number(p.advanceAmount || p.totalAmount || booking.total_amount || 0);

        // First, delete existing journal entries for this booking
        await db('journal_entries')
          .where({ reference_type: 'hall_booking', reference_id: idNum })
          .del();

        if (amountNum > 0) {
          const entryData = {
            date: booking.date || new Date().toISOString().slice(0, 10),
            from_account: 'HALL A/C',
            to_account: 'INCOME A/C',
            amount: amountNum,
            entry_type: 'transfer',
            remarks: booking.remarks || p.remarks || `Updated hall booking payment - ${booking.name || 'Unknown'}`,
            reference_type: 'hall_booking',
            reference_id: idNum,
            temple_id: booking.temple_id,
            created_by: req.user.id,
            created_at: db.fn.now()
          };

          console.log('🔍 Hall booking journal mirror debug - Updating entry:', entryData);
          await db('journal_entries').insert(entryData);
          console.log(`✅ Journal entry updated for hall booking ${idNum}`);
        } else {
          console.log(`⚠️ Skipping journal update for hall booking ${idNum} due to zero amount`);
        }
      } catch (e) {
        console.error('❌ Failed to sync hall booking journal mirror on update:', e.message);
      }

      // Log update with after snapshot
      try {
        console.log('🔍 Attempting to log hall booking update...');
        console.log('Log data:', {
          hallBookingId: idNum,
          templeId: req.user.templeId,
          userId: req.user.id,
          action: 'update',
          details: { before: null, after: booking || null }
        });
        
        await logHallBookingAction({
          hallBookingId: idNum,
          templeId: req.user.templeId,
          userId: req.user.id,
          action: 'update',
          details: { before: null, after: booking || null }, // We don't have before state in this context
        });
        console.log('✅ Successfully logged hall booking update for ID:', idNum);
      } catch (logError) {
        console.error('❌ Failed to log hall booking update:', logError);
        console.error('Log error details:', logError);
        // Don't fail the request if logging fails, but log the error
      }

      res.json({ success: true, data: booking });
    } catch (err) {
      console.error('PUT /api/hall-bookings/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get the latest hall booking
  router.get('/latest', async (req, res) => {
    try {
      const latestBooking = await db('marriage_hall_bookings')
        .where('temple_id', req.user.templeId)
        .whereNotNull('register_no')
        .orderBy('id', 'desc')
        .first();
      
      if (latestBooking) {
        return res.json({
          success: true,
          register_no: latestBooking.register_no,
          date: latestBooking.date,
          name: latestBooking.name
        });
      }
      
      res.status(404).json({
        success: false,
        error: 'No bookings found'
      });
      
    } catch (error) {
      console.error('Error fetching latest booking:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch latest booking'
      });
    }
  });

  // Generate sequential receipt number (MUST be before /:id route)
  router.get('/generate-receipt-number', async (req, res) => {
    try {
      const year = new Date().getFullYear();

      // Ensure table exists (works for both SQLite/MySQL)
      const hasTable = await db.schema.hasTable('receipt_counter');
      if (!hasTable) {
        await db.schema.createTable('receipt_counter', (t) => {
          t.integer('year').primary();
          t.integer('last_number').notNullable().defaultTo(0);
          t.timestamp('created_at').defaultTo(db.fn.now());
          t.timestamp('updated_at').defaultTo(db.fn.now());
        });
      }

      // Atomic upsert: insert year with last_number=1 or increment existing last_number
      // Keep the column set minimal to avoid errors if older schemas lack created_at/updated_at
      await db('receipt_counter')
        .insert({ year, last_number: 1 })
        .onConflict('year')
        .merge({ last_number: db.raw('last_number + 1') });

      // Read back the latest counter
      const updated = await db('receipt_counter').where({ year }).first();
      const seq = Number(updated?.last_number || 1);
      const receiptNo = `${year}-${String(seq).padStart(4, '0')}`;
      res.json({ receiptNo });
    } catch (error) {
      console.error('Error generating receipt number:', error);
      res.status(500).json({ error: 'Failed to generate receipt number' });
    }
  });

  // Export to CSV
  router.get('/export', async (req, res) => {
    try {
      const rows = await db('marriage_hall_bookings')
        .where('temple_id', req.user.templeId)
        .orderBy('date', 'desc');

      const headers = [
        'id,register_no,date,time,event,subdivision,name,address,village,mobile,advance_amount,total_amount,balance_amount,remarks,transfer_to_account'
      ];

      const csv = rows.map(r => [
        r.id, r.register_no, r.date, r.time, r.event, r.subdivision, r.name,
        (r.address || '').replaceAll(',', ' '), (r.village || '').replaceAll(',', ' '), (r.mobile || '').replaceAll(',', ' '),
        r.advance_amount, r.total_amount, r.balance_amount, (r.remarks || '').replaceAll(',', ' '), (r.transfer_to_account || '').replaceAll(',', ' ')
      ].join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="hall_bookings.csv"');
      res.send(headers.join('\n') + '\n' + csv);
    } catch (err) {
      console.error('GET /api/hall-bookings/export error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get single hall booking (camelCase response for frontend)
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const idNum = Number(id);

      // Validate ID is a valid number
      if (isNaN(idNum) || idNum <= 0) {
        console.error('Invalid hall booking ID:', id);
        return res.status(400).json({ error: 'Invalid booking ID' });
      }

      const row = await db('marriage_hall_bookings')
        .where({ id: idNum })
        .andWhere('temple_id', req.user.templeId)
        .first();
      if (!row) return res.status(404).json({ error: 'Hall booking not found' });

      const data = {
        id: row.id,
        registerNo: row.register_no,
        date: row.date,
        time: row.time,
        event: row.event,
        hallId: row.hall_id || null,
        eventId: row.event_id || null,
        name: row.name,
        address: row.address,
        village: row.village,
        mobile: row.mobile,
        advanceAmount: row.advance_amount,
        totalAmount: row.total_amount,
        balanceAmount: row.balance_amount,
        remarks: row.remarks,
        transferTo: row.transfer_to_account,
        bookingStatus: row.status,
        // Extras
        cleaning: row.cleaning,
        chair: row.chair,
        eb: row.eb,
        gas: row.gas,
        ac: row.ac,
        // Check-in/out
        checkInDate: row.check_in_date,
        checkInTime: row.check_in_time,
        checkOutDate: row.check_out_date,
        checkOutTime: row.check_out_time,
      };
      res.json({ success: true, data });
    } catch (err) {
      console.error('GET /api/hall-bookings/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete hall booking
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const idNum = Number(id);

      // Validate ID is a valid number
      if (isNaN(idNum) || idNum <= 0) {
        console.error('Invalid hall booking ID for delete:', id);
        return res.status(400).json({ error: 'Invalid booking ID' });
      }

      // Get the data before deleting for logging
      const beforeRow = await db('marriage_hall_bookings').where({ id: idNum }).andWhere('temple_id', req.user.templeId).first();

      const result = await db('marriage_hall_bookings')
        .where({ id: idNum })
        .andWhere('temple_id', req.user.templeId)
        .del();

      if (!result) {
        return res.status(404).json({ error: 'Hall booking not found' });
      }

      // Cleanup journal mirror
      try {
        const hasJournal = await db.schema.hasTable('journal_entries');
        if (hasJournal) {
          await db('journal_entries')
            .where({ reference_type: 'hall_booking', reference_id: idNum, temple_id: req.user.templeId })
            .del();
        }
      } catch (e) {
        console.warn('Failed to cleanup hall booking journal mirror:', e);
      }

      // Log deletion with before snapshot
      try {
        await logHallBookingAction({
          hallBookingId: idNum,
          templeId: req.user.templeId,
          userId: req.user.id,
          action: 'delete',
          details: { before: beforeRow || null, after: null },
        });
        console.log('Successfully logged hall booking deletion for ID:', idNum);
      } catch (logError) {
        console.error('Failed to log hall booking deletion:', logError);
        // Don't fail the request if logging fails, but log the error
      }

      res.json({ success: true });
    } catch (err) {
      console.error('DELETE /api/hall-bookings/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
