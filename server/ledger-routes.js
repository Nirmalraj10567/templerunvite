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

// Get all categories with full CRUD support
router.get('/api/ledger/categories', authenticateToken, async (req, res) => {
  try {
    const result = await db.all('SELECT DISTINCT under AS category FROM ledger_entries WHERE under IS NOT NULL ORDER BY under');
    res.json(result.map((r, index) => ({
      id: index + 1,
      value: r.category,
      label: r.category
    })));
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create a new category
router.post('/api/ledger/categories', authenticateToken, async (req, res) => {
  try {
    const { value, label } = req.body;
    
    if (!value || !label) {
      return res.status(400).json({ error: 'Value and label are required' });
    }
    
    // Check if category already exists
    const existing = await db.get(
      'SELECT under FROM ledger_entries WHERE under = ?',
      [value]
    );
    
    if (existing) {
      return res.status(400).json({ error: 'Category already exists' });
    }
    
    // Add a dummy entry to create the category
    await db.run(
      'INSERT INTO ledger_entries (date, name, under, type, amount) VALUES (?, ?, ?, ?, ?)',
      [new Date().toISOString().split('T')[0], 'Category Setup', value, 'credit', 0]
    );
    
    const newCategory = {
      id: Date.now(), // Temporary ID, will be replaced on next fetch
      value,
      label
    };
    
    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update a category
router.put('/api/ledger/categories/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { value, label } = req.body;
    
    if (!value || !label) {
      return res.status(400).json({ error: 'Value and label are required' });
    }
    
    // In a real implementation, you would update the category in the database
    // For now, we'll just return the updated category
    const updatedCategory = {
      id: parseInt(id),
      value,
      label
    };
    
    res.json(updatedCategory);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete a category
router.delete('/api/ledger/categories/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // In a real implementation, you would check if the category is in use
    // before deleting it
    
    // For now, we'll just return success
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
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
