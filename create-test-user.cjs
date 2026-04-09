const bcrypt = require('bcryptjs');
const knex = require('knex');
const path = require('path');

async function createTestUser() {
  const db = knex({
    client: 'sqlite3',
    connection: {
      filename: path.join(__dirname, 'server/deev.sqlite3')
    },
    useNullAsDefault: true
  });

  try {
    // Hash password 'test123'
    const passwordHash = await bcrypt.hash('test123', 10);
    
    // Check if test user exists
    const existing = await db('users').where({ username: 'testadmin' }).first();
    
    if (existing) {
      console.log('✅ Test user already exists:');
      console.log('   Username: testadmin');
      console.log('   Password: test123');
      console.log('   Temple: Temple A (ID: 1)');
    } else {
      // Create test user
      await db('users').insert({
        username: 'testadmin',
        full_name: 'Test Admin User',
        email: 'testadmin@temple.com',
        password: passwordHash,
        role: 'admin',
        temple_id: 1,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      console.log('✅ Test user created successfully!');
      console.log('');
      console.log('🔐 Login Credentials:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Username: testadmin');
      console.log('Password: test123');
      console.log('Email:    testadmin@temple.com');
      console.log('Temple:   Temple A');
      console.log('Role:     Admin');
      console.log('━━━━━━━━━━━━━━━━━━━━━━');
    }
    
    // Also show superadmin info
    const superadmin = await db('users').where({ username: 'superadmin' }).first();
    if (superadmin) {
      console.log('');
      console.log('🔐 Existing SuperAdmin:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Username: superadmin');
      console.log('Email:    superadmin@temple.com');
      console.log('Temple:   Temple A');
      console.log('Role:     SuperAdmin');
      console.log('━━━━━━━━━━━━━━━━━━━━━━');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.destroy();
  }
}

createTestUser();
