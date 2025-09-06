const express = require('express');
const router = express.Router();

module.exports = function({ db, retryOnBusy }) {
  // GET all educations for a temple
  router.get('/:templeId', async (req, res) => {
    try {
      const educations = await db('master_educations')
        .where('temple_id', req.params.templeId)
        .select('*');
      res.json(educations);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch educations' });
    }
  });

  return router;
};
