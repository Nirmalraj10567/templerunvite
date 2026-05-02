const express = require('express');
const router = express.Router();

module.exports = function(deps = {}) {
  const { db } = deps;

  // Helper to write donation product logs
  async function logDonationProductAction({ donationId, templeId, userId, action, details }) {
    try {
      const has = await db.schema.hasTable('donation_product_logs');
      if (!has) {
        console.warn('donation_product_logs table does not exist, creating it...');
        // Create the table if it doesn't exist
        await db.schema.createTable('donation_product_logs', (table) => {
          table.increments('id').primary();
          table.integer('temple_id').notNullable().index();
          table.integer('donation_id').notNullable().index();
          table.string('action').notNullable(); // create | update | delete
          table.text('details'); // JSON string with full snapshot/diff
          table.integer('created_by').nullable().index();
          table.timestamp('created_at').defaultTo(db.fn.now());
        });
        console.log('Created donation_product_logs table');
      }
      
      const logData = {
        donation_id: Number(donationId),
        temple_id: Number(templeId),
        created_by: userId ? Number(userId) : null,
        action,
        details: details ? JSON.stringify(details) : null,
        created_at: db.fn.now(),
      };
      
      console.log('Inserting donation product log:', logData);
      await db('donation_product_logs').insert(logData);
      console.log('Successfully inserted donation product log');
    } catch (e) {
      console.error('Failed to write donation_product_logs:', e.message);
      console.error('Error details:', e);
      throw e; // Re-throw to let caller handle
    }
  }
  
  // Create donations table if it doesn't exist
  const initDb = async () => {
    const exists = await db.schema.hasTable('donations');
    if (!exists) {
      await db.schema.createTable('donations', table => {
        table.increments('id').primary();
        table.integer('temple_id').notNullable();
        table.string('register_no');
        table.string('product_name').notNullable();
        table.text('description');
        table.decimal('price', 10, 2).notNullable();
        table.integer('quantity').defaultTo(1);
        table.string('category');
        table.string('donor_name');
        table.string('donor_contact');
        table.date('donation_date');
        table.date('entry_date').nullable();
        table.enum('status', ['available', 'reserved', 'distributed']).defaultTo('available');
        table.text('notes');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
    } else {
      // Ensure register_no column exists for older databases
      const hasRegister = await db.schema.hasColumn('donations', 'register_no');
      if (!hasRegister) {
        await db.schema.table('donations', (table) => {
          table.string('register_no');
        });
      }
      // Ensure entry_date column exists
      const hasEntryDate = await db.schema.hasColumn('donations', 'entry_date');
      if (!hasEntryDate) {
        await db.schema.table('donations', (table) => {
          table.date('entry_date').nullable().after('register_no');
        });
      }
      // Ensure unit column exists
      const hasUnit = await db.schema.hasColumn('donations', 'unit');
      if (!hasUnit) {
        await db.schema.table('donations', (table) => {
          table.string('unit').nullable().after('quantity');
        });
      }
    }
  };

  // Initialize database
  initDb().catch(console.error);

  // Get all logs for the current temple (MUST be before /:id route)
  router.get('/logs', async (req, res) => {
    try {
      console.log('🔍 Fetching all donation product logs');
      console.log('User temple ID:', req.user.templeId);
      console.log('Query params:', req.query);
      
      const templeId = req.user.templeId;
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize, 10) || 50));
      const has = await db.schema.hasTable('donation_product_logs');
      console.log('Table exists:', has);
      
      if (!has) {
        console.log('⚠️ donation_product_logs table does not exist');
        return res.json({ success: true, data: [], total: 0, page, pageSize });
      }
      
      console.log('Building query for temple_id:', templeId);
      const base = db('donation_product_logs as l')
        .leftJoin('donations as d', 'd.id', 'l.donation_id')
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
        .select('l.*', 'd.product_name as donation_name', 'd.register_no as receipt_number');
      
      console.log('Query results:', rows.length, 'logs');
      console.log('Sample log data:', rows.slice(0, 2));
      
      const data = rows.map(r => ({
        id: r.id,
        donation_id: r.donation_id,
        action: r.action,
        created_at: r.created_at,
        created_by: r.created_by,
        donation_name: r.donation_name || null,
        receipt_number: r.receipt_number || null,
        details: (() => { try { return r.details ? JSON.parse(r.details) : null; } catch { return r.details; } })(),
      }));
      
      res.json({ success: true, data, total, page, pageSize });
    } catch (e) {
      console.error('Error fetching /api/donations/logs:', e);
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  });

  // Get logs for a specific donation entry
  router.get('/:id/logs', async (req, res) => {
    try {
      console.log('🔍 Fetching logs for donation ID:', req.params.id);
      console.log('User temple ID:', req.user.templeId);
      
      const { id } = req.params;
      const templeId = req.user.templeId;
      const has = await db.schema.hasTable('donation_product_logs');
      console.log('Table exists:', has);
      
      if (!has) {
        console.log('⚠️ donation_product_logs table does not exist');
        return res.json({ success: true, data: [] });
      }

      console.log('Querying logs for donation_id:', id, 'temple_id:', templeId);
      const logs = await db('donation_product_logs')
        .where({ donation_id: id, temple_id: templeId })
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
      console.error('Error fetching /api/donations/:id/logs:', e);
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  });

  // GET /api/donations - Get all donations for current temple (with search)
  router.get('/', async (req, res) => {
    try {
      const templeId = req.user.templeId;
      const q = (req.query.q || '').toString().trim();
      const from = (req.query.from || '').toString().trim();
      const to = (req.query.to || '').toString().trim();

      let query = db('donations').where('temple_id', templeId);

      if (from) query = query.andWhere('donation_date', '>=', from);
      if (to) query = query.andWhere('donation_date', '<=', to);

      if (q) {
        query = query.andWhere((builder) => {
          builder
            .where('donor_name', 'like', `%${q}%`)
            .orWhere('product_name', 'like', `%${q}%`)
            .orWhere('category', 'like', `%${q}%`)
            .orWhere('donor_contact', 'like', `%${q}%`)
            .orWhere('description', 'like', `%${q}%`)
            .orWhere('register_no', 'like', `%${q}%`);
        });
      }

      const donations = await query.orderBy('donation_date', 'desc').orderBy('id', 'desc');
      res.json({ success: true, data: donations });
    } catch (err) {
      console.error('GET /api/donations error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/donations/:id - Get a single donation (numeric id only)
  router.get('/:id(\\d+)', async (req, res) => {
    try {
      const { id } = req.params;
      const donation = await db('donations')
        .where({ id })
        .andWhere('temple_id', req.user.templeId)
        .first();
      
      if (!donation) {
        return res.status(404).json({ error: 'Donation not found' });
      }
      
      res.json({ success: true, data: donation });
    } catch (err) {
      console.error('GET /api/donations/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/donations - Create a new donation
  router.post('/', async (req, res) => {
    try {
      console.log('🔍 Creating donation product with data:', req.body);
      
      // Set default values if not provided
      const productName = req.body.productName || req.body.registerNo || req.body.name || '';
      const price = parseFloat(req.body.price || req.body.amount || 0);

      // Get current date in YYYY-MM-DD format
      const currentDate = new Date().toISOString().split('T')[0];
      
      // Safely parse quantity with validation
      const quantityValue = req.body.quantity || req.body.unit || 1;
      console.log('🔍 Raw quantity value:', quantityValue, 'Type:', typeof quantityValue);
      const parsedQuantity = parseInt(quantityValue, 10);
      console.log('🔍 Parsed quantity:', parsedQuantity, 'Is NaN:', isNaN(parsedQuantity));
      const quantity = isNaN(parsedQuantity) || parsedQuantity < 1 ? 1 : parsedQuantity;
      console.log('🔍 Final quantity:', quantity);

      const donationData = {
        temple_id: req.user.templeId,
        register_no: req.body.registerNo || null,
        // prefer explicit product field from UI; fallback to productName, then name
        product_name: req.body.product || req.body.productName || productName,
        description: req.body.description || req.body.reason || '',
        price: price,
        quantity: quantity,
        unit: req.body.unit || null,
        category: req.body.category || 'General',
        donor_name: req.body.donorName || req.body.name || 'Anonymous',
        donor_contact: req.body.donorContact || req.body.phone || '',
        entry_date: req.body.entryDate || req.body.date || currentDate,
        donation_date: req.body.bookingDate || req.body.donationDate || req.body.date || currentDate,
        status: req.body.status || 'available',
        notes: req.body.notes || '',
        transfer_to_account: req.body.transfer_to_account || req.body.transferTo || null
      };

      console.log('🔍 Final donation data to insert:', donationData);
      const [id] = await db('donations').insert(donationData);
      const donation = await db('donations').where({ id }).first();
      
      // Log creation with full snapshot
      try {
        await logDonationProductAction({
          donationId: id,
          templeId: req.user.templeId,
          userId: req.user.id,
          action: 'create',
          details: donation,
        });
        console.log('Successfully logged donation product creation for ID:', id);
      } catch (logError) {
        console.error('Failed to log donation product creation:', logError);
      }

      // Sync to Asset Management
      try {
        const hasAssets = await db.schema.hasTable('assets');
        if (hasAssets) {
          const existingAsset = await db('assets')
            .where({ temple_id: req.user.templeId })
            .where('name', 'like', `%Donation-${donation.id}%`)
            .first();
          if (!existingAsset) {
            await db('assets').insert({
              name: `Donation-${donation.id} - ${donation.donor_name || 'Anonymous'}`,
              details: `Product: ${donation.product_name} | Qty: ${donation.quantity} | Price: ₹${donation.price}`,
              value: donation.price || 0,
              quantity: donation.quantity || 1,
              remaining_quantity: donation.quantity || 1,
              asset_source: 'donation',
              donor_name: donation.donor_name,
              donor_contact: donation.donor_contact,
              status: donation.status === 'available' ? 'active' : 'disposed',
              created_by: req.user.id,
              temple_id: req.user.templeId,
              created_at: db.fn.now(),
              updated_at: db.fn.now(),
            });
            console.log('Synced donation product to assets');
          }
        }
      } catch (assetError) {
        console.error('Failed to sync donation to assets:', assetError.message);
      }
      
      res.json({ success: true, data: donation });
    } catch (err) {
      console.error('POST /api/donations error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PUT /api/donations/:id - Update a donation (numeric id only)
  router.put('/:id(\\d+)', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Safely parse quantity with validation for updates
      let quantity = req.body.quantity;
      if (quantity !== undefined && quantity !== null) {
        const parsedQuantity = parseInt(quantity, 10);
        quantity = isNaN(parsedQuantity) || parsedQuantity < 1 ? 1 : parsedQuantity;
      }

      const updateData = {
        product_name: req.body.product || req.body.productName,
        description: req.body.description,
        price: req.body.price,
        quantity: quantity,
        unit: req.body.unit || null,
        category: req.body.category,
        donor_name: req.body.donorName,
        donor_contact: req.body.donorContact,
        entry_date: req.body.entryDate,
        donation_date: req.body.bookingDate || req.body.donationDate,
        status: req.body.status,
        notes: req.body.notes,
        transfer_to_account: req.body.transfer_to_account ?? req.body.transferTo,
        updated_at: db.fn.now()
      };

      const result = await db('donations')
        .where({ id })
        .andWhere('temple_id', req.user.templeId)
        .update(updateData);
      
      if (!result) {
        return res.status(404).json({ error: 'Donation not found' });
      }
      
      const donation = await db('donations').where({ id }).first();
      
      // Log update with after snapshot
      try {
        console.log('🔍 Attempting to log donation product update...');
        console.log('Log data:', {
          donationId: id,
          templeId: req.user.templeId,
          userId: req.user.id,
          action: 'update',
          details: { before: null, after: donation || null }
        });
        
        await logDonationProductAction({
          donationId: id,
          templeId: req.user.templeId,
          userId: req.user.id,
          action: 'update',
          details: { before: null, after: donation || null }, // We don't have before state in this context
        });
        console.log('✅ Successfully logged donation product update for ID:', id);
      } catch (logError) {
        console.error('❌ Failed to log donation product update:', logError);
        console.error('Log error details:', logError);
        // Don't fail the request if logging fails, but log the error
      }
      
      res.json({ success: true, data: donation });
    } catch (err) {
      console.error('PUT /api/donations/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/donations/next-register-no - Get next register number for product donations
  router.get('/next-register-no', async (req, res) => {
    try {
      const currentYear = new Date().getFullYear();
      
      // Get the highest register number for current year from donations table
      const lastRecord = await db('donations')
        .where('temple_id', req.user.templeId)
        .where('register_no', 'like', `${currentYear}-%`)
        .orderBy('register_no', 'desc')
        .select('register_no')
        .first();

      let nextNumber = 1;
      
      if (lastRecord && lastRecord.register_no) {
        // Extract the number part after the year
        const parts = lastRecord.register_no.split('-');
        if (parts.length === 2 && parts[0] === String(currentYear)) {
          const lastNumber = parseInt(parts[1], 10);
          if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
          }
        }
      }

      const nextRegisterNo = `${currentYear}-${String(nextNumber).padStart(4, '0')}`;
      
      res.json({ 
        success: true, 
        nextRegisterNo,
        currentYear,
        nextNumber
      });
    } catch (err) {
      console.error('Error generating next register number for donations:', err);
      res.status(500).json({ error: 'Failed to generate next register number' });
    }
  });

  // DELETE /api/donations/:id - Delete a donation (numeric id only)
  router.delete('/:id(\\d+)', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get the data before deleting for logging
      const beforeRow = await db('donations').where({ id }).andWhere('temple_id', req.user.templeId).first();
      
      const result = await db('donations')
        .where({ id })
        .andWhere('temple_id', req.user.templeId)
        .del();
      
      if (!result) {
        return res.status(404).json({ error: 'Donation not found' });
      }
      
      // Log deletion with before snapshot
      try {
        await logDonationProductAction({
          donationId: id,
          templeId: req.user.templeId,
          userId: req.user.id,
          action: 'delete',
          details: { before: beforeRow || null, after: null },
        });
        console.log('Successfully logged donation product deletion for ID:', id);
      } catch (logError) {
        console.error('Failed to log donation product deletion:', logError);
        // Don't fail the request if logging fails, but log the error
      }
      
      res.json({ success: true });
    } catch (err) {
      console.error('DELETE /api/donations/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/donations/export - Export donations as CSV
  router.get('/export/csv', async (req, res) => {
    try {
      const rows = await db('donations')
        .where('temple_id', req.user.templeId)
        .orderBy('created_at', 'desc');
      
      const headers = [
        'id,product_name,description,price,quantity,category,donor_name,donor_contact,donation_date,status,notes,created_at,updated_at'
      ];
      
      const csv = rows.map(r => [
        r.id, r.product_name, (r.description||'').replaceAll(',', ' '), r.price, r.quantity,
        r.category, r.donor_name, r.donor_contact, r.donation_date, r.status,
        (r.notes||'').replaceAll(',', ' '), r.created_at, r.updated_at
      ].join(',')).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="donations.csv"');
      res.send(headers.join('\n') + '\n' + csv);
    } catch (err) {
      console.error('GET /api/donations/export error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
