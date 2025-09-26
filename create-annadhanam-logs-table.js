const knex = require('knex');

// Database configuration - adjust as needed
const db = knex({
  client: 'sqlite3',
  connection: {
    filename: './server/database.sqlite' // Adjust path as needed
  },
  useNullAsDefault: true
});

async function createAnnadhanamLogsTable() {
  try {
    console.log('🔍 Checking if annadhanam_logs table exists...');
    
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
    
    // Check if there are any existing logs
    const logCount = await db('annadhanam_logs').count('* as count').first();
    console.log('📊 Current log count:', logCount.count);
    
    // Show table structure
    const columns = await db.raw("PRAGMA table_info(annadhanam_logs)");
    console.log('📋 Table structure:');
    console.table(columns);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await db.destroy();
  }
}

createAnnadhanamLogsTable();
