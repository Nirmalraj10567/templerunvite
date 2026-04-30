const express = require('express');
const router = express.Router();

// Ensure table exists (auto-sync)
async function ensureTable(db) {
  const hasTable = await db.schema.hasTable('master_food_items');
  if (!hasTable) {
    await db.schema.createTable('master_food_items', (table) => {
      table.increments('id').primary();
      table.integer('temple_id').unsigned().notNullable().defaultTo(1);
      table.string('name', 255).notNullable();
      table.text('description');
      table.string('category', 100).defaultTo('general');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
      
      table.index(['temple_id', 'name']);
      table.index('name');
    });
    console.log('✅ Auto-created master_food_items table');
  }
}

module.exports = function({ db, retryOnBusy }) {
  // Create a new food item
  router.post('/', async (req, res) => {
    // Auto-sync table
    await ensureTable(db);
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const { name, description, category } = req.body;
    const templeId = req.user.templeId;

    if (!name) {
      return res.status(400).json({ error: 'Food item name is required.' });
    }

    try {
      // Check for duplicates
      const existing = await db('master_food_items')
        .where({ temple_id: templeId })
        .whereRaw('LOWER(name) = ?', [name.toLowerCase()])
        .first();

      if (existing) {
        return res.status(400).json({ error: 'A food item with this name already exists.' });
      }

      const newItem = await retryOnBusy(() => db('master_food_items').insert({
        temple_id: templeId,
        name: name.trim(),
        description: description || '',
        category: category || 'general',
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      }).returning('*'));

      res.status(201).json({ success: true, data: newItem[0] });
    } catch (err) {
      console.error('Error saving food item:', err);
      res.status(500).json({ error: 'Database error while saving food item.' });
    }
  });

  // Get all food items for a temple
  router.get('/:templeId', async (req, res) => {
    // Auto-sync table
    await ensureTable(db);
    
    try {
      const items = await db('master_food_items')
        .where('temple_id', req.params.templeId)
        .orderBy('name', 'asc')
        .select('*');
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch food items' });
    }
  });

  // Search food items by name
  router.get('/:templeId/search', async (req, res) => {
    // Auto-sync table
    await ensureTable(db);
    
    try {
      const { q } = req.query;
      let query = db('master_food_items')
        .where('temple_id', req.params.templeId);
      
      if (q) {
        query = query.whereRaw('LOWER(name) LIKE ?', [`%${q.toLowerCase()}%`]);
      }
      
      const items = await query
        .orderBy('name', 'asc')
        .limit(50)
        .select('*');
      
      res.json({ success: true, data: items });
    } catch (err) {
      console.error('Error searching food items:', err);
      res.status(500).json({ error: 'Failed to search food items' });
    }
  });

  // Update a food item
  router.put('/:id', async (req, res) => {
    // Auto-sync table
    await ensureTable(db);
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const { id } = req.params;
    const { name, description, category } = req.body;
    const templeId = req.user.templeId;

    if (!name) {
      return res.status(400).json({ error: 'Food item name is required.' });
    }

    try {
      // Check if item exists and belongs to user's temple
      const existingItem = await db('master_food_items')
        .where({ id, temple_id: templeId })
        .first();

      if (!existingItem) {
        return res.status(404).json({ error: 'Food item not found or access denied.' });
      }

      // Check for duplicates if name is changing
      if (name !== existingItem.name) {
        const duplicate = await db('master_food_items')
          .where({ temple_id: templeId })
          .whereRaw('LOWER(name) = ?', [name.toLowerCase()])
          .where('id', '!=', id)
          .first();

        if (duplicate) {
          return res.status(400).json({ error: 'A food item with this name already exists.' });
        }
      }

      await db('master_food_items')
        .where({ id, temple_id: templeId })
        .update({
          name: name.trim(),
          description: description || '',
          category: category || 'general',
          updated_at: db.fn.now()
        });

      res.json({ success: true, message: 'Food item updated successfully.' });
    } catch (err) {
      console.error('Error updating food item:', err);
      res.status(500).json({ error: 'Database error while updating food item.' });
    }
  });

  // Delete a food item
  router.delete('/:id', async (req, res) => {
    // Auto-sync table
    await ensureTable(db);
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const { id } = req.params;
    const templeId = req.user.templeId;

    try {
      // Check if item exists and belongs to user's temple
      const existingItem = await db('master_food_items')
        .where({ id, temple_id: templeId })
        .first();

      if (!existingItem) {
        return res.status(404).json({ error: 'Food item not found or access denied.' });
      }

      await db('master_food_items')
        .where({ id, temple_id: templeId })
        .del();

      res.json({ success: true, message: 'Food item deleted successfully.' });
    } catch (err) {
      console.error('Error deleting food item:', err);
      res.status(500).json({ error: 'Database error while deleting food item.' });
    }
  });

  return router;
};
