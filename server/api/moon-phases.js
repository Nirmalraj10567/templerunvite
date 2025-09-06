const express = require('express');
const router = express.Router();
const { getMoonPhases } = require('../services/moon-service');

router.get('/moon-phases', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const phases = await getMoonPhases(new Date(startDate), new Date(endDate));
    res.json(phases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
