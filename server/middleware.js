const jwt = require('jsonwebtoken');
const knex = require('knex');
const db = require('./db');

// JWT Secret (must match the one in backend.js)
const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';

// Knex instance
const knexDb = knex({
  client: 'sqlite3',
  connection: {
    filename: __dirname + '/deev.sqlite3',
  },
  useNullAsDefault: true
});

// Function to retry database operations on SQLITE_BUSY
const retryOnBusy = async (fn, maxRetries = 5, delay = 100) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err.code === 'SQLITE_BUSY' && i < maxRetries - 1) {
        console.log(`Database busy, retrying (${i+1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
};

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Middleware to authorize user roles
const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Middleware to check if user has access to specific temple
const authorizeTempleAccess = (req, res, next) => {
  if (!req.user || !req.user.templeId) {
    return res.status(401).json({ error: 'User not authenticated or temple ID missing' });
  }
  next();
};

// Enhanced authorizePermission middleware with superadmin bypass
const authorizePermission = (permissionId, requiredLevel = 'view') => {
  return async (req, res, next) => {
    if (req.user.role === 'superadmin') {
      return next();
    }

    try {
      const permission = await knexDb('user_permissions')
        .where({ 
          user_id: req.user.id, 
          permission_id: permissionId 
        })
        .first();
      
      if (!permission) {
        return res.status(403).json({ error: 'Permission not granted' });
      }
      
      const accessLevels = { 'view': 1, 'edit': 2, 'full': 3 };
      const userLevel = accessLevels[permission.access_level] || 0;
      const requiredLevelNum = accessLevels[requiredLevel] || 0;
      
      if (userLevel < requiredLevelNum) {
        return res.status(403).json({ error: 'Insufficient permission level' });
      }
      
      next();
    } catch (err) {
      console.error('Permission check error:', err);
      res.status(500).json({ error: 'Error checking permissions' });
    }
  };
};

module.exports = {
  retryOnBusy,
  authenticateToken,
  authorizeRole,
  authorizeTempleAccess,
  authorizePermission
};
