const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../public/uploads/events');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Initialize multer upload middleware
const upload = multer({ storage });

/**
 * Get single event by ID
 * GET /api/events/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid event id' });

    const event = await req.db('events')
      .where({ id, temple_id: req.user.templeId })
      .first();

    if (!event) return res.status(404).json({ error: 'Event not found' });

    const images = await req.db('event_images')
      .where({ event_id: id })
      .select('id', 'image_path', 'title', 'caption')
      .catch(() => {
        // Fallback if columns do not exist yet
        return req.db('event_images').where({ event_id: id }).select('id', 'image_path');
      });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imageObjs = images.map((img) => ({
      id: img.id,
      url: `${baseUrl}/public${img.image_path}`,
      title: img.title || null,
      caption: img.caption || null,
    }));

    return res.json({
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location,
      images: imageObjs,
      created_at: event.created_at,
      updated_at: event.updated_at,
    });
  } catch (error) {
    console.error('Error fetching event by id:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

/**
 * Update event
 * PUT /api/events/:id
 * Accepts multipart form-data with optional new images under 'images' or 'eventImages'
 */
router.put('/:id', upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'eventImages', maxCount: 10 }
]), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid event id' });

    const existing = await req.db('events')
      .where({ id, temple_id: req.user.templeId })
      .first();
    if (!existing) return res.status(404).json({ error: 'Event not found' });

    const { title, description, date, time, location } = req.body;

    await req.db('events')
      .where({ id })
      .update({
        title: title ?? existing.title,
        description: description ?? existing.description,
        date: date ?? existing.date,
        time: time ?? existing.time,
        location: location ?? existing.location,
        updated_at: req.db.fn.now(),
      });

    // Parse existing image metadata updates (if any)
    // Preferred: JSON payload in 'existingImageUpdates' as [{id, title, caption}, ...]
    // Fallback: parallel arrays existingImageIds[], existingImageTitles[], existingImageCaptions[]
    const toArray = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
    let updates = [];
    if (req.body.existingImageUpdates) {
      try {
        const parsed = JSON.parse(req.body.existingImageUpdates);
        if (Array.isArray(parsed)) {
          updates = parsed
            .map(x => ({ id: parseInt(x.id, 10), title: x.title ?? null, caption: x.caption ?? null }))
            .filter(x => !Number.isNaN(x.id));
        }
      } catch (e) {
        // ignore parse errors, fall back below
      }
    }
    if (updates.length === 0) {
      const existingIds = toArray(req.body.existingImageIds).map(v => parseInt(v, 10)).filter(v => !Number.isNaN(v));
      const existingTitles = toArray(req.body.existingImageTitles);
      const existingCaptions = toArray(req.body.existingImageCaptions);
      updates = existingIds.map((id, i) => ({ id, title: existingTitles[i] ?? null, caption: existingCaptions[i] ?? null }));
    }

    if (updates.length > 0) {
      for (const u of updates) {
        try {
          await req.db('event_images')
            .where({ id: u.id, event_id: id })
            .update({ title: u.title, caption: u.caption });
        } catch (e) {
          // Ignore if columns not present yet
        }
      }
    }

    // Handle newly uploaded images (append)
    const uploadedImages = [
      ...(req.files && req.files.images ? req.files.images : []),
      ...(req.files && req.files.eventImages ? req.files.eventImages : [])
    ];

    if (uploadedImages.length > 0) {
      // New image titles/captions come in order matching uploaded files
      const newTitles = toArray(req.body.imageTitles);
      const newCaptions = toArray(req.body.imageCaptions);
      const images = uploadedImages.map((file, idx) => ({
        event_id: id,
        image_path: path.join('/uploads/events', file.filename),
        uploaded_by: req.user.id,
        title: newTitles[idx] ?? null,
        caption: newCaptions[idx] ?? null,
      }));
      try {
        await req.db('event_images').insert(images);
      } catch (e) {
        // Retry without title/caption if columns don't exist yet
        const fallback = images.map(({ title, caption, ...rest }) => rest);
        await req.db('event_images').insert(fallback);
      }
    }

    return res.json({ message: 'Event updated successfully' });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

/**
 * Delete event
 * DELETE /api/events/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid event id' });

    const event = await req.db('events')
      .where({ id, temple_id: req.user.templeId })
      .first();

    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Delete associated images first
    await req.db('event_images').where({ event_id: id }).del();
    
    // Delete the event
    await req.db('events').where({ id }).del();
    
    return res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

/**
 * List events
 * GET /api/events
 * Query params:
 *  - from: YYYY-MM-DD (optional)
 *  - to: YYYY-MM-DD (optional)
 *  - q: search in title/description (optional)
 */
router.get('/', async (req, res) => {
  try {
    const { from, to } = req.query;
    const search = (req.query.search || req.query.q || '').toString();
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 10, 1), 100);
    const offset = (page - 1) * pageSize;

    // Base filter
    const base = req.db('events').where('temple_id', req.user.templeId);
    if (from) base.andWhere('date', '>=', from);
    if (to) base.andWhere('date', '<=', to);
    if (search) {
      base.andWhere(builder => {
        builder.where('title', 'like', `%${search}%`).orWhere('description', 'like', `%${search}%`);
      });
    }

    // Total count
    const [{ count }] = await base.clone().count({ count: '*' });
    const total = typeof count === 'string' ? parseInt(count, 10) : (count || 0);

    // Page data
    const events = await base
      .clone()
      .select('*')
      .orderBy('date', 'desc')
      .orderBy('time', 'desc')
      .limit(pageSize)
      .offset(offset);

    if (events.length === 0) {
      return res.json({ data: [], total, page, pageSize });
    }

    const ids = events.map(e => e.id);
    let images = [];
    try {
      images = await req.db('event_images')
        .whereIn('event_id', ids)
        .select('event_id', 'id', 'image_path', 'title', 'caption');
    } catch (e) {
      // Fallback if columns not present
      images = await req.db('event_images')
        .whereIn('event_id', ids)
        .select('event_id', 'id', 'image_path');
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imagesByEvent = images.reduce((acc, img) => {
      acc[img.event_id] = acc[img.event_id] || [];
      acc[img.event_id].push({
        id: img.id,
        url: `${baseUrl}/public${img.image_path}`,
        title: img.title || null,
        caption: img.caption || null,
      });
      return acc;
    }, {});

    const data = events.map(e => ({
      ...e,
      images: imagesByEvent[e.id] || []
    }));

    res.json({ data, total, page, pageSize });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

/**
 * Create a new event
 * POST /api/events
 */
// Accept both 'images' and legacy 'eventImages' field names
router.post('/', upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'eventImages', maxCount: 10 }
]), async (req, res) => {
  try {
    const { title, description, date, time, location } = req.body;
    
    if (!title || !date || !time || !location) {
      return res.status(400).json({ error: 'Title, date, time and location are required' });
    }
    
    const [id] = await req.db('events').insert({
      title,
      description,
      date,
      time,
      location,
      created_by: req.user.id,
      temple_id: req.user.templeId,
      created_at: req.db.fn.now()
    });
    
    // Handle image uploads if any
    const uploadedImages = [
      ...(req.files && req.files.images ? req.files.images : []),
      ...(req.files && req.files.eventImages ? req.files.eventImages : [])
    ];

    if (uploadedImages.length > 0) {
      const toArray = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
      const titles = toArray(req.body.imageTitles);
      const captions = toArray(req.body.imageCaptions);
      const images = uploadedImages.map((file, idx) => ({
        event_id: id,
        image_path: path.join('/uploads/events', file.filename),
        uploaded_by: req.user.id,
        title: titles[idx] ?? null,
        caption: captions[idx] ?? null,
      }));
      try {
        await req.db('event_images').insert(images);
      } catch (e) {
        // Retry without title/caption if columns not present yet
        const fallback = images.map(({ title, caption, ...rest }) => rest);
        await req.db('event_images').insert(fallback);
      }
    }
    
    res.status(201).json({ id, message: 'Event created successfully' });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

/**
 * Mobile API - Get events (simplified format)
 * GET /api/mobile/events
 */
router.get('/mobile/events', async (req, res) => {
  try {
    if (!req.db) {
      throw new Error('Database connection not available');
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    const events = await req.db('events')
      .where('date', '>=', today)
      .orderBy('date', 'asc')
      .orderBy('time', 'asc')
      .limit(50);

    const eventIds = events.map(e => e.id);
    const images = await req.db('event_images')
      .whereIn('event_id', eventIds)
      .groupBy('event_id')
      .select('event_id', 'image_path');

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    const mobileEvents = events.map(event => ({
      id: event.id,
      title: event.title,
      date: event.date,
      time: event.time,
      location: event.location,
      image: images.find(img => img.event_id === event.id) 
        ? `${baseUrl}/public${images.find(img => img.event_id === event.id).image_path}` 
        : null,
      description: event.description
    }));

    res.json(mobileEvents);
  } catch (error) {
    console.error('Mobile events error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch events',
      details: error.message 
    });
  }
});

module.exports = router;
