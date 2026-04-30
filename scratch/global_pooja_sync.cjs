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

async function generateDaybookReceiptNumber(db, templeId) {
  const year = new Date().getFullYear();
  const latest = await db('daybook_entries')
    .where('temple_id', templeId)
    .where('receipt_number', 'like', `${year}-%`)
    .orderBy('id', 'desc')
    .first();
  let nextNumber = 1;
  if (latest && latest.receipt_number) {
    const parts = latest.receipt_number.split('-');
    if (parts.length === 2 && parts[0] === year.toString()) {
      nextNumber = parseInt(parts[1], 10) + 1;
    }
  }
  return `${year}-${String(nextNumber).padStart(4, '0')}`;
}

async function calculateDaybookRunningBalance(db, templeId, entryDate) {
  const entries = await db('daybook_entries')
    .where('temple_id', templeId)
    .where('entry_date', '<=', entryDate)
    .orderBy('entry_date', 'asc')
    .orderBy('id', 'asc');
  
  let balance = 0;
  for (const entry of entries) {
    if (entry.entry_type === 'income') {
      balance += parseFloat(entry.amount || 0);
    } else if (entry.entry_type === 'expense') {
      balance -= parseFloat(entry.amount || 0);
    }
  }
  return balance;
}

async function syncAll() {
  try {
    console.log('--- GLOBAL POOJA SYNC ---');
    const poojas = await db('pooja');
    console.log(`Found ${poojas.length} poojas.`);

    for (const p of poojas) {
      const amount = parseFloat(p.amount || 0);
      if (amount <= 0) continue;

      console.log(`Syncing Pooja ID ${p.id} (Ref: ${p.receipt_number}). Amount: ₹${amount}`);

      // 1. Journal Sync
      const existingJournal = await db('journal_entries')
        .where({ reference_type: 'pooja', reference_id: p.id, temple_id: p.temple_id })
        .first();

      const journalDate = p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : (p.from_date || new Date().toISOString().slice(0, 10));

      if (!existingJournal) {
        await db('journal_entries').insert({
          date: journalDate,
          description: `Pooja: ${p.name} (${p.receipt_number || p.id})`,
          from_account: 'POOJA A/C',
          to_account: p.transfer_to_account || 'INCOME A/C',
          amount: amount,
          total_amount: amount,
          entry_type: 'transfer',
          reference_number: p.receipt_number || 'POOJA-' + p.id,
          reference_type: 'pooja',
          reference_id: p.id,
          temple_id: p.temple_id,
          created_by: p.created_by || 1,
          created_at: p.created_at || db.fn.now()
        });
        console.log(`  ✅ Journal created.`);
      } else {
        await db('journal_entries').where({ id: existingJournal.id }).update({
          amount: amount,
          total_amount: amount,
          updated_at: db.fn.now()
        });
        console.log(`  ✅ Journal updated.`);
      }

      // 2. Daybook Sync
      const existingDaybook = await db('daybook_entries')
        .where({ reference_type: 'pooja', reference_id: p.id, temple_id: p.temple_id })
        .first();

      if (!existingDaybook) {
        const entryDate = p.from_date || new Date().toISOString().slice(0, 10);
        const receiptNumber = await generateDaybookReceiptNumber(db, p.temple_id);
        const runningBalance = await calculateDaybookRunningBalance(db, p.temple_id, entryDate);

        await db('daybook_entries').insert({
          temple_id: p.temple_id,
          entry_date: entryDate,
          entry_type: 'income',
          description: `Pooja - ${p.name || 'Unknown'}`,
          reference_type: 'pooja',
          reference_id: p.id,
          receipt_number: receiptNumber,
          amount: amount,
          payment_mode: 'cash',
          party_name: p.name || null,
          party_mobile: p.mobile_number || null,
          notes: p.remarks || null,
          running_balance: runningBalance + amount,
          created_by: p.created_by || 1,
          created_at: p.created_at || db.fn.now()
        });
        console.log(`  ✅ Daybook created.`);
      } else {
        await db('daybook_entries').where({ id: existingDaybook.id }).update({
          amount: amount,
          entry_date: p.from_date,
          updated_at: db.fn.now()
        });
        console.log(`  ✅ Daybook updated.`);
      }
    }

    console.log('--- SYNC COMPLETE ---');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

syncAll();
