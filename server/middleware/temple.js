/**
 * Middleware to validate if user has access to the temple
 */
const validateTempleAccess = async (req, res, next) => {
  try {
    const { templeId } = req.params;
    const db = req.app.get('db');
    
    // Validate templeId is present
    if (!templeId) {
      return res.status(400).json({
        success: false,
        error: 'Temple ID is required'
      });
    }

    // Check if temple exists
    const temple = await db('temples').where({ id: templeId }).first();
    if (!temple) {
      return res.status(404).json({
        success: false,
        error: 'Temple not found'
      });
    }

    // Check if user has access to this temple
    if (req.user.templeId !== parseInt(templeId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: User does not have permission for this temple'
      });
    }

    // Store temple in request for later use
    req.temple = temple;
    next();
  } catch (error) {
    console.error('Temple validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during temple validation'
    });
  }
};

module.exports = {
  validateTempleAccess
};
