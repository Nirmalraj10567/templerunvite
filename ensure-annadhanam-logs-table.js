const knex = require('knex');

// Database configuration - adjust as needed for your setup
const db = knex({
  client: 'sqlite3',
  connection: {
    filename: './server/database.sqlite' // Adjust path as needed
  },
  useNullAsDefault: true
});

async function ensureAnnadhanamLogsTable() {
  try {
    console.log('🔍 Checking annadhanam_logs table...');
    
    // Check if table exists
    const hasTable = await db.schema.hasTable('annadhanam_logs');
    console.log('Table exists:', hasTable);
    
    if (!hasTable) {
      console.log('📝 Creating annadhanam_logs table...');
      
      await db.schema.createTable('annadhanam_logs', (table) => {
        table.increments('id').primary();
        table.integer('temple_id').notNullable().index();
        table.integer('annadhanam_id').notNullable().index();
        table.string('action').notNullable(); // create | update | delete
        table.text('details'); // JSON string with full snapshot/diff
        table.integer('created_by').nullable().index();
        table.timestamp('created_at').defaultTo(db.fn.now());
      });
      
      console.log('✅ annadhanam_logs table created successfully!');
    } else {
      console.log('✅ annadhanam_logs table already exists!');
    }
    
    // Check current log count
    const logCount = await db('annadhanam_logs').count('* as count').first();
    console.log('📊 Current log count:', logCount.count);
    
    // Show table structure
    try {
      const columns = await db.raw("PRAGMA table_info(annadhanam_logs)");
      console.log('📋 Table structure:');
      console.table(columns);
    } catch (e) {
      console.log('📋 Table structure (MySQL format):');
      console.log('- id (auto increment primary key)');
      console.log('- temple_id (integer, indexed)');
      console.log('- annadhanam_id (integer, indexed)');
      console.log('- action (string)');
      console.log('- details (text)');
      console.log('- created_by (integer, nullable, indexed)');
      console.log('- created_at (timestamp)');
    }
    
    // Test insert a sample log if table is empty
    if (logCount.count === 0) {
      console.log('\n🧪 Testing log insertion...');
      try {
        await db('annadhanam_logs').insert({
          temple_id: 1,
          annadhanam_id: 999, // Test ID
          action: 'test',
          details: JSON.stringify({ test: true }),
          created_by: 1,
          created_at: db.fn.now()
        });
        console.log('✅ Test log inserted successfully!');
        
        // Clean up test log
        await db('annadhanam_logs').where({ annadhanam_id: 999 }).del();
        console.log('🧹 Test log cleaned up');
      } catch (insertError) {
        console.error('❌ Test log insertion failed:', insertError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await db.destroy();
  }
}

console.log('📋 Instructions:');
console.log('1. Make sure your database file path is correct in this script');
console.log('2. Run: node ensure-annadhanam-logs-table.js');
console.log('3. Check the output for any errors');
console.log('');

ensureAnnadhanamLogsTable();
