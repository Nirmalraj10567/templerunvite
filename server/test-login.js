/**
 * Test login to diagnose the issue
 * Run with: node test-login.js
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'env') });

const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';

async function testLogin() {
  console.log('='.repeat(60));
  console.log('TESTING LOGIN');
  console.log('='.repeat(60));

  try {
    console.log('\n1. Checking if user exists...');
    const user = await db('users')
      .where('username', 'test_admin')
      .orWhere('mobile', 'test_admin')
      .first();

    if (!user) {
      console.log('❌ User not found!');
      return;
    }

    console.log('✅ User found:', {
      id: user.id,
      username: user.username,
      mobile: user.mobile,
      role: user.role,
      temple_id: user.temple_id,
      status: user.status,
      has_password: !!user.password,
    });

    console.log('\n2. Checking temple...');
    const temple = await db('temples')
      .where('id', user.temple_id)
      .first();

    if (!temple) {
      console.log('❌ Temple not found!');
      return;
    }

    console.log('✅ Temple found:', temple.name);

    console.log('\n3. Checking permissions...');
    const permissions = await db('user_permissions')
      .where({ user_id: user.id })
      .select('permission_id', 'access_level');

    console.log(`✅ Found ${permissions.length} permissions`);
    
    const daybookPerm = permissions.find(p => p.permission_id === 'daybook');
    if (daybookPerm) {
      console.log(`   ✅ daybook permission: ${daybookPerm.access_level}`);
    } else {
      console.log('   ❌ No daybook permission found!');
    }

    console.log('\n4. Testing password...');
    const testPassword = 'test123';
    const match = await bcrypt.compare(testPassword, user.password);

    if (!match) {
      console.log('❌ Password does not match!');
      return;
    }

    console.log('✅ Password matches!');

    console.log('\n5. Generating token...');
    const token = jwt.sign(
      {
        id: user.id,
        mobile: user.mobile,
        username: user.username,
        templeId: user.temple_id,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '365d' }
    );

    console.log('✅ Token generated successfully');
    console.log('\nYour token:');
    console.log(token);

    console.log('\n' + '='.repeat(60));
    console.log('TEST CURL COMMAND');
    console.log('='.repeat(60));
    console.log(`
curl -X POST http://localhost:4000/api/users/login ^
  -H "Content-Type: application/json" ^
  -d "{\"mobile\":\"test_admin\",\"username\":\"test_admin\",\"password\":\"test123\"}"
    `);

    console.log('\n' + '='.repeat(60));
    console.log('LOGIN SUMMARY');
    console.log('='.repeat(60));
    console.log('Username: test_admin');
    console.log('Password: test123');
    console.log('Mobile: test_admin (same as username)');
    console.log('Role:', user.role);
    console.log('Temple ID:', user.temple_id);
    console.log('Temple Name:', temple.name);
    console.log('');
    console.log('Use this token in Authorization header:');
    console.log(`Authorization: Bearer ${token}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await db.destroy();
  }
}

testLogin();
