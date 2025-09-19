const jwt = require('jsonwebtoken');
const db = require('./db');

// JWT Secret (must match the one in backend.js)
const JWT_SECRET = process.env.JWT_SECRET

// Knex instance (MySQL via shared configuration in server/db.js)
const knexDb = db;

// Generic retry helper (still useful for transient DB errors)
const retryOnBusy = async (fn, maxRetries = 3, delay = 150) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i < maxRetries - 1) {
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
