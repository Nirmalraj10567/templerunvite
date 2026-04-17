const express = require('express');
const router = express.Router();

module.exports = function(deps = {}) {
  const { db, authenticateToken } = deps;

  // All routes require authentication
  if (authenticateToken) router.use(authenticateToken);

  // Get ALL donations (both money + products) - token based
  router.get('/all-donations', async (req, res) => {
    try {
      const { page = 1, pageSize = 10 } = req.query;
      
      // Use mobile from token OR allow param override
      const mobile_number = req.query.mobile_number || req.user?.mobile;
      if (!mobile_number) {
        return res.status(400).json({ success: false, error: 'Mobile number required' });
      }

      const limit = parseInt(pageSize, 10);
      const offset = (parseInt(page, 10) - 1) * limit;
      const templeId = req.user?.templeId;

      // Search by phone OR user's registered mobile
      let moneyQuery = db('money_donations').where('phone', mobile_number);
      if (req.user?.mobile && req.user.mobile !== mobile_number) {
        moneyQuery = moneyQuery.orWhere('phone', req.user.mobile);
      }
      if (templeId) moneyQuery = moneyQuery.andWhere('temple_id', templeId);
      
      const moneyTotal = await moneyQuery.clone().count('* as count').first();
      const moneyRows = (await moneyQuery
        .select('*')
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)).map(r => ({ ...r, type: 'money' }));

      // Get product donations
      let productQuery = db('donations').where('donor_contact', mobile_number);
      if (templeId) productQuery = productQuery.andWhere('temple_id', templeId);
      
      const productTotal = await productQuery.clone().count('* as count').first();
      const productRows = (await productQuery
        .select('*')
        .orderBy('submitted_at', 'desc')
        .limit(limit)
        .offset(offset)).map(r => ({ 
          ...r, 
          type: 'product',
          name: r.donor_name,
          phone: r.donor_contact,
          amount: r.price,
          date: r.donation_date
        }));

      // Combine and sort by date
      const allData = [...moneyRows, ...productRows].sort((a, b) => 
        new Date(b.created_at || b.date) - new Date(a.created_at || a.date)
      );

      const total = Number(moneyTotal?.count || 0) + Number(productTotal?.count || 0);

      res.json({
        success: true,
        data: allData.slice(0, limit),
        pagination: {
          page: parseInt(page, 10),
          pageSize: limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        breakdown: {
          moneyDonations: Number(moneyTotal?.count || 0),
          productDonations: Number(productTotal?.count || 0)
        }
      });
    } catch (err) {
      console.error('GET /api/money-donations-mobile/all-donations error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Get user's money donation requests - token based
  router.get('/my-requests', async (req, res) => {
    try {
      const { page = 1, pageSize = 10 } = req.query;
      
      // Use mobile from token OR allow override param for admin viewing
      const mobile_number = req.query.mobile_number || req.user?.mobile;
      if (!mobile_number) {
        return res.status(400).json({ success: false, error: 'Mobile number required' });
      }

      const limit = parseInt(pageSize, 10);
      const offset = (parseInt(page, 10) - 1) * limit;
      const templeId = req.user?.templeId;

      // Search by phone OR user mobile (allows user to see their donations)
      let base = db('money_donations').where('phone', mobile_number);
      
      // If token mobile different, also include results for user's registered mobile
      if (req.user?.mobile && req.user.mobile !== mobile_number) {
        base = base.orWhere('phone', req.user.mobile);
      }
      if (templeId) {
        base = base.andWhere('temple_id', templeId);
      }
      
      const totalRow = await base.clone().count('* as count').first();

      const rows = await base
        .select('*')
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      res.json({
        success: true,
        data: rows,
        pagination: {
          page: parseInt(page, 10),
          pageSize: limit,
          total: Number(totalRow?.count || 0),
          totalPages: Math.ceil(Number(totalRow?.count || 0) / limit)
        }
      });
    } catch (err) {
      console.error('GET /api/money-donations-mobile/my-requests error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Get single donation details
  router.get('/request/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const templeId = req.user?.templeId;

      let query = db('money_donations').where('id', id);
      if (templeId) query = query.andWhere('temple_id', templeId);
      
      const row = await query.first();
      if (!row) return res.status(404).json({ success: false, error: 'Not found' });

      res.json({ success: true, data: row });
    } catch (err) {
      console.error('GET /api/money-donations-mobile/request error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  return router;
};