const express = require('express');

function createMarriagesRouter({ db, authenticateToken, authorizeRole }) {
  const router = express.Router();

  // List with optional search and date filter
  router.get('/', authenticateToken, authorizeRole(['admin','superadmin']), async (req, res) => {
    try {
      const { q, from, to, page = 1, pageSize = 20 } = req.query;
      const pg = Math.max(parseInt(page, 10) || 1, 1);
      const ps = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
      const offset = (pg - 1) * ps;

      const query = db('marriage_registers')
        .where('temple_id', req.user.templeId)
        .modify((qb) => {
          if (q) {
            qb.andWhere((b) => {
              b.where('groom_name', 'like', `%${q}%`)
               .orWhere('bride_name', 'like', `%${q}%`)
               .orWhere('register_no', 'like', `%${q}%`)
               .orWhere('village', 'like', `%${q}%`);
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
      console.error('GET /api/marriages error:', err);
      res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  // Create new marriage record
  router.post('/', authenticateToken, authorizeRole(['admin','superadmin']), async (req, res) => {
    try {
      const payload = req.body || {};
      const record = {
        temple_id: req.user.templeId,
        register_no: payload.registerNo || null,
        date: payload.date || null,
        time: payload.time || null,
        event: payload.event || null,
        groom_name: payload.groomName || null,
        bride_name: payload.brideName || null,
        address: payload.address || null,
        village: payload.village || null,
        guardian_name: payload.guardianName || null,
        witness_one: payload.witnessOne || null,
        witness_two: payload.witnessTwo || null,
        remarks: payload.remarks || null,
        amount: typeof payload.amount === 'number' ? payload.amount : (payload.amount ? parseInt(payload.amount, 10) || 0 : 0),
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      };
      const inserted = await db('marriage_registers').insert(record).returning('*');
      res.json({ success: true, data: inserted[0] });
    } catch (err) {
      console.error('POST /api/marriages error:', err);
      res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  // Update marriage record
  router.put('/:id', authenticateToken, authorizeRole(['admin','superadmin']), async (req, res) => {
    try {
      const { id } = req.params;
      const payload = req.body || {};
      const update = {
        register_no: payload.registerNo ?? null,
        date: payload.date ?? null,
        time: payload.time ?? null,
        event: payload.event ?? null,
        groom_name: payload.groomName ?? null,
        bride_name: payload.brideName ?? null,
        address: payload.address ?? null,
        village: payload.village ?? null,
        guardian_name: payload.guardianName ?? null,
        witness_one: payload.witnessOne ?? null,
        witness_two: payload.witnessTwo ?? null,
        remarks: payload.remarks ?? null,
        amount: (payload.amount === undefined || payload.amount === null)
          ? undefined
          : (typeof payload.amount === 'number' ? payload.amount : (parseInt(payload.amount, 10) || 0)),
        updated_at: db.fn.now(),
      };
      
      const result = await db('marriage_registers')
        .where({ id })
        .andWhere('temple_id', req.user.templeId)
        .update(update);
        
      if (!result) {
        return res.status(404).json({ error: 'Not found' });
      }
      
      const row = await db('marriage_registers').where({ id }).first();
      res.json({ success: true, data: row });
      
    } catch (err) {
      console.error('PUT /api/marriages/:id error:', err);
      res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  // Delete marriage record
  router.delete('/:id', authenticateToken, authorizeRole(['admin','superadmin']), async (req, res) => {
    try {
      const { id } = req.params;
      const result = await db('marriage_registers')
        .where({ id })
        .andWhere('temple_id', req.user.templeId)
        .del();
        
      if (!result) {
        return res.status(404).json({ error: 'Not found' });
      }
      
      res.json({ success: true });
      
    } catch (err) {
      console.error('DELETE /api/marriages/:id error:', err);
      res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  // Export marriages to CSV
  router.get('/export', authenticateToken, authorizeRole(['admin','superadmin']), async (req, res) => {
    try {
      const rows = await db('marriage_registers')
        .where('temple_id', req.user.templeId)
        .orderBy('date', 'desc');
        
      const headers = [
        'id,register_no,date,time,event,groom_name,bride_name,address,village,guardian_name,witness_one,witness_two,remarks,amount'
      ];
      
      const csv = rows.map(r => [
        r.id, 
        r.register_no, 
        r.date, 
        r.time, 
        r.event, 
        r.groom_name, 
        r.bride_name,
        (r.address || '').replaceAll(',', ' '), 
        (r.village || '').replaceAll(',', ' '), 
        (r.guardian_name || '').replaceAll(',', ' '),
        (r.witness_one || '').replaceAll(',', ' '), 
        (r.witness_two || '').replaceAll(',', ' '), 
        (r.remarks || '').replaceAll(',', ' '),
        r.amount ?? 0
      ].join(',')).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="marriages.csv"');
      res.send(headers.join('\n') + '\n' + csv);
      
    } catch (err) {
      console.error('GET /api/marriages/export error:', err);
      res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  return router;
}

module.exports = createMarriagesRouter;
