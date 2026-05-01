const express = require('express');
const router = express.Router();

// Import middleware
const { authenticateToken, authorizePermission } = require('./middleware');

// Import shared db instance
let db;
try { db = require('./db'); } catch {}

// Helper to get db instance
function getDb() {
  if (db) return db;
  if (global.assetDb) return global.assetDb;
  try { return require('./db'); } catch { return null; }
}

// Helper to generate receipt number
async function generateReceiptNumber(templeId) {
  const database = getDb();
  if (!database) return `2026-${Date.now()}`;
  
  const year = new Date().getFullYear();
  const latest = await database('daybook_entries')
    .where('temple_id', templeId)
    .where('receipt_number', 'like', `${year}-%`)
    .orderBy('id', 'desc')
    .first();
  
  let nextNumber = 1;
  if (latest && latest.receipt_number) {
    const parts = String(latest.receipt_number).split('-');
    if (parts.length === 2 && parts[0] === String(year)) {
      nextNumber = parseInt(parts[1], 10) + 1;
    }
  }
  return `${year}-${String(nextNumber).padStart(4, '0')}`;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Log asset action to asset_logs table
 */
async function logAssetAction({ assetId, action, details, userId }) {
  try {
    await db('asset_logs').insert({
      asset_id: assetId,
      action,
      details: details ? JSON.stringify(details) : null,
      created_by: userId,
      created_at: db.fn.now()
    });
  } catch (err) {
    console.error('Failed to log asset action:', err);
    // Don't throw - logging failures shouldn't break the main operation
  }
}

/**
 * Verify asset ownership - checks if asset belongs to user's temple
 * Returns the asset if found and owned, null otherwise
 */
async function verifyAssetOwnership(assetId, templeId) {
  const asset = await db('assets')
    .where({ id: assetId, temple_id: templeId })
    .first();
  return asset;
}

/**
 * Create ledger entry for income when asset is converted to cash
 */
async function createIncomeEntry({ asset, userId, templeId }) {
  const today = new Date().toISOString().split('T')[0];

  const [ledgerEntryId] = await db('ledger_entries').insert({
    date: today,
    name: 'ASSET CONVERSION A/C',
    under: 'INCOME A/C',
    type: 'credit',
    amount: parseFloat(asset.value),
    note: `Asset Conversion: ${asset.name}. Asset ID: ${asset.id}, Source: ${asset.asset_source || 'N/A'}`,
    temple_id: templeId,
    created_at: db.fn.now(),
    updated_at: db.fn.now()
  });

  // Create ledger entry log
  await db('ledger_entry_logs').insert({
    ledger_entry_id: ledgerEntryId,
    action: 'create',
    created_by: userId,
    details: JSON.stringify({
      date: today,
      name: `Asset Conversion: ${asset.name}`,
      under: 'INCOME A/C',
      type: 'credit',
      amount: asset.value,
      note: `Converted asset to cash. Asset ID: ${asset.id}`,
      source: 'asset_conversion'
    }),
    created_at: db.fn.now()
  });

  return ledgerEntryId;
}

// ==================== CREATE OPERATION ====================

/**
 * POST /api/properties
 * Create a new asset with source tracking
 * Flow: Add Property Form → Property Details → Source Tracking → Validate → Set Temple ID → Insert → Log Creation → Return 201
 */
router.post('/', authenticateToken, authorizePermission('asset_management', 'full'), async (req, res) => {
  try {
    const { name, details, value, quantity, asset_source, source_details, donor_name, donor_contact } = req.body;

    // Validate Required Fields
    if (!name || value === undefined || value === null) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Property name and value are required'
      });
    }

    const numericValue = parseFloat(value);
    const numericQty = parseFloat(quantity) || 1;
    if (isNaN(numericValue) || numericValue < 0) {
      return res.status(400).json({
        error: 'Invalid value',
        message: 'Value must be a positive number'
      });
    }

    // Prepare asset data with source tracking
    const assetData = {
      name: name.trim(),
      details: details ? details.trim() : null,
      value: numericValue,
      quantity: numericQty,
      // Source Tracking fields
      asset_source: asset_source || 'other', // 'purchase', 'donation', 'other'
      source_details: source_details ? source_details.trim() : null,
      donor_name: donor_name ? donor_name.trim() : null,
      donor_contact: donor_contact ? donor_contact.trim() : null,
      // Ownership
      created_by: req.user.id,
      temple_id: req.user.templeId,
      status: 'active',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    };

    // Insert into assets table
    const [assetId] = await db('assets').insert(assetData);

    // Log Creation (sanitize data to avoid circular references from db.fn.now())
    await logAssetAction({
      assetId,
      action: 'create',
      details: {
        asset: {
          name: assetData.name,
          details: assetData.details,
          value: assetData.value,
          quantity: assetData.quantity,
          asset_source: assetData.asset_source,
          source_details: assetData.source_details,
          donor_name: assetData.donor_name,
          donor_contact: assetData.donor_contact,
          status: assetData.status,
          temple_id: assetData.temple_id,
          created_by: assetData.created_by
        },
        message: 'Asset created successfully'
      },
      userId: req.user.id
    });

    // Return 201 Success
    res.status(201).json({
      success: true,
      assetId,
      message: 'Property registered successfully'
    });
  } catch (err) {
    console.error('Property registration error:', err);
    res.status(500).json({ error: 'Failed to register property' });
  }
});

// ==================== VIEW OPERATION ====================

/**
 * GET /api/properties
 * List all properties for the user's temple
 * Flow: List Properties → Query properties Table → Filter by Temple ID → Order by Updated At → Return Property List
 */
router.get('/', authenticateToken, authorizePermission('asset_management', 'view'), async (req, res) => {
  try {
    // Query properties Table → Filter by Temple ID → Order by Updated At
    const assets = await db('assets')
      .select(
        'id',
        'name',
        'details',
        'value',
        'quantity',
        'used_qty',
        'for_sell_qty',
        'asset_source',
        'source_details',
        'donor_name',
        'donor_contact',
        'status',
        'converted_at',
        'conversion_income_id',
        'convert_price',
        'created_at',
        'updated_at'
      )
      .where('temple_id', req.user.templeId)
      .orderBy('updated_at', 'desc');

    // Return Property List
    res.json({
      success: true,
      data: assets,
      count: assets.length
    });
  } catch (err) {
    console.error('Error fetching properties:', err);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

/**
 * GET /api/assets/stats
 * Get asset statistics
 */
router.get('/stats', authenticateToken, authorizePermission('asset_management', 'view'), async (req, res) => {
  try {
    const assets = await db('assets')
      .where('temple_id', req.user.templeId);
    
    const total = assets.length;
    const active = assets.filter(a => a.status === 'active').length;
    const converted = assets.filter(a => a.status === 'converted').length;
    
    // Calculate total value of ACTIVE assets (Inventory Value)
    // Total Value = Sum of (quantity * unit_price)
    const totalValue = assets
      .filter(a => a.status === 'active')
      .reduce((sum, a) => {
        const val = parseFloat(a.value) || 0;
        const qty = parseFloat(a.quantity) || 0;
        return sum + (val * qty);
      }, 0);
    
    res.json({
      success: true,
      data: { total, active, converted, totalValue }
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/properties/:id
 * Get single property details (for Edit flow - Load Property Data)
 */
router.get('/:id', authenticateToken, authorizePermission('asset_management', 'view'), async (req, res) => {
  try {
    const { id } = req.params;

    const asset = await db('assets')
      .where({ id, temple_id: req.user.templeId })
      .select('*')
      .first();

    if (!asset) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json({
      success: true,
      data: asset
    });
  } catch (err) {
    console.error('Error fetching property:', err);
    res.status(500).json({ error: 'Failed to fetch property' });
  }
});

// ==================== UPDATE OPERATION ====================

/**
 * PUT /api/properties/:id
 * Update an existing asset
 * Flow: Edit Property → Load Property Data → Verify Ownership → Authorized? → Update Fields → Update Database → Return 200 Success
 */
router.put('/:id', authenticateToken, authorizePermission('asset_management', 'full'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, details, value, quantity, asset_source, source_details, donor_name, donor_contact } = req.body;

    // Load Property Data → Verify Ownership
    const asset = await verifyAssetOwnership(id, req.user.templeId);

    if (!asset) {
      return res.status(403).json({
        error: 'Not authorized',
        message: 'Property not found or you do not have permission to update it'
      });
    }

    // Check if asset is already converted
    if (asset.status === 'converted') {
      return res.status(400).json({
        error: 'Cannot update converted asset',
        message: 'This asset has already been converted to cash and cannot be modified'
      });
    }

    // Validate input
    if (!name || value === undefined || value === null) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Property name and value are required'
      });
    }

    const numericValue = parseFloat(value);
    const numericQty = parseFloat(quantity) || 1;
    if (isNaN(numericValue) || numericValue < 0) {
      return res.status(400).json({
        error: 'Invalid value',
        message: 'Value must be a positive number'
      });
    }

    // Prepare update data
    const updateData = {
      name: name.trim(),
      details: details ? details.trim() : null,
      value: numericValue,
      quantity: numericQty,
      asset_source: asset_source || asset.asset_source,
      source_details: source_details ? source_details.trim() : asset.source_details,
      donor_name: donor_name ? donor_name.trim() : asset.donor_name,
      donor_contact: donor_contact ? donor_contact.trim() : asset.donor_contact,
      updated_at: db.fn.now()
    };

    // Update Database
    await db('assets')
      .where({ id, temple_id: req.user.templeId })
      .update(updateData);

    // Log Update (sanitize to avoid circular references)
    await logAssetAction({
      assetId: id,
      action: 'update',
      details: {
        before: {
          name: asset.name,
          details: asset.details,
          value: asset.value,
          quantity: asset.quantity,
          asset_source: asset.asset_source,
          source_details: asset.source_details,
          donor_name: asset.donor_name,
          donor_contact: asset.donor_contact,
          status: asset.status
        },
        after: {
          name: updateData.name,
          details: updateData.details,
          value: updateData.value,
          quantity: updateData.quantity,
          asset_source: updateData.asset_source,
          source_details: updateData.source_details,
          donor_name: updateData.donor_name,
          donor_contact: updateData.donor_contact
        },
        message: 'Asset updated successfully'
      },
      userId: req.user.id
    });

    // Return 200 Success
    res.json({
      success: true,
      message: 'Property updated successfully'
    });
  } catch (err) {
    console.error('Error updating property:', err);
    res.status(500).json({ error: 'Failed to update property' });
  }
});

// ==================== DELETE OPERATION ====================

/**
 * DELETE /api/properties/:id
 * Delete an asset
 * Flow: Delete Property → Verify Ownership → Authorized? → Delete Property → Return 200 Success
 */
router.delete('/:id', authenticateToken, authorizePermission('asset_management', 'full'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verify Ownership
    const asset = await verifyAssetOwnership(id, req.user.templeId);

    if (!asset) {
      return res.status(403).json({
        error: 'Not authorized',
        message: 'Property not found or you do not have permission to delete it'
      });
    }

    // Check if asset is already converted
    if (asset.status === 'converted') {
      return res.status(400).json({
        error: 'Cannot delete converted asset',
        message: 'This asset has already been converted to cash and cannot be deleted'
      });
    }

    // Log deletion before deleting (sanitize asset data)
    await logAssetAction({
      assetId: id,
      action: 'delete',
      details: {
        asset: {
          name: asset.name,
          details: asset.details,
          value: asset.value,
          asset_source: asset.asset_source,
          status: asset.status,
          temple_id: asset.temple_id,
          created_by: asset.created_by
        },
        message: 'Asset deleted'
      },
      userId: req.user.id
    });

    // Delete Property
    await db('assets')
      .where({ id, temple_id: req.user.templeId })
      .del();

    // Return 200 Success
    res.json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting property:', err);
    res.status(500).json({ error: 'Failed to delete property' });
  }
});

// ==================== UPDATE QTY OPERATION ====================

/**
 * PUT /api/properties/:id/qty
 * Update asset quantity (used qty and for sell qty) without converting to cash
 */
router.put('/:id/qty', authenticateToken, authorizePermission('asset_management', 'full'), async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await verifyAssetOwnership(id, req.user.templeId);

    if (!asset) {
      return res.status(403).json({
        error: 'Not authorized',
        message: 'Property not found or you do not have permission'
      });
    }

    const usedQty = req.body?.usedQty !== undefined ? parseInt(req.body.usedQty) : 0;
    const forSellQty = req.body?.forSellQty !== undefined ? parseInt(req.body.forSellQty) : 0;

    await db('assets')
      .where({ id, temple_id: req.user.templeId })
      .update({
        used_qty: usedQty,
        for_sell_qty: forSellQty,
        updated_at: db.fn.now()
      });

    await logAssetAction({
      assetId: id,
      action: 'update_qty',
      details: {
        asset: { name: asset.name },
        used_qty: usedQty,
        for_sell_qty: forSellQty,
        message: `Quantity updated: used=${usedQty}, for_sell=${forSellQty}`
      },
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Quantity updated successfully',
      usedQty,
      forSellQty
    });
  } catch (err) {
    console.error('Error updating quantity:', err);
    res.status(500).json({ error: 'Failed to update quantity' });
  }
});

// ==================== CONVERT TO CASH OPERATION ====================

/**
 * POST /api/properties/:id/convert-to-cash
 * Convert an asset to cash (creates income entry and updates ledger)
 * Flow: Asset Conversion → Load Asset Data → Asset Value > 0? → Initiate Conversion → Create Income Entry → Update Ledger → Mark Asset as Converted → Log Conversion → Return Success
 */
router.post('/:id/convert-to-cash', authenticateToken, authorizePermission('asset_management', 'full'), async (req, res) => {
  try {
    const { id } = req.params;

    // Load Asset Data → Verify Ownership
    const asset = await verifyAssetOwnership(id, req.user.templeId);

    if (!asset) {
      return res.status(403).json({
        error: 'Not authorized',
        message: 'Property not found or you do not have permission'
      });
    }

    // Check if already converted
    if (asset.status === 'converted') {
      return res.status(400).json({
        error: 'Already converted',
        message: 'This asset has already been converted to cash'
      });
    }

    // Get value from request body or asset.value
    const convertValue = req.body?.convertValue !== undefined 
      ? parseFloat(req.body.convertValue) 
      : parseFloat(asset.value);
    
    const usedQty = req.body?.usedQty !== undefined 
      ? parseInt(req.body.usedQty) 
      : 0;
    
    const forSellQty = req.body?.forSellQty !== undefined 
      ? parseInt(req.body.forSellQty) 
      : 0;
    
    const convertPrice = req.body?.convertPrice !== undefined 
      ? parseFloat(req.body.convertPrice) 
      : 0;
    
    if (isNaN(convertValue) || convertValue <= 0) {
      return res.status(400).json({
        error: 'Invalid value',
        message: 'Please provide a valid amount to convert'
      });
    }

    asset.value = convertValue;
    asset.used_qty = usedQty;
    asset.for_sell_qty = forSellQty;
    asset.convert_price = convertPrice;

    // Initiate Conversion → Create Income Entry (Asset Value = Income)
    const incomeEntryId = await createIncomeEntry({
      asset,
      userId: req.user.id,
      templeId: req.user.templeId
    });

    // Update Ledger (done via ledger entry creation above)

    // Sync to daybook
    let receiptNumber = null;
    try {
      const database = getDb();
      if (!database) {
        console.log('DB not available, skipping daybook sync');
      } else {
        const hasDaybook = await database.schema.hasTable('daybook_entries');
        if (hasDaybook) {
          receiptNumber = await generateReceiptNumber(req.user.templeId);
          await database('daybook_entries').insert({
            temple_id: req.user.templeId,
            entry_date: new Date().toISOString().slice(0, 10),
            entry_type: 'income',
            description: `Asset Converted - ${asset.name}`,
            reference_type: 'asset',
            reference_id: parseInt(id),
            receipt_number: receiptNumber,
            amount: convertValue,
            payment_mode: 'cash',
            party_name: asset.donor_name || null,
            party_mobile: asset.donor_contact || null,
            notes: `Asset converted to cash. Ledger Entry ID: ${incomeEntryId}`,
            running_balance: 0,
            created_by: req.user.id,
            created_at: database.fn.now(),
          });
          console.log('Synced asset conversion to daybook');
        }
      }
    } catch (daybookError) {
      console.error('Failed to sync to daybook:', daybookError.message);
    }

    // Create Journal Entry for Trial Balance/Balance Sheet
    try {
      await db('journal_entries').insert({
        date: new Date().toISOString().slice(0, 10),
        reference_number: receiptNumber || `ASSET-${id}`,
        description: `Asset Conversion - ${asset.name}`,
        total_amount: convertValue,
        from_account: 'ASSET CONVERSION A/C',
        to_account: 'INCOME A/C',
        amount: convertValue,
        entry_type: 'transfer',
        reference_type: 'asset',
        reference_id: parseInt(id),
        temple_id: req.user.templeId,
        created_by: req.user.id
      });
      console.log('Synced asset conversion to journal_entries');
    } catch (journalError) {
      console.error('Failed to sync to journal_entries:', journalError.message);
    }

    // Mark Asset as Converted
    await db('assets')
      .where({ id, temple_id: req.user.templeId })
      .update({
        status: 'converted',
        converted_at: db.fn.now(),
        converted_by: req.user.id,
        conversion_income_id: incomeEntryId,
        used_qty: usedQty || 0,
        for_sell_qty: forSellQty || 0,
        convert_price: convertPrice || 0,
        updated_at: db.fn.now()
      });

    // Log Conversion (sanitize asset data)
    await logAssetAction({
      assetId: id,
      action: 'convert_to_cash',
      details: {
        asset: {
          name: asset.name,
          details: asset.details,
          value: asset.value,
          asset_source: asset.asset_source,
          source_details: asset.source_details,
          donor_name: asset.donor_name,
          donor_contact: asset.donor_contact,
          status: asset.status,
          temple_id: asset.temple_id,
          created_by: asset.created_by
        },
        income_entry_id: incomeEntryId,
        converted_value: convertValue,
        used_qty: usedQty,
        for_sell_qty: forSellQty,
        convert_price: convertPrice,
        message: `Asset converted to cash. Income entry created with ID ${incomeEntryId}`
      },
      userId: req.user.id
    });

    // Return Success
    res.json({
      success: true,
      message: 'Asset successfully converted to cash',
      incomeEntryId,
      convertedValue: convertValue,
      usedQty,
      forSellQty,
      convertPrice
    });
  } catch (err) {
    console.error('Error converting asset to cash:', err);
    res.status(500).json({ error: 'Failed to convert asset to cash' });
  }
});

// ==================== LOGS ENDPOINT ====================

/**
 * GET /api/properties/:id/logs
 * Get audit logs for a specific asset
 */
router.get('/:id/logs', authenticateToken, authorizePermission('asset_management', 'view'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const asset = await verifyAssetOwnership(id, req.user.templeId);

    if (!asset) {
      return res.status(403).json({
        error: 'Not authorized',
        message: 'Property not found or you do not have permission'
      });
    }

    const logs = await db('asset_logs')
      .where('asset_id', id)
      .orderBy('created_at', 'desc');

    res.json({
      success: true,
      data: logs
    });
  } catch (err) {
    console.error('Error fetching asset logs:', err);
    res.status(500).json({ error: 'Failed to fetch asset logs' });
  }
});

/**
 * GET /api/properties/logs/all
 * Get all asset logs with pagination (admin only)
 */
router.get('/logs/all', authenticateToken, authorizePermission('asset_management', 'view'), async (req, res) => {
  try {
    const { page = 1, pageSize = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    // Get total count (filtered by temple for non-superadmins)
    let countQuery = db('asset_logs');
    if (req.user.role !== 'superadmin') {
      countQuery = countQuery
        .join('assets', 'asset_logs.asset_id', 'assets.id')
        .where('assets.temple_id', req.user.templeId);
    }
    const totalResult = await countQuery.count('* as count').first();
    const total = totalResult.count;

    // Get paginated logs
    let logsQuery = db('asset_logs')
      .select('asset_logs.*', 'assets.name as asset_name', 'assets.temple_id')
      .join('assets', 'asset_logs.asset_id', 'assets.id');

    if (req.user.role !== 'superadmin') {
      logsQuery = logsQuery.where('assets.temple_id', req.user.templeId);
    }

    const logs = await logsQuery
      .orderBy('asset_logs.created_at', 'desc')
      .limit(parseInt(pageSize))
      .offset(offset);

    res.json({
      success: true,
      data: logs,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (err) {
    console.error('Error fetching all asset logs:', err);
    res.status(500).json({ error: 'Failed to fetch asset logs' });
  }
});

module.exports = function(deps = {}) {
  // Simple check - just set deps if provided
  if (deps && deps.db) global.assetDb = deps.db;
  if (deps && deps.generateDaybookReceiptNumber) global.assetGenerateReceiptNumber = deps.generateDaybookReceiptNumber;
  return router;
};

// Export router for backward compatibility
module.exports.router = router;
