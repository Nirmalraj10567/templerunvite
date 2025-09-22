const express = require('express');
const router = express.Router();

module.exports = function(deps = {}) {
  const { db } = deps;

  // List journal entries with optional filtering
  router.get('/entries', async (req, res) => {
    try {
      const {
        startDate,
        endDate,
        account,
        page = 1,
        limit = 20,
        excludeZero = true
      } = req.query;

      const pg = Math.max(parseInt(page, 10) || 1, 1);
      const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 1000);
      const offset = (pg - 1) * lim;

      let query = db('journal_entries')
        .where('temple_id', req.user.templeId)
        .orderBy('date', 'desc')
        .orderBy('created_at', 'desc');

      // Apply date filters
      if (startDate) {
        query = query.where('date', '>=', startDate);
      }
      if (endDate) {
        query = query.where('date', '<=', endDate);
      }

      // Apply account filter (either from or to account)
      if (account) {
        query = query.where((qb) => {
          qb.where('from_account', 'like', `%${account}%`)
            .orWhere('to_account', 'like', `%${account}%`);
        });
      }

      // Apply excludeZero filter
      if (excludeZero === 'true') {
        query = query.where('amount', '>', 0);
      }

      // Get total count for pagination
      const countQuery = query.clone().count('* as count');
      const [{ count }] = await countQuery;
      const total = parseInt(count, 10);
      const totalPages = Math.ceil(total / lim);

      // Get paginated results
      const entries = await query.limit(lim).offset(offset);

      res.json({
        success: true,
        data: entries,
        pagination: {
          total,
          page: pg,
          limit: lim,
          totalPages
        }
      });
    } catch (err) {
      console.error('GET /api/journal/entries error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get account balances
  router.get('/balance', async (req, res) => {
    try {
      const { account } = req.query;

      if (!account) {
        return res.status(400).json({ error: 'Account parameter required' });
      }

      // Calculate balance for the account
      const result = await db('journal_entries')
        .where('temple_id', req.user.templeId)
        .where((qb) => {
          qb.where('from_account', 'like', `%${account}%`)
            .orWhere('to_account', 'like', `%${account}%`);
        })
        .sum('amount as total');

      const balance = result[0].total || 0;

      res.json({
        success: true,
        data: {
          account,
          balance: parseFloat(balance)
        }
      });
    } catch (err) {
      console.error('GET /api/journal/balance error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get list of unique accounts
  router.get('/accounts', async (req, res) => {
    try {
      const accounts = await db('journal_entries')
        .where('temple_id', req.user.templeId)
        .distinct()
        .select('from_account', 'to_account')
        .orderBy('from_account');

      const uniqueAccounts = new Set();

      accounts.forEach(entry => {
        if (entry.from_account) uniqueAccounts.add(entry.from_account);
        if (entry.to_account) uniqueAccounts.add(entry.to_account);
      });

      res.json({
        success: true,
        data: Array.from(uniqueAccounts).sort()
      });
    } catch (err) {
      console.error('GET /api/journal/accounts error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create new journal entry
  router.post('/entries', async (req, res) => {
    try {
      const {
        date,
        from_account,
        to_account,
        amount,
        entry_type = 'transfer',
        remarks,
        reference_type,
        reference_id
      } = req.body;

      if (!date || !from_account || !to_account || !amount) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const entry = {
        date,
        from_account,
        to_account,
        amount: parseFloat(amount),
        entry_type,
        remarks,
        reference_type,
        reference_id,
        temple_id: req.user.templeId,
        created_by: req.user.id,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      };

      const result = await db('journal_entries').insert(entry);

      res.json({
        success: true,
        data: { id: result[0] }
      });
    } catch (err) {
      console.error('POST /api/journal/entries error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
