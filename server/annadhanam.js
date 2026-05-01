const express = require('express');
const router = express.Router();
const { sendNotification } = require('./config/firebase-notification');


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
  const { db, generateDaybookReceiptNumber, calculateDaybookRunningBalance } = deps;

  // Helper to sync annadhanam product donations to asset management
  async function syncAnnadhanamProductToAsset({ annadhanamId, templeId, userId, row }) {
    try {
      const donationType = row.donation_type || 'food';
      
      // Only sync product donations to assets
      if (donationType !== 'product') return;

      const hasAssets = await db.schema.hasTable('assets');
      if (!hasAssets) return;

      // Check if already synced
      const existing = await db('assets')
        .where({ temple_id: templeId, name: `Annadhanam - ${row.name || 'Product Donation'}` })
        .where('details', 'like', `%reference_id:${annadhanamId}%`)
        .first();
      if (existing) return;

      const productName = row.product_name || row.food?.replace('Product: ', '') || 'Product';
      const quantity = row.quantity || 1;
      const details = `Annadhanam Product Donation ID: ${annadhanamId} | ${productName} x ${quantity} | From: ${row.name} (${row.mobile_number})`;

      await db('assets').insert({
        name: `Annadhanam - ${row.name || 'Product Donation'}`,
        details: details,
        value: 0,
        asset_source: 'donation',
        donor_name: row.name || null,
        donor_contact: row.mobile_number || null,
        status: 'active',
        created_by: userId ? Number(userId) : null,
        temple_id: templeId,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });
      console.log(`Synced annadhanam product ${annadhanamId} to assets`);
    } catch (e) {
      console.error('Failed to sync annadhanam to assets:', e.message);
    }
  }

  // Helper to sync annadhanam to daybook (money = income, food = in_kind income, product = 0)
  async function syncAnnadhanamToDaybook({ annadhanamId, templeId, userId, row }) {
    try {
      const donationType = row.donation_type || 'food';
      const amount = Number(row.amount || 0);
      const peoples = Number(row.peoples || 1);

      const hasDaybook = await db.schema.hasTable('daybook_entries');
      if (!hasDaybook) return;

      let entryDate = row.entry_date || row.from_date;
      if (entryDate) {
        const d = new Date(entryDate);
        if (d.toString() !== 'Invalid Date') {
          entryDate = d.toISOString().slice(0, 10);
        }
      }
      if (!entryDate || typeof entryDate !== 'string' || entryDate.includes(' ')) {
        entryDate = new Date().toISOString().slice(0, 10);
      }

      // Check if already synced
      const existing = await db('daybook_entries')
        .where({ temple_id: templeId, reference_type: 'annadhanam', reference_id: Number(annadhanamId) })
        .first();
      if (existing) return;

      const receiptNumber = await generateDaybookReceiptNumber(templeId);

      let entryAmount = 0;
      let paymentMode = 'in_kind';

      if (donationType === 'money') {
        entryAmount = Math.abs(amount);
        paymentMode = 'cash';
      } else if (donationType === 'food') {
        entryAmount = 0;
        paymentMode = 'in_kind';
      } else if (donationType === 'product') {
        entryAmount = 0;
        paymentMode = 'in_kind';
      }

      await db('daybook_entries').insert({
        temple_id: templeId,
        entry_date: entryDate,
        entry_type: 'income',
        description: `Annadhanam - ${row.name || 'Anonymous'}`,
        reference_type: 'annadhanam',
        reference_id: Number(annadhanamId),
        receipt_number: receiptNumber,
        amount: entryAmount,
        payment_mode: paymentMode,
        party_name: row.name || null,
        party_mobile: row.mobile_number || null,
        notes: `${row.food || ''} (${peoples} people)`.trim(),
        running_balance: (typeof calculateDaybookRunningBalance === 'function' ? await calculateDaybookRunningBalance(templeId, entryDate) : 0) + entryAmount,
        created_by: userId ? Number(userId) : null,
        created_at: db.fn.now(),
      });
    } catch (e) {
      console.error('Failed to sync annadhanam to daybook:', e.message);
    }
  }

  async function removeAnnadhanamFromDaybook({ annadhanamId, templeId }) {
    try {
      const hasDaybook = await db.schema.hasTable('daybook_entries');
      if (!hasDaybook) return;

      await db('daybook_entries')
        .where({ temple_id: templeId, reference_type: 'annadhanam', reference_id: Number(annadhanamId) })
        .del();
    } catch (e) {
      console.error('Failed to remove annadhanam from daybook:', e.message);
    }
  }

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
        entryDate: body.entryDate ?? body.entry_date,
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
        // Food (default/legacy) or check for prefixes in food string
        if (!storedFood) {
          return res.status(400).json({ error: 'food is required for food donation' });
        }
        
        // Auto-detect donation type from food string if not provided
        if (!p.donationType) {
          if (storedFood.startsWith('Money:')) {
            p.donationType = 'money';
            p.amount = storedFood.replace(/^Money:\s*/i, '').trim();
          } else if (storedFood.startsWith('Product:')) {
            p.donationType = 'product';
          }
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
        entry_date: p.entryDate || new Date().toISOString().slice(0, 10),
        remarks: p.remarks || null,
        amount: p.amount ? Number(p.amount) : null,
        donation_type: p.donationType || 'food',
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
      }

      // Sync to daybook (all annadhanam entries)
      try {
        if (createdRow || record) {
          await syncAnnadhanamToDaybook({
            annadhanamId: insertedId,
            templeId: req.user.templeId,
            userId: req.user.id,
            row: createdRow || record,
          });
          console.log('Successfully synced annadhanam to daybook for ID:', insertedId);
        }
      } catch (daybookError) {
        console.error('Failed to sync annadhanam to daybook:', daybookError);
      }

      // Also create journal entry for income tracking
      try {
        if (createdRow || record) {
          const annadhanamRow = createdRow || record;
          if (annadhanamRow.amount && Number(annadhanamRow.amount) > 0) {
            const hasJournal = await db.schema.hasTable('journal_entries');
            if (hasJournal) {
              const entryDate = annadhanamRow.entry_date instanceof Date 
                ? annadhanamRow.entry_date.toISOString().slice(0, 10) 
                : String(annadhanamRow.entry_date || annadhanamRow.from_date).split('T')[0];
                
              await db('journal_entries').insert({
                date: entryDate,
                reference_number: 'ANN-' + insertedId + '-' + Date.now(),
                description: 'Annadhanam from ' + (annadhanamRow.name || 'Anonymous'),
                from_account: 'ANNADHANAM A/C',
                to_account: 'INCOME A/C',
                amount: Number(annadhanamRow.amount),
                total_amount: Number(annadhanamRow.amount),
                entry_type: 'transfer',
                remarks: annadhanamRow.remarks || null,
                reference_type: 'annadhanam',
                reference_id: insertedId,
                temple_id: req.user.templeId,
                created_by: req.user.id,
                created_at: db.fn.now(),
              });
              console.log('Created journal entry for annadhanam:', insertedId);
            }
          }
        }
      } catch (journalError) {
        console.error('Failed to create journal entry for annadhanam:', journalError);
      }

      // Sync product donations to asset management
      try {
        if (createdRow || record) {
          await syncAnnadhanamProductToAsset({
            annadhanamId: insertedId,
            templeId: req.user.templeId,
            userId: req.user.id,
            row: createdRow || record,
          });
        }
      } catch (assetError) {
        console.error('Failed to sync annadhanam to assets:', assetError);
      }

      // Send FCM notification to ALL temple users (admin submit)
      try {
        const templeUsers = await db('user_registrations')
          .where('temple_id', req.user.templeId)
          .whereNotNull('fcm_token')
          .select('fcm_token');
        
        const tokens = templeUsers.map(u => u.fcm_token).filter(Boolean);
        
        if (tokens.length > 0) {
          await sendNotification(
            tokens,
            'New Annadhanam Request',
            `${p.name} submitted an Annadhanam request for ${p.fromDate}. Awaiting approval.`,
            {
              type: 'annadhanam_submitted',
              annadhanamId: String(insertedId),
              submittedBy: p.name,
              templeId: String(req.user.templeId),
              status: 'pending'
            }
          );
          console.log(`✓ Sent submission notification to ${tokens.length} users in temple ${req.user.templeId}`);
        }
      } catch (notifyErr) {
        console.warn('Failed to send submission notification:', notifyErr.message);
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
        entryDate: body.entryDate ?? body.entry_date,
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
        // Food (default/legacy) or check for prefixes
        if (!storedFood) {
          return res.status(400).json({ error: 'food is required' });
        }
        
        // Auto-detect donation type from food string if not provided
        if (!p.donationType) {
          if (storedFood.startsWith('Money:')) {
            p.donationType = 'money';
            p.amount = storedFood.replace(/^Money:\s*/i, '').trim();
          } else if (storedFood.startsWith('Product:')) {
            p.donationType = 'product';
          }
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
        entry_date: p.entryDate,
        remarks: p.remarks || null,
        amount: p.amount ? Number(p.amount) : null,
        donation_type: p.donationType || 'food',
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

      // Sync journal mirror on update
      try {
        const hasJournal = await db.schema.hasTable('journal_entries');
        if (hasJournal) {
          await db('journal_entries')
            .where({ reference_type: 'annadhanam', reference_id: Number(id), temple_id: req.user.templeId })
            .del();
          const amountNum = Number(annadhanam?.amount || 0);
          if (amountNum > 0) {
            const entryDate = annadhanam.entry_date instanceof Date 
              ? annadhanam.entry_date.toISOString().slice(0, 10) 
              : String(annadhanam.entry_date || annadhanam.from_date).split('T')[0];

            await db('journal_entries').insert({
              date: entryDate,
              reference_number: 'ANN-' + id + '-' + Date.now(),
              description: 'Annadhanam from ' + (annadhanam.name || 'Anonymous'),
              total_amount: amountNum,
              from_account: 'ANNADHANAM A/C',
              to_account: 'INCOME A/C',
              amount: amountNum,
              entry_type: 'transfer',
              remarks: annadhanam.remarks || null,
              reference_type: 'annadhanam',
              reference_id: Number(id),
              temple_id: req.user.templeId,
              created_by: req.user.id,
              created_at: db.fn.now(),
            });
          }
        }
      } catch (e) {}

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
      }

      // Sync to daybook (all entries)
      try {
        if (annadhanam) {
          await syncAnnadhanamToDaybook({
            annadhanamId: id,
            templeId: req.user.templeId,
            userId: req.user.id,
            row: annadhanam,
          });
        }
      } catch (daybookError) {
        console.error('Failed to sync annadhanam update to daybook:', daybookError);
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
      }

      // Remove from daybook
      try {
        await removeAnnadhanamFromDaybook({
          annadhanamId: id,
          templeId: req.user.templeId,
        });
      } catch (daybookError) {
        console.error('Failed to remove annadhanam from daybook:', daybookError);
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
