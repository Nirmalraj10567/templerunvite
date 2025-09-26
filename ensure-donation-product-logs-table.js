const knex = require('knex');

// Database configuration - adjust as needed for your setup
const db = knex({
  client: 'sqlite3',
  connection: {
    filename: './server/database.sqlite' // Adjust path as needed
  },
  useNullAsDefault: true
});

async function ensureDonationProductLogsTable() {
  try {
    console.log('🔍 Ensuring donation_product_logs table exists...\n');

    // Check if table exists
    const hasTable = await db.schema.hasTable('donation_product_logs');
    console.log('Table exists:', hasTable);
    
    if (!hasTable) {
      console.log('Creating donation_product_logs table...');
      
      await db.schema.createTable('donation_product_logs', (table) => {
        table.increments('id').primary();
        table.integer('temple_id').notNullable().index();
        table.integer('donation_id').notNullable().index();
        table.string('action').notNullable();
        table.text('details');
        table.integer('created_by').nullable().index();
        table.timestamp('created_at').defaultTo(db.fn.now());
      });
      
      console.log('✅ Table created successfully!');
    } else {
      console.log('✅ Table already exists');
    }

    // Test table by inserting a test record
    console.log('\n🧪 Testing table functionality...');
    try {
      const testLog = {
        temple_id: 1,
        donation_id: 999, // Test ID
        action: 'test_manual',
        details: JSON.stringify({ test: true, manual: true }),
        created_by: 1,
        created_at: db.fn.now()
      };
      
      await db('donation_product_logs').insert(testLog);
      console.log('✅ Test log insertion successful!');
      
      // Check if the log was inserted
      const insertedLog = await db('donation_product_logs').where({ donation_id: 999 }).first();
      if (insertedLog) {
        console.log('✅ Test log found after insertion:', insertedLog);
      } else {
        console.log('❌ Test log not found after insertion');
      }
      
      // Clean up test log
      await db('donation_product_logs').where({ donation_id: 999 }).del();
      console.log('🧹 Test log cleaned up');
      
    } catch (insertError) {
      console.error('❌ Test log insertion failed:', insertError.message);
    }

    console.log('\n🎉 Donation product logs table is ready!');
    console.log('\n📋 Next steps:');
    console.log('1. Restart your server');
    console.log('2. Test creating/updating donation products');
    console.log('3. Check that logs are being created successfully');
    console.log('4. Verify the frontend shows logs properly');

  } catch (error) {
    console.error('❌ Failed to ensure table:', error.message);
    console.error('Full error:', error);
  } finally {
    await db.destroy();
  }
}

console.log('📋 Ensuring Donation Product Logs Table');
console.log('This script will:');
console.log('1. Check if donation_product_logs table exists');
console.log('2. Create the table if it doesn\'t exist');
console.log('3. Test table functionality');
console.log('4. Clean up test data');
console.log('');

ensureDonationProductLogsTable();
