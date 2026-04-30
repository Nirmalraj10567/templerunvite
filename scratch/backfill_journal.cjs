const knex = require('knex');
const path = require('path');

const db = knex({
  client: 'mysql2',
  connection: {
    host: '127.0.0.1',
    user: 'root',
    password: 'YourStrongPassword123',
    database: 'templerun'
  }
});

async function backfill() {
  console.log('--- Starting Backfill of Journal Entries ---');

  // 1. BACKFILL TAX REGISTRATIONS
  console.log('\nChecking Tax Registrations...');
  const taxRegs = await db('user_tax_registrations').where('amount_paid', '>', 0);
  console.log(`Found ${taxRegs.length} paid tax registrations.`);

  for (const reg of taxRegs) {
    const existing = await db('journal_entries')
      .where({ reference_type: 'tax_registration', reference_id: reg.id })
      .first();
    
    if (!existing) {
      console.log(`Backfilling Tax for: ${reg.name} (Amount: ${reg.amount_paid})`);
      const desc = `Tax Registration: ${reg.name} (${reg.year})`;
      await db('journal_entries').insert({
        date: reg.date || new Date().toISOString().slice(0, 10),
        from_account: reg.from_account || 'TAX A/C',
        to_account: reg.transfer_to_account || 'INCOME A/C',
        amount: reg.amount_paid,
        total_amount: reg.amount_paid,
        description: desc,
        entry_type: 'transfer',
        remarks: `TAX ${reg.year} - ${reg.name}`,
        reference_type: 'tax_registration',
        reference_id: reg.id,
        reference_number: reg.reference_number || `TAX-${reg.id}`,
        temple_id: reg.temple_id,
        created_by: 1, // System default
        created_at: db.fn.now()
      });
    }
  }

  // 2. BACKFILL USER REGISTRATIONS
  console.log('\nChecking User Registration Payments...');
  const ledgerRegs = await db('ledger_entries').whereNotNull('registration_id').andWhere('amount', '>', 0);
  console.log(`Found ${ledgerRegs.length} registration payments in ledger.`);

  for (const l of ledgerRegs) {
    const existing = await db('journal_entries')
      .where({ reference_type: 'user_registration', reference_id: l.registration_id })
      .first();
    
    if (!existing) {
      console.log(`Backfilling User Reg for: ${l.name} (Amount: ${l.amount})`);
      const desc = `Registration Payment: ${l.name} (${l.id})`;
      await db('journal_entries').insert({
        date: l.date,
        from_account: 'REGISTRATION A/C',
        to_account: 'INCOME A/C',
        amount: l.amount,
        total_amount: l.amount,
        description: desc,
        entry_type: 'transfer',
        reference_number: `REG-${l.registration_id}-${l.id}`,
        reference_type: 'user_registration',
        reference_id: l.registration_id,
        temple_id: l.temple_id,
        created_by: 1,
        created_at: db.fn.now()
      });
    }
  }

  // 3. BACKFILL HALL BOOKINGS
  console.log('\nChecking Hall Bookings...');
  const hallBookings = await db('marriage_hall_bookings').where(function() {
    this.where('advance_amount', '>', 0).orWhere('total_amount', '>', 0);
  });
  console.log(`Found ${hallBookings.length} paid hall bookings.`);

  for (const h of hallBookings) {
    const existing = await db('journal_entries')
      .where({ reference_type: 'hall_booking', reference_id: h.id })
      .first();
    
    if (!existing) {
      console.log(`Backfilling Hall Booking for: ${h.name} (ID: ${h.id})`);
      const amount = Number(h.advance_amount || h.total_amount || 0);
      await db('journal_entries').insert({
        date: h.date || new Date().toISOString().slice(0, 10),
        from_account: 'HALL A/C',
        to_account: 'INCOME A/C',
        amount: amount,
        total_amount: amount,
        description: `Hall Booking: ${h.name} (${h.register_no || h.id})`,
        entry_type: 'transfer',
        remarks: h.remarks || null,
        reference_type: 'hall_booking',
        reference_id: h.id,
        reference_number: h.register_no || `HALL-${h.id}`,
        temple_id: h.temple_id,
        created_by: 1,
        created_at: db.fn.now()
      });
    }
  }

  console.log('\n--- Backfill Complete ---');
  process.exit(0);
}

backfill().catch(err => {
  console.error(err);
  process.exit(1);
});
