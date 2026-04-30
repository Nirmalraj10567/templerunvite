const express = require('express');
const router = express.Router();
const { sendNotification, sendToTopic } = require('../config/firebase-notification');
const db = require('../db');

// POST /api/test-notification/send
// Send test notification to specific token(s)
router.post('/send', async (req, res) => {
  try {
    const { tokens, title, body, data, templeId } = req.body;
    
    if (!tokens && !templeId) {
      return res.status(400).json({ 
        error: 'Either tokens array or templeId is required' 
      });
    }

    if (!title || !body) {
      return res.status(400).json({ 
        error: 'Title and body are required' 
      });
    }

    let targetTokens = [];

    if (tokens) {
      // Use provided tokens
      targetTokens = Array.isArray(tokens) ? tokens : [tokens];
    } else if (templeId) {
      // Get tokens from database for specific temple
      const users = await db('user_registrations')
        .where('temple_id', templeId)
        .whereNotNull('fcm_token')
        .select('fcm_token');
      
      targetTokens = users.map(u => u.fcm_token).filter(Boolean);
      
      if (targetTokens.length === 0) {
        return res.status(404).json({ 
          error: `No FCM tokens found for temple_id: ${templeId}` 
        });
      }
    }

    const result = await sendNotification(
      targetTokens,
      title,
      body,
      data || {}
    );

    res.json({
      success: true,
      message: 'Notification sent',
      successCount: result.successCount,
      failureCount: result.failureCount,
      tokensUsed: targetTokens.length,
      responses: result.responses.map((r, i) => ({
        token: targetTokens[i]?.substring(0, 20) + '...',
        success: r.success,
        error: r.error?.message || null,
      })),
    });

  } catch (err) {
    console.error('Test notification error:', err);
    res.status(500).json({ error: 'Failed to send notification', details: err.message });
  }
});

// POST /api/test-notification/send-to-topic
// Send notification to a topic
router.post('/send-to-topic', async (req, res) => {
  try {
    const { topic, title, body, data } = req.body;

    if (!topic || !title || !body) {
      return res.status(400).json({ 
        error: 'Topic, title, and body are required' 
      });
    }

    const result = await sendToTopic(topic, title, body, data || {});

    res.json({
      success: true,
      message: 'Notification sent to topic',
      messageId: result.messageId || result.message_id,
    });

  } catch (err) {
    console.error('Topic notification error:', err);
    res.status(500).json({ error: 'Failed to send topic notification', details: err.message });
  }
});

// GET /api/test-notification/tokens
// Get all FCM tokens (for testing)
router.get('/tokens', async (req, res) => {
  try {
    const { templeId } = req.query;
    
    let query = db('user_registrations')
      .whereNotNull('fcm_token')
      .select('id', 'name', 'mobile_number', 'temple_id', 'fcm_token');

    if (templeId) {
      query = query.where('temple_id', templeId);
    }

    const users = await query;

    res.json({
      success: true,
      count: users.length,
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        mobile: u.mobile_number,
        templeId: u.temple_id,
        tokenPreview: u.fcm_token?.substring(0, 30) + '...',
      })),
    });

  } catch (err) {
    console.error('Get tokens error:', err);
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

module.exports = router;
