/**
 * Get all products for a specific temple
 */
const getProductsByTemple = async (req, res) => {
  try {
    const { templeId } = req.params;
    const db = req.app.get('db');
    
    const products = await db('donation_products')
      .where({ temple_id: templeId })
      .orderBy('label', 'asc');

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products'
    });
  }
};

/**
 * Create a new product for a temple
 */
const createProduct = async (req, res) => {
  try {
    const { templeId } = req.params;
    const { label, value, unit } = req.body;
    const db = req.app.get('db');

    // Validate required fields
    if (!label) {
      return res.status(400).json({
        success: false,
        error: 'Product label is required'
      });
    }

    // Check for duplicate product name in this temple
    const existing = await db('donation_products')
      .where({ temple_id: templeId })
      .whereRaw('LOWER(label) = ?', [label.toLowerCase()])
      .first();

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'A product with this name already exists in this temple'
      });
    }

    // Create new product
    const [id] = await db('donation_products').insert({
      label,
      value: value || label,
      unit,
      temple_id: templeId,
      created_at: db.fn.now()
    });

    const product = await db('donation_products').where({ id }).first();

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create product'
    });
  }
};

/**
 * Update an existing product
 */
const updateProduct = async (req, res) => {
  try {
    const { templeId, id } = req.params;
    const { label, value, unit } = req.body;
    const db = req.app.get('db');

    // Find the product
    const product = await db('donation_products')
      .where({ id, temple_id: templeId })
      .first();

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Check for duplicate name if name is being changed
    if (label && label !== product.label) {
      const existing = await db('donation_products')
        .where({ temple_id: templeId })
        .whereRaw('LOWER(label) = ?', [label.toLowerCase()])
        .where('id', '!=', id)
        .first();

      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'A product with this name already exists in this temple'
        });
      }
    }

    // Update product
    await db('donation_products')
      .where({ id })
      .update({
        label: label || product.label,
        value: value || label || product.value,
        unit: unit !== undefined ? unit : product.unit,
        updated_at: db.fn.now()
      });

    const updatedProduct = await db('donation_products').where({ id }).first();

    res.json({
      success: true,
      data: updatedProduct
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update product'
    });
  }
};

/**
 * Delete a product
 */
const deleteProduct = async (req, res) => {
  try {
    const { templeId, id } = req.params;
    const db = req.app.get('db');

    const product = await db('donation_products')
      .where({ id, temple_id: templeId })
      .first();

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    await db('donation_products').where({ id }).del();

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete product'
    });
  }
};

module.exports = {
  getProductsByTemple,
  createProduct,
  updateProduct,
  deleteProduct
};
