/**
 * Debug login to see exact error
 * Run with: node debug-login.js
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'env') });
const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';

async function debugLogin() {
  console.log('='.repeat(60));
  console.log('DEBUG LOGIN');
  console.log('='.repeat(60));

  try {
    console.log('\n1. Querying user with temple join...');
    const userQuery = db('users')
      .join('temples', 'users.temple_id', 'temples.id')
      .where('users.status', 'active')
      .select('users.*', 'temples.name as templeName');

    userQuery.andWhere('users.username', 'test_admin');

    const user = await userQuery.first();
    
    if (!user) {
      console.log('❌ User not found with join query');
      // Try without join
      console.log('\nTrying without join...');
      const userNoJoin = await db('users')
        .where('username', 'test_admin')
        .first();
      
      if (userNoJoin) {
        console.log('✅ User found without join');
        console.log('  temple_id:', userNoJoin.temple_id);
        
        const temple = await db('temples')
          .where('id', userNoJoin.temple_id)
          .first();
        
        if (temple) {
          console.log('✅ Temple exists:', temple.name);
        } else {
          console.log('❌ Temple NOT found!');
        }
      }
      return;
    }

    console.log('✅ User found with join:', user.username);
    console.log('  Temple:', user.templeName);

    console.log('\n2. Checking password...');
    const match = await bcrypt.compare('test123', user.password);
    console.log(match ? '✅ Password matches' : '❌ Password does not match');

    if (!match) return;

    console.log('\n3. Generating token...');
    const token = jwt.sign(
      { id: user.id, mobile: user.mobile, username: user.username, templeId: user.temple_id, role: user.role },
      JWT_SECRET,
      { expiresIn: '365d' }
    );
    console.log('✅ Token generated');

    console.log('\n4. Loading permissions...');
    const permissions = await db('user_permissions')
      .where({ user_id: user.id })
      .select('permission_id', 'access_level');
    console.log(`✅ Found ${permissions.length} permissions`);

    console.log('\n5. Inserting session log...');
    try {
      const hasTable = await db.schema.hasTable('session_logs');
      if (hasTable) {
        await db('session_logs').insert({
          user_id: user.id,
          login_time: db.fn.now(),
          ip_address: '127.0.0.1',
          user_agent: 'test'
        });
        console.log('✅ Session log inserted');
      } else {
        console.log('⚠️ session_logs table does not exist - skipping');
      }
    } catch (e) {
      console.log('⚠️ Session log insert failed (non-critical):', e.message);
    }

    console.log('\n' + '='.repeat(60));
    console.log('LOGIN WOULD SUCCEED');
    console.log('='.repeat(60));
    console.log('\nToken:', token.substring(0, 50) + '...\n');

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    console.error('Full error:', err);
  } finally {
    await db.destroy();
  }
}

debugLogin();
