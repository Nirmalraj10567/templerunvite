const express = require('express');
const router = express.Router();
const db = require('../db');
const {
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
} = require('../utils/refreshToken');

// POST /api/auth/refresh - exchange refresh token for new access token
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ success: false, error: 'refresh_token is required' });
    }

    const record = await verifyRefreshToken(refresh_token);
    if (!record) {
      return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
    }

    // Fetch user data
    const user = await db('users').where('id', record.user_id).first();
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    // Revoke old refresh token (rotate)
    await revokeRefreshToken(refresh_token);

    // Generate new token pair
    const newAccessToken = generateAccessToken(user);
    const newRefresh = generateRefreshToken(user.id);
    await storeRefreshToken(user.id, newRefresh.token, newRefresh.expiresAt);

    res.json({
      success: true,
      data: {
        access_token: newAccessToken,
        refresh_token: newRefresh.token,
        expires_in: 900, // 15 minutes in seconds
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ success: false, error: 'Token refresh failed' });
  }
});

// POST /api/auth/logout - revoke refresh token
router.post('/logout', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (refresh_token) {
      await revokeRefreshToken(refresh_token);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, error: 'Logout failed' });
  }
});

module.exports = router;
