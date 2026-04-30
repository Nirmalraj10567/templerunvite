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

async function sync() {
  try {
    console.log('--- REPAIRING POOJA JOURNAL MIRRORS ---');
    
    // Get all poojas for Temple 5
    const poojas = await db('pooja').where('temple_id', 5);
    
    for (const p of poojas) {
      const amount = parseFloat(p.amount || 0);
      if (amount <= 0) continue;

      console.log(`Checking Pooja ID ${p.id} (Ref: ${p.receipt_number}). Amount: ₹${amount}`);

      // Check current mirror
      const existing = await db('journal_entries')
        .where({ reference_type: 'pooja', reference_id: p.id, temple_id: p.temple_id })
        .first();

      if (!existing) {
        console.log(`Missing mirror! REPAIRING...`);

        // Insert fresh mirror
        await db('journal_entries').insert({
          date: p.from_date || new Date().toISOString().slice(0, 10),
          description: `Pooja: ${p.name} (${p.receipt_number || p.id})`,
          from_account: 'POOJA A/C',
          to_account: p.transfer_to_account || 'INCOME A/C',
          amount: amount,
          total_amount: amount,
          entry_type: 'transfer',
          reference_number: p.receipt_number || 'POOJA-' + p.id,
          remarks: p.remarks || 'Manual repair sync',
          reference_type: 'pooja',
          reference_id: p.id,
          temple_id: p.temple_id,
          created_by: p.created_by || 1,
          created_at: db.fn.now()
        });
        
        console.log(`✅ Repaired Pooja ID ${p.id}`);
      } else if (parseFloat(existing.amount) !== amount) {
        console.log(`Mismatch! Mirror says ₹${existing.amount}, but pooja says ₹${amount}. UPDATING...`);
        await db('journal_entries')
          .where({ id: existing.id })
          .update({
            amount: amount,
            total_amount: amount,
            updated_at: db.fn.now()
          });
        console.log(`✅ Fixed mirror for Pooja ID ${p.id}`);
      } else {
        console.log(`✅ Pooja ID ${p.id} is already in sync.`);
      }
    }

    console.log('--- SYNC COMPLETE ---');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

sync();
