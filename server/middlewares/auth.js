const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  // Public allowlist (bypass auth)
  // Use originalUrl to match full path regardless of where the router is mounted
  const url = req.originalUrl || req.url || '';
  const method = req.method;
  const isPublic = (
    // Allow login endpoint
    (method === 'POST' && /\/api\/login$/.test(url)) ||
    // Allow smart login discovery endpoint
    (method === 'POST' && /\/api\/login\/smart$/.test(url)) ||
    // Allow mobile-auth OTP verification (token validated internally)
    (method === 'POST' && /\/api\/mobile-auth\/verify-otp$/.test(url)) ||
    // Allow login mode discovery endpoint
    (method === 'GET' && /\/api\/login\/mode(\?.*)?$/.test(url)) ||
    // Mobile events list should be public
    (method === 'GET' && /\/api\/events\/mobile\/events(\?.*)?$/.test(url)) ||
    // Allow PDF/receipt endpoints that validate token via query using verifyQueryToken
    // Example: /api/money-donations/:id/receipt.pdf?token=...
    //          /api/tax-registrations/:id/receipt.pdf?token=...
    //          /api/annadhanam/:id/receipt.pdf?token=...
    //          /api/hall-bookings/:id/receipt.pdf?token=...
    //          /api/ledger/trial-balance.pdf?token=...
    // Explicit allow for hall bookings receipt with token in query
    (method === 'GET' && /\/api\/hall-bookings\/[0-9]+\/receipt\.pdf(\?.*)?$/.test(url)) ||
    (method === 'GET' && /\/api\/(?:[^\s]+)\/receipt\.pdf(\?.*)?$/.test(url)) ||
    (method === 'GET' && /\/api\/.*\.pdf(\?.*)?$/.test(url))
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
