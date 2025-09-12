const express = require('express');
const router = express.Router();

module.exports = function({ db, retryOnBusy }) {
  // Create a new master occupation
  router.post('/', async (req, res) => {
    const { name, description } = req.body;
    const templeId = req.user.templeId;

    if (!name) {
      return res.status(400).json({ error: 'Occupation name is required.' });
    }

    try {
      const newOccupation = await retryOnBusy(() => db('master_occupations').insert({
        temple_id: templeId,
        name: name.trim(),
        description: description || '',
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      }).returning('*'));

      console.log('Successfully saved master occupation:', newOccupation);
      res.status(201).json({ success: true, id: newOccupation[0] });
    } catch (err) {
      console.error('Error saving master occupation:', err);
      res.status(500).json({ error: 'Database error while saving master occupation.' });
    }
  });

  // GET all occupations for a temple
  router.get('/:templeId', async (req, res) => {
    try {
      const occupations = await db('master_occupations')
        .where('temple_id', req.params.templeId)
        .select('*');
      res.json(occupations);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch occupations' });
    }
  });

  // Update an occupation
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    const templeId = req.user.templeId;

    if (!name) {
      return res.status(400).json({ error: 'Occupation name is required.' });
    }

    try {
      // Check if occupation exists and belongs to user's temple
      const existingOccupation = await db('master_occupations')
        .where({ id, temple_id: templeId })
        .first();

      if (!existingOccupation) {
        return res.status(404).json({ error: 'Occupation not found or access denied.' });
      }

      await db('master_occupations')
        .where({ id, temple_id: templeId })
        .update({
          name: name.trim(),
          description: description || '',
          updated_at: db.fn.now()
        });

      res.json({ success: true, message: 'Occupation updated successfully.' });
    } catch (err) {
      console.error('Error updating master occupation:', err);
      res.status(500).json({ error: 'Database error while updating master occupation.' });
    }
  });

  // Delete an occupation
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const templeId = req.user.templeId;

    try {
      // Check if occupation exists and belongs to user's temple
      const existingOccupation = await db('master_occupations')
        .where({ id, temple_id: templeId })
        .first();

      if (!existingOccupation) {
        return res.status(404).json({ error: 'Occupation not found or access denied.' });
      }

      // Check if occupation is being used by any users
      const usersWithOccupation = await db('user_registrations')
        .where({ occupation: existingOccupation.name, temple_id: templeId })
        .first();

      if (usersWithOccupation) {
        return res.status(400).json({ 
          error: 'Cannot delete occupation. It is currently being used by registered users.' 
        });
      }

      await db('master_occupations')
        .where({ id, temple_id: templeId })
        .del();

      res.json({ success: true, message: 'Occupation deleted successfully.' });
    } catch (err) {
      console.error('Error deleting master occupation:', err);
      res.status(500).json({ error: 'Database error while deleting master occupation.' });
    }
  });

  return router;
};
