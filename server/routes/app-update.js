const express = require('express');
const router = express.Router();

// App version configuration (can be moved to database or config file later)
const APP_CONFIG = {
  android: {
    currentVersion: '1.0.0',
    minVersion: '1.0.0',
    downloadUrl: 'https://play.google.com/store/apps/details?id=com.temple.app',
    forceUpdate: false,
    updateMessage: 'New version available with bug fixes and improvements.',
  },
  ios: {
    currentVersion: '1.0.0',
    minVersion: '1.0.0',
    downloadUrl: 'https://apps.apple.com/app/temple-app/id123456789',
    forceUpdate: false,
    updateMessage: 'New version available with bug fixes and improvements.',
  },
};

// Helper function to compare version strings
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

// GET /api/app/version - Get current app version info
router.get('/version', (req, res) => {
  const { platform } = req.query;
  
  if (platform && ['android', 'ios'].includes(platform.toLowerCase())) {
    return res.json({
      success: true,
      platform: platform.toLowerCase(),
      ...APP_CONFIG[platform.toLowerCase()],
    });
  }
  
  // Return all platforms if no specific platform requested
  res.json({
    success: true,
    android: APP_CONFIG.android,
    ios: APP_CONFIG.ios,
  });
});

// POST /api/app/check-update - Check if update is available
router.post('/check-update', (req, res) => {
  try {
    const { platform, version, buildNumber } = req.body;
    
    if (!platform || !version) {
      return res.status(400).json({
        error: 'Platform and version are required',
      });
    }
    
    const normalizedPlatform = platform.toLowerCase();
    if (!['android', 'ios'].includes(normalizedPlatform)) {
      return res.status(400).json({
        error: 'Invalid platform. Must be "android" or "ios"',
      });
    }
    
    const config = APP_CONFIG[normalizedPlatform];
    const comparison = compareVersions(version, config.currentVersion);
    const isUpdateAvailable = comparison < 0;
    const isVersionSupported = compareVersions(version, config.minVersion) >= 0;
    
    res.json({
      success: true,
      updateAvailable: isUpdateAvailable,
      forceUpdate: !isVersionSupported,
      currentVersion: config.currentVersion,
      yourVersion: version,
      minVersion: config.minVersion,
      downloadUrl: config.downloadUrl,
      updateMessage: isUpdateAvailable ? config.updateMessage : 'You are using the latest version.',
      platform: normalizedPlatform,
    });
  } catch (err) {
    console.error('App update check error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
