const express = require('express');
const router = express.Router();

module.exports = function({ db, retryOnBusy }) {
  // Create a new master education
  router.post('/', async (req, res) => {
    const { name, description } = req.body;
    const templeId = req.user.templeId;

    if (!name) {
      return res.status(400).json({ error: 'Education name is required.' });
    }

    try {
      const newEducation = await retryOnBusy(() => db('master_educations').insert({
        temple_id: templeId,
        name: name.trim(),
        description: description || '',
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      }).returning('*'));

      console.log('Successfully saved master education:', newEducation);
      res.status(201).json({ success: true, id: newEducation[0] });
    } catch (err) {
      console.error('Error saving master education:', err);
      res.status(500).json({ error: 'Database error while saving master education.' });
    }
  });

  // GET all educations for a temple
  router.get('/:templeId', async (req, res) => {
    try {
      const educations = await db('master_educations')
        .where('temple_id', req.params.templeId)
        .select('*');
      res.json(educations);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch educations' });
    }
  });

  // Update an education
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    const templeId = req.user.templeId;

    if (!name) {
      return res.status(400).json({ error: 'Education name is required.' });
    }

    try {
      // Check if education exists and belongs to user's temple
      const existingEducation = await db('master_educations')
        .where({ id, temple_id: templeId })
        .first();

      if (!existingEducation) {
        return res.status(404).json({ error: 'Education not found or access denied.' });
      }

      await db('master_educations')
        .where({ id, temple_id: templeId })
        .update({
          name: name.trim(),
          description: description || '',
          updated_at: db.fn.now()
        });

      res.json({ success: true, message: 'Education updated successfully.' });
    } catch (err) {
      console.error('Error updating master education:', err);
      res.status(500).json({ error: 'Database error while updating master education.' });
    }
  });

  // Delete an education
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const templeId = req.user.templeId;

    try {
      // Check if education exists and belongs to user's temple
      const existingEducation = await db('master_educations')
        .where({ id, temple_id: templeId })
        .first();

      if (!existingEducation) {
        return res.status(404).json({ error: 'Education not found or access denied.' });
      }

      // Check if education is being used by any users
      const usersWithEducation = await db('user_registrations')
        .where({ education: existingEducation.name, temple_id: templeId })
        .first();

      if (usersWithEducation) {
        return res.status(400).json({ 
          error: 'Cannot delete education. It is currently being used by registered users.' 
        });
      }

      await db('master_educations')
        .where({ id, temple_id: templeId })
        .del();

      res.json({ success: true, message: 'Education deleted successfully.' });
    } catch (err) {
      console.error('Error deleting master education:', err);
      res.status(500).json({ error: 'Database error while deleting master education.' });
    }
  });

  return router;
};
