const express = require('express');
const router = express.Router();

/**
 * List tax settings for a temple
 * GET /api/tax-settings
 */
router.get('/', async (req, res) => {
  try {
    const templeId = req.user.templeId;
    const settings = await req.db('tax_settings')
      .where('temple_id', templeId)
      .orderBy('year', 'desc');

    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('Error listing tax settings:', err);
    res.status(500).json({ error: 'Database error while listing tax settings.' });
  }
});

/**
 * Get active tax setting for a specific year
 * GET /api/tax-settings/year/:year
 */
router.get('/year/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const templeId = req.user.templeId;

    const setting = await req.db('tax_settings')
      .where({ temple_id: templeId, year, is_active: true })
      .first();

    if (setting) {
      res.json({ success: true, data: setting });
    } else {
      res.json({ success: true, data: null });
    }
  } catch (err) {
    console.error('Error getting tax setting for year:', err);
    res.status(500).json({ error: 'Database error while getting tax setting.' });
  }
});

/**
 * Create or update tax setting
 * POST /api/tax-settings
 */
router.post('/', async (req, res) => {
  const { year, taxAmount, description, isActive, includePreviousYears } = req.body;
  const templeId = req.user.templeId;

  if (!year || !taxAmount) {
    return res.status(400).json({ error: 'Year and tax amount are required.' });
  }

  try {
    // Check if setting already exists for this year and temple
    const existing = await req.db('tax_settings')
      .where({ temple_id: templeId, year })
      .first();

    if (existing) {
      // Update existing setting
      await req.db('tax_settings')
        .where({ temple_id: templeId, year })
        .update({
          tax_amount: taxAmount,
          description: description || '',
          is_active: isActive !== undefined ? isActive : true,
          include_previous_years: includePreviousYears !== undefined ? includePreviousYears : false,
          updated_at: req.db.fn.now()
        });
      res.json({ success: true, id: existing.id, action: 'updated' });
    } else {
      // Create new setting
      const [id] = await req.db('tax_settings')
        .insert({
          temple_id: templeId,
          year,
          tax_amount: taxAmount,
          description: description || '',
          is_active: isActive !== undefined ? isActive : true,
          include_previous_years: includePreviousYears !== undefined ? includePreviousYears : false,
          created_at: req.db.fn.now(),
          updated_at: req.db.fn.now()
        })
        .returning('id');
      res.status(201).json({ success: true, id, action: 'created' });
    }
  } catch (err) {
    console.error('Error saving tax setting:', err);
    res.status(500).json({ error: 'Database error while saving tax setting.' });
  }
});

/**
 * Delete tax setting
 * DELETE /api/tax-settings/:id
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const templeId = req.user.templeId;

  try {
    const existing = await req.db('tax_settings')
      .where({ id, temple_id: templeId })
      .first();
    
    if (!existing) {
      return res.status(404).json({ error: 'Tax setting not found or access denied.' });
    }

    await req.db('tax_settings').where({ id, temple_id: templeId }).del();
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting tax setting:', err);
    res.status(500).json({ error: 'Database error while deleting tax setting.' });
  }
});

module.exports = router;
