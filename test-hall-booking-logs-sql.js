const knex = require('knex');

async function testHallBookingLogsSQL() {
  console.log('🔍 Testing Hall Booking Logs SQL Syntax...\n');

  // Database configuration - adjust as needed
  const db = knex({
    client: 'sqlite3',
    connection: {
      filename: './server/database.sqlite'
    },
    useNullAsDefault: true
  });

  try {
    console.log('📝 Testing table creation...');
    
    // Drop table if exists (for testing)
    const hasTable = await db.schema.hasTable('hall_booking_logs');
    if (hasTable) {
      console.log('Dropping existing table for test...');
      await db.schema.dropTable('hall_booking_logs');
    }

    // Create table using Knex schema builder
    await db.schema.createTable('hall_booking_logs', (table) => {
      table.increments('id').primary();
      table.integer('temple_id').notNullable().index();
      table.integer('hall_booking_id').notNullable().index();
      table.string('action').notNullable(); // create | update | delete
      table.text('details'); // JSON string with full snapshot/diff
      table.integer('created_by').nullable().index();
      table.timestamp('created_at').defaultTo(db.fn.now());
    });

    console.log('✅ Table created successfully using Knex schema builder');

    // Test insert
    console.log('\n🧪 Testing insert...');
    const testLog = {
      temple_id: 1,
      hall_booking_id: 999,
      action: 'test',
      details: JSON.stringify({ test: 'data' }),
      created_by: 1
    };

    const [insertedId] = await db('hall_booking_logs').insert(testLog);
    console.log('✅ Test log inserted with ID:', insertedId);

    // Test select
    console.log('\n🔍 Testing select...');
    const logs = await db('hall_booking_logs').where('id', insertedId);
    console.log('✅ Retrieved log:', logs[0]);

    // Clean up
    await db('hall_booking_logs').where('id', insertedId).del();
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 SQL Syntax Test Passed!');
    console.log('\n📋 What was tested:');
    console.log('- ✅ Table creation with Knex schema builder');
    console.log('- ✅ Index creation');
    console.log('- ✅ Data insertion');
    console.log('- ✅ Data retrieval');
    console.log('- ✅ Data deletion');

  } catch (error) {
    console.error('❌ SQL Syntax Error:', error.message);
    console.error('Full error:', error);
    
    console.log('\n🔧 Possible fixes:');
    console.log('1. Check database connection');
    console.log('2. Verify Knex configuration');
    console.log('3. Check if database file exists');
    console.log('4. Try running: node ensure-hall-booking-logs-table.js');
  } finally {
    await db.destroy();
  }
}

console.log('📋 Hall Booking Logs SQL Syntax Test');
console.log('This script will test the SQL syntax for creating the hall_booking_logs table');
console.log('');

testHallBookingLogsSQL();
