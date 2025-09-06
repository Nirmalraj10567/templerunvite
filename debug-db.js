const knex = require('knex');
const path = require('path');

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: path.join(__dirname, 'server', 'deev.sqlite3'),
  },
  useNullAsDefault: true,
});

async function debugDatabase() {
  try {
    console.log('Checking database structure...');
    
    // Check if user_registrations table exists
    const hasTable = await db.schema.hasTable('user_registrations');
    console.log('user_registrations table exists:', hasTable);
    
    if (hasTable) {
      // Get table info
      const tableInfo = await db.raw("PRAGMA table_info(user_registrations)");
      console.log('user_registrations table structure:');
      tableInfo.forEach(col => {
        console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
      });
    }
    
    // Check temples table
    const temples = await db('temples').select('*');
    console.log('\nTemples in database:');
    temples.forEach(temple => {
      console.log(`  ID: ${temple.id}, Name: ${temple.name}`);
    });
    
    // Check users table
    const users = await db('users').select('id', 'username', 'mobile', 'temple_id', 'role');
    console.log('\nUsers in database:');
    users.forEach(user => {
      console.log(`  ID: ${user.id}, Username: ${user.username}, Mobile: ${user.mobile}, Temple: ${user.temple_id}, Role: ${user.role}`);
    });
    
  } catch (error) {
    console.error('Database debug error:', error);
  } finally {
    await db.destroy();
  }
}

debugDatabase();