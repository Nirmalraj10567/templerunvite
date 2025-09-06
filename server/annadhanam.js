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

      const query = db('annadhanam')
        .where('temple_id', req.user.templeId)
        .modify((qb) => {
          if (q) {
            qb.andWhere((b) => {
              b.where('name', 'like', `%${q}%`)
                .orWhere('receipt_number', 'like', `%${q}%`)
                .orWhere('mobile_number', 'like', `%${q}%`)
                .orWhere('food', 'like', `%${q}%`);
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
      console.error('GET /api/annadhanam error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get single annadhanam entry
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const row = await db('annadhanam')
        .where({ id })
        .andWhere('temple_id', req.user.templeId)
        .first();
      
      if (!row) {
        return res.status(404).json({ error: 'Annadhanam entry not found' });
      }
      
      res.json({ success: true, data: row });
    } catch (err) {
      console.error('GET /api/annadhanam/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create annadhanam entry
  router.post('/', async (req, res) => {
    try {
      const p = req.body || {};
      
      // Validate required fields
      if (!p.name || !p.mobileNumber || !p.food || !p.peoples || !p.time || !p.fromDate || !p.toDate) {
        return res.status(400).json({ 
          error: 'Missing required fields: name, mobileNumber, food, peoples, time, fromDate, toDate' 
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

      // Validate peoples count
      if (p.peoples < 1) {
        return res.status(400).json({ 
          error: 'Number of people must be at least 1' 
        });
      }

      const record = {
        temple_id: req.user.templeId,
        receipt_number: p.receiptNumber || null,
        name: p.name,
        mobile_number: p.mobileNumber,
        food: p.food,
        peoples: parseInt(p.peoples),
        time: p.time,
        from_date: p.fromDate,
        to_date: p.toDate,
        remarks: p.remarks || null,
        created_by: req.user.id,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      };

      const inserted = await db('annadhanam').insert(record).returning('*');
      res.json({ success: true, data: inserted[0] });
    } catch (err) {
      console.error('POST /api/annadhanam error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update annadhanam entry
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const p = req.body || {};
      
      // Validate required fields
      if (!p.name || !p.mobileNumber || !p.food || !p.peoples || !p.time || !p.fromDate || !p.toDate) {
        return res.status(400).json({ 
          error: 'Missing required fields: name, mobileNumber, food, peoples, time, fromDate, toDate' 
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

      // Validate peoples count
      if (p.peoples < 1) {
        return res.status(400).json({ 
          error: 'Number of people must be at least 1' 
        });
      }
      
      const updateData = {
        receipt_number: p.receiptNumber || null,
        name: p.name,
        mobile_number: p.mobileNumber,
        food: p.food,
        peoples: parseInt(p.peoples),
        time: p.time,
        from_date: p.fromDate,
        to_date: p.toDate,
        remarks: p.remarks || null,
        updated_at: db.fn.now(),
      };

      const result = await db('annadhanam')
        .where({ id })
        .andWhere('temple_id', req.user.templeId)
        .update(updateData);
      
      if (!result) {
        return res.status(404).json({ error: 'Annadhanam entry not found' });
      }
      
      const annadhanam = await db('annadhanam').where({ id }).first();
      res.json({ success: true, data: annadhanam });
    } catch (err) {
      console.error('PUT /api/annadhanam/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete annadhanam entry
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await db('annadhanam')
        .where({ id })
        .andWhere('temple_id', req.user.templeId)
        .del();
      
      if (!result) {
        return res.status(404).json({ error: 'Annadhanam entry not found' });
      }
      
      res.json({ success: true });
    } catch (err) {
      console.error('DELETE /api/annadhanam/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Export to CSV
  router.get('/export', async (req, res) => {
    try {
      const rows = await db('annadhanam')
        .where('temple_id', req.user.templeId)
        .orderBy('from_date', 'desc');
      
      const headers = [
        'id,receipt_number,name,mobile_number,food,peoples,time,from_date,to_date,remarks,created_at'
      ];
      
      const csv = rows.map(r => [
        r.id, 
        r.receipt_number, 
        r.name,
        r.mobile_number,
        (r.food || '').replaceAll(',', ' '), 
        r.peoples, 
        r.time, 
        r.from_date, 
        r.to_date, 
        (r.remarks || '').replaceAll(',', ' '),
        r.created_at
      ].join(',')).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="annadhanam.csv"');
      res.send(headers.join('\n') + '\n' + csv);
    } catch (err) {
      console.error('GET /api/annadhanam/export error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get statistics
  router.get('/stats/summary', async (req, res) => {
    try {
      const { from, to } = req.query;
      
      let query = db('annadhanam')
        .where('temple_id', req.user.templeId);
      
      if (from) query = query.andWhere('from_date', '>=', from);
      if (to) query = query.andWhere('to_date', '<=', to);
      
      const stats = await query
        .select(
          db.raw('COUNT(*) as total_entries'),
          db.raw('SUM(peoples) as total_people_served'),
          db.raw('AVG(peoples) as avg_people_per_entry')
        )
        .first();
      
      res.json({ success: true, data: stats });
    } catch (err) {
      console.error('GET /api/annadhanam/stats/summary error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
