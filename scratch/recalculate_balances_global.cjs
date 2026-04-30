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

async function recalculateAll() {
  try {
    console.log('--- GLOBAL RECALCULATION OF DAYBOOK BALANCES ---');
    
    // Get all unique temple IDs
    const temples = await db('daybook_entries').distinct('temple_id').pluck('temple_id');
    console.log(`Found ${temples.length} temples.`);

    for (const templeId of temples) {
      console.log(`Recalculating Temple ${templeId}...`);
      
      const entries = await db('daybook_entries')
        .where('temple_id', templeId)
        .orderBy('entry_date', 'asc')
        .orderBy('id', 'asc');
      
      let balance = 0;
      for (const entry of entries) {
        if (entry.entry_type === 'income') {
          balance += parseFloat(entry.amount || 0);
        } else if (entry.entry_type === 'expense') {
          balance -= parseFloat(entry.amount || 0);
        }
        
        await db('daybook_entries')
          .where({ id: entry.id })
          .update({ running_balance: balance });
      }
      console.log(`  ✅ Done. Final balance: ${balance}`);
    }
    
    console.log('--- GLOBAL RECALCULATION COMPLETE ---');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

recalculateAll();
