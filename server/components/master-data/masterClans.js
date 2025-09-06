const express = require('express');
const router = express.Router();

module.exports = function({ db, retryOnBusy }) {
  // Create a new master clan
  router.post('/', async (req, res) => {
    const { name, description } = req.body;
    const templeId = req.user.templeId;

    if (!name) {
      return res.status(400).json({ error: 'Clan name is required.' });
    }

    try {
      const newClan = await retryOnBusy(() => db('master_clans').insert({
        temple_id: templeId,
        name: name.trim(),
        description: description || '',
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      }).returning('*'));

      console.log('Successfully saved master clan:', newClan);
      res.status(201).json({ success: true, id: newClan[0] });
    } catch (err) {
      console.error('Error saving master clan:', err);
      res.status(500).json({ error: 'Database error while saving master clan.' });
    }
  });

  // Get all clans for a temple
  router.get('/:templeId', async (req, res) => {
    try {
      const clans = await db('master_clans')
        .where('temple_id', req.params.templeId)
        .select('*');
      res.json(clans);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch clans' });
    }
  });

  // Update a clan
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    const templeId = req.user.templeId;

    if (!name) {
      return res.status(400).json({ error: 'Clan name is required.' });
    }

    try {
      // Check if clan exists and belongs to user's temple
      const existingClan = await db('master_clans')
        .where({ id, temple_id: templeId })
        .first();

      if (!existingClan) {
        return res.status(404).json({ error: 'Clan not found or access denied.' });
      }

      await db('master_clans')
        .where({ id, temple_id: templeId })
        .update({
          name: name.trim(),
          description: description || '',
          updated_at: db.fn.now()
        });

      res.json({ success: true, message: 'Clan updated successfully.' });
    } catch (err) {
      console.error('Error updating master clan:', err);
      res.status(500).json({ error: 'Database error while updating master clan.' });
    }
  });

  // Delete a clan
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const templeId = req.user.templeId;

    try {
      // Check if clan exists and belongs to user's temple
      const existingClan = await db('master_clans')
        .where({ id, temple_id: templeId })
        .first();

      if (!existingClan) {
        return res.status(404).json({ error: 'Clan not found or access denied.' });
      }

      await db('master_clans')
        .where({ id, temple_id: templeId })
        .del();

      res.json({ success: true, message: 'Clan deleted successfully.' });
    } catch (err) {
      console.error('Error deleting master clan:', err);
      res.status(500).json({ error: 'Database error while deleting master clan.' });
    }
  });

  return router;
};
