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

  // Submit annadhanam request from mobile
  router.post('/submit', async (req, res) => {
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
        submitted_by_mobile: body.submitted_by_mobile
      };

      // Basic validations
      if (!p.name || !p.mobileNumber || !p.time || !p.fromDate || !p.toDate) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, mobileNumber, time, fromDate, toDate'
        });
      }

      if (new Date(p.fromDate) > new Date(p.toDate)) {
        return res.status(400).json({ success: false, error: 'From date cannot be later than to date' });
      }

      if (!/^[0-9]{10}$/.test(p.mobileNumber)) {
        return res.status(400).json({ success: false, error: 'Mobile number must be 10 digits' });
      }

      // Map donation type to stored fields (food string + peoples number)
      let storedFood = p.food || '';
      let storedPeoples = 1;

      if (p.donationType === 'product') {
        if (!p.productName || !p.quantity) {
          return res.status(400).json({ success: false, error: 'productName and quantity are required for product donation' });
        }
        storedFood = `Product: ${String(p.productName).trim()} | Qty: ${String(p.quantity).trim()}`;
        storedPeoples = 1;
      } else if (p.donationType === 'money') {
        if (!p.amount) {
          return res.status(400).json({ success: false, error: 'amount is required for money donation' });
        }
        storedFood = `Money: ${String(p.amount).trim()}`;
        storedPeoples = 1;
      } else {
        // Food (default/legacy)
        if (!storedFood) {
          return res.status(400).json({ success: false, error: 'food is required for food donation' });
        }
        if (p.peoples != null && p.peoples !== '') {
          const n = parseInt(p.peoples, 10);
          if (isNaN(n) || n < 1) {
            return res.status(400).json({ success: false, error: 'Number of people must be at least 1' });
          }
          storedPeoples = n;
        } else {
          storedPeoples = 1;
        }
      }

      const now = new Date();

      // Resolve a valid temple id
      let templeId = Number(req.body?.temple_id) || null;
      try {
        if (templeId) {
          const t = await db('temples').where({ id: templeId }).first();
          if (!t) templeId = null;
        }
        if (!templeId) {
          // Prefer the smallest/first id from temples table
          let row = null;
          try {
            row = await db('temples').min({ id: 'id' }).first();
          } catch {}
          templeId = Number(row?.id) || 1;
        }
      } catch {
        templeId = 1;
      }

      const record = {
        temple_id: templeId,
        receipt_number: await generateReceiptNumber(db, templeId),
        name: p.name,
        mobile_number: p.mobileNumber,
        food: storedFood,
        peoples: storedPeoples,
        time: p.time,
        from_date: p.fromDate,
        to_date: p.toDate,
        remarks: p.remarks || null,
        created_by: null, // Mobile submissions don't have user context
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      };

      // Detect optional columns and add them
      let hasStatus = false;
      let hasSubmittedBy = false;
      let hasSubmittedAt = false;
      try { hasStatus = await db.schema.hasColumn('annadhanam', 'status'); } catch {}
      try { hasSubmittedBy = await db.schema.hasColumn('annadhanam', 'submitted_by_mobile'); } catch {}
      try { hasSubmittedAt = await db.schema.hasColumn('annadhanam', 'submitted_at'); } catch {}

      if (hasStatus) record.status = 'pending';
      if (hasSubmittedBy) record.submitted_by_mobile = p.submitted_by_mobile || p.mobileNumber;
      if (hasSubmittedAt) record.submitted_at = now;

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
          templeId: templeId,
          userId: null, // Mobile submissions don't have user context
          action: 'create',
          details: createdRow || { ...record, id: insertedId },
        });
        console.log('Successfully logged annadhanam creation for ID:', insertedId);
      } catch (logError) {
        console.error('Failed to log annadhanam creation:', logError);
        // Don't fail the request if logging fails, but log the error
      }

      // Also log to approval logs if table exists
      try {
        await db('annadhanam_approval_logs').insert({
          annadhanam_id: insertedId,
          action: 'submitted',
          performed_by: null,
          performed_at: now,
          notes: `Submitted from mobile by ${p.submitted_by_mobile || p.mobileNumber}`,
          old_status: null,
          new_status: 'pending'
        });
      } catch (e) {
        // logs table may not exist yet; ignore
      }

      res.json({ success: true, message: 'Annadhanam request submitted successfully. Awaiting approval.', data: { id: insertedId, status: 'pending' } });
    } catch (err) {
      console.error('POST /api/annadhanam-mobile/submit error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // List with optional search and date filter (mobile version)
  router.get('/', async (req, res) => {
    try {
      const { q, from, to, page = 1, pageSize = 20, mobile_number, temple_id } = req.query;
      const pg = Math.max(parseInt(page, 10) || 1, 1);
      const ps = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
      const offset = (pg - 1) * ps;

      let query = db('annadhanam');
      
      // If temple_id is provided, filter by it (for multi-temple support)
      if (temple_id) {
        query = query.where('temple_id', temple_id);
      }
      
      // If mobile_number is provided, filter by it
      if (mobile_number) {
        query = query.where('mobile_number', mobile_number);
      }

      query = query.modify((qb) => {
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
      
      // Get total count for pagination
      let countQuery = db('annadhanam');
      if (temple_id) countQuery = countQuery.where('temple_id', temple_id);
      if (mobile_number) countQuery = countQuery.where('mobile_number', mobile_number);
      
      const totalResult = await countQuery.count('* as count').first();
      const total = totalResult.count;

      res.json({ 
        success: true, 
        data: rows, 
        page: pg, 
        pageSize: ps,
        total: total,
        totalPages: Math.ceil(total / ps)
      });
    } catch (err) {
      console.error('GET /api/annadhanam-mobile error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Get all annadhanam requests for a mobile number
  router.get('/my-requests', async (req, res) => {
    try {
      const { mobile_number } = req.query;
      
      if (!mobile_number) {
        return res.status(400).json({ 
          success: false, 
          error: 'Mobile number is required' 
        });
      }
      
      if (!/^\d{10}$/.test(mobile_number)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Mobile number must be 10 digits' 
        });
      }
      
      const requests = await db('annadhanam')
        .where('mobile_number', mobile_number)
        .orderBy('created_at', 'desc');
      
      return res.json({ 
        success: true, 
        data: requests,
        count: requests.length
      });
    } catch (error) {
      console.error('Error getting annadhanam requests:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to get requests' 
      });
    }
  });

  // Get user's submitted annadhanam requests
  router.get('/my-submitted-requests', async (req, res) => {
    try {
      const { mobile_number } = req.query;
      if (!mobile_number) {
        return res.status(400).json({ success: false, error: 'Mobile number is required' });
      }

      const rows = await db('annadhanam')
        .where('submitted_by_mobile', mobile_number)
        .select(
          'id',
          'receipt_number',
          'name',
          'mobile_number',
          'food',
          'peoples',
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

      res.json({ success: true, data: rows });
    } catch (err) {
      console.error('GET /api/annadhanam-mobile/my-requests error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Get single request details
  router.get('/request/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { mobile_number } = req.query;
      if (!mobile_number) {
        return res.status(400).json({ success: false, error: 'Mobile number is required' });
      }

      const request = await db('annadhanam')
        .where('id', id)
        .where('submitted_by_mobile', mobile_number)
        .first();

      if (!request) {
        return res.status(404).json({ success: false, error: 'Request not found' });
      }

      let logs = [];
      try {
        logs = await db('annadhanam_approval_logs')
          .where('annadhanam_id', id)
          .orderBy('performed_at', 'desc');
      } catch {}

      res.json({ success: true, data: { ...request, logs } });
    } catch (err) {
      console.error('GET /api/annadhanam-mobile/request/:id error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Cancel request (only if pending)
  router.put('/cancel/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { mobile_number, reason } = req.body || {};
      if (!mobile_number) {
        return res.status(400).json({ success: false, error: 'Mobile number is required' });
      }

      const reqRow = await db('annadhanam')
        .where('id', id)
        .where('submitted_by_mobile', mobile_number)
        .where('status', 'pending')
        .first();
      
      if (!reqRow) {
        return res.status(404).json({ success: false, error: 'Request not found or cannot be cancelled' });
      }

      const now = new Date();
      await db('annadhanam')
        .where('id', id)
        .update({ status: 'cancelled', updated_at: now });

      try {
        await db('annadhanam_approval_logs').insert({
          annadhanam_id: id,
          action: 'cancelled',
          performed_by: null,
          performed_at: now,
          notes: `Cancelled by user: ${reason || 'No reason provided'}`,
          old_status: 'pending',
          new_status: 'cancelled'
        });
      } catch {}

      res.json({ success: true, message: 'Request cancelled successfully' });
    } catch (err) {
      console.error('PUT /api/annadhanam-mobile/cancel/:id error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Update annadhanam entry (mobile version)
  router.put('/:id', async (req, res) => {
    try {
      console.log('🔍 Annadhanam mobile update API called');
      console.log('Request params:', req.params);
      console.log('Request body:', req.body);
      
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
          success: false,
          error: 'Missing required fields: name, mobileNumber, time, fromDate, toDate'
        });
      }

      if (new Date(p.fromDate) > new Date(p.toDate)) {
        return res.status(400).json({ success: false, error: 'From date cannot be later than to date' });
      }

      if (!/^[0-9]{10}$/.test(p.mobileNumber)) {
        return res.status(400).json({ success: false, error: 'Mobile number must be 10 digits' });
      }

      // Map donation type to stored fields (food string + peoples number)
      let storedFood = p.food || '';
      let storedPeoples = 1;

      if (p.donationType === 'product') {
        if (!p.productName || !p.quantity) {
          return res.status(400).json({ success: false, error: 'productName and quantity are required for product donation' });
        }
        storedFood = `Product: ${String(p.productName).trim()} | Qty: ${String(p.quantity).trim()}`;
        storedPeoples = 1;
      } else if (p.donationType === 'money') {
        if (!p.amount) {
          return res.status(400).json({ success: false, error: 'amount is required for money donation' });
        }
        storedFood = `Money: ${String(p.amount).trim()}`;
        storedPeoples = 1;
      } else {
        // Food (default/legacy)
        if (!storedFood) {
          return res.status(400).json({ success: false, error: 'food is required for food donation' });
        }
        if (p.peoples != null && p.peoples !== '') {
          const n = parseInt(p.peoples, 10);
          if (isNaN(n) || n < 1) {
            return res.status(400).json({ success: false, error: 'Number of people must be at least 1' });
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
        .update(updateData);
      
      if (!result) {
        return res.status(404).json({ success: false, error: 'Annadhanam entry not found' });
      }
      
      const annadhanam = await db('annadhanam').where({ id }).first();

      // Log update with before/after
      try {
        console.log('🔍 Attempting to log annadhanam update...');
        console.log('Log data:', {
          annadhanamId: id,
          templeId: annadhanam?.temple_id || 1,
          userId: null, // Mobile updates don't have user context
          action: 'update',
          details: { before: null, after: annadhanam || null }
        });
        
        await logAnnadhanamAction({
          annadhanamId: id,
          templeId: annadhanam?.temple_id || 1,
          userId: null, // Mobile updates don't have user context
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
      console.error('PUT /api/annadhanam-mobile/:id error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Delete annadhanam entry (mobile version)
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get the data before deleting for logging
      const beforeRow = await db('annadhanam').where({ id }).first();
      
      const result = await db('annadhanam')
        .where({ id })
        .del();
      
      if (!result) {
        return res.status(404).json({ success: false, error: 'Annadhanam entry not found' });
      }

      // Log deletion with before snapshot
      try {
        await logAnnadhanamAction({
          annadhanamId: id,
          templeId: beforeRow?.temple_id || 1,
          userId: null, // Mobile deletions don't have user context
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
      console.error('DELETE /api/annadhanam-mobile/:id error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Fetch annadhanam entries by mobile number (not limited to submitter)
  // Example: GET /api/annadhanam-mobile/by-mobile?mobile_number=9876543210&status=approved&from_date=2025-09-01&to_date=2025-09-30
  router.get('/by-mobile', async (req, res) => {
    try {
      const { mobile_number, status, from_date, to_date } = req.query;
      if (!mobile_number) {
        return res.status(400).json({ success: false, error: 'Mobile number is required' });
      }

      let query = db('annadhanam')
        .where('mobile_number', mobile_number)
        .orderBy('from_date', 'desc')
        .select(
          'id',
          'receipt_number',
          'name',
          'mobile_number',
          'food',
          'peoples',
          'time',
          'from_date',
          'to_date',
          'remarks',
          'status',
          'submitted_by_mobile',
          'submitted_at',
          'approved_at',
          'rejection_reason',
          'admin_notes',
          'created_at'
        );

      if (status && status !== 'all') {
        query = query.andWhere('status', status);
      }
      if (from_date) {
        query = query.andWhere('from_date', '>=', from_date);
      }
      if (to_date) {
        query = query.andWhere('to_date', '<=', to_date);
      }

      const results = await query;
      res.json({ success: true, data: results });
    } catch (err) {
      console.error('GET /api/annadhanam-mobile/by-mobile error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Fetch the latest annadhanam entry for a mobile number
  // Example: GET /api/annadhanam-mobile/latest?mobile_number=9876543210
  router.get('/latest', async (req, res) => {
    try {
      const { mobile_number } = req.query;
      if (!mobile_number) {
        return res.status(400).json({ success: false, error: 'Mobile number is required' });
      }

      const latest = await db('annadhanam')
        .where('mobile_number', mobile_number)
        .orderBy('created_at', 'desc')
        .first(
          'id',
          'receipt_number',
          'name',
          'mobile_number',
          'food',
          'peoples',
          'time',
          'from_date',
          'to_date',
          'remarks',
          'status',
          'submitted_by_mobile',
          'submitted_at',
          'approved_at',
          'rejection_reason',
          'admin_notes',
          'created_at'
        );

      if (!latest) {
        return res.json({ success: true, data: null });
      }
      
      res.json({ success: true, data: latest });
    } catch (err) {
      console.error('GET /api/annadhanam-mobile/latest error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Public: Get next receipt number (no token required)
  // Example: GET /api/annadhanam-mobile/next-receipt?templeId=1
  router.get('/next-receipt', async (req, res) => {
    try {
      const year = new Date().getFullYear();
      let templeId = Number(req.query.templeId) || null;
      try {
        if (templeId) {
          const t = await db('temples').where({ id: templeId }).first();
          if (!t) templeId = null;
        }
        if (!templeId) {
          let row = null;
          try {
            row = await db('temples').min({ id: 'id' }).first();
          } catch {}
          templeId = Number(row?.id) || 1;
        }
      } catch {
        templeId = 1;
      }

      const latest = await db('annadhanam')
        .where('temple_id', templeId)
        .where('receipt_number', 'like', `${year}-%`)
        .orderBy('id', 'desc')
        .first('receipt_number');

      let nextNumber = 1;
      if (latest && latest.receipt_number) {
        const parts = String(latest.receipt_number).split('-');
        if (parts.length === 2 && parts[0] === String(year)) {
          const n = parseInt(parts[1], 10);
          if (!isNaN(n)) nextNumber = n + 1;
        }
      }

      const receipt_number = `${year}-${String(nextNumber).padStart(4, '0')}`;
      res.json({ success: true, receipt_number, temple_id: templeId });
    } catch (err) {
      console.error('GET /api/annadhanam-mobile/next-receipt error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Get annadhanam request by receipt number or mobile number
  router.get('/get', async (req, res) => {
    try {
      const { receipt_number, mobile_number } = req.query;
      
      if (!receipt_number && !mobile_number) {
        return res.status(400).json({ success: false, error: 'Must provide either receipt_number or mobile_number' });
      }
      
      let query = db('annadhanam');
      
      if (receipt_number) {
        query = query.where('receipt_number', receipt_number);
      } else if (mobile_number) {
        query = query.where('mobile_number', mobile_number);
      }
      
      const request = await query.first();
      
      if (!request) {
        return res.status(404).json({ success: false, error: 'Request not found' });
      }
      
      return res.json({ success: true, data: request });
    } catch (error) {
      console.error('Error getting annadhanam request:', error);
      return res.status(500).json({ success: false, error: 'Failed to get request' });
    }
  });

  // Export to CSV (mobile version)
  router.get('/export', async (req, res) => {
    try {
      const { mobile_number, from, to } = req.query;
      
      let query = db('annadhanam');
      
      // If mobile_number is provided, filter by it
      if (mobile_number) {
        query = query.where('mobile_number', mobile_number);
      }
      
      if (from) query = query.andWhere('from_date', '>=', from);
      if (to) query = query.andWhere('to_date', '<=', to);
      
      const rows = await query.orderBy('from_date', 'desc');
      
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
      res.setHeader('Content-Disposition', 'attachment; filename="annadhanam-mobile.csv"');
      res.send(headers.join('\n') + '\n' + csv);
    } catch (err) {
      console.error('GET /api/annadhanam-mobile/export error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Get statistics (mobile version)
  router.get('/stats/summary', async (req, res) => {
    try {
      const { from, to, mobile_number } = req.query;
      
      let query = db('annadhanam');
      
      // If mobile_number is provided, filter by it
      if (mobile_number) {
        query = query.where('mobile_number', mobile_number);
      }
      
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
      console.error('GET /api/annadhanam-mobile/stats/summary error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Get all logs for mobile (MUST be before /:id route)
  router.get('/logs', async (req, res) => {
    try {
      console.log('🔍 Fetching all annadhanam logs for mobile');
      console.log('Query params:', req.query);
      
      const { mobile_number, page = 1, pageSize = 50 } = req.query;
      const pg = Math.max(parseInt(page, 10) || 1, 1);
      const ps = Math.min(200, Math.max(1, parseInt(pageSize, 10) || 50));
      const has = await db.schema.hasTable('annadhanam_logs');
      console.log('Table exists:', has);
      
      if (!has) {
        console.log('⚠️ annadhanam_logs table does not exist');
        return res.json({ success: true, data: [], total: 0, page: pg, pageSize: ps });
      }
      
      console.log('Building query...');
      const base = db('annadhanam_logs as l')
        .leftJoin('annadhanam as a', 'a.id', 'l.annadhanam_id');
      
      // If mobile_number is provided, filter by it
      if (mobile_number) {
        base.where('a.mobile_number', mobile_number);
      }
      
      console.log('Counting total logs...');
      const totalRow = await base.clone().count({ c: '*' }).first();
      const total = Number(totalRow?.c || totalRow?.count || 0);
      console.log('Total logs found:', total);
      
      console.log('Fetching logs with pagination...');
      const rows = await base.clone()
        .orderBy('l.created_at', 'desc')
        .orderBy('l.id', 'desc')
        .limit(ps)
        .offset((pg - 1) * ps)
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
      
      res.json({ success: true, data, total, page: pg, pageSize: ps });
    } catch (e) {
      console.error('Error fetching /api/annadhanam-mobile/logs:', e);
      res.status(500).json({ success: false, error: 'Failed to fetch logs' });
    }
  });

  // Get logs for a specific annadhanam entry (mobile version)
  router.get('/:id/logs', async (req, res) => {
    try {
      console.log('🔍 Fetching logs for annadhanam ID:', req.params.id);
      
      const { id } = req.params;
      const has = await db.schema.hasTable('annadhanam_logs');
      console.log('Table exists:', has);
      
      if (!has) {
        console.log('⚠️ annadhanam_logs table does not exist');
        return res.json({ success: true, data: [] });
      }

      console.log('Querying logs for annadhanam_id:', id);
      const logs = await db('annadhanam_logs')
        .where({ annadhanam_id: id })
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
      console.error('Error fetching /api/annadhanam-mobile/:id/logs:', e);
      res.status(500).json({ success: false, error: 'Failed to fetch logs' });
    }
  });

  return router;
};
