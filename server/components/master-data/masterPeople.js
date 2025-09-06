const express = require('express');
const router = express.Router();

module.exports = function({ db, retryOnBusy }) {
  // Create a new master person
  router.post('/', async (req, res) => {
    const { 
      templeId, 
      name, 
      address, 
      village, 
      mobile, 
      mobileNumber 
    } = req.body;

    if (!templeId || !name) {
      return res.status(400).json({ error: 'Temple ID and name are required.' });
    }

    try {
      const newPeopleRecord = await retryOnBusy(() => db('master_people').insert({
        temple_id: templeId,
        name,
        gender: '',
        dob: '',
        address: Array.isArray(address) ? address.join(', ') : address,
        village: village || '',
        mobile: mobile || mobileNumber || '',
        email: '',
        note: '',
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      }).returning('*'));

      console.log('Successfully saved master people record:', newPeopleRecord);
      res.json({ success: true, record: newPeopleRecord });
    } catch (err) {
      console.error('Error saving master people record - Full error:', err);
      res.status(500).json({ 
        error: 'Database error while saving master people record.', 
        details: err.message 
      });
    }
  });

  // Get all people for a temple
  router.get('/:templeId', async (req, res) => {
    const { templeId } = req.params;

    try {
      const people = await db('master_people')
        .where('temple_id', templeId)
        .select('*')
        .orderBy('created_at', 'desc');
      
      res.json(people);
    } catch (err) {
      console.error('Error fetching master people:', err);
      res.status(500).json({ 
        error: 'Database error while fetching master people.' 
      });
    }
  });

  return router;
};
