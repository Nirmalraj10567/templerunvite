const express = require('express');
const router = express.Router();

/**
 * Create a new wedding event
 * POST /api/wedding-events
 */
router.post('/', async (req, res) => {
  try {
    const { kanikalar_id, event_name, event_date, event_time, location, description } = req.body;
    
    if (!kanikalar_id || !event_name || !event_date || !event_time || !location) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Verify the wedding exists and belongs to the user's temple
    const wedding = await req.db('kanikalar')
      .where({ id: kanikalar_id, temple_id: req.user.templeId })
      .first();
    
    if (!wedding) {
      return res.status(404).json({ error: 'Wedding not found' });
    }

    const [id] = await req.db('wedding_events').insert({
      kanikalar_id,
      event_name,
      event_date,
      event_time,
      location,
      description,
      created_by: req.user.id
    });

    res.status(201).json({ id, message: 'Wedding event created successfully' });
  } catch (error) {
    console.error('Error creating wedding event:', error);
    res.status(500).json({ error: 'Failed to create wedding event' });
  }
});

/**
 * Get events for a wedding
 * GET /api/wedding-events/:kanikalarId
 */
router.get('/:kanikalarId', async (req, res) => {
  try {
    // Verify the wedding exists and belongs to the user's temple
    const wedding = await req.db('kanikalar')
      .where({ id: req.params.kanikalarId, temple_id: req.user.templeId })
      .first();
    
    if (!wedding) {
      return res.status(404).json({ error: 'Wedding not found' });
    }

    const events = await req.db('wedding_events')
      .where('kanikalar_id', req.params.kanikalarId)
      .select('*');
    
    res.json(events);
  } catch (error) {
    console.error('Error fetching wedding events:', error);
    res.status(500).json({ error: 'Failed to fetch wedding events' });
  }
});

/**
 * Update event
 * PUT /api/wedding-events/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { event_name, event_date, event_time, location, description } = req.body;
    
    // First find the event with its associated wedding
    const event = await req.db('wedding_events')
      .select('wedding_events.*')
      .join('kanikalar', 'kanikalar.id', 'wedding_events.kanikalar_id')
      .where({
        'wedding_events.id': req.params.id,
        'kanikalar.temple_id': req.user.templeId
      })
      .first();
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const updated = await req.db('wedding_events')
      .where('id', req.params.id)
      .update({
        event_name,
        event_date,
        event_time,
        location,
        description: description || null,
        updated_at: req.db.fn.now()
      });

    if (!updated) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({ message: 'Event updated successfully' });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

/**
 * Delete event
 * DELETE /api/wedding-events/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    // First find the event with its associated wedding to verify temple ownership
    const event = await req.db('wedding_events')
      .select('wedding_events.*')
      .join('kanikalar', 'kanikalar.id', 'wedding_events.kanikalar_id')
      .where({
        'wedding_events.id': req.params.id,
        'kanikalar.temple_id': req.user.templeId
      })
      .first();
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const deleted = await req.db('wedding_events')
      .where('id', req.params.id)
      .del();

    if (!deleted) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;
