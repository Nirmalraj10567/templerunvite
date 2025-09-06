const express = require('express');
const router = express.Router();

/**
 * Logout endpoint
 * POST /api/logout
 */
router.post('/logout', (req, res) => {
  const userId = req.user.id;
  
  // Find the latest session log without a logout time for this user
  req.db('session_logs')
    .where({ user_id: userId, logout_time: null })
    .orderBy('login_time', 'desc')
    .first()
    .then(session => {
      if (session) {
        const logoutTime = new Date();
        const durationSeconds = Math.floor((logoutTime - session.login_time) / 1000);
        
        return req.db('session_logs')
          .where({ id: session.id })
          .update({
            logout_time: logoutTime,
            duration_seconds: durationSeconds
          });
      }
      return Promise.resolve();
    })
    .then(() => {
      res.sendStatus(200);
    })
    .catch(err => {
      console.error('Error updating session log:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});

module.exports = router;
