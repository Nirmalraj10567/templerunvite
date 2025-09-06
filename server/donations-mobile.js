const express = require('express');
const router = express.Router();

module.exports = function(deps = {}) {
  const { db } = deps;

  // Submit donation request from mobile
  router.post('/submit', async (req, res) => {
    try {
      const {
        product_name,
        description,
        price,
        quantity,
        category,
        donor_name,
        donor_contact,
        donation_date,
        submitted_by_mobile
      } = req.body;

      // Basic validation
      if (!product_name || !price || !submitted_by_mobile) {
        return res.status(400).json({
          success: false,
          error: 'product_name, price and submitted_by_mobile are required'
        });
      }

      const [id] = await db('donations').insert({
        temple_id: 1,
        product_name,
        description: description || null,
        price: Number(price),
        quantity: parseInt(quantity || 1, 10),
        category: category || null,
        donor_name: donor_name || null,
        donor_contact: donor_contact || submitted_by_mobile,
        donation_date: donation_date || new Date().toISOString().slice(0,10),
        status: 'available',
        approval_status: 'pending',
        submitted_by_mobile,
        submitted_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Log submission
      await db('donations_approval_logs').insert({
        donation_id: id,
        action: 'submitted',
        performed_by: null,
        performed_at: new Date(),
        notes: `Submitted from mobile by ${submitted_by_mobile}`,
        old_status: null,
        new_status: 'pending'
      });

      res.json({ success: true, message: 'Donation submitted successfully. Awaiting approval.', data: { id, approval_status: 'pending' } });
    } catch (err) {
      console.error('POST /api/donations-mobile/submit error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Get user's submitted donation requests (with pagination & optional status)
  router.get('/my-requests', async (req, res) => {
    try {
      const { mobile_number, page = 1, pageSize = 10, status } = req.query;

      if (!mobile_number) {
        return res.status(400).json({ success: false, error: 'Mobile number is required' });
      }

      const limit = parseInt(pageSize, 10);
      const offset = (parseInt(page, 10) - 1) * limit;

      let base = db('donations').where('donor_contact', mobile_number);
    /*  if (status && status !== 'all') {
        base = base.andWhere('approval_status', status);
      }
*/
      const totalRow = await base.clone().count('* as count').first();

      const rows = await base
        .select(
          'id',
          'product_name',
          'description',
          'price',
          'quantity',
          'category',
          'donor_name',
          'donor_contact',
          'donation_date',
          'status',
          'approval_status',
          'submitted_by_mobile',
          'submitted_at',
          'approved_at',
          'rejection_reason',
          'admin_notes'
        )
        .orderBy('submitted_at', 'desc')
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
      console.error('GET /api/donations-mobile/my-requests error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Get single donation request details + logs (owner-only by mobile)
  router.get('/request/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { mobile_number } = req.query;

      if (!mobile_number) {
        return res.status(400).json({ success: false, error: 'Mobile number is required' });
      }

      const request = await db('donations')
        .where('id', id)
        .andWhere('submitted_by_mobile', mobile_number)
        .first();

      if (!request) {
        return res.status(404).json({ success: false, error: 'Request not found' });
      }

      const logs = await db('donations_approval_logs')
        .where('donation_id', id)
        .orderBy('performed_at', 'desc');

      res.json({ success: true, data: { ...request, logs } });
    } catch (err) {
      console.error('GET /api/donations-mobile/request/:id error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Cancel donation request (only if pending and owned)
  router.put('/cancel/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { mobile_number, reason } = req.body;

      if (!mobile_number) {
        return res.status(400).json({ success: false, error: 'Mobile number is required' });
      }

      const request = await db('donations')
        .where('id', id)
        .andWhere('submitted_by_mobile', mobile_number)
        .andWhere('approval_status', 'pending')
        .first();

      if (!request) {
        return res.status(404).json({ success: false, error: 'Request not found or cannot be cancelled' });
      }

      await db('donations')
        .where('id', id)
        .update({
          approval_status: 'cancelled',
          updated_at: new Date()
        });

      await db('donations_approval_logs').insert({
        donation_id: id,
        action: 'cancelled',
        performed_by: null,
        performed_at: new Date(),
        notes: `Cancelled by user: ${reason || 'No reason provided'}`,
        old_status: 'pending',
        new_status: 'cancelled'
      });

      res.json({ success: true, message: 'Request cancelled successfully' });
    } catch (err) {
      console.error('PUT /api/donations-mobile/cancel/:id error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  return router;
};
