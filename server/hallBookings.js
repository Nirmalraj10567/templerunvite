const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');

module.exports = function(deps = {}) {
  const { db } = deps;

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
      const p = req.body || {};
      const record = {
        temple_id: req.user.templeId,
        register_no: p.registerNo || null,
        date: p.date || null,
        time: p.time || null,
        event: p.event || null,
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
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      };
      const inserted = await db('marriage_hall_bookings').insert(record).returning('*');
      res.json({ success: true, data: inserted[0] });
    } catch (err) {
      console.error('POST /api/hall-bookings error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update hall booking
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const p = req.body || {};
      
      const updateData = {
        register_no: p.registerNo || null,
        date: p.date || null,
        time: p.time || null,
        event: p.event || null,
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
        updated_at: db.fn.now(),
      };

      const result = await db('marriage_hall_bookings')
        .where({ id })
        .andWhere('temple_id', req.user.templeId)
        .update(updateData);
      
      if (!result) {
        return res.status(404).json({ error: 'Hall booking not found' });
      }
      
      const booking = await db('marriage_hall_bookings').where({ id }).first();
      res.json({ success: true, data: booking });
    } catch (err) {
      console.error('PUT /api/hall-bookings/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete hall booking
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await db('marriage_hall_bookings')
        .where({ id })
        .andWhere('temple_id', req.user.templeId)
        .del();
      
      if (!result) {
        return res.status(404).json({ error: 'Hall booking not found' });
      }
      
      res.json({ success: true });
    } catch (err) {
      console.error('DELETE /api/hall-bookings/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
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
        (r.address||'').replaceAll(',', ' '), (r.village||'').replaceAll(',', ' '), (r.mobile||'').replaceAll(',', ' '),
        r.advance_amount, r.total_amount, r.balance_amount, (r.remarks||'').replaceAll(',', ' '), (r.transfer_to_account||'').replaceAll(',', ' ')
      ].join(',')).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="hall_bookings.csv"');
      res.send(headers.join('\n') + '\n' + csv);
    } catch (err) {
      console.error('GET /api/hall-bookings/export error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
