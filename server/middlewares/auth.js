const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  // Public allowlist (bypass auth)
  // Use originalUrl to match full path regardless of where the router is mounted
  const url = req.originalUrl || req.url || '';
  const method = req.method;
  const isPublic = (
    // Mobile events list should be public
    (method === 'GET' && /\/api\/events\/mobile\/events(\?.*)?$/.test(url))
  );

  if (isPublic) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

module.exports = { authenticateToken };
