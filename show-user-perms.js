const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'deev.sqlite3');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Database open error:', err.message);
    return;
  }

  const mobile = '9999999999';
  
  // Get user ID
  db.get(`SELECT id, username, role FROM users WHERE mobile = ?`, [mobile], (err, user) => {
    if (err || !user) {
      console.error('User not found:', err?.message || 'No user with mobile ' + mobile);
      db.close();
      return;
    }

    console.log(`\nUser Permissions for ${user.username} (${mobile}):`);
    console.log(`Role: ${user.role}\n`);

    // Get permissions
    db.all(`SELECT permission_id, access_level FROM user_permissions WHERE user_id = ?`, [user.id], (err, permissions) => {
      if (err) {
        console.error('Permissions query error:', err.message);
        db.close();
        return;
      }

      if (permissions.length === 0) {
        console.log('No permissions found for this user');
      } else {
        console.log('Permissions:');
        permissions.forEach(perm => {
          console.log(`- ${perm.permission_id}: ${perm.access_level}`);
        });
      }
      
      db.close();
    });
  });
});
