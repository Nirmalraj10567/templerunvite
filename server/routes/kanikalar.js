const express = require('express');
const router = express.Router();

/**
 * Create a new wedding
 * POST /api/kanikalar
 */
router.post('/', async (req, res) => {
  try {
    const { bride_name, groom_name, wedding_date, venue, contact_number, email } = req.body;
    
    if (!bride_name || !groom_name || !wedding_date || !venue) {
      return res.status(400).json({ error: 'Bride name, groom name, wedding date, and venue are required' });
    }

    const [id] = await req.db('kanikalar').insert({
      bride_name,
      groom_name,
      wedding_date,
      venue,
      contact_number,
      email,
      created_by: req.user.id,
      temple_id: req.user.templeId
    });

    res.status(201).json({ id, message: 'Wedding created successfully' });
  } catch (error) {
    console.error('Error creating wedding:', error);
    res.status(500).json({ error: 'Failed to create wedding' });
  }
});

/**
 * Get all weddings
 * GET /api/kanikalar
 */
router.get('/', async (req, res) => {
  try {
    const weddings = await req.db('kanikalar')
      .where('temple_id', req.user.templeId)
      .select('*');
    res.json(weddings);
  } catch (error) {
    console.error('Error fetching weddings:', error);
    res.status(500).json({ error: 'Failed to fetch weddings' });
  }
});

/**
 * Get single wedding by ID
 * GET /api/kanikalar/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const wedding = await req.db('kanikalar')
      .where({ id: req.params.id, temple_id: req.user.templeId })
      .first();
    
    if (!wedding) {
      return res.status(404).json({ error: 'Wedding not found' });
    }
    
    res.json(wedding);
  } catch (error) {
    console.error('Error fetching wedding:', error);
    res.status(500).json({ error: 'Failed to fetch wedding' });
  }
});

/**
 * Update wedding
 * PUT /api/kanikalar/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { bride_name, groom_name, wedding_date, venue, contact_number, email } = req.body;
    
    const updated = await req.db('kanikalar')
      .where({ 
        id: req.params.id,
        temple_id: req.user.templeId 
      })
      .update({
        bride_name,
        groom_name,
        wedding_date,
        venue,
        contact_number,
        email,
        updated_at: req.db.fn.now()
      });

    if (!updated) {
      return res.status(404).json({ error: 'Wedding not found' });
    }
    
    res.json({ message: 'Wedding updated successfully' });
  } catch (error) {
    console.error('Error updating wedding:', error);
    res.status(500).json({ error: 'Failed to update wedding' });
  }
});

/**
 * Delete wedding
 * DELETE /api/kanikalar/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    // First delete all events associated with this wedding
    await req.db('wedding_events')
      .where('kanikalar_id', req.params.id)
      .del();

    // Then delete the wedding
    const deleted = await req.db('kanikalar')
      .where({ 
        id: req.params.id,
        temple_id: req.user.templeId 
      })
      .del();

    if (!deleted) {
      return res.status(404).json({ error: 'Wedding not found' });
    }
    
    res.json({ message: 'Wedding and associated events deleted successfully' });
  } catch (error) {
    console.error('Error deleting wedding:', error);
    res.status(500).json({ error: 'Failed to delete wedding' });
  }
});

// Export the router
module.exports = router;
