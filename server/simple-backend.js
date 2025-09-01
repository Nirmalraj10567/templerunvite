const express = require('express');
const knex = require('knex');
const app = express();
const port = 4000;

// Database configuration
const db = knex({
  client: 'sqlite3',
  connection: {
    filename: './deev.sqlite3'
  },
  useNullAsDefault: true
});

app.use(express.json());

console.log('Starting minimal server...');

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Simple property registration route
app.post('/api/properties', async (req, res) => {
  try {
    console.log('Received property registration:', req.body);

    const [id] = await db('properties').insert({
      property_no: req.body.wardNo || 'TEMP',
      survey_no: req.body.wardNo || 'TEMP',
      ward_no: req.body.wardNo || 'TEMP',
      street_name: req.body.streetName || 'TEMP',
      area: req.body.area || 'TEMP',
      city: req.body.city || 'TEMP',
      pincode: '000000',
      owner_name: req.body.ownerName || 'TEMP',
      owner_mobile: req.body.ownerMobile || '0000000000',
      tax_amount: req.body.taxAmount || 0,
      tax_year: req.body.taxYear || 2025,
      tax_status: 'pending',
      pending_amount: req.body.taxAmount || 0,
      created_by: 1,
      temple_id: 1
    });

    console.log('Property inserted with ID:', id);
    res.status(201).json({ success: true, id });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
