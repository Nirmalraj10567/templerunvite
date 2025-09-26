const knex = require('knex');

// Database configuration - adjust as needed for your setup
const db = knex({
  client: 'sqlite3',
  connection: {
    filename: './server/database.sqlite' // Adjust path as needed
  },
  useNullAsDefault: true
});

async function debugAnnadhanamLogsIssue() {
  try {
    console.log('🔍 Debugging Annadhanam Logs Issue...\n');

    // Step 1: Check if annadhanam_logs table exists
    console.log('1. Checking if annadhanam_logs table exists...');
    const hasTable = await db.schema.hasTable('annadhanam_logs');
    console.log('Table exists:', hasTable);
    
    if (!hasTable) {
      console.log('❌ annadhanam_logs table does not exist!');
      console.log('Creating table...');
      
      await db.schema.createTable('annadhanam_logs', (table) => {
        table.increments('id').primary();
        table.integer('temple_id').notNullable().index();
        table.integer('annadhanam_id').notNullable().index();
        table.string('action').notNullable();
        table.text('details');
        table.integer('created_by').nullable().index();
        table.timestamp('created_at').defaultTo(db.fn.now());
      });
      
      console.log('✅ Table created successfully!');
    } else {
      console.log('✅ Table exists');
    }

    // Step 2: Check current logs
    console.log('\n2. Checking current logs...');
    const logCount = await db('annadhanam_logs').count('* as count').first();
    console.log('Total logs in table:', logCount.count);
    
    if (logCount.count > 0) {
      const allLogs = await db('annadhanam_logs').select('*').orderBy('created_at', 'desc');
      console.log('Recent logs:');
      allLogs.slice(0, 5).forEach((log, index) => {
        console.log(`  ${index + 1}. ID: ${log.id}, Action: ${log.action}, Annadhanam ID: ${log.annadhanam_id}, Temple ID: ${log.temple_id}, Created: ${log.created_at}`);
      });
    }

    // Step 3: Check annadhanam entries
    console.log('\n3. Checking annadhanam entries...');
    const annadhanamCount = await db('annadhanam').count('* as count').first();
    console.log('Total annadhanam entries:', annadhanamCount.count);
    
    if (annadhanamCount.count > 0) {
      const recentAnnadhanam = await db('annadhanam').select('id', 'name', 'created_at').orderBy('created_at', 'desc').limit(5);
      console.log('Recent annadhanam entries:');
      recentAnnadhanam.forEach((entry, index) => {
        console.log(`  ${index + 1}. ID: ${entry.id}, Name: ${entry.name}, Created: ${entry.created_at}`);
      });
    }

    // Step 4: Check temple_id values
    console.log('\n4. Checking temple_id values...');
    const temples = await db('temples').select('id', 'name').limit(5);
    console.log('Available temples:');
    temples.forEach((temple, index) => {
      console.log(`  ${index + 1}. ID: ${temple.id}, Name: ${temple.name}`);
    });

    // Step 5: Test log insertion manually
    console.log('\n5. Testing manual log insertion...');
    try {
      const testLog = {
        temple_id: 1,
        annadhanam_id: 999, // Test ID
        action: 'test_manual',
        details: JSON.stringify({ test: true, manual: true }),
        created_by: 1,
        created_at: db.fn.now()
      };
      
      await db('annadhanam_logs').insert(testLog);
      console.log('✅ Manual log insertion successful!');
      
      // Check if the log was inserted
      const insertedLog = await db('annadhanam_logs').where({ annadhanam_id: 999 }).first();
      if (insertedLog) {
        console.log('✅ Log found after insertion:', insertedLog);
      } else {
        console.log('❌ Log not found after insertion');
      }
      
      // Clean up test log
      await db('annadhanam_logs').where({ annadhanam_id: 999 }).del();
      console.log('🧹 Test log cleaned up');
      
    } catch (insertError) {
      console.error('❌ Manual log insertion failed:', insertError.message);
    }

    // Step 6: Check for logs with specific temple_id
    console.log('\n6. Checking logs by temple_id...');
    const templeLogs = await db('annadhanam_logs').where('temple_id', 1).select('*');
    console.log(`Logs for temple_id 1: ${templeLogs.length}`);
    
    if (templeLogs.length > 0) {
      templeLogs.forEach((log, index) => {
        console.log(`  ${index + 1}. Action: ${log.action}, Annadhanam ID: ${log.annadhanam_id}, Created: ${log.created_at}`);
      });
    }

    // Step 7: Test the exact query used by the API
    console.log('\n7. Testing API query...');
    try {
      const apiQuery = db('annadhanam_logs as l')
        .leftJoin('annadhanam as a', 'a.id', 'l.annadhanam_id')
        .where('l.temple_id', 1)
        .select('l.*', 'a.name as annadhanam_name', 'a.receipt_number as receipt_number');
      
      const apiResults = await apiQuery;
      console.log(`API query results: ${apiResults.length} logs`);
      
      if (apiResults.length > 0) {
        apiResults.forEach((log, index) => {
          console.log(`  ${index + 1}. Action: ${log.action}, Name: ${log.annadhanam_name}, Receipt: ${log.receipt_number}`);
        });
      }
    } catch (queryError) {
      console.error('❌ API query failed:', queryError.message);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await db.destroy();
  }
}

console.log('📋 Instructions:');
console.log('1. Make sure your database file path is correct in this script');
console.log('2. Run: node debug-annadhanam-logs-issue.js');
console.log('3. Check the output for any issues');
console.log('');

debugAnnadhanamLogsIssue();
