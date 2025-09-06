const express = require('express');
const router = express.Router();

// Import middleware
const { authenticateToken, authorizePermission } = require('./middleware');

// Import shared db instance
const db = require('./db');

// Property Registration Endpoint
router.post('/', authenticateToken, authorizePermission('property_registrations', 'full'), async (req, res) => {
  try {
    const propertyData = req.body;
    
    // Validate required fields
    if (!propertyData.name || !propertyData.details || !propertyData.value) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Add created_by and temple_id from authenticated user
    propertyData.created_by = req.user.id;
    propertyData.temple_id = req.user.templeId;
    
    // Insert property
    const [propertyId] = await db('properties').insert(propertyData);
    
    res.json({
      success: true,
      propertyId,
      message: 'Property registered successfully'
    });
  } catch (err) {
    console.error('Property registration error:', err);
    res.status(500).json({ error: 'Failed to register property' });
  }
});

// GET endpoint to retrieve properties
router.get('/', authenticateToken, authorizePermission('property_registrations', 'view'), async (req, res) => {
  try {
    const properties = await db('properties')
      .select('id', 'name', 'details', 'value', 'created_at', 'updated_at')
      .where('temple_id', req.user.templeId)
      .orderBy('created_at', 'desc');
    
    res.json(properties);
  } catch (err) {
    console.error('Error fetching properties:', err);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// PUT endpoint to update properties
router.put('/:id', authenticateToken, authorizePermission('property_registrations', 'full'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, details, value } = req.body;
    
    if (!name || !details || !value) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const updated = await db('properties')
      .where({ id, temple_id: req.user.templeId })
      .update({ name, details, value, updated_at: db.fn.now() });
    
    if (updated === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    res.json({ success: true, message: 'Property updated successfully' });
  } catch (err) {
    console.error('Error updating property:', err);
    res.status(500).json({ error: 'Failed to update property' });
  }
});

module.exports = router;
