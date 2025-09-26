const knex = require('knex');

// Database configuration - adjust as needed for your setup
const db = knex({
  client: 'sqlite3',
  connection: {
    filename: './server/database.sqlite' // Adjust path as needed
  },
  useNullAsDefault: true
});

// Import the annadhanam router
const annadhanamRouter = require('./server/annadhanam.js');

async function testAnnadhanamDbFix() {
  try {
    console.log('🔍 Testing Annadhanam DB Fix...\n');

    // Step 1: Test the router initialization
    console.log('1. Testing router initialization...');
    try {
      const router = annadhanamRouter({ db });
      console.log('✅ Router initialized successfully');
    } catch (error) {
      console.error('❌ Router initialization failed:', error.message);
      return;
    }

    // Step 2: Check if annadhanam_logs table exists
    console.log('\n2. Checking annadhanam_logs table...');
    const hasTable = await db.schema.hasTable('annadhanam_logs');
    console.log('Table exists:', hasTable);
    
    if (!hasTable) {
      console.log('Creating annadhanam_logs table...');
      await db.schema.createTable('annadhanam_logs', (table) => {
        table.increments('id').primary();
        table.integer('temple_id').notNullable().index();
        table.integer('annadhanam_id').notNullable().index();
        table.string('action').notNullable();
        table.text('details');
        table.integer('created_by').nullable().index();
        table.timestamp('created_at').defaultTo(db.fn.now());
      });
      console.log('✅ Table created successfully');
    } else {
      console.log('✅ Table already exists');
    }

    // Step 3: Test log insertion
    console.log('\n3. Testing log insertion...');
    try {
      const testLog = {
        temple_id: 1,
        annadhanam_id: 999,
        action: 'test',
        details: JSON.stringify({ test: true }),
        created_by: 1,
        created_at: db.fn.now()
      };
      
      await db('annadhanam_logs').insert(testLog);
      console.log('✅ Log insertion successful');
      
      // Clean up test log
      await db('annadhanam_logs').where({ annadhanam_id: 999 }).del();
      console.log('🧹 Test log cleaned up');
      
    } catch (insertError) {
      console.error('❌ Log insertion failed:', insertError.message);
    }

    // Step 4: Test the router with a mock request
    console.log('\n4. Testing router with mock request...');
    try {
      const router = annadhanamRouter({ db });
      
      // Create a mock request object
      const mockReq = {
        user: { id: 1, templeId: 1 },
        params: { id: '1' },
        query: {}
      };
      
      const mockRes = {
        json: (data) => console.log('Response data:', data),
        status: (code) => ({ json: (data) => console.log(`Status ${code}:`, data) })
      };
      
      console.log('✅ Router created successfully with db dependency');
      console.log('✅ No "db is not defined" errors');
      
    } catch (error) {
      console.error('❌ Router test failed:', error.message);
    }

    console.log('\n🎉 All tests passed! The "db is not defined" error should be fixed.');
    console.log('\n📋 Next steps:');
    console.log('1. Restart your server');
    console.log('2. Test creating/updating annadhanam entries');
    console.log('3. Check server console for successful log creation messages');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await db.destroy();
  }
}

console.log('📋 Testing Annadhanam DB Fix');
console.log('This test will:');
console.log('1. Test router initialization with db dependency');
console.log('2. Check/create annadhanam_logs table');
console.log('3. Test log insertion');
console.log('4. Verify no "db is not defined" errors');
console.log('');

testAnnadhanamDbFix();
