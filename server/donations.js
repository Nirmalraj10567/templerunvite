const express = require('express');
const router = express.Router();

module.exports = function(deps = {}) {
  const { db } = deps;
  
  // Create donations table if it doesn't exist
  const initDb = async () => {
    const exists = await db.schema.hasTable('donations');
    if (!exists) {
      await db.schema.createTable('donations', table => {
        table.increments('id').primary();
        table.integer('temple_id').notNullable();
        table.string('product_name').notNullable();
        table.text('description');
        table.decimal('price', 10, 2).notNullable();
        table.integer('quantity').defaultTo(1);
        table.string('category');
        table.string('donor_name');
        table.string('donor_contact');
        table.date('donation_date');
        table.enum('status', ['available', 'reserved', 'distributed']).defaultTo('available');
        table.text('notes');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
    }
  };

  // Initialize database
  initDb().catch(console.error);

  // GET /api/donations - Get all donations for current temple
  router.get('/', async (req, res) => {
    try {
      const donations = await db('donations')
        .where('temple_id', req.user.templeId)
        .orderBy('created_at', 'desc');
      res.json({ success: true, data: donations });
    } catch (err) {
      console.error('GET /api/donations error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/donations/:id - Get a single donation
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const donation = await db('donations')
        .where({ id })
        .andWhere('temple_id', req.user.templeId)
        .first();
      
      if (!donation) {
        return res.status(404).json({ error: 'Donation not found' });
      }
      
      res.json({ success: true, data: donation });
    } catch (err) {
      console.error('GET /api/donations/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/donations - Create a new donation
  router.post('/', async (req, res) => {
    try {
      // Ensure required fields have values
      const productName = req.body.productName || req.body.registerNo || req.body.name || 'General Donation';
      const price = parseFloat(req.body.price || req.body.amount || 0);
      
      if (!productName || price <= 0) {
        return res.status(400).json({ 
          error: 'Product name and valid price/amount are required' 
        });
      }

      const donationData = {
        temple_id: req.user.templeId,
        product_name: productName,
        description: req.body.description || req.body.reason || '',
        price: price,
        quantity: parseInt(req.body.quantity || req.body.unit || 1),
        category: req.body.category || 'General',
        donor_name: req.body.donorName || req.body.name || 'Anonymous',
        donor_contact: req.body.donorContact || req.body.phone || '',
        donation_date: req.body.donationDate || req.body.date || new Date().toISOString().split('T')[0],
        status: req.body.status || 'available',
        notes: req.body.notes || ''
      };

      const [id] = await db('donations').insert(donationData);
      const donation = await db('donations').where({ id }).first();
      
      res.json({ success: true, data: donation });
    } catch (err) {
      console.error('POST /api/donations error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PUT /api/donations/:id - Update a donation
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const updateData = {
        product_name: req.body.productName,
        description: req.body.description,
        price: req.body.price,
        quantity: req.body.quantity,
        category: req.body.category,
        donor_name: req.body.donorName,
        donor_contact: req.body.donorContact,
        donation_date: req.body.donationDate,
        status: req.body.status,
        notes: req.body.notes,
        updated_at: db.fn.now()
      };

      const result = await db('donations')
        .where({ id })
        .andWhere('temple_id', req.user.templeId)
        .update(updateData);
      
      if (!result) {
        return res.status(404).json({ error: 'Donation not found' });
      }
      
      const donation = await db('donations').where({ id }).first();
      res.json({ success: true, data: donation });
    } catch (err) {
      console.error('PUT /api/donations/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE /api/donations/:id - Delete a donation
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await db('donations')
        .where({ id })
        .andWhere('temple_id', req.user.templeId)
        .del();
      
      if (!result) {
        return res.status(404).json({ error: 'Donation not found' });
      }
      
      res.json({ success: true });
    } catch (err) {
      console.error('DELETE /api/donations/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/donations/export - Export donations as CSV
  router.get('/export/csv', async (req, res) => {
    try {
      const rows = await db('donations')
        .where('temple_id', req.user.templeId)
        .orderBy('created_at', 'desc');
      
      const headers = [
        'id,product_name,description,price,quantity,category,donor_name,donor_contact,donation_date,status,notes,created_at,updated_at'
      ];
      
      const csv = rows.map(r => [
        r.id, r.product_name, (r.description||'').replaceAll(',', ' '), r.price, r.quantity,
        r.category, r.donor_name, r.donor_contact, r.donation_date, r.status,
        (r.notes||'').replaceAll(',', ' '), r.created_at, r.updated_at
      ].join(',')).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="donations.csv"');
      res.send(headers.join('\n') + '\n' + csv);
    } catch (err) {
      console.error('GET /api/donations/export error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
