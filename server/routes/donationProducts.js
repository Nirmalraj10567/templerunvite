const express = require('express');
const { authenticateToken } = require('../middlewares/auth');
const { validateTempleAccess } = require('../middleware/temple');
const donationProductController = require('../controllers/donationProducts');

module.exports = ({ db }) => {
  const router = express.Router();
  
  // Set database connection in app for controllers to access
  router.use((req, res, next) => {
    req.app.set('db', db);
    next();
  });

  // All routes require authentication
  router.use(authenticateToken);

  // Get products for a temple
  router.get('/:templeId', 
    validateTempleAccess,
    donationProductController.getProductsByTemple
  );

  // Create new product for a temple
  router.post('/:templeId',
    validateTempleAccess,
    donationProductController.createProduct
  );

  // Update product for a temple
  router.put('/:templeId/:id',
    validateTempleAccess,
    donationProductController.updateProduct
  );

  // Delete product from a temple
  router.delete('/:templeId/:id',
    validateTempleAccess,
    donationProductController.deleteProduct
  );

  return router;
};
