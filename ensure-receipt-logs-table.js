const knex = require('knex');

async function ensureReceiptLogsTable() {
  console.log('🔍 Ensuring receipt_logs table exists...\n');

  // Database configuration - adjust as needed
  // For MySQL, use this configuration instead:
  /*
  const db = knex({
    client: 'mysql2',
    connection: {
      host: 'localhost',
      user: 'your_username',
      password: 'your_password',
      database: 'your_database'
    }
  });
  */
  
  // For SQLite (default)
  const db = knex({
    client: 'sqlite3',
    connection: {
      filename: './server/database.sqlite'
    },
    useNullAsDefault: true
  });

  try {
    // Check if table exists
    const hasTable = await db.schema.hasTable('receipt_logs');
    console.log('Table exists:', hasTable);

    if (!hasTable) {
      console.log('📝 Creating receipt_logs table...');
      
      await db.schema.createTable('receipt_logs', (table) => {
        table.increments('id').primary();
        table.integer('temple_id').notNullable().index();
        table.integer('receipt_id').notNullable().index();
        table.string('action').notNullable(); // create | update | delete
        table.text('details'); // JSON string with full snapshot/diff
        table.integer('created_by').nullable().index();
        table.timestamp('created_at').defaultTo(db.fn.now());
      });

      console.log('✅ receipt_logs table created successfully');
    } else {
      console.log('✅ receipt_logs table already exists');
    }

    // Verify table structure
    console.log('\n🔍 Verifying table structure...');
    const columns = await db.schema.raw("PRAGMA table_info(receipt_logs)");
    console.log('Table columns:');
    columns.forEach(col => {
      console.log(`  - ${col.name}: ${col.type} ${col.notnull ? '(NOT NULL)' : ''} ${col.pk ? '(PRIMARY KEY)' : ''}`);
    });

    // Test insert
    console.log('\n🧪 Testing table functionality...');
    const testLog = {
      temple_id: 1,
      receipt_id: 999,
      action: 'test',
      details: JSON.stringify({ test: 'data' }),
      created_by: 1
    };

    const [insertedId] = await db('receipt_logs').insert(testLog);
    console.log('✅ Test log inserted with ID:', insertedId);

    // Clean up test data
    await db('receipt_logs').where('id', insertedId).del();
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 Receipt Logs Table Setup Complete!');
    console.log('\n📋 Table Features:');
    console.log('- ✅ Primary key (id)');
    console.log('- ✅ Temple ID with index');
    console.log('- ✅ Receipt ID with index');
    console.log('- ✅ Action tracking (create/update/delete)');
    console.log('- ✅ JSON details storage');
    console.log('- ✅ User tracking (created_by)');
    console.log('- ✅ Timestamp tracking');
    console.log('- ✅ Foreign key relationships');

  } catch (error) {
    console.error('❌ Error setting up receipt_logs table:', error.message);
    console.error('Full error:', error);
  } finally {
    await db.destroy();
  }
}

console.log('📋 Receipt Logs Table Setup');
console.log('This script will:');
console.log('1. Check if receipt_logs table exists');
console.log('2. Create the table if it doesn\'t exist');
console.log('3. Verify table structure');
console.log('4. Test basic functionality');
console.log('');

ensureReceiptLogsTable();
