/**
 * Create a test user with known credentials for API testing
 * Run with: node create-test-user-mysql.js
 */

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'rootroot',
  database: process.env.MYSQL_DATABASE || 'temple'
};

const TEST_USER = {
  username: 'test_admin',
  password: 'test123',
  email: 'test@example.com',
  full_name: 'Test Administrator',
  mobile: '9999999999',
  role: 'admin',
  temple_id: 1
};

async function createTestUser() {
  let connection;
  
  try {
    console.log('========================================');
    console.log('CREATE TEST USER');
    console.log('========================================');
    console.log(`MySQL: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`Database: ${dbConfig.database}\n`);

    // Connect to MySQL
    console.log('Connecting...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✓ Connected\n');

    // Check if user already exists
    console.log('Checking for existing user...');
    const [existing] = await connection.execute(
      'SELECT id, username FROM users WHERE username = ?',
      [TEST_USER.username]
    );

    if (existing.length > 0) {
      console.log(`✓ Test user already exists: ${TEST_USER.username} (ID: ${existing[0].id})`);
      console.log('\nCredentials:');
      console.log(`  Username: ${TEST_USER.username}`);
      console.log(`  Password: ${TEST_USER.password}`);
      console.log(`  Role: ${TEST_USER.role}`);
      console.log(`  Temple ID: ${TEST_USER.temple_id}`);
      console.log('\nYou can now run: node test-assets-api.js');
      return;
    }

    // Hash password
    console.log('Creating user...');
    const hashedPassword = await bcrypt.hash(TEST_USER.password, 10);

    // Insert user
    const [result] = await connection.execute(
      `INSERT INTO users (username, password, email, full_name, mobile, role, temple_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [TEST_USER.username, hashedPassword, TEST_USER.email, TEST_USER.full_name, TEST_USER.mobile, TEST_USER.role, TEST_USER.temple_id]
    );

    const userId = result.insertId;
    console.log(`✓ Test user created successfully!`);
    console.log(`  ID: ${userId}`);
    console.log(`  Username: ${TEST_USER.username}`);
    console.log(`  Role: ${TEST_USER.role}\n`);

    // Add asset_management permission
    console.log('Adding asset_management permission...');
    await connection.execute(
      `INSERT IGNORE INTO user_permissions (user_id, permission_id, access_level)
       VALUES (?, 'asset_management', 'full')`,
      [userId]
    );
    console.log('✓ Permission added\n');

    console.log('========================================');
    console.log('TEST USER READY');
    console.log('========================================');
    console.log('\nCredentials:');
    console.log(`  Username: ${TEST_USER.username}`);
    console.log(`  Password: ${TEST_USER.password}`);
    console.log(`  Email: ${TEST_USER.email}`);
    console.log(`  Role: ${TEST_USER.role}`);
    console.log(`  Temple ID: ${TEST_USER.temple_id}`);
    console.log('\nNext steps:');
    console.log('1. Test login: curl -X POST http://localhost:4000/api/login -H "Content-Type: application/json" -d \'{\"username\":\"test_admin\",\"password\":\"test123\"}\'');
    console.log('2. Run tests: node test-assets-api.js');
    console.log('========================================');

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createTestUser();
