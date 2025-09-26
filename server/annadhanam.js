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

  // Helper to write annadhanam logs
  async function logAnnadhanamAction({ annadhanamId, templeId, userId, action, details }) {
    try {
      const has = await db.schema.hasTable('annadhanam_logs');
      if (!has) {
        console.warn('annadhanam_logs table does not exist, creating it...');
        // Create the table if it doesn't exist
        await db.schema.createTable('annadhanam_logs', (table) => {
          table.increments('id').primary();
          table.integer('temple_id').notNullable().index();
          table.integer('annadhanam_id').notNullable().index();
          table.string('action').notNullable(); // create | update | delete
          table.text('details'); // JSON string with full snapshot/diff
          table.integer('created_by').nullable().index();
          table.timestamp('created_at').defaultTo(db.fn.now());
        });
        console.log('Created annadhanam_logs table');
      }
      
      const logData = {
        annadhanam_id: Number(annadhanamId),
        temple_id: Number(templeId),
        created_by: userId ? Number(userId) : null,
        action,
        details: details ? JSON.stringify(details) : null,
        created_at: db.fn.now(),
      };
      
      console.log('Inserting annadhanam log:', logData);
      await db('annadhanam_logs').insert(logData);
      console.log('Successfully inserted annadhanam log');
    } catch (e) {
      console.error('Failed to write annadhanam_logs:', e.message);
      console.error('Error details:', e);
      throw e; // Re-throw to let caller handle
    }
  }

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

  // Get all logs for the current temple (MUST be before /:id route)
  router.get('/logs', async (req, res) => {
    try {
      console.log('🔍 Fetching all annadhanam logs');
      console.log('User temple ID:', req.user.templeId);
      console.log('Query params:', req.query);
      
      const templeId = req.user.templeId;
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize, 10) || 50));
      const has = await db.schema.hasTable('annadhanam_logs');
      console.log('Table exists:', has);
      
      if (!has) {
        console.log('⚠️ annadhanam_logs table does not exist');
        return res.json({ success: true, data: [], total: 0, page, pageSize });
      }
      
      console.log('Building query for temple_id:', templeId);
      const base = db('annadhanam_logs as l')
        .leftJoin('annadhanam as a', 'a.id', 'l.annadhanam_id')
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
        .select('l.*', 'a.name as annadhanam_name', 'a.receipt_number as receipt_number');
      
      console.log('Query results:', rows.length, 'logs');
      console.log('Sample log data:', rows.slice(0, 2));
      
      const data = rows.map(r => ({
        id: r.id,
        annadhanam_id: r.annadhanam_id,
        action: r.action,
        created_at: r.created_at,
        created_by: r.created_by,
        annadhanam_name: r.annadhanam_name || null,
        receipt_number: r.receipt_number || null,
        details: (() => { try { return r.details ? JSON.parse(r.details) : null; } catch { return r.details; } })(),
      }));
      
      res.json({ success: true, data, total, page, pageSize });
    } catch (e) {
      console.error('Error fetching /api/annadhanam/logs:', e);
      res.status(500).json({ error: 'Failed to fetch logs' });
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

      // Log creation with full snapshot
      try {
        await logAnnadhanamAction({
          annadhanamId: insertedId,
          templeId: req.user.templeId,
          userId: req.user.id,
          action: 'create',
          details: createdRow || { ...record, id: insertedId },
        });
        console.log('Successfully logged annadhanam creation for ID:', insertedId);
      } catch (logError) {
        console.error('Failed to log annadhanam creation:', logError);
        // Don't fail the request if logging fails, but log the error
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
      console.log('🔍 Annadhanam update API called');
      console.log('Request params:', req.params);
      console.log('Request body:', req.body);
      console.log('User:', req.user);
      
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

      // Log update with before/after
      try {
        console.log('🔍 Attempting to log annadhanam update...');
        console.log('Log data:', {
          annadhanamId: id,
          templeId: req.user.templeId,
          userId: req.user.id,
          action: 'update',
          details: { before: null, after: annadhanam || null }
        });
        
        await logAnnadhanamAction({
          annadhanamId: id,
          templeId: req.user.templeId,
          userId: req.user.id,
          action: 'update',
          details: { before: null, after: annadhanam || null }, // We don't have before state in this context
        });
        console.log('✅ Successfully logged annadhanam update for ID:', id);
      } catch (logError) {
        console.error('❌ Failed to log annadhanam update:', logError);
        console.error('Log error details:', logError);
        // Don't fail the request if logging fails, but log the error
      }

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
      
      // Get the data before deleting for logging
      const beforeRow = await db('annadhanam').where({ id }).andWhere('temple_id', req.user.templeId).first();
      
      const result = await db('annadhanam')
        .where({ id })
        .andWhere('temple_id', req.user.templeId)
        .del();
      
      if (!result) {
        return res.status(404).json({ error: 'Annadhanam entry not found' });
      }

      // Log deletion with before snapshot
      try {
        await logAnnadhanamAction({
          annadhanamId: id,
          templeId: req.user.templeId,
          userId: req.user.id,
          action: 'delete',
          details: { before: beforeRow || null, after: null },
        });
        console.log('Successfully logged annadhanam deletion for ID:', id);
      } catch (logError) {
        console.error('Failed to log annadhanam deletion:', logError);
        // Don't fail the request if logging fails, but log the error
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

  // Get logs for a specific annadhanam entry
  router.get('/:id/logs', async (req, res) => {
    try {
      console.log('🔍 Fetching logs for annadhanam ID:', req.params.id);
      console.log('User temple ID:', req.user.templeId);
      
      const { id } = req.params;
      const templeId = req.user.templeId;
      const has = await db.schema.hasTable('annadhanam_logs');
      console.log('Table exists:', has);
      
      if (!has) {
        console.log('⚠️ annadhanam_logs table does not exist');
        return res.json({ success: true, data: [] });
      }

      console.log('Querying logs for annadhanam_id:', id, 'temple_id:', templeId);
      const logs = await db('annadhanam_logs')
        .where({ annadhanam_id: id, temple_id: templeId })
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
      console.error('Error fetching /api/annadhanam/:id/logs:', e);
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  });


  return router;
};
