const express = require('express');
const { authenticateToken } = require('../middleware');

function createTaxRegistrationsRouter(db) {
  const router = express.Router();

  router.get('/', authenticateToken, async (req, res) => {
    try {
      const { page = 1, pageSize = 20, search = '' } = req.query;
      const offset = (page - 1) * pageSize;
      
      let query = db('user_tax_registrations')
        .where('temple_id', req.user.templeId);
      
      if (search) {
        query = query.where(function() {
          this.where('name', 'like', `%${search}%`)
            .orWhere('mobile_number', 'like', `%${search}%`)
            .orWhere('reference_number', 'like', `%${search}%`);
        });
      }
      
      const data = await query
        .select('*')
        .limit(pageSize)
        .offset(offset)
        .orderBy('created_at', 'desc');
      
      const total = await query.clone().count('* as total').first();
      
      res.json({ 
        success: true, 
        data,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          total: total.total,
          totalPages: Math.ceil(total.total / pageSize)
        }
      });
    } catch (err) {
      console.error('Error fetching tax registrations:', err);
      res.status(500).json({ error: 'Failed to fetch tax registrations' });
    }
  });

  return router;
}

module.exports = createTaxRegistrationsRouter;
