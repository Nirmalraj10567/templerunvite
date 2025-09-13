const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const { getMoonPhases } = require('../services/moon-service');
const { saveMoonDate, getSavedMoonDates, deleteMoonDate } = require('../services/moon-storage-service');

// Apply authentication to all moon-phases API endpoints
router.use(authenticateToken);

router.get('/moon-phases', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const phases = await getMoonPhases(new Date(startDate), new Date(endDate));
    res.json(phases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/moon-dates', async (req, res) => {
  try {
    const { date, label } = req.body;
    await saveMoonDate({ date, label });
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/moon-dates', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dates = await getSavedMoonDates(new Date(startDate), new Date(endDate));
    res.json(dates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/moon-dates/:date', async (req, res) => {
  try {
    // Date in path may be URL-encoded (contains ':'), so decode it
    const raw = req.params.date;
    const date = decodeURIComponent(raw);
    await deleteMoonDate(date);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete moon date:', error);
    res.status(500).json({ error: 'Failed to delete moon date' });
  }
});

module.exports = router;
