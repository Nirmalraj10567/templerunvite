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

async function repairReceiptsInDaybook() {
  try {
    console.log('--- REPAIRING RECEIPT ENTRIES IN DAYBOOK ---');
    const receipts = await db('receipts');
    console.log(`Found ${receipts.length} receipts.`);

    for (const r of receipts) {
      const entryType = r.type === 'payment' ? 'expense' : 'income';
      const partyName = r.type === 'payment' ? (r.to_person || 'Unknown') : (r.from_person || 'Unknown');
      
      const updateData = {
        entry_type: entryType,
        party_name: partyName !== 'Unknown' ? partyName : null,
        description: `Receipt - ${partyName}`
      };

      const changed = await db('daybook_entries')
        .where({ reference_type: 'receipt', reference_id: r.id, temple_id: r.temple_id })
        .update(updateData);
      
      if (changed) {
        console.log(`  ✅ Repaired Daybook entry for Receipt ID ${r.id} (${r.register_no}). Party set to: ${partyName}`);
      }
    }

    console.log('--- REPAIR COMPLETE ---');
    
    // Now trigger global balance recalculation
    console.log('--- TRIGGERING GLOBAL BALANCE RECALCULATION ---');
    const temples = await db('daybook_entries').distinct('temple_id').pluck('temple_id');
    for (const tid of temples) {
      console.log(`Recalculating Temple ${tid}...`);
      const entries = await db('daybook_entries').where('temple_id', tid).orderBy('entry_date', 'asc').orderBy('id', 'asc');
      let balance = 0;
      for (const entry of entries) {
        if (entry.entry_type === 'income') balance += parseFloat(entry.amount || 0);
        else if (entry.entry_type === 'expense') balance -= parseFloat(entry.amount || 0);
        await db('daybook_entries').where({ id: entry.id }).update({ running_balance: balance });
      }
    }
    console.log('--- ALL BALANCES RECALCULATED ---');
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

repairReceiptsInDaybook();
