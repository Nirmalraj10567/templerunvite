const express = require('express');
const router = express.Router();

// Function to generate the next receipt number in format YYYY-XXXX
async function generateReceiptNumber(db, templeId) {
  const year = new Date().getFullYear();
  
  // Get the latest receipt number for this year
  const latest = await db('annadhanam')
    .where('temple_id', templeId)
    .where('receipt_number', 'like', `${year}-%`)
    .orderBy('id', 'desc')
    .first();

  let nextNumber = 1;
  
  if (latest && latest.receipt_number) {
    const parts = latest.receipt_number.split('-');
    if (parts.length === 2 && parts[0] === year.toString()) {
      nextNumber = parseInt(parts[1], 10) + 1;
    }
  }
  
  // Format with leading zeros
  return `${year}-${String(nextNumber).padStart(4, '0')}`;
}

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

  // Preview next receipt number (not reserved until POST)
  router.get('/next-receipt', async (req, res) => {
    try {
      const next = await generateReceiptNumber(db, req.user.templeId);
      res.json({ success: true, receipt_number: next });
    } catch (err) {
      console.error('GET /api/annadhanam/next-receipt error:', err);
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
      const body = req.body || {};

      // Accept both snake_case and camelCase
      const p = {
        name: body.name,
        mobileNumber: body.mobileNumber ?? body.mobile_number,
        time: body.time,
        fromDate: body.fromDate ?? body.from_date,
        toDate: body.toDate ?? body.to_date,
        remarks: body.remarks,
        // Optional/legacy
        peoples: body.peoples,
        food: body.food,
        // New structured fields
        donationType: body.donationType ?? body.donation_type,
        productName: body.productName ?? body.product_name,
        quantity: body.quantity,
        amount: body.amount,
      };

      // Basic validations
      if (!p.name || !p.mobileNumber || !p.time || !p.fromDate || !p.toDate) {
        return res.status(400).json({
          error: 'Missing required fields: name, mobileNumber, time, fromDate, toDate'
        });
      }

      if (new Date(p.fromDate) > new Date(p.toDate)) {
        return res.status(400).json({ error: 'From date cannot be later than to date' });
      }

      if (!/^[0-9]{10}$/.test(p.mobileNumber)) {
        return res.status(400).json({ error: 'Mobile number must be 10 digits' });
      }

      // Map donation type to stored fields (food string + peoples number)
      let storedFood = p.food || '';
      let storedPeoples = 1;

      if (p.donationType === 'product') {
        if (!p.productName || !p.quantity) {
          return res.status(400).json({ error: 'productName and quantity are required for product donation' });
        }
        storedFood = `Product: ${String(p.productName).trim()} | Qty: ${String(p.quantity).trim()}`;
        storedPeoples = 1;
      } else if (p.donationType === 'money') {
        if (!p.amount) {
          return res.status(400).json({ error: 'amount is required for money donation' });
        }
        storedFood = `Money: ${String(p.amount).trim()}`;
        storedPeoples = 1;
      } else {
        // Food (default/legacy)
        if (!storedFood) {
          return res.status(400).json({ error: 'food is required for food donation' });
        }
        if (p.peoples != null && p.peoples !== '') {
          const n = parseInt(p.peoples, 10);
          if (isNaN(n) || n < 1) {
            return res.status(400).json({ error: 'Number of people must be at least 1' });
          }
          storedPeoples = n;
        } else {
          storedPeoples = 1;
        }
      }

      const record = {
        temple_id: req.user.templeId,
        receipt_number: await generateReceiptNumber(db, req.user.templeId),
        name: p.name,
        mobile_number: p.mobileNumber,
        food: storedFood,
        peoples: storedPeoples,
        time: p.time,
        from_date: p.fromDate,
        to_date: p.toDate,
        remarks: p.remarks || null,
        created_by: req.user.id,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      };

      // For SQLite3 recent versions, returning('*') works; for MySQL it doesn't.
      // Do an insert and then fetch the row using the inserted id for maximum compatibility.
      const insertResult = await db('annadhanam').insert(record);
      const insertedId = Array.isArray(insertResult) ? Number(insertResult[0]) : Number(insertResult);
      let createdRow = null;
      try {
        createdRow = await db('annadhanam').where({ id: insertedId }).first();
      } catch (e) {
        // Fallback: return minimal payload if select fails
        createdRow = { id: insertedId, ...record };
      }
      res.json({ success: true, data: createdRow });
    } catch (err) {
      console.error('POST /api/annadhanam error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update annadhanam entry
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const body = req.body || {};

      // Accept both snake_case and camelCase
      const p = {
        name: body.name,
        mobileNumber: body.mobileNumber ?? body.mobile_number,
        time: body.time,
        fromDate: body.fromDate ?? body.from_date,
        toDate: body.toDate ?? body.to_date,
        remarks: body.remarks,
        peoples: body.peoples,
        food: body.food,
        donationType: body.donationType ?? body.donation_type,
        productName: body.productName ?? body.product_name,
        quantity: body.quantity,
        amount: body.amount,
      };

      // Basic validations
      if (!p.name || !p.mobileNumber || !p.time || !p.fromDate || !p.toDate) {
        return res.status(400).json({
          error: 'Missing required fields: name, mobileNumber, time, fromDate, toDate'
        });
      }

      if (new Date(p.fromDate) > new Date(p.toDate)) {
        return res.status(400).json({ error: 'From date cannot be later than to date' });
      }

      if (!/^[0-9]{10}$/.test(p.mobileNumber)) {
        return res.status(400).json({ error: 'Mobile number must be 10 digits' });
      }

      // Map donation type to stored fields (food string + peoples number)
      let storedFood = p.food || '';
      let storedPeoples = 1;

      if (p.donationType === 'product') {
        if (!p.productName || !p.quantity) {
          return res.status(400).json({ error: 'productName and quantity are required for product donation' });
        }
        storedFood = `Product: ${String(p.productName).trim()} | Qty: ${String(p.quantity).trim()}`;
        storedPeoples = 1;
      } else if (p.donationType === 'money') {
        if (!p.amount) {
          return res.status(400).json({ error: 'amount is required for money donation' });
        }
        storedFood = `Money: ${String(p.amount).trim()}`;
        storedPeoples = 1;
      } else {
        // Food (default/legacy)
        if (!storedFood) {
          return res.status(400).json({ error: 'food is required for food donation' });
        }
        if (p.peoples != null && p.peoples !== '') {
          const n = parseInt(p.peoples, 10);
          if (isNaN(n) || n < 1) {
            return res.status(400).json({ error: 'Number of people must be at least 1' });
          }
          storedPeoples = n;
        } else {
          storedPeoples = 1;
        }
      }
      
      const updateData = {
        // Do NOT update receipt_number on PUT; keep original
        name: p.name,
        mobile_number: p.mobileNumber,
        food: storedFood,
        peoples: storedPeoples,
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
