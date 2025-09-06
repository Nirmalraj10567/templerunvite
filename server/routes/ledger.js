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
  const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';

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
    const { startDate, endDate, type, under, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = db('ledger_entries');
    
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
    const entry = await db('ledger_entries').where('id', id).first();
    
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
      .where('id', id)
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

    const updatedEntry = await db('ledger_entries').where('id', id).first();
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
    
    const deleted = await db('ledger_entries').where('id', id).del();
    
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
    const balance = await calculateCurrentBalance();
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

// Get all categories (distinct 'under' values)
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const result = await db('ledger_entries')
      .distinct('under')
      .whereNotNull('under')
      .orderBy('under');
    
    const categories = result.map(r => r.under);
    res.json({ data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Helper function to calculate current balance
async function calculateCurrentBalance() {
  const result = await db('ledger_entries')
    .select(
      db.raw('COALESCE(SUM(CASE WHEN type = "credit" THEN amount ELSE 0 END), 0) as total_credits'),
      db.raw('COALESCE(SUM(CASE WHEN type = "debit" THEN amount ELSE 0 END), 0) as total_debits')
    )
    .first();
  
  return (result.total_credits || 0) - (result.total_debits || 0);
}

module.exports = router;
