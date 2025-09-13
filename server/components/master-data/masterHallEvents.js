const express = require('express');
const router = express.Router();

module.exports = function({ db, retryOnBusy }) {
  // Create a new hall-event master (event type)
  router.post('/', async (req, res) => {
    const { name } = req.body || {};
    const templeId = req.user.templeId;
    if (!name) return res.status(400).json({ error: 'Event name is required.' });
    try {
      const inserted = await retryOnBusy(() => db('master_hall_events').insert({
        temple_id: templeId,
        name: name.trim(),
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      }).returning('*'));
      const row = inserted[0] || null;
      res.status(201).json({ success: true, data: row });
    } catch (err) {
      console.error('Error creating master hall event:', err);
      res.status(500).json({ error: 'Database error while creating hall event.' });
    }
  });

  // Get hall events for a temple
  router.get('/:templeId', async (req, res) => {
    try {
      const rows = await db('master_hall_events')
        .where('temple_id', req.params.templeId)
        .orderBy('name', 'asc')
        .select('*');
      res.json(rows);
    } catch (err) {
      console.error('Error fetching master hall events:', err);
      res.status(500).json({ error: 'Failed to fetch hall events' });
    }
  });

  // Update
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body || {};
    const templeId = req.user.templeId;
    if (!name) return res.status(400).json({ error: 'Event name is required.' });
    try {
      const exists = await db('master_hall_events').where({ id, temple_id: templeId }).first();
      if (!exists) return res.status(404).json({ error: 'Hall event not found or access denied.' });
      await db('master_hall_events').where({ id, temple_id: templeId }).update({
        name: name.trim(),
        updated_at: db.fn.now()
      });
      res.json({ success: true });
    } catch (err) {
      console.error('Error updating master hall event:', err);
      res.status(500).json({ error: 'Database error while updating hall event.' });
    }
  });

  // Delete (ensure not referenced)
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const templeId = req.user.templeId;
    try {
      const exists = await db('master_hall_events').where({ id, temple_id: templeId }).first();
      if (!exists) return res.status(404).json({ error: 'Hall event not found or access denied.' });
      const used = await db('marriage_hall_bookings').where({ event_id: id, temple_id: templeId }).first().catch(() => null);
      if (used) return res.status(400).json({ error: 'Cannot delete hall event; it is referenced by bookings.' });
      await db('master_hall_events').where({ id, temple_id: templeId }).del();
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting master hall event:', err);
      res.status(500).json({ error: 'Database error while deleting hall event.' });
    }
  });

  return router;
};
