const express = require('express');
const router = express.Router();

module.exports = function({ db, retryOnBusy }) {
  // Create a new master group
  router.post('/', async (req, res) => {
    const { name, description } = req.body;
    const templeId = req.user.templeId;

    if (!name) {
      return res.status(400).json({ error: 'Group name is required.' });
    }

    try {
      const newGroup = await retryOnBusy(() => db('master_groups').insert({
        temple_id: templeId,
        name: name.trim(),
        description: description || '',
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      }).returning('*'));

      console.log('Successfully saved master group:', newGroup);
      res.status(201).json({ success: true, id: newGroup[0] });
    } catch (err) {
      console.error('Error saving master group:', err);
      res.status(500).json({ error: 'Database error while saving master group.' });
    }
  });

  // Get all groups for a temple
  router.get('/:templeId', async (req, res) => {
    try {
      const groups = await db('master_groups')
        .where('temple_id', req.params.templeId)
        .select('*');
      res.json(groups);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch groups' });
    }
  });

  // Update a group
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    const templeId = req.user.templeId;

    if (!name) {
      return res.status(400).json({ error: 'Group name is required.' });
    }

    try {
      // Check if group exists and belongs to user's temple
      const existingGroup = await db('master_groups')
        .where({ id, temple_id: templeId })
        .first();

      if (!existingGroup) {
        return res.status(404).json({ error: 'Group not found or access denied.' });
      }

      await db('master_groups')
        .where({ id, temple_id: templeId })
        .update({
          name: name.trim(),
          description: description || '',
          updated_at: db.fn.now()
        });

      res.json({ success: true, message: 'Group updated successfully.' });
    } catch (err) {
      console.error('Error updating master group:', err);
      res.status(500).json({ error: 'Database error while updating master group.' });
    }
  });

  // Delete a group
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const templeId = req.user.templeId;

    try {
      // Check if group exists and belongs to user's temple
      const existingGroup = await db('master_groups')
        .where({ id, temple_id: templeId })
        .first();

      if (!existingGroup) {
        return res.status(404).json({ error: 'Group not found or access denied.' });
      }

      // Check if group is being used by any users
      const usersWithGroup = await db('user_registrations')
        .where({ group: existingGroup.name, temple_id: templeId })
        .first();

      if (usersWithGroup) {
        return res.status(400).json({ 
          error: 'Cannot delete group. It is currently being used by registered users.' 
        });
      }

      await db('master_groups')
        .where({ id, temple_id: templeId })
        .del();

      res.json({ success: true, message: 'Group deleted successfully.' });
    } catch (err) {
      console.error('Error deleting master group:', err);
      res.status(500).json({ error: 'Database error while deleting master group.' });
    }
  });

  return router;
};
