const knex = require('knex');
const db = knex({
  client: 'mysql2',
  connection: {
    host: '127.0.0.1',
    user: 'root',
    password: 'YourStrongPassword123',
    database: 'templerun'
  }
});

async function recalculate(templeId) {
  try {
    console.log(`--- RECALCULATING RUNNING BALANCES FOR TEMPLE ${templeId} ---`);
    
    // Get all entries ordered by date and ID
    const entries = await db('daybook_entries')
      .where('temple_id', templeId)
      .orderBy('entry_date', 'asc')
      .orderBy('id', 'asc');
    
    console.log(`Found ${entries.length} entries.`);
    
    let balance = 0;
    for (const entry of entries) {
      if (entry.entry_type === 'income') {
        balance += parseFloat(entry.amount || 0);
      } else if (entry.entry_type === 'expense') {
        balance -= parseFloat(entry.amount || 0);
      }
      
      // Update the entry with the new running balance
      await db('daybook_entries')
        .where({ id: entry.id })
        .update({ running_balance: balance });
      
      // console.log(`Entry ID ${entry.id}: Type ${entry.entry_type}, Amt ${entry.amount}, New Bal ${balance}`);
    }
    
    console.log('--- RECALCULATION COMPLETE ---');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

// Get temple ID from arg or default to 5
const tid = process.argv[2] || 5;
recalculate(tid);
