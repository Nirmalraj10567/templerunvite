const express = require('express');
const router = express.Router();

module.exports = function({ db, retryOnBusy }) {
  // Create a new hall master
  router.post('/', async (req, res) => {
    const { name, basePrice } = req.body || {};
    const templeId = req.user.templeId;
    if (!name) return res.status(400).json({ error: 'Hall name is required.' });
    try {
      const inserted = await retryOnBusy(() => db('master_halls').insert({
        temple_id: templeId,
        name: name.trim(),
        base_price: basePrice != null ? Number(basePrice) : null,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      }).returning('*'));
      const row = inserted[0] || null;
      res.status(201).json({ success: true, data: row });
    } catch (err) {
      console.error('Error creating master hall:', err);
      res.status(500).json({ error: 'Database error while creating hall.' });
    }
  });

  // Get halls for a temple
  router.get('/:templeId', async (req, res) => {
    try {
      const halls = await db('master_halls')
        .where('temple_id', req.params.templeId)
        .orderBy('name', 'asc')
        .select('*');
      res.json(halls);
    } catch (err) {
      console.error('Error fetching master halls:', err);
      res.status(500).json({ error: 'Failed to fetch halls' });
    }
  });

  // Update a hall
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, basePrice } = req.body || {};
    const templeId = req.user.templeId;
    if (!name) return res.status(400).json({ error: 'Hall name is required.' });
    try {
      const exists = await db('master_halls').where({ id, temple_id: templeId }).first();
      if (!exists) return res.status(404).json({ error: 'Hall not found or access denied.' });
      await db('master_halls').where({ id, temple_id: templeId }).update({
        name: name.trim(),
        base_price: basePrice != null ? Number(basePrice) : null,
        updated_at: db.fn.now()
      });
      res.json({ success: true });
    } catch (err) {
      console.error('Error updating master hall:', err);
      res.status(500).json({ error: 'Database error while updating hall.' });
    }
  });

  // Delete a hall (ensure not referenced by bookings)
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const templeId = req.user.templeId;
    try {
      const exists = await db('master_halls').where({ id, temple_id: templeId }).first();
      if (!exists) return res.status(404).json({ error: 'Hall not found or access denied.' });
      const used = await db('marriage_hall_bookings').where({ hall_id: id, temple_id: templeId }).first().catch(() => null);
      if (used) return res.status(400).json({ error: 'Cannot delete hall; it is referenced by bookings.' });
      await db('master_halls').where({ id, temple_id: templeId }).del();
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting master hall:', err);
      res.status(500).json({ error: 'Database error while deleting hall.' });
    }
  });

  return router;
};
