const express = require('express');
const router = express.Router();

module.exports = function(deps = {}) {
  const { db } = deps;

  /**
   * Get calendar data for a specific date
   * GET /api/calendar/:date
   * Returns events, pooja, and hall bookings for the specified date
   */
  router.get('/:date', async (req, res) => {
    try {
      const { date } = req.params;
      const templeId = req.user.templeId;

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      }

      // Fetch events for the date
      const events = await db('events')
        .select('id', 'title', 'description', 'date', 'time', 'location')
        .where('temple_id', templeId)
        .andWhere('date', date)
        .orderBy('time', 'asc');

      // Fetch approved pooja for the date
      const pooja = await db('pooja')
        .select('id', 'name', 'time', 'from_date', 'status')
        .where('temple_id', templeId)
        .andWhere('status', 'approved')
        .andWhere('from_date', date)
        .orderBy('time', 'asc');

      // Fetch approved hall bookings for the date
      const hallBookings = await db('marriage_hall_bookings')
        .select('id', 'event', 'name', 'check_in_date', 'check_in_time', 'status')
        .where('temple_id', templeId)
        .andWhere('status', 'approved')
        .andWhere('check_in_date', date)
        .orderBy('check_in_time', 'asc');

      // Format the response
      const calendarData = {
        date,
        events: events.map(event => ({
          id: event.id,
          title: event.title,
          description: event.description,
          time: event.time,
          location: event.location,
          type: 'event'
        })),
        pooja: pooja.map(p => ({
          id: p.id,
          name: p.name,
          time: p.time,
          type: 'pooja'
        })),
        hallBookings: hallBookings.map(booking => ({
          id: booking.id,
          event: booking.event,
          name: booking.name,
          checkInTime: booking.check_in_time,
          type: 'hall_booking'
        }))
      };

      res.json({
        success: true,
        data: calendarData
      });

    } catch (error) {
      console.error('Error fetching calendar data:', error);
      res.status(500).json({ error: 'Failed to fetch calendar data' });
    }
  });

  /**
   * Get calendar data for a date range
   * GET /api/calendar/range?from=YYYY-MM-DD&to=YYYY-MM-DD
   */
  router.get('/range', async (req, res) => {
    try {
      const { from, to } = req.query;
      const templeId = req.user.templeId;

      // Validate date formats
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!from || !to || !dateRegex.test(from) || !dateRegex.test(to)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD for both from and to parameters' });
      }

      if (new Date(from) > new Date(to)) {
        return res.status(400).json({ error: 'From date cannot be after to date' });
      }

      // Fetch events for the date range
      const events = await db('events')
        .select('id', 'title', 'description', 'date', 'time', 'location')
        .where('temple_id', templeId)
        .andWhere('date', '>=', from)
        .andWhere('date', '<=', to)
        .orderBy('date', 'asc')
        .orderBy('time', 'asc');

      // Fetch approved pooja for the date range
      const pooja = await db('pooja')
        .select('id', 'name', 'time', 'from_date', 'status')
        .where('temple_id', templeId)
        .andWhere('status', 'approved')
        .andWhere('from_date', '>=', from)
        .andWhere('from_date', '<=', to)
        .orderBy('from_date', 'asc')
        .orderBy('time', 'asc');

      // Fetch approved hall bookings for the date range
      const hallBookings = await db('marriage_hall_bookings')
        .select('id', 'event', 'name', 'check_in_date', 'check_in_time', 'status')
        .where('temple_id', templeId)
        .andWhere('status', 'approved')
        .andWhere('check_in_date', '>=', from)
        .andWhere('check_in_date', '<=', to)
        .orderBy('check_in_date', 'asc')
        .orderBy('check_in_time', 'asc');

      // Group data by date
      const calendarData = {};
      
      // Process events
      events.forEach(event => {
        const date = event.date;
        if (!calendarData[date]) {
          calendarData[date] = { events: [], pooja: [], hallBookings: [] };
        }
        calendarData[date].events.push({
          id: event.id,
          title: event.title,
          description: event.description,
          time: event.time,
          location: event.location,
          type: 'event'
        });
      });

      // Process pooja
      pooja.forEach(p => {
        const date = p.from_date;
        if (!calendarData[date]) {
          calendarData[date] = { events: [], pooja: [], hallBookings: [] };
        }
        calendarData[date].pooja.push({
          id: p.id,
          name: p.name,
          time: p.time,
          type: 'pooja'
        });
      });

      // Process hall bookings
      hallBookings.forEach(booking => {
        const date = booking.check_in_date;
        if (!calendarData[date]) {
          calendarData[date] = { events: [], pooja: [], hallBookings: [] };
        }
        calendarData[date].hallBookings.push({
          id: booking.id,
          event: booking.event,
          name: booking.name,
          checkInTime: booking.check_in_time,
          type: 'hall_booking'
        });
      });

      res.json({
        success: true,
        data: calendarData,
        from,
        to
      });

    } catch (error) {
      console.error('Error fetching calendar range data:', error);
      res.status(500).json({ error: 'Failed to fetch calendar range data' });
    }
  });

  /**
   * Get all calendar data (global view)
   * GET /api/calendar/all
   * Returns all events, pooja, and hall bookings for the temple
   */
  router.get('/all', async (req, res) => {
    try {
      const templeId = req.user.templeId;
      const { limit = 100, offset = 0 } = req.query;

      // Fetch all events
      const events = await db('events')
        .select('id', 'title', 'description', 'date', 'time', 'location')
        .where('temple_id', templeId)
        .orderBy('date', 'desc')
        .orderBy('time', 'desc')
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      // Fetch all approved pooja
      const pooja = await db('pooja')
        .select('id', 'name', 'time', 'from_date', 'status')
        .where('temple_id', templeId)
        .andWhere('status', 'approved')
        .orderBy('from_date', 'desc')
        .orderBy('time', 'desc')
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      // Fetch all approved hall bookings
      const hallBookings = await db('marriage_hall_bookings')
        .select('id', 'event', 'name', 'check_in_date', 'check_in_time', 'status')
        .where('temple_id', templeId)
        .andWhere('status', 'approved')
        .orderBy('check_in_date', 'desc')
        .orderBy('check_in_time', 'desc')
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      // Format the response
      const allEvents = [
        ...events.map(event => ({
          id: event.id,
          title: event.title,
          description: event.description,
          time: event.time,
          location: event.location,
          date: event.date,
          type: 'event'
        })),
        ...pooja.map(p => ({
          id: p.id,
          title: p.name,
          description: 'Pooja Ceremony',
          time: p.time,
          location: 'Temple',
          date: p.from_date,
          type: 'pooja'
        })),
        ...hallBookings.map(booking => ({
          id: booking.id,
          title: booking.event,
          description: `Hall Booking - ${booking.name}`,
          time: booking.check_in_time,
          location: 'Marriage Hall',
          date: booking.check_in_date,
          type: 'hall_booking'
        }))
      ].sort((a, b) => {
        // Sort by date (newest first), then by time
        const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return (b.time || '').localeCompare(a.time || '');
      });

      res.json({
        success: true,
        data: allEvents,
        total: allEvents.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

    } catch (error) {
      console.error('Error fetching all calendar data:', error);
      res.status(500).json({ error: 'Failed to fetch all calendar data' });
    }
  });

  return router;
};

