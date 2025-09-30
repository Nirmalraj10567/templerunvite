const express = require('express');
const router = express.Router();
const db = require('../db');

// Import JWT at the top level
const jwt = require('jsonwebtoken');

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

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
  console.log(`[${new Date().toISOString()}] Accounting API: ${req.method} ${req.path}`);
  next();
});

// Helper function to validate journal entry balance
function validateJournalEntryBalance(entries) {
  const totalDebits = entries.reduce((sum, entry) => sum + (parseFloat(entry.debit_amount) || 0), 0);
  const totalCredits = entries.reduce((sum, entry) => sum + (parseFloat(entry.credit_amount) || 0), 0);
  const difference = Math.abs(totalDebits - totalCredits);
  return difference < 0.01; // Allow for small rounding differences
}

// Helper function to get account by code or ID
async function getAccountByCodeOrId(codeOrId, templeId) {
  if (typeof codeOrId === 'number' || !isNaN(parseInt(codeOrId))) {
    return await db('accounts').where({ id: parseInt(codeOrId), temple_id: templeId }).first();
  } else {
    return await db('accounts').where({ code: codeOrId, temple_id: templeId }).first();
  }
}

// ACCOUNTS MANAGEMENT

// Get all accounts
router.get('/accounts', authenticateToken, async (req, res) => {
  try {
    const templeId = req.user.templeId;
    const accounts = await db('accounts')
      .where({ temple_id: templeId })
      .orderBy(['type', 'category', 'name']);
    
    res.json({ success: true, data: accounts });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// Get single account
router.get('/accounts/:id', authenticateToken, async (req, res) => {
  try {
    const templeId = req.user.templeId;
    const account = await db('accounts')
      .where({ id: req.params.id, temple_id: templeId })
      .first();
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    res.json({ success: true, data: account });
  } catch (error) {
    console.error('Error fetching account:', error);
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

// Create new account
router.post('/accounts', authenticateToken, async (req, res) => {
  try {
    const templeId = req.user.templeId;
    const { code, name, type, category, parent_id, initial_balance, is_active } = req.body;

    // Validation
    if (!code || !name || !type || !category) {
      return res.status(400).json({ error: 'Missing required fields: code, name, type, category' });
    }

    if (!['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'].includes(type)) {
      return res.status(400).json({ error: 'Invalid account type' });
    }

    // Check for duplicate code within temple
    const existing = await db('accounts').where({ code, temple_id: templeId }).first();
    if (existing) {
      return res.status(400).json({ error: 'Account code already exists' });
    }

    const accountData = {
      code,
      name,
      type,
      category,
      parent_id: parent_id || null,
      initial_balance: parseFloat(initial_balance) || 0,
      current_balance: parseFloat(initial_balance) || 0,
      is_active: is_active !== false,
      temple_id: templeId
    };

    const [accountId] = await db('accounts').insert(accountData);
    const newAccount = await db('accounts').where({ id: accountId }).first();
    
    res.status(201).json({ success: true, data: newAccount });
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Update account
router.put('/accounts/:id', authenticateToken, async (req, res) => {
  try {
    const templeId = req.user.templeId;
    const { code, name, type, category, parent_id, initial_balance, is_active } = req.body;

    // Check if account exists and belongs to temple
    const account = await db('accounts').where({ id: req.params.id, temple_id: templeId }).first();
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Check for duplicate code (excluding current account)
    if (code && code !== account.code) {
      const existing = await db('accounts').where({ code, temple_id: templeId }).first();
      if (existing) {
        return res.status(400).json({ error: 'Account code already exists' });
      }
    }

    const updateData = {};
    if (code) updateData.code = code;
    if (name) updateData.name = name;
    if (type) updateData.type = type;
    if (category) updateData.category = category;
    if (parent_id !== undefined) updateData.parent_id = parent_id || null;
    if (initial_balance !== undefined) updateData.initial_balance = parseFloat(initial_balance) || 0;
    if (is_active !== undefined) updateData.is_active = is_active;

    await db('accounts').where({ id: req.params.id }).update(updateData);
    const updatedAccount = await db('accounts').where({ id: req.params.id }).first();
    
    res.json({ success: true, data: updatedAccount });
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// Delete account
router.delete('/accounts/:id', authenticateToken, async (req, res) => {
  try {
    const templeId = req.user.templeId;

    // Check if account exists and belongs to temple
    const account = await db('accounts').where({ id: req.params.id, temple_id: templeId }).first();
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Check if account has journal entries
    const hasEntries = await db('journal_entry_lines').where({ account_id: req.params.id }).first();
    if (hasEntries) {
      return res.status(400).json({ error: 'Cannot delete account with existing transactions' });
    }

    await db('accounts').where({ id: req.params.id }).del();
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Get account balance
router.get('/accounts/:id/balance', authenticateToken, async (req, res) => {
  try {
    const templeId = req.user.templeId;
    const { date } = req.query;

    // Check if account exists and belongs to temple
    const account = await db('accounts').where({ id: req.params.id, temple_id: templeId }).first();
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    let balance = account.current_balance;

    // If date is specified, calculate balance as of that date
    if (date) {
      const entries = await db('journal_entry_lines as jel')
        .join('journal_entries as je', 'jel.journal_entry_id', 'je.id')
        .where('jel.account_id', req.params.id)
        .where('je.temple_id', templeId)
        .where('je.date', '<=', date)
        .select('jel.debit_amount', 'jel.credit_amount');

      balance = account.initial_balance + entries.reduce((sum, entry) => {
        return sum + (parseFloat(entry.credit_amount) || 0) - (parseFloat(entry.debit_amount) || 0);
      }, 0);
    }

    res.json({ success: true, balance: parseFloat(balance) || 0 });
  } catch (error) {
    console.error('Error fetching account balance:', error);
    res.status(500).json({ error: 'Failed to fetch account balance' });
  }
});

// JOURNAL ENTRIES MANAGEMENT

// Get journal entries
router.get('/journal-entries', authenticateToken, async (req, res) => {
  try {
    const templeId = req.user.templeId;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const entries = await db('journal_entries')
      .where({ temple_id: templeId })
      .orderBy('date', 'desc')
      .orderBy('id', 'desc')
      .limit(limit)
      .offset(offset);

    // Get entry lines for each journal entry
    for (const entry of entries) {
      entry.entries = await db('journal_entry_lines as jel')
        .join('accounts as a', 'jel.account_id', 'a.id')
        .where('jel.journal_entry_id', entry.id)
        .select('jel.*', 'a.code as account_code', 'a.name as account_name');
    }

    const total = await db('journal_entries').where({ temple_id: templeId }).count('id as count').first();

    res.json({ 
      success: true, 
      data: entries, 
      total: total.count,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    res.status(500).json({ error: 'Failed to fetch journal entries' });
  }
});

// Get single journal entry
router.get('/journal-entries/:id', authenticateToken, async (req, res) => {
  try {
    const templeId = req.user.templeId;
    
    const entry = await db('journal_entries')
      .where({ id: req.params.id, temple_id: templeId })
      .first();
    
    if (!entry) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    // Get entry lines
    entry.entries = await db('journal_entry_lines as jel')
      .join('accounts as a', 'jel.account_id', 'a.id')
      .where('jel.journal_entry_id', entry.id)
      .select('jel.*', 'a.code as account_code', 'a.name as account_name');

    res.json({ success: true, data: entry });
  } catch (error) {
    console.error('Error fetching journal entry:', error);
    res.status(500).json({ error: 'Failed to fetch journal entry' });
  }
});

// Create journal entry
router.post('/journal-entries', authenticateToken, async (req, res) => {
  try {
    const templeId = req.user.templeId;
    const userId = req.user.id;
    const { date, reference_number, description, entries } = req.body;

    // Validation
    if (!date || !reference_number || !description || !entries || !Array.isArray(entries)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (entries.length < 2) {
      return res.status(400).json({ error: 'Journal entry must have at least 2 lines' });
    }

    // Validate balance
    if (!validateJournalEntryBalance(entries)) {
      return res.status(400).json({ error: 'Journal entry is not balanced. Debits must equal credits.' });
    }

    // Check for duplicate reference number
    const existing = await db('journal_entries').where({ reference_number, temple_id: templeId }).first();
    if (existing) {
      return res.status(400).json({ error: 'Reference number already exists' });
    }

    // Validate accounts exist
    for (const entry of entries) {
      const account = await getAccountByCodeOrId(entry.account_id || entry.account_code, templeId);
      if (!account) {
        return res.status(400).json({ error: `Account not found: ${entry.account_id || entry.account_code}` });
      }
      entry.resolved_account_id = account.id;
    }

    const totalAmount = entries.reduce((sum, entry) => sum + (parseFloat(entry.debit_amount) || 0), 0);

    // Start transaction
    const trx = await db.transaction();
    
    try {
      // Create journal entry
      const [journalEntryId] = await trx('journal_entries').insert({
        date,
        reference_number,
        description,
        total_amount: totalAmount,
        created_by: userId,
        temple_id: templeId
      });

      // Create journal entry lines
      for (const entry of entries) {
        await trx('journal_entry_lines').insert({
          journal_entry_id: journalEntryId,
          account_id: entry.resolved_account_id,
          debit_amount: parseFloat(entry.debit_amount) || 0,
          credit_amount: parseFloat(entry.credit_amount) || 0,
          description: entry.description || description
        });
      }

      await trx.commit();

      // Fetch the created entry with lines
      const newEntry = await db('journal_entries').where({ id: journalEntryId }).first();
      newEntry.entries = await db('journal_entry_lines as jel')
        .join('accounts as a', 'jel.account_id', 'a.id')
        .where('jel.journal_entry_id', journalEntryId)
        .select('jel.*', 'a.code as account_code', 'a.name as account_name');

      res.status(201).json({ success: true, data: newEntry });
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error creating journal entry:', error);
    res.status(500).json({ error: 'Failed to create journal entry' });
  }
});

// Update journal entry
router.put('/journal-entries/:id', authenticateToken, async (req, res) => {
  try {
    const templeId = req.user.templeId;
    const { date, reference_number, description, entries } = req.body;

    // Check if journal entry exists and belongs to temple
    const journalEntry = await db('journal_entries').where({ id: req.params.id, temple_id: templeId }).first();
    if (!journalEntry) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    // Validate balance if entries are provided
    if (entries && !validateJournalEntryBalance(entries)) {
      return res.status(400).json({ error: 'Journal entry is not balanced. Debits must equal credits.' });
    }

    // Check for duplicate reference number (excluding current entry)
    if (reference_number && reference_number !== journalEntry.reference_number) {
      const existing = await db('journal_entries').where({ reference_number, temple_id: templeId }).first();
      if (existing) {
        return res.status(400).json({ error: 'Reference number already exists' });
      }
    }

    const trx = await db.transaction();
    
    try {
      // Update journal entry header
      const updateData = {};
      if (date) updateData.date = date;
      if (reference_number) updateData.reference_number = reference_number;
      if (description) updateData.description = description;

      if (Object.keys(updateData).length > 0) {
        await trx('journal_entries').where({ id: req.params.id }).update(updateData);
      }

      // Update entry lines if provided
      if (entries) {
        // Delete existing lines
        await trx('journal_entry_lines').where({ journal_entry_id: req.params.id }).del();

        // Validate and create new lines
        for (const entry of entries) {
          const account = await getAccountByCodeOrId(entry.account_id || entry.account_code, templeId);
          if (!account) {
            throw new Error(`Account not found: ${entry.account_id || entry.account_code}`);
          }

          await trx('journal_entry_lines').insert({
            journal_entry_id: req.params.id,
            account_id: account.id,
            debit_amount: parseFloat(entry.debit_amount) || 0,
            credit_amount: parseFloat(entry.credit_amount) || 0,
            description: entry.description || description
          });
        }

        // Update total amount
        const totalAmount = entries.reduce((sum, entry) => sum + (parseFloat(entry.debit_amount) || 0), 0);
        await trx('journal_entries').where({ id: req.params.id }).update({ total_amount: totalAmount });
      }

      await trx.commit();

      // Fetch updated entry
      const updatedEntry = await db('journal_entries').where({ id: req.params.id }).first();
      updatedEntry.entries = await db('journal_entry_lines as jel')
        .join('accounts as a', 'jel.account_id', 'a.id')
        .where('jel.journal_entry_id', req.params.id)
        .select('jel.*', 'a.code as account_code', 'a.name as account_name');

      res.json({ success: true, data: updatedEntry });
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error updating journal entry:', error);
    res.status(500).json({ error: 'Failed to update journal entry' });
  }
});

// Delete journal entry
router.delete('/journal-entries/:id', authenticateToken, async (req, res) => {
  try {
    const templeId = req.user.templeId;

    // Check if journal entry exists and belongs to temple
    const journalEntry = await db('journal_entries').where({ id: req.params.id, temple_id: templeId }).first();
    if (!journalEntry) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    // Delete journal entry (lines will be deleted by CASCADE)
    await db('journal_entries').where({ id: req.params.id }).del();
    
    res.json({ success: true, message: 'Journal entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting journal entry:', error);
    res.status(500).json({ error: 'Failed to delete journal entry' });
  }
});

// REPORTS

// Trial Balance
router.get('/reports/trial-balance', authenticateToken, async (req, res) => {
  try {
    const templeId = req.user.templeId;
    const { date } = req.query;
    const asOfDate = date || new Date().toISOString().slice(0, 10);

    const accounts = await db('accounts')
      .where({ temple_id: templeId, is_active: true })
      .orderBy(['type', 'category', 'name']);

    const trialBalance = [];

    for (const account of accounts) {
      // Calculate balance as of date
      const entries = await db('journal_entry_lines as jel')
        .join('journal_entries as je', 'jel.journal_entry_id', 'je.id')
        .where('jel.account_id', account.id)
        .where('je.temple_id', templeId)
        .where('je.date', '<=', asOfDate)
        .select('jel.debit_amount', 'jel.credit_amount');

      const balance = account.initial_balance + entries.reduce((sum, entry) => {
        return sum + (parseFloat(entry.credit_amount) || 0) - (parseFloat(entry.debit_amount) || 0);
      }, 0);

      // Determine if balance should be shown as debit or credit based on account type
      const isDebitBalance = ['ASSET', 'EXPENSE'].includes(account.type);
      
      trialBalance.push({
        account_code: account.code,
        account_name: account.name,
        account_type: account.type,
        debit_balance: (isDebitBalance && balance > 0) ? Math.abs(balance) : 0,
        credit_balance: (!isDebitBalance && balance > 0) || (isDebitBalance && balance < 0) ? Math.abs(balance) : 0
      });
    }

    res.json({ success: true, data: trialBalance });
  } catch (error) {
    console.error('Error generating trial balance:', error);
    res.status(500).json({ error: 'Failed to generate trial balance' });
  }
});

// Balance Sheet
router.get('/reports/balance-sheet', authenticateToken, async (req, res) => {
  try {
    const templeId = req.user.templeId;
    const { date } = req.query;
    const asOfDate = date || new Date().toISOString().slice(0, 10);

    const accounts = await db('accounts')
      .where({ temple_id: templeId, is_active: true })
      .whereIn('type', ['ASSET', 'LIABILITY', 'EQUITY']);

    const balanceSheet = {
      assets: { current_assets: [], fixed_assets: [], total_assets: 0 },
      liabilities: { current_liabilities: [], long_term_liabilities: [], total_liabilities: 0 },
      equity: { items: [], total_equity: 0 }
    };

    for (const account of accounts) {
      // Calculate balance as of date
      const entries = await db('journal_entry_lines as jel')
        .join('journal_entries as je', 'jel.journal_entry_id', 'je.id')
        .where('jel.account_id', account.id)
        .where('je.temple_id', templeId)
        .where('je.date', '<=', asOfDate)
        .select('jel.debit_amount', 'jel.credit_amount');

      const balance = account.initial_balance + entries.reduce((sum, entry) => {
        return sum + (parseFloat(entry.credit_amount) || 0) - (parseFloat(entry.debit_amount) || 0);
      }, 0);

      if (Math.abs(balance) < 0.01) continue; // Skip zero balances

      const item = { name: account.name, amount: Math.abs(balance) };

      if (account.type === 'ASSET') {
        if (account.category.toLowerCase().includes('current')) {
          balanceSheet.assets.current_assets.push(item);
        } else {
          balanceSheet.assets.fixed_assets.push(item);
        }
        balanceSheet.assets.total_assets += Math.abs(balance);
      } else if (account.type === 'LIABILITY') {
        if (account.category.toLowerCase().includes('current')) {
          balanceSheet.liabilities.current_liabilities.push(item);
        } else {
          balanceSheet.liabilities.long_term_liabilities.push(item);
        }
        balanceSheet.liabilities.total_liabilities += Math.abs(balance);
      } else if (account.type === 'EQUITY') {
        balanceSheet.equity.items.push(item);
        balanceSheet.equity.total_equity += Math.abs(balance);
      }
    }

    res.json({ success: true, data: balanceSheet });
  } catch (error) {
    console.error('Error generating balance sheet:', error);
    res.status(500).json({ error: 'Failed to generate balance sheet' });
  }
});

// Income Statement
router.get('/reports/income-statement', authenticateToken, async (req, res) => {
  try {
    const templeId = req.user.templeId;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const accounts = await db('accounts')
      .where({ temple_id: templeId, is_active: true })
      .whereIn('type', ['INCOME', 'EXPENSE']);

    const incomeStatement = {
      income: { items: [], total_income: 0 },
      expenses: { items: [], total_expenses: 0 },
      net_income: 0
    };

    for (const account of accounts) {
      // Calculate balance for the period
      const entries = await db('journal_entry_lines as jel')
        .join('journal_entries as je', 'jel.journal_entry_id', 'je.id')
        .where('jel.account_id', account.id)
        .where('je.temple_id', templeId)
        .whereBetween('je.date', [start_date, end_date])
        .select('jel.debit_amount', 'jel.credit_amount');

      const balance = entries.reduce((sum, entry) => {
        return sum + (parseFloat(entry.credit_amount) || 0) - (parseFloat(entry.debit_amount) || 0);
      }, 0);

      if (Math.abs(balance) < 0.01) continue; // Skip zero balances

      const item = { name: account.name, amount: Math.abs(balance) };

      if (account.type === 'INCOME') {
        incomeStatement.income.items.push(item);
        incomeStatement.income.total_income += Math.abs(balance);
      } else if (account.type === 'EXPENSE') {
        incomeStatement.expenses.items.push(item);
        incomeStatement.expenses.total_expenses += Math.abs(balance);
      }
    }

    incomeStatement.net_income = incomeStatement.income.total_income - incomeStatement.expenses.total_expenses;

    res.json({ success: true, data: incomeStatement });
  } catch (error) {
    console.error('Error generating income statement:', error);
    res.status(500).json({ error: 'Failed to generate income statement' });
  }
});

module.exports = router;