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
    console.log('--- REPAIRING HALL BOOKING JOURNAL MIRRORS ---');
    
    // Get all bookings
    const bookings = await db('marriage_hall_bookings').where('temple_id', 5);
    
    for (const b of bookings) {
      const collected = parseFloat(b.advance_amount || 0);
      if (collected <= 0) continue;

      console.log(`Checking Booking ID ${b.id} (Ref: ${b.register_no}). Collected: ₹${collected}`);

      // Check current mirror
      const mirrors = await db('journal_entries')
        .where({ reference_type: 'hall_booking', reference_id: b.id });

      const currentTotalMirror = mirrors.reduce((sum, m) => sum + parseFloat(m.amount), 0);

      if (currentTotalMirror !== collected) {
        console.log(`Mismatch! Mirrors sum to ₹${currentTotalMirror}, but booking says ₹${collected}. REPAIRING...`);

        // Delete old mirrors
        await db('journal_entries')
          .where({ reference_type: 'hall_booking', reference_id: b.id })
          .del();

        // Insert fresh single mirror for the correct amount
        await db('journal_entries').insert({
          date: b.date || new Date().toISOString().slice(0, 10),
          description: `Repair Sync: Hall Booking - ${b.name || 'Unknown'}`,
          from_account: 'HALL A/C',
          to_account: 'INCOME A/C',
          amount: collected,
          total_amount: collected,
          entry_type: 'transfer',
          reference_number: b.register_no || `HALL-FIX-${b.id}-${Date.now()}`,
          remarks: `System repair: Syncing collected amount for booking ${b.register_no}`,
          reference_type: 'hall_booking',
          reference_id: b.id,
          temple_id: b.temple_id,
          created_by: 1,
          created_at: db.fn.now()
        });
        
        console.log(`✅ Repaired Booking ID ${b.id}`);
      } else {
        console.log(`✅ Booking ID ${b.id} is already in sync.`);
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
