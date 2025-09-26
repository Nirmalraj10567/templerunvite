const knex = require('knex');

// Database configuration - adjust as needed
const db = knex({
  client: 'mysql2', // or 'sqlite3' depending on your setup
  connection: {
    host: 'localhost',
    user: 'your_username',
    password: 'your_password',
    database: 'your_database'
  }
});

async function ensureTempleExists() {
  try {
    console.log('🔍 Checking if temples table exists and has data...');
    
    // Check if temples table exists
    const hasTable = await db.schema.hasTable('temples');
    if (!hasTable) {
      console.log('❌ Temples table does not exist!');
      console.log('Please run your database migrations first.');
      return;
    }
    
    // Check if any temples exist
    const temples = await db('temples').select('*');
    console.log(`Found ${temples.length} temples in database:`);
    temples.forEach(temple => {
      console.log(`  - ID: ${temple.id}, Name: ${temple.name}`);
    });
    
    if (temples.length === 0) {
      console.log('⚠️  No temples found! Creating a default temple...');
      
      // Insert a default temple
      const [templeId] = await db('temples').insert({
        name: 'Main Temple',
        registration_id: 'TEMPLE001',
        address: 'Main Temple Address',
        phone: '+91-1234567890',
        email: 'temple@example.com'
      });
      
      console.log(`✅ Created default temple with ID: ${templeId}`);
    } else {
      console.log('✅ Temples table has data, no action needed.');
    }
    
  } catch (error) {
    console.error('❌ Error checking temples:', error.message);
  } finally {
    await db.destroy();
  }
}

// Run the check
ensureTempleExists();
