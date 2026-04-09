const bcrypt = require('bcryptjs');
const knex = require('knex');
const path = require('path');

async function testLogin() {
  const db = knex({
    client: 'sqlite3',
    connection: {
      filename: path.join(__dirname, 'server/deev.sqlite3')
    },
    useNullAsDefault: true
  });

  try {
    // Get testadmin user
    const user = await db('users').where({ username: 'testadmin' }).first();
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('User found:', user.username);
    console.log('Password hash:', user.password.substring(0, 20) + '...');
    
    // Test password comparison
    const testPasswords = ['test123', 'password', 'admin', '123456'];
    
    for (const pwd of testPasswords) {
      const match = await bcrypt.compare(pwd, user.password);
      console.log(`Password "${pwd}": ${match ? '✅ MATCH' : '❌ No match'}`);
    }
    
    // Update password to something we know works
    console.log('\n🔄 Resetting password to "test123"...');
    const newHash = await bcrypt.hash('test123', 10);
    await db('users').where({ id: user.id }).update({ password: newHash });
    console.log('✅ Password reset complete!');
    
    // Verify it works
    const verifyUser = await db('users').where({ username: 'testadmin' }).first();
    const verifyMatch = await bcrypt.compare('test123', verifyUser.password);
    console.log(`\nVerification: "test123" = ${verifyMatch ? '✅ WORKS' : '❌ FAILED'}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.destroy();
  }
}

testLogin();
