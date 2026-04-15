/**
 * Add daybook permission to test user
 * Run with: node add-daybook-permission.js
 */

const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'rootroot',
  database: process.env.MYSQL_DATABASE || 'temple'
};

async function addDaybookPermission() {
  let connection;

  try {
    console.log('========================================');
    console.log('ADD DAYBOOK PERMISSION');
    console.log('========================================\n');

    connection = await mysql.createConnection(dbConfig);
    console.log('✓ Connected to database\n');

    // Get test user
    const [users] = await connection.execute(
      'SELECT id, username FROM users WHERE username = ?',
      ['test_admin']
    );

    if (users.length === 0) {
      console.log('✗ Test user not found!');
      return;
    }

    const userId = users[0].id;
    console.log(`Found user: ${users[0].username} (ID: ${userId})\n`);

    // Check if daybook permission exists
    const [perms] = await connection.execute(
      'SELECT id FROM permissions WHERE id = ?',
      ['daybook']
    );

    if (perms.length === 0) {
      console.log('Creating daybook permission...');
      await connection.execute(
        "INSERT INTO permissions (id, name, description) VALUES ('daybook', 'Daybook', 'Access to daybook entries and logs')"
      );
      console.log('✓ Daybook permission created\n');
    } else {
      console.log('✓ Daybook permission already exists\n');
    }

    // Add daybook permission to user
    console.log('Adding daybook permission to user...');
    await connection.execute(
      `INSERT IGNORE INTO user_permissions (user_id, permission_id, access_level)
       VALUES (?, 'daybook', 'full')`,
      [userId]
    );
    console.log('✓ Daybook permission added\n');

    // Add all other common permissions for testing
    console.log('Adding additional permissions for testing...');
    const permissions = [
      'dashboard', 'member_entry', 'master_data', 'balance_sheet',
      'ledger_management', 'transaction', 'report', 'reports',
      'setting', 'pdf_settings', 'property_registrations',
      'view_donations', 'edit_donations', 'receipts', 'donation_approval',
      'session_logs', 'view_session_logs', 'activity_logs',
      'tax_registrations', 'marriage_register', 'user_registrations',
      'pooja_registrations', 'pooja_approval', 'hall_booking',
      'hall_approval', 'view_events', 'edit_events',
      'annadhanam_registrations', 'annadhanam_approval'
    ];

    for (const perm of permissions) {
      // Check if permission exists
      const [exists] = await connection.execute(
        'SELECT id FROM permissions WHERE id = ?',
        [perm]
      );

      if (exists.length === 0) {
        await connection.execute(
          "INSERT INTO permissions (id, name, description) VALUES (?, ?, NULL)",
          [perm, perm.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())]
        );
      }

      await connection.execute(
        `INSERT IGNORE INTO user_permissions (user_id, permission_id, access_level)
         VALUES (?, ?, 'full')`,
        [userId, perm]
      );
    }
    console.log(`✓ Added ${permissions.length} permissions\n`);

    console.log('========================================');
    console.log('PERMISSIONS READY');
    console.log('========================================\n');

    console.log('Test User Credentials:');
    console.log('  Username: test_admin');
    console.log('  Password: test123');
    console.log('  Mobile: 9999999999');
    console.log('  Role: admin');
    console.log('  Temple ID: 1\n');

    console.log('Permissions:');
    console.log('  ✅ daybook (full access)');
    console.log(`  ✅ ${permissions.length} other permissions (full access)\n`);

    console.log('Next Steps:');
    console.log('  1. Start server: npm run dev');
    console.log('  2. Login via API or use token directly');
    console.log('  3. Run tests: node daybook.test.js');
    console.log('========================================');

  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addDaybookPermission();
