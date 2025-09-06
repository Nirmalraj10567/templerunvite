const express = require('express');
const router = express.Router();

module.exports = function({ db, retryOnBusy }) {
  // GET all occupations for a temple
  router.get('/:templeId', async (req, res) => {
    try {
      const occupations = await db('master_occupations')
        .where('temple_id', req.params.templeId)
        .select('*');
      res.json(occupations);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch occupations' });
    }
  });

  return router;
};
