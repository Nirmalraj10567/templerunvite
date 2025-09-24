const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware to authenticate JWT token (using the same pattern as backend.js)
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET;

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Add route logging
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Ledger API: ${req.method} ${req.path}`);
  next();
});

// Create a new ledger entry
router.post('/entries', authenticateToken, async (req, res) => {
  try {
    const { 
      date, name, under, type, amount, 
      address, city, phone, mobile, email, note 
    } = req.body;

    if (!date || !name || type === undefined || amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['credit', 'debit'].includes(type)) {
      return res.status(400).json({ error: 'Type must be either credit or debit' });
    }

    if (isNaN(amount) || amount < 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    const [entryId] = await db('ledger_entries').insert({
      date,
      name,
      under: under || null,
      type,
      amount: parseFloat(amount),
      address: address || null,
      city: city || null,
      phone: phone || null,
      mobile: mobile || null,
      email: email || null,
      note: note || null,
      temple_id: req.user?.templeId || 1,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    const newEntry = await db('ledger_entries').where('id', entryId).first();
    res.status(201).json(newEntry);
  } catch (error) {
    console.error('Error creating ledger entry:', error);
    res.status(500).json({ error: 'Failed to create ledger entry' });
  }
});

// Get all ledger entries with filters
router.get('/entries', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, type, under, name, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = db('ledger_entries').where('temple_id', req.user?.templeId || 1);
    
    if (startDate) {
      query = query.where('date', '>=', startDate);
    }
    
    if (endDate) {
      query = query.where('date', '<=', endDate);
    }
    
    if (type) {
      query = query.where('type', type);
    }
    
    if (under) {
      query = query.where('under', under);
    }
    
    if (name) {
      // Partial match on name (case-insensitive where supported)
      const term = String(name).trim();
      if (term) {
        query = query.where('name', 'like', `%${term}%`);
      }
    }
    
    // Get total count for pagination
    const countQuery = query.clone();
    const totalResult = await countQuery.count('* as count').first();
    const total = totalResult.count;
    
    // Get paginated entries
    const entries = await query
      .orderBy('date', 'desc')
      .orderBy('id', 'desc')
      .limit(parseInt(limit))
      .offset(offset);
    
    res.json({
      data: entries,
      pagination: {
        total: total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching ledger entries:', error);
    res.status(500).json({ error: 'Failed to fetch ledger entries' });
  }
});

// Get a single ledger entry
router.get('/entries/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await db('ledger_entries')
      .where({ id })
      .andWhere('temple_id', req.user?.templeId || 1)
      .first();
    
    if (!entry) {
      return res.status(404).json({ error: 'Ledger entry not found' });
    }
    
    res.json(entry);
  } catch (error) {
    console.error('Error fetching ledger entry:', error);
    res.status(500).json({ error: 'Failed to fetch ledger entry' });
  }
});

// Update a ledger entry
router.put('/entries/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      date, name, under, type, amount, 
      address, city, phone, mobile, email, note 
    } = req.body;

    if (!date || !name || type === undefined || amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['credit', 'debit'].includes(type)) {
      return res.status(400).json({ error: 'Type must be either credit or debit' });
    }

    if (isNaN(amount) || amount < 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    const updated = await db('ledger_entries')
      .where({ id })
      .andWhere('temple_id', req.user?.templeId || 1)
      .update({
        date,
        name,
        under: under || null,
        type,
        amount: parseFloat(amount),
        address: address || null,
        city: city || null,
        phone: phone || null,
        mobile: mobile || null,
        email: email || null,
        note: note || null,
        updated_at: db.fn.now()
      });

    if (updated === 0) {
      return res.status(404).json({ error: 'Ledger entry not found' });
    }

    const updatedEntry = await db('ledger_entries')
      .where({ id })
      .andWhere('temple_id', req.user?.templeId || 1)
      .first();
    res.json(updatedEntry);
  } catch (error) {
    console.error('Error updating ledger entry:', error);
    res.status(500).json({ error: 'Failed to update ledger entry' });
  }
});

// Delete a ledger entry
router.delete('/entries/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await db('ledger_entries')
      .where({ id })
      .andWhere('temple_id', req.user?.templeId || 1)
      .del();
    
    if (deleted === 0) {
      return res.status(404).json({ error: 'Ledger entry not found' });
    }
    
    res.json({ message: 'Ledger entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting ledger entry:', error);
    res.status(500).json({ error: 'Failed to delete ledger entry' });
  }
});

// Get current balance
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const balance = await calculateCurrentBalance(req.user?.templeId || 1);
    res.json({ balance });
  } catch (error) {
    console.error('Error calculating balance:', error);
    res.status(500).json({ error: 'Failed to calculate balance' });
  }
});

// Get profit and loss statement
router.get('/profit-and-loss', authenticateToken, async (req, res) => {
  try {
    const { year, startDate, endDate, type, under, groupBy } = req.query;

    // Determine grouping: 'day' groups by exact date, default groups by month (YYYY-MM)
    const groupByDay = (groupBy === 'day');
    const periodExpr = groupByDay ? "date" : "strftime('%Y-%m', date)";

    let query = db('ledger_entries');

    // Apply filters safely
    if (year) {
      query = query.whereRaw("strftime('%Y', date) = ?", [year]);
    }
    if (startDate) {
      query = query.where('date', '>=', startDate);
    }
    if (endDate) {
      query = query.where('date', '<=', endDate);
    }
    if (type) {
      query = query.where('type', type);
    }
    if (under) {
      query = query.where('under', under);
    }

    const rows = await query
      .select(
        db.raw(`${periodExpr} as period`),
        db.raw("SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as total_income"),
        db.raw("SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as total_expenses"),
        db.raw("(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) - SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END)) as net_profit_loss")
      )
      .groupBy('period')
      .orderBy('period', 'desc');

    res.json(rows);
  } catch (error) {
    console.error('Error generating profit and loss:', error);
    res.status(500).json({ error: 'Failed to generate profit and loss statement' });
  }
});

// Get categories actually used in entries (distinct 'under' values)
// NOTE: The full master list of categories is served by backend.js at
// GET /api/ledger/categories from the ledger_categories table.
// This endpoint is intentionally named /categories-used to avoid conflicts.
router.get('/categories-used', authenticateToken, async (req, res) => {
  try {
    const templeId = req.user.templeId || req.query.templeId || 1;
    
    // Prefer temple-scoped categories derived from journal activity
    let accounts = [];
    try {
      const froms = await db('journal_entries')
        .distinct('from_account as name')
        .where('temple_id', templeId);
      const tos = await db('journal_entries')
        .distinct('to_account as name')
        .where('temple_id', templeId);
      const set = new Set();
      [...froms, ...tos].forEach(r => { if (r?.name) set.add(r.name); });
      accounts = Array.from(set);
    } catch (e) {
      accounts = [];
    }

    let categories = [];
    if (accounts.length) {
      try {
        // Map accounts to categories using ledger_entries name->under mapping
        const rows = await db('ledger_entries')
          .distinct('under')
          .whereIn('name', accounts)
          .where('temple_id', templeId)
          .whereNotNull('under')
          .andWhere('under', '!=', '')
          .orderBy('under');
        categories = rows.map(r => r.under).filter(Boolean);
      } catch (e) {
        categories = [];
      }
    }

    // Fallback to temple-scoped distinct-under if temple-scoped result is empty
    if (!categories.length) {
      const result = await db('ledger_entries')
        .distinct('under')
        .where('temple_id', templeId)
        .whereNotNull('under')
        .andWhere('under', '!=', '')
        .orderBy('under');
      categories = result.map(r => r.under).filter(Boolean);
    }

    res.json({ data: categories });
  } catch (error) {
    console.error('Error fetching categories-used:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get distinct ledger names for autocompletion (donor/receiver, etc.)
router.get('/names', authenticateToken, async (req, res) => {
  try {
    const rows = await db('ledger_entries')
      .distinct('name')
      .whereNotNull('name')
      .andWhere('name', '!=', '')
      .orderBy('name', 'asc');
    const names = rows.map(r => r.name);
    res.json({ data: names });
  } catch (error) {
    console.error('Error fetching ledger names:', error);
    res.status(500).json({ error: 'Failed to fetch ledger names' });
  }
});

// Helper function to calculate current balance
async function calculateCurrentBalance(templeId) {
  const result = await db('ledger_entries')
    .where('temple_id', templeId)
    .select(
      db.raw('COALESCE(SUM(CASE WHEN type = "credit" THEN amount ELSE 0 END), 0) as total_credits'),
      db.raw('COALESCE(SUM(CASE WHEN type = "debit" THEN amount ELSE 0 END), 0) as total_debits')
    )
    .first();
  
  return (result.total_credits || 0) - (result.total_debits || 0);
};

// Detailed cashflow by category (under)
// GET /api/ledger/cashflow/summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&includeEntries=0|1
router.get('/cashflow/summary', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, includeEntries, under } = req.query;
    const templeId = req.user?.templeId || 1;

    let base = db('ledger_entries').where('temple_id', templeId);
    if (startDate) base = base.where('date', '>=', startDate);
    if (endDate) base = base.where('date', '<=', endDate);
    if (under) base = base.where('under', under);

    // Summary by category
    const summaryRows = await base
      .clone()
      .select(
        'under',
        db.raw("COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) as total_credit"),
        db.raw("COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) as total_debit"),
        db.raw("COUNT(*) as entry_count")
      )
      .groupBy('under')
      .orderBy('under', 'asc');

    // Overall totals
    const totals = await base
      .clone()
      .select(
        db.raw("COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) as total_credit"),
        db.raw("COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) as total_debit")
      )
      .first();

    // Optionally include detailed entries per category
    let details = undefined;
    if (String(includeEntries) === '1') {
      const rows = await base
        .clone()
        .select('id', 'date', 'name', 'under', 'type', 'amount', 'note')
        .orderBy('date', 'desc')
        .orderBy('id', 'desc');
      // Group by under in memory
      details = rows.reduce((acc, r) => {
        const key = r.under || 'Uncategorized';
        if (!acc[key]) acc[key] = [];
        acc[key].push(r);
        return acc;
      }, {});
    }

    // Normalize under label
    const summary = summaryRows.map(r => ({
      category: r.under || 'Uncategorized',
      total_credit: Number(r.total_credit) || 0,
      total_debit: Number(r.total_debit) || 0,
      net: (Number(r.total_credit) || 0) - (Number(r.total_debit) || 0),
      entry_count: Number(r.entry_count) || 0,
    }));

    res.json({
      success: true,
      range: { startDate: startDate || null, endDate: endDate || null },
      totals: {
        total_credit: Number(totals?.total_credit || 0),
        total_debit: Number(totals?.total_debit || 0),
        net: Number(totals?.total_credit || 0) - Number(totals?.total_debit || 0),
      },
      summary,
      details: details || null,
    });
  } catch (error) {
    console.error('Error generating cashflow summary:', error);
    res.status(500).json({ error: 'Failed to generate cashflow summary' });
  }
});

// Bank-style statement for a single category with opening and running balance
// GET /api/ledger/cashflow/statement?under=Category&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/cashflow/statement', authenticateToken, async (req, res) => {
  try {
    const { under, startDate, endDate } = req.query;
    if (!under) return res.status(400).json({ error: "Parameter 'under' (category) is required" });
    const templeId = req.user?.templeId || 1;

    // Opening balance logic:
    // If a startDate is provided, opening = net (credits - debits) strictly BEFORE startDate.
    // If startDate is NOT provided, treat opening as 0 so that the closing balance
    // reflects net within the requested period (typically up to endDate) only.
    let opening_balance = 0;
    if (startDate) {
      let openBase = db('ledger_entries')
        .where('under', under)
        .andWhere('temple_id', templeId)
        .andWhere('date', '<', startDate);
      const opening = await openBase
        .select(
          db.raw("COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE 0 END), 0) as cr"),
          db.raw("COALESCE(SUM(CASE WHEN type='debit' THEN amount ELSE 0 END), 0) as dr")
        )
        .first();
      opening_balance = Number(opening?.cr || 0) - Number(opening?.dr || 0);
    }

    // Entries within the period
    let periodBase = db('ledger_entries')
      .where('under', under)
      .andWhere('temple_id', templeId);
    if (startDate) periodBase = periodBase.andWhere('date', '>=', startDate);
    if (endDate) periodBase = periodBase.andWhere('date', '<=', endDate);
    const entries = await periodBase
      .select('id', 'date', 'name', 'type', 'amount', 'note')
      .orderBy('date', 'asc')
      .orderBy('id', 'asc');

    // Compute running balance
    let running = opening_balance;
    const rows = entries.map((e) => {
      const amt = Number(e.amount || 0);
      if (e.type === 'credit') running += amt; else running -= amt;
      return {
        ...e,
        credit: e.type === 'credit' ? amt : 0,
        debit: e.type === 'debit' ? amt : 0,
        running_balance: running,
      };
    });

    // Period totals
    const totals = rows.reduce((acc, r) => ({ cr: acc.cr + r.credit, dr: acc.dr + r.debit }), { cr: 0, dr: 0 });
    const closing_balance = opening_balance + totals.cr - totals.dr;

    res.json({
      success: true,
      category: under,
      range: { startDate: startDate || null, endDate: endDate || null },
      opening_balance,
      totals: { credit: totals.cr, debit: totals.dr },
      closing_balance,
      entries: rows,
    });
  } catch (error) {
    console.error('Error generating category statement:', error);
    res.status(500).json({ error: 'Failed to generate category statement' });
  }
});

module.exports = router;
