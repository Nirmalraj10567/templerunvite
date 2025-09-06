const express = require('express');
const router = express.Router();

/**
 * Helper: convert a DB row to camelCase response expected by frontend
 * @param {Object} row - Database row
 * @returns {Object} - Formatted object with camelCase keys
 */
function mapPropertyToCamel(row) {
  if (!row) return null;
  const cap = (s) => (!s ? '' : s.charAt(0).toUpperCase() + s.slice(1));
  
  return {
    id: row.id,
    propertyNo: row.property_no,
    surveyNo: row.survey_no,
    wardNo: row.ward_no,
    streetName: row.street_name,
    area: row.area,
    city: row.city,
    pincode: row.pincode,
    ownerName: row.owner_name,
    ownerMobile: row.owner_mobile,
    ownerAadhaar: row.owner_aadhaar,
    ownerAddress: row.owner_address,
    taxAmount: Number(row.tax_amount || 0),
    taxYear: Number(row.tax_year || new Date().getFullYear()),
    taxStatus: row.tax_status ? cap(row.tax_status) : 'Pending',
    lastPaidDate: row.last_paid_date,
    pendingAmount: Number(row.pending_amount || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Helper: convert a camelCase payload to DB snake_case columns (safe update)
 * @param {Object} payload - Request payload with camelCase keys
 * @returns {Object} - Object with snake_case keys for database
 */
function mapCamelToSnakeUpdate(payload) {
  const out = {};
  const map = {
    propertyNo: 'property_no',
    surveyNo: 'survey_no',
    wardNo: 'ward_no',
    streetName: 'street_name',
    area: 'area',
    city: 'city',
    pincode: 'pincode',
    ownerName: 'owner_name',
    ownerMobile: 'owner_mobile',
    ownerAadhaar: 'owner_aadhaar',
    ownerAddress: 'owner_address',
    taxAmount: 'tax_amount',
    taxYear: 'tax_year',
    taxStatus: 'tax_status',
    lastPaidDate: 'last_paid_date',
    pendingAmount: 'pending_amount',
  };
  
  for (const [k, v] of Object.entries(payload || {})) {
    if (k in map) {
      if (k === 'taxAmount' || k === 'pendingAmount' || k === 'taxYear') {
        out[map[k]] = Number(v);
      } else if (k === 'taxStatus' && typeof v === 'string') {
        out[map[k]] = v.toLowerCase();
      } else {
        out[map[k]] = v;
      }
    } else if (k.includes('_')) {
      // already snake_case
      out[k] = v;
    }
  }
  return out;
}

/**
 * Helper function to generate a unique property number
 * @returns {string} Generated property number
 */
function generatePropertyNumber() {
  const yearNow = new Date().getFullYear();
  return `PROP-${yearNow}-${Math.floor(Math.random() * 90000 + 10000)}`;
}

/**
 * Register a new property
 * POST /api/properties
 */
router.post('/', async (req, res) => {
  try {
    const {
      propertyNo, surveyNo, wardNo, streetName, area, city, pincode,
      ownerName, ownerMobile, ownerAadhaar, ownerAddress,
      taxAmount, taxYear, taxStatus, lastPaidDate, pendingAmount
    } = req.body;

    const now = new Date();
    const yearNow = now.getFullYear();

    const normalizedTaxStatus = (taxStatus || 'pending').toString().trim().toLowerCase();
    const amountNum = Number(taxAmount ?? 0) || 0;
    const pendingNum = pendingAmount != null ? Number(pendingAmount) : amountNum;
    const yearNum = Number(taxYear ?? yearNow) || yearNow;

    // Accept alternative field names coming from a simplified form
    const streetOrAddress = streetName || req.body.address || 'N/A';

    // Build insert payload with fallbacks for NOT NULL columns
    const insertData = {
      property_no: propertyNo || generatePropertyNumber(),
      survey_no: surveyNo || 'N/A',
      ward_no: wardNo || 'N/A',
      street_name: streetOrAddress,
      area: area || 'N/A',
      city: city || 'N/A',
      pincode: pincode || '000000',
      owner_name: ownerName || 'Unknown',
      owner_mobile: ownerMobile || '0000000000',
      owner_aadhaar: ownerAadhaar || null,
      owner_address: ownerAddress || null,
      tax_amount: amountNum,
      tax_year: yearNum,
      tax_status: normalizedTaxStatus,
      last_paid_date: lastPaidDate ? new Date(lastPaidDate) : null,
      pending_amount: pendingNum,
      created_by: req.user.id,
      temple_id: req.user.templeId,
      created_at: now,
      updated_at: now
    };

    const [propertyId] = await req.db('properties').insert(insertData).returning('id');

    res.status(201).json({
      success: true,
      message: 'Property registered successfully',
      propertyId
    });
  } catch (error) {
    console.error('Error registering property:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to register property',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get all properties with pagination and search
 * GET /api/properties
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 10, search = '' } = req.query;
    const offset = (page - 1) * pageSize;
    const templeId = req.user.templeId;

    // Base query
    let query = req.db('properties')
      .where('temple_id', templeId)
      .orderBy('created_at', 'desc');

    // Apply search if provided
    if (search) {
      const searchTerm = `%${search}%`;
      query = query.where(function() {
        this.where('property_no', 'like', searchTerm)
          .orWhere('survey_no', 'like', searchTerm)
          .orWhere('owner_name', 'like', searchTerm)
          .orWhere('owner_mobile', 'like', searchTerm);
      });
    }

    // Get total count for pagination
    const [countResult] = await query.clone().clearSelect().count('* as total');
    const total = countResult.total;

    // Apply pagination
    const rows = await query
      .select('*')
      .limit(pageSize)
      .offset(offset);

    const properties = rows.map(mapPropertyToCamel);

    res.json({
      success: true,
      data: properties,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch properties',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get single property by ID
 * GET /api/properties/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const property = await req.db('properties')
      .where({
        id: req.params.id,
        temple_id: req.user.templeId
      })
      .first();

    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }

    res.json({
      success: true,
      data: mapPropertyToCamel(property)
    });
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch property',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
