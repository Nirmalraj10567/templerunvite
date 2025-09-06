const express = require('express');
const router = express.Router();
const db = require('./db');
const { authenticateToken } = require('./middleware/auth');

// Create a new ledger entry
router.post('/api/ledger/entries', authenticateToken, async (req, res) => {
  try {
    const { 
      date, name, under, type, amount, 
      address, city, phone, mobile, email, note 
    } = req.body;

    if (!date || !name || type === undefined || amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const stmt = await db.prepare(`
      INSERT INTO ledger_entries (
        date, name, under, type, amount, 
        address, city, phone, mobile, email, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    await stmt.run(
      date, name, under || null, type, amount,
      address || null, city || null, phone || null, 
      mobile || null, email || null, note || null
    );
    await stmt.finalize();

    const balance = await calculateCurrentBalance();
    res.status(201).json({ message: 'Entry created', balance });
  } catch (error) {
    console.error('Error creating ledger entry:', error);
    res.status(500).json({ error: 'Failed to create ledger entry' });
  }
});

// Get all ledger entries with filters
router.get('/api/ledger/entries', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, type, under, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM ledger_entries WHERE 1=1';
    const params = [];
    
    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }
    
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    
    if (under) {
      query += ' AND under = ?';
      params.push(under);
    }
    
    // Add pagination
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countResult = await db.get(countQuery, params);
    
    query += ' ORDER BY date DESC, id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const entries = await db.all(query, params);
    
    res.json({
      data: entries,
      pagination: {
        total: countResult.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult.count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching ledger entries:', error);
    res.status(500).json({ error: 'Failed to fetch ledger entries' });
  }
});

// Get current balance
router.get('/api/ledger/balance', authenticateToken, async (req, res) => {
  try {
    const balance = await calculateCurrentBalance();
    res.json({ balance });
  } catch (error) {
    console.error('Error calculating balance:', error);
    res.status(500).json({ error: 'Failed to calculate balance' });
  }
});

// Get profit and loss statement
router.get('/api/ledger/profit-and-loss', authenticateToken, async (req, res) => {
  try {
    const { year } = req.query;
    let query = 'SELECT * FROM profit_and_loss';
    const params = [];
    
    if (year) {
      query += ' WHERE strftime("%Y", month || "-01") = ?';
      params.push(year.toString());
    }
    
    query += ' ORDER BY month DESC';
    
    const result = await db.all(query, params);
    res.json(result);
  } catch (error) {
    console.error('Error generating profit and loss:', error);
    res.status(500).json({ error: 'Failed to generate profit and loss statement' });
  }
});

// Get all categories
router.get('/api/ledger/categories', authenticateToken, async (req, res) => {
  try {
    const result = await db.all('SELECT DISTINCT under FROM ledger_entries WHERE under IS NOT NULL ORDER BY under');
    res.json(result.map(r => r.under));
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Helper function to calculate current balance
async function calculateCurrentBalance() {
  const result = await db.get(`
    SELECT 
      COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) as total_credits,
      COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) as total_debits
    FROM ledger_entries
  `);
  
  return (result.total_credits || 0) - (result.total_debits || 0);
}

module.exports = router;
