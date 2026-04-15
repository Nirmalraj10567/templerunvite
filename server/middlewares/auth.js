const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  // Public allowlist (bypass auth)
  // Use originalUrl to match full path regardless of where the router is mounted
  const url = req.originalUrl || req.url || '';
  const method = req.method;

  // Always allow CORS preflight requests
  if (method === 'OPTIONS') {
    return next();
  }

  // Normalize path: strip query string and trailing slash
  const pathOnly = (url.split('?')[0] || '').replace(/\/$/, '');
  const isPublic = (
    // Allow login endpoint
    (method === 'POST' && ((/\/api\/login$/.test(pathOnly)) || (/\/login$/.test(pathOnly)))) ||
    // Allow OTP login endpoint
    (method === 'POST' && ((/\/api\/login\/otp$/.test(pathOnly)) || (/\/login\/otp$/.test(pathOnly)))) ||
    // Allow smart login discovery endpoint
    (method === 'POST' && ((/\/api\/login\/smart$/.test(pathOnly)) || (/\/login\/smart$/.test(pathOnly)))) ||
    // Allow public user registration endpoint
    (method === 'POST' && ((/\/api\/register$/.test(pathOnly)) || (/\/register$/.test(pathOnly)))) ||
    // Allow mobile-auth OTP verification (token validated internally)
    (method === 'POST' && /\/api\/mobile-auth\/verify-otp$/.test(pathOnly)) ||
    // Allow guest login endpoint
    (method === 'POST' && /\/api\/mobile-auth\/guest-login$/.test(pathOnly)) ||
    // Allow login mode discovery endpoint
    (method === 'GET' && ((/\/api\/login\/mode$/.test(pathOnly)) || (/\/login\/mode$/.test(pathOnly)))) ||
    // Mobile events list should be public (correct path)
    (method === 'GET' && /\/api\/mobile\/events$/.test(pathOnly)) ||
    // Allow PDF/receipt endpoints that validate token via query using verifyQueryToken
    // Example: /api/money-donations/:id/receipt.pdf?token=...
    //          /api/tax-registrations/:id/receipt.pdf?token=...
    //          /api/annadhanam/:id/receipt.pdf?token=...
    //          /api/hall-bookings/:id/receipt.pdf?token=...
    //          /api/ledger/trial-balance.pdf?token=...
    // Explicit allow for hall bookings receipt with token in query
    (method === 'GET' && /\/api\/hall-bookings\/[0-9]+\/receipt\.pdf$/.test(pathOnly)) ||
    (method === 'GET' && /\/api\/(?:[^\s]+)\/receipt\.pdf$/.test(pathOnly)) ||
    (method === 'GET' && /\/api\/.*\.pdf$/.test(pathOnly))
  );

  if (isPublic) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // Debug: log denial to help diagnose mismatched paths in production
    try {
      console.warn('[AUTH] 401 Access token required:', { method, url, pathOnly });
    } catch {}
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
