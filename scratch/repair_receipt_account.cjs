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
    console.log('--- REPAIRING RECEIPT ENTRIES IN DAYBOOK (ACCOUNTS) ---');
    const receipts = await db('receipts');
    console.log(`Found ${receipts.length} receipts.`);

    for (const r of receipts) {
      const entryType = r.type === 'payment' ? 'expense' : 'income';
      const partyName = r.type === 'payment' ? (r.to_person || 'Unknown') : (r.from_person || 'Unknown');
      const account = r.type === 'payment' ? (r.from_person || 'cash') : (r.to_person || 'cash');
      
      const updateData = {
        entry_type: entryType,
        party_name: partyName !== 'Unknown' ? partyName : null,
        description: `Receipt - ${partyName}`,
        payment_mode: account
      };

      const changed = await db('daybook_entries')
        .where({ reference_type: 'receipt', reference_id: r.id, temple_id: r.temple_id })
        .update(updateData);
      
      if (changed) {
        console.log(`  ✅ Repaired Daybook entry for Receipt ID ${r.id} (${r.register_no}). Account set to: ${account}`);
      }
    }

    console.log('--- REPAIR COMPLETE ---');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

repairReceiptsInDaybook();
