const express = require('express');
const router = express.Router();

// Function to generate the next receipt number in format YYYY-XXXX
async function generateReceiptNumber(db, templeId) {
  const year = new Date().getFullYear();

  // Get the latest receipt number for this year
  const latest = await db('daybook_entries')
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

  // Helper to write daybook logs
  async function logDaybookAction({ daybookId, templeId, userId, action, details }) {
    try {
      const has = await db.schema.hasTable('daybook_logs');
      if (!has) {
        console.warn('daybook_logs table does not exist, skipping log...');
        return;
      }

      const logData = {
        daybook_entry_id: Number(daybookId),
        temple_id: Number(templeId),
        created_by: userId ? Number(userId) : null,
        action,
        details: details ? JSON.stringify(details) : null,
        created_at: db.fn.now(),
      };

      await db('daybook_logs').insert(logData);
    } catch (e) {
      console.error('Failed to write daybook_logs:', e.message);
    }
  }

  // Helper to calculate running balance
  async function calculateRunningBalance(db, templeId, entryDate, excludeId = null) {
    const query = db('daybook_entries')
      .where('temple_id', templeId)
      .where('entry_date', '<=', entryDate)
      .modify((qb) => {
        if (excludeId) {
          qb.whereNot('id', excludeId);
        }
      });

    const entries = await query.orderBy('entry_date', 'asc').orderBy('id', 'asc');
    
    let balance = 0;
    for (const entry of entries) {
      if (entry.entry_type === 'income') {
        balance += parseFloat(entry.amount || 0);
      } else if (entry.entry_type === 'expense') {
        balance -= parseFloat(entry.amount || 0);
      }
    }
    
    return balance;
  }

  // Global recalculation for a temple
  async function recalculateBalances(templeId) {
    try {
      const entries = await db('daybook_entries')
        .where('temple_id', templeId)
        .orderBy('entry_date', 'asc')
        .orderBy('id', 'asc');
      
      let balance = 0;
      for (const entry of entries) {
        if (entry.entry_type === 'income') {
          balance += parseFloat(entry.amount || 0);
        } else if (entry.entry_type === 'expense') {
          balance -= parseFloat(entry.amount || 0);
        }
        
        await db('daybook_entries')
          .where({ id: entry.id })
          .update({ running_balance: balance });
      }
    } catch (e) {
      console.error('Failed to recalculate daybook balances:', e.message);
    }
  }

  // List with optional search and date filter
  router.get('/', async (req, res) => {
    try {
      const { q, from, to, type, page = 1, pageSize = 50 } = req.query;
      const pg = Math.max(parseInt(page, 10) || 1, 1);
      const ps = Math.min(Math.max(parseInt(pageSize, 10) || 50, 1), 200);
      const offset = (pg - 1) * ps;

      const query = db('daybook_entries as d')
        .where('d.temple_id', req.user.templeId)
        .leftJoin('journal_entries as j', function() {
          this.on('d.reference_id', '=', 'j.id')
              .andOn('d.reference_type', '=', db.raw('?', ['donation']));
        })
        .select(
          'd.*',
          'j.from_account as journal_from_account',
          'j.to_account as journal_to_account'
        )
        .modify((qb) => {
          if (q) {
            qb.andWhere((b) => {
              b.where('d.description', 'like', `%${q}%`)
                .orWhere('d.receipt_number', 'like', `%${q}%`)
                .orWhere('d.party_name', 'like', `%${q}%`)
                .orWhere('d.party_mobile', 'like', `%${q}%`);
            });
          }
          if (from) qb.andWhere('d.entry_date', '>=', from);
          if (to) qb.andWhere('d.entry_date', '<=', to);
          if (type) {
            if (type === 'annadhanam') {
              qb.andWhere('d.reference_type', 'annadhanam');
            } else {
              qb.andWhere('d.entry_type', type);
            }
          }
        })
        .orderBy('d.created_at', 'desc')
        .orderBy('d.id', 'desc')
        .limit(ps)
        .offset(offset);

      const rows = await query;
      
      // Get total count
      const countQuery = db('daybook_entries')
        .where('temple_id', req.user.templeId)
        .modify((qb) => {
          if (q) {
            qb.andWhere((b) => {
              b.where('description', 'like', `%${q}%`)
                .orWhere('receipt_number', 'like', `%${q}%`)
                .orWhere('party_name', 'like', `%${q}%`)
                .orWhere('party_mobile', 'like', `%${q}%`);
            });
          }
          if (from) qb.andWhere('entry_date', '>=', from);
          if (to) qb.andWhere('entry_date', '<=', to);
          if (type) {
            if (type === 'annadhanam') {
              qb.andWhere('reference_type', 'annadhanam');
            } else {
              qb.andWhere('entry_type', type);
            }
          }
        });
      
      const [{ count }] = await countQuery.count('* as count');
      
      res.json({ 
        success: true, 
        data: rows,
        total: parseInt(count, 10),
        page: pg,
        pageSize: ps
      });
    } catch (err) {
      console.error('GET /api/daybook error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Preview next receipt number (not reserved until POST)
  router.get('/next-receipt', async (req, res) => {
    try {
      const next = await generateReceiptNumber(db, req.user.templeId);
      res.json({ success: true, receipt_number: next });
    } catch (err) {
      console.error('GET /api/daybook/next-receipt error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get all logs for the current temple (MUST be before /:id route)
  router.get('/logs', async (req, res) => {
    try {
      const templeId = req.user.templeId;
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize, 10) || 50));
      
      const has = await db.schema.hasTable('daybook_logs');
      if (!has) {
        return res.json({ success: true, data: [], total: 0, page, pageSize });
      }

      const base = db('daybook_logs as l')
        .leftJoin('daybook_entries as d', 'd.id', 'l.daybook_entry_id')
        .where('l.temple_id', templeId);

      const totalRow = await base.clone().count({ c: '*' }).first();
      const total = Number(totalRow?.c || totalRow?.count || 0);

      const rows = await base.clone()
        .orderBy('l.created_at', 'desc')
        .orderBy('l.id', 'desc')
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .select('l.*', 'd.description as entry_description', 'd.receipt_number as receipt_number');

      const data = rows.map(r => ({
        id: r.id,
        daybook_entry_id: r.daybook_entry_id,
        action: r.action,
        created_at: r.created_at,
        created_by: r.created_by,
        entry_description: r.entry_description || null,
        receipt_number: r.receipt_number || null,
        details: (() => { 
          try { 
            return r.details ? (typeof r.details === 'string' ? JSON.parse(r.details) : r.details) : null; 
          } catch { 
            return r.details; 
          } 
        })(),
      }));

      res.json({ success: true, data, total, page, pageSize });
    } catch (e) {
      console.error('Error fetching /api/daybook/logs:', e);
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  });

  // Get statistics/summary
  router.get('/stats/summary', async (req, res) => {
    try {
      const { from, to } = req.query;
      
      const query = db('daybook_entries')
        .where('temple_id', req.user.templeId)
        .modify((qb) => {
          if (from) qb.andWhere('entry_date', '>=', from);
          if (to) qb.andWhere('entry_date', '<=', to);
        });

      const stats = await query
        .select(
          db.raw('SUM(CASE WHEN entry_type = "income" THEN amount ELSE 0 END) as total_income'),
          db.raw('SUM(CASE WHEN entry_type = "expense" THEN amount ELSE 0 END) as total_expense'),
          db.raw('COUNT(*) as total_entries'),
          db.raw('SUM(CASE WHEN entry_type = "income" THEN 1 ELSE 0 END) as income_count'),
          db.raw('SUM(CASE WHEN entry_type = "expense" THEN 1 ELSE 0 END) as expense_count'),
          db.raw('SUM(CASE WHEN entry_type = "journal" THEN 1 ELSE 0 END) as journal_count')
        )
        .first();

      // Opening balance: total balance before 'from'
      let opening_balance = 0;
      if (from) {
        const obStats = await db('daybook_entries')
          .where('temple_id', req.user.templeId)
          .andWhere('entry_date', '<', from)
          .select(
            db.raw('SUM(CASE WHEN entry_type = "income" THEN amount ELSE 0 END) as total_income'),
            db.raw('SUM(CASE WHEN entry_type = "expense" THEN amount ELSE 0 END) as total_expense')
          )
          .first();
        opening_balance = parseFloat(obStats.total_income || 0) - parseFloat(obStats.total_expense || 0);
      }

      const period_net = parseFloat(stats.total_income || 0) - parseFloat(stats.total_expense || 0);
      const closing_balance = opening_balance + period_net;

      // Actual current balance (all time)
      const allTimeStats = await db('daybook_entries')
        .where('temple_id', req.user.templeId)
        .select(
          db.raw('SUM(CASE WHEN entry_type = "income" THEN amount ELSE 0 END) as all_time_income'),
          db.raw('SUM(CASE WHEN entry_type = "expense" THEN amount ELSE 0 END) as all_time_expense')
        )
        .first();

      const actual_current_balance = parseFloat(allTimeStats.all_time_income || 0) - parseFloat(allTimeStats.all_time_expense || 0);

      res.json({
        success: true,
        data: {
          ...stats,
          opening_balance,
          period_net,
          closing_balance,
          all_time_income: parseFloat(allTimeStats.all_time_income || 0),
          all_time_expense: parseFloat(allTimeStats.all_time_expense || 0),
          current_balance: actual_current_balance,
          period: { from, to }
        }
      });
    } catch (err) {
      console.error('GET /api/daybook/stats/summary error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Export to CSV
  router.get('/export', async (req, res) => {
    try {
      const { from, to, type } = req.query;
      
      const query = db('daybook_entries')
        .where('temple_id', req.user.templeId)
        .modify((qb) => {
          if (from) qb.andWhere(db.raw('DATE(created_at)'), '>=', from);
          if (to) qb.andWhere(db.raw('DATE(created_at)'), '<=', to);
          if (type) {
            if (type === 'annadhanam') {
              qb.andWhere('reference_type', 'annadhanam');
            } else {
              qb.andWhere('entry_type', type);
            }
          }
        })
        .orderBy('created_at', 'asc')
        .orderBy('id', 'asc');

      const rows = await query;

      // CSV headers
      const headers = ['Date', 'Receipt No', 'Type', 'Description', 'Party Name', 'Party Mobile', 'Payment Mode', 'Amount', 'Notes'];
      const csvContent = [
        headers.join(','),
        ...rows.map(row => [
          row.entry_date,
          row.receipt_number,
          row.entry_type,
          `"${(row.description || '').replace(/"/g, '""')}"`,
          `"${(row.party_name || '').replace(/"/g, '""')}"`,
          row.party_mobile || '',
          row.payment_mode || 'cash',
          row.amount,
          `"${(row.notes || '').replace(/"/g, '""')}"`
        ].join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="daybook_export_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } catch (err) {
      console.error('GET /api/daybook/export error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get single daybook entry
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const row = await db('daybook_entries')
        .where({ id, temple_id: req.user.templeId })
        .first();

      if (!row) {
        return res.status(404).json({ error: 'Daybook entry not found' });
      }

      res.json({ success: true, data: row });
    } catch (err) {
      console.error('GET /api/daybook/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get logs for a specific entry
  router.get('/:id/logs', async (req, res) => {
    try {
      const { id } = req.params;
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize, 10) || 50));

      const has = await db.schema.hasTable('daybook_logs');
      if (!has) {
        return res.json({ success: true, data: [], total: 0, page, pageSize });
      }

      const base = db('daybook_logs')
        .where('daybook_entry_id', id)
        .andWhere('temple_id', req.user.templeId);

      const totalRow = await base.clone().count({ c: '*' }).first();
      const total = Number(totalRow?.c || totalRow?.count || 0);

      const rows = await base.clone()
        .orderBy('created_at', 'desc')
        .orderBy('id', 'desc')
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const data = rows.map(r => ({
        ...r,
        details: (() => { 
          try { 
            return r.details ? (typeof r.details === 'string' ? JSON.parse(r.details) : r.details) : null; 
          } catch { 
            return r.details; 
          } 
        })(),
      }));

      res.json({ success: true, data, total, page, pageSize });
    } catch (err) {
      console.error('GET /api/daybook/:id/logs error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create daybook entry
  router.post('/', async (req, res) => {
    try {
      const body = req.body || {};

      // Validation
      const required = ['entry_date', 'entry_type', 'description', 'amount'];
      const missing = required.filter(field => !body[field]);
      if (missing.length > 0) {
        return res.status(400).json({ 
          error: `Missing required fields: ${missing.join(', ')}`,
          required 
        });
      }

      // Validate entry type
      if (!['income', 'expense', 'journal'].includes(body.entry_type)) {
        return res.status(400).json({ 
          error: 'Invalid entry_type. Must be: income, expense, or journal' 
        });
      }

      // Validate amount
      const amount = parseFloat(body.amount);
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Amount must be a positive number' });
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(body.entry_date)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      }

      // Validate mobile if provided
      if (body.party_mobile && !/^\d{10}$/.test(body.party_mobile.replace(/\s/g, ''))) {
        return res.status(400).json({ error: 'Invalid mobile number. Must be 10 digits' });
      }

      // Generate receipt number
      const receiptNumber = await generateReceiptNumber(db, req.user.templeId);

      // Calculate running balance
      const runningBalance = await calculateRunningBalance(db, req.user.templeId, body.entry_date);

      const entryData = {
        temple_id: req.user.templeId,
        entry_date: body.entry_date,
        entry_type: body.entry_type,
        description: body.description,
        reference_type: body.reference_type || null,
        reference_id: body.reference_id ? parseInt(body.reference_id) : null,
        receipt_number: receiptNumber,
        amount: amount,
        payment_mode: body.payment_mode || 'cash',
        party_name: body.party_name || null,
        party_mobile: body.party_mobile || null,
        notes: body.notes || null,
        running_balance: runningBalance,
        created_by: req.user.id,
      };

      const [id] = await db('daybook_entries').insert(entryData);
      
      // Recalculate all balances to keep them consistent
      await recalculateBalances(req.user.templeId);

      const created = await db('daybook_entries').where({ id }).first();

      // Log the action
      await logDaybookAction({
        daybookId: id,
        templeId: req.user.templeId,
        userId: req.user.id,
        action: 'created',
        details: { entry: created }
      });

      res.status(201).json({ success: true, data: created });
    } catch (err) {
      console.error('POST /api/daybook error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update daybook entry
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const body = req.body || {};

      // Check if entry exists
      const existing = await db('daybook_entries')
        .where({ id, temple_id: req.user.templeId })
        .first();

      if (!existing) {
        return res.status(404).json({ error: 'Daybook entry not found' });
      }

      // Validate entry type if provided
      if (body.entry_type && !['income', 'expense', 'journal'].includes(body.entry_type)) {
        return res.status(400).json({ 
          error: 'Invalid entry_type. Must be: income, expense, or journal' 
        });
      }

      // Validate amount if provided
      if (body.amount !== undefined) {
        const amount = parseFloat(body.amount);
        if (isNaN(amount) || amount <= 0) {
          return res.status(400).json({ error: 'Amount must be a positive number' });
        }
      }

      // Validate date format if provided
      if (body.entry_date) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(body.entry_date)) {
          return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
        }
      }

      // Validate mobile if provided
      if (body.party_mobile && !/^\d{10}$/.test(body.party_mobile.replace(/\s/g, ''))) {
        return res.status(400).json({ error: 'Invalid mobile number. Must be 10 digits' });
      }

      // Build update data
      const updateData = {};
      if (body.entry_date) updateData.entry_date = body.entry_date;
      if (body.entry_type) updateData.entry_type = body.entry_type;
      if (body.description) updateData.description = body.description;
      if (body.reference_type !== undefined) updateData.reference_type = body.reference_type;
      if (body.reference_id !== undefined) updateData.reference_id = body.reference_id ? parseInt(body.reference_id) : null;
      if (body.amount !== undefined) updateData.amount = parseFloat(body.amount);
      if (body.payment_mode !== undefined) updateData.payment_mode = body.payment_mode;
      if (body.party_name !== undefined) updateData.party_name = body.party_name;
      if (body.party_mobile !== undefined) updateData.party_mobile = body.party_mobile;
      if (body.notes !== undefined) updateData.notes = body.notes;

      // Recalculate running balance if date or type changed
      const entryDate = body.entry_date || existing.entry_date;
      const runningBalance = await calculateRunningBalance(db, req.user.templeId, entryDate, parseInt(id));
      updateData.running_balance = runningBalance;

      await db('daybook_entries')
        .where({ id, temple_id: req.user.templeId })
        .update(updateData);
      
      // Recalculate all balances
      await recalculateBalances(req.user.templeId);

      const updated = await db('daybook_entries').where({ id }).first();

      // Log the action
      await logDaybookAction({
        daybookId: id,
        templeId: req.user.templeId,
        userId: req.user.id,
        action: 'updated',
        details: { before: existing, after: updated }
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      console.error('PUT /api/daybook/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete daybook entry
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // Check if entry exists
      const existing = await db('daybook_entries')
        .where({ id, temple_id: req.user.templeId })
        .first();

      if (!existing) {
        return res.status(404).json({ error: 'Daybook entry not found' });
      }

      // Log the action before deletion
      await logDaybookAction({
        daybookId: id,
        templeId: req.user.templeId,
        userId: req.user.id,
        action: 'deleted',
        details: { entry: existing }
      });

      await db('daybook_entries')
        .where({ id, temple_id: req.user.templeId })
        .delete();
      
      // Recalculate all balances
      await recalculateBalances(req.user.templeId);

      res.json({ success: true, message: 'Daybook entry deleted successfully' });
    } catch (err) {
      console.error('DELETE /api/daybook/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
