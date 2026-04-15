const express = require('express');
const router = express.Router();

module.exports = function(deps = {}) {
  const { db } = deps;

  // Ensure pooja_items table exists
  async function ensurePoojaItemsTable() {
    const has = await db.schema.hasTable('pooja_items');
    if (!has) {
      await db.schema.createTable('pooja_items', (table) => {
        table.increments('id').primary();
        table.integer('temple_id').notNullable();
        table.string('name').notNullable();
        table.string('name_ta').nullable();
        table.text('description').nullable();
        table.decimal('amount', 12, 2).defaultTo(0);
        table.string('duration').nullable();
        table.boolean('is_active').defaultTo(true);
        table.integer('sort_order').defaultTo(0);
        table.integer('created_by').nullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('Created pooja_items table');
    }
  }

  // Ensure pooja_settings table exists
  async function ensurePoojaSettingsTable() {
    const has = await db.schema.hasTable('pooja_settings');
    if (!has) {
      await db.schema.createTable('pooja_settings', (table) => {
        table.increments('id').primary();
        table.integer('temple_id').notNullable().unique();
        table.boolean('multi_pooja_same_day').defaultTo(false);
        table.boolean('pooja_registration_active').defaultTo(true);
        table.integer('created_by').nullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('Created pooja_settings table');
    }
  }

  // GET /api/pooja-master/settings - Get pooja settings
  router.get('/settings', async (req, res) => {
    try {
      await ensurePoojaSettingsTable();
      const templeId = req.user.templeId;
      
      let settings = await db('pooja_settings').where({ temple_id: templeId }).first();
      
      if (!settings) {
        await db('pooja_settings').insert({
          temple_id: templeId,
          multi_pooja_same_day: false,
          pooja_registration_active: true,
          created_by: req.user.id,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        });
        settings = await db('pooja_settings').where({ temple_id: templeId }).first();
      }
      
      res.json({ success: true, data: settings });
    } catch (err) {
      console.error('GET /api/pooja-master/settings error:', err);
      res.status(500).json({ error: 'Failed to load settings' });
    }
  });

  // PUT /api/pooja-master/settings - Update pooja settings
  router.put('/settings', async (req, res) => {
    try {
      await ensurePoojaSettingsTable();
      const templeId = req.user.templeId;
      const { multi_pooja_same_day, pooja_registration_active } = req.body;
      
      const existing = await db('pooja_settings').where({ temple_id: templeId }).first();
      
      if (existing) {
        await db('pooja_settings')
          .where({ temple_id: templeId })
          .update({
            multi_pooja_same_day: multi_pooja_same_day !== undefined ? Boolean(multi_pooja_same_day) : existing.multi_pooja_same_day,
            pooja_registration_active: pooja_registration_active !== undefined ? Boolean(pooja_registration_active) : existing.pooja_registration_active,
            updated_at: db.fn.now(),
          });
      } else {
        await db('pooja_settings').insert({
          temple_id: templeId,
          multi_pooja_same_day: Boolean(multi_pooja_same_day),
          pooja_registration_active: Boolean(pooja_registration_active),
          created_by: req.user.id,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        });
      }
      
      const settings = await db('pooja_settings').where({ temple_id: templeId }).first();
      res.json({ success: true, data: settings });
    } catch (err) {
      console.error('PUT /api/pooja-master/settings error:', err);
      res.status(500).json({ error: 'Failed to save settings' });
    }
  });

  // GET /api/pooja-master/items - Get all pooja items
  router.get('/items', async (req, res) => {
    try {
      await ensurePoojaItemsTable();
      const templeId = req.user.templeId;
      
      const items = await db('pooja_items')
        .where({ temple_id: templeId })
        .orderBy('sort_order', 'asc')
        .orderBy('name', 'asc');
      
      res.json({ success: true, data: items });
    } catch (err) {
      console.error('GET /api/pooja-master/items error:', err);
      res.status(500).json({ error: 'Failed to load pooja items' });
    }
  });

  // POST /api/pooja-master/items - Create new pooja item
  router.post('/items', async (req, res) => {
    try {
      await ensurePoojaItemsTable();
      const templeId = req.user.templeId;
      const { name, name_ta, description, amount, duration, is_active, sort_order } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }
      
      const [id] = await db('pooja_items').insert({
        temple_id: templeId,
        name,
        name_ta: name_ta || null,
        description: description || null,
        amount: amount != null ? Number(amount) : 0,
        duration: duration || null,
        is_active: is_active !== false,
        sort_order: sort_order || 0,
        created_by: req.user.id,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });
      
      const item = await db('pooja_items').where({ id }).first();
      res.json({ success: true, data: item });
    } catch (err) {
      console.error('POST /api/pooja-master/items error:', err);
      res.status(500).json({ error: 'Failed to create pooja item' });
    }
  });

  // PUT /api/pooja-master/items/:id - Update pooja item
  router.put('/items/:id', async (req, res) => {
    try {
      await ensurePoojaItemsTable();
      const templeId = req.user.templeId;
      const { id } = req.params;
      const { name, name_ta, description, amount, duration, is_active, sort_order } = req.body;
      
      const existing = await db('pooja_items').where({ id, temple_id: templeId }).first();
      if (!existing) {
        return res.status(404).json({ error: 'Pooja item not found' });
      }
      
      await db('pooja_items')
        .where({ id, temple_id: templeId })
        .update({
          name: name !== undefined ? name : existing.name,
          name_ta: name_ta !== undefined ? name_ta : existing.name_ta,
          description: description !== undefined ? description : existing.description,
          amount: amount !== undefined ? Number(amount) : existing.amount,
          duration: duration !== undefined ? duration : existing.duration,
          is_active: is_active !== undefined ? Boolean(is_active) : existing.is_active,
          sort_order: sort_order !== undefined ? Number(sort_order) : existing.sort_order,
          updated_at: db.fn.now(),
        });
      
      const item = await db('pooja_items').where({ id }).first();
      res.json({ success: true, data: item });
    } catch (err) {
      console.error('PUT /api/pooja-master/items/:id error:', err);
      res.status(500).json({ error: 'Failed to update pooja item' });
    }
  });

  // DELETE /api/pooja-master/items/:id - Delete pooja item
  router.delete('/items/:id', async (req, res) => {
    try {
      const templeId = req.user.templeId;
      const { id } = req.params;
      
      const existing = await db('pooja_items').where({ id, temple_id: templeId }).first();
      if (!existing) {
        return res.status(404).json({ error: 'Pooja item not found' });
      }
      
      await db('pooja_items').where({ id, temple_id: templeId }).del();
      
      res.json({ success: true, message: 'Pooja item deleted' });
    } catch (err) {
      console.error('DELETE /api/pooja-master/items/:id error:', err);
      res.status(500).json({ error: 'Failed to delete pooja item' });
    }
  });

  return router;
};