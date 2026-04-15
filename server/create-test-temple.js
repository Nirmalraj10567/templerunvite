/**
 * Create test temple and ensure user is properly linked
 * Run with: node create-test-temple.js
 */

const db = require('./db');

async function createTestTemple() {
  console.log('='.repeat(60));
  console.log('CREATING TEST TEMPLE');
  console.log('='.repeat(60));

  try {
    console.log('\n1. Checking if temple exists...');
    const temple = await db('temples')
      .where('id', 1)
      .first();

    if (temple) {
      console.log('✅ Temple already exists:', temple.name);
    } else {
      console.log('Creating temple...');
      const [id] = await db('temples').insert({
        name: 'Test Temple',
        registration_id: 'TEST001',
        address: '123 Test Street, Test City',
        phone: '9999999999',
        email: 'test@temple.com',
      });
      console.log(`✅ Temple created with ID: ${id}`);
    }

    console.log('\n2. Verifying user temple link...');
    const user = await db('users')
      .where('username', 'test_admin')
      .first();

    if (user) {
      const templeCheck = await db('temples')
        .where('id', user.temple_id)
        .first();

      if (templeCheck) {
        console.log(`✅ User temple_id (${user.temple_id}) is valid`);
        console.log(`   Temple name: ${templeCheck.name}`);
      } else {
        console.log('❌ User temple_id is invalid, updating...');
        await db('users')
          .where('username', 'test_admin')
          .update({ temple_id: 1 });
        console.log('✅ Updated user temple_id to 1');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('SETUP COMPLETE');
    console.log('='.repeat(60));
    console.log('Now you can login with:');
    console.log('  Username: test_admin');
    console.log('  Password: test123');
    console.log('');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await db.destroy();
  }
}

createTestTemple();
