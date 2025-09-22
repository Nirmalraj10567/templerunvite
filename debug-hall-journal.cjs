// Debug hall booking journal entry creation
const knex = require('knex');

// Database configuration (adjust as needed)
const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'root',
    database: process.env.MYSQL_DATABASE || 'templerun2',
    timezone: process.env.MYSQL_TIMEZONE || 'Z',
  },
  pool: { min: 2, max: 10 },
});

async function debugHallJournal() {
  try {
    console.log('🔍 Debugging hall booking journal entries...\n');

    // Check if journal_entries table exists
    const hasTable = await db.schema.hasTable('journal_entries');
    console.log('📋 journal_entries table exists:', hasTable);

    if (hasTable) {
      // Check table structure
      const columns = await db('journal_entries').columnInfo();
      console.log('📊 Table columns:', Object.keys(columns));

      // Check recent hall bookings
      const recentBookings = await db('marriage_hall_bookings')
        .orderBy('id', 'desc')
        .limit(5);
      console.log('\n🏛️ Recent hall bookings:');
      recentBookings.forEach(booking => {
        console.log(`  ID: ${booking.id}, Name: ${booking.name}, Amount: ${booking.advance_amount || booking.total_amount}, Date: ${booking.date}`);
      });

      // Check journal entries for hall bookings
      const hallJournalEntries = await db('journal_entries')
        .where('reference_type', 'hall_booking')
        .orderBy('id', 'desc')
        .limit(10);
      console.log('\n📝 Hall booking journal entries:');
      if (hallJournalEntries.length === 0) {
        console.log('  ❌ No hall booking journal entries found');
      } else {
        hallJournalEntries.forEach(entry => {
          console.log(`  ID: ${entry.id}, Ref: ${entry.reference_id}, From: ${entry.from_account}, To: ${entry.to_account}, Amount: ${entry.amount}`);
        });
      }

      // Test manual journal entry creation
      console.log('\n🧪 Testing manual journal entry creation...');
      try {
        const testEntry = {
          date: '2025-09-21',
          from_account: 'INCOME A/C',
          to_account: 'CASH A/C',
          amount: 999.99,
          entry_type: 'transfer',
          remarks: 'Test hall booking journal entry',
          reference_type: 'hall_booking',
          reference_id: 999,
          temple_id: 2,
          created_by: 1,
          created_at: new Date().toISOString()
        };

        console.log('📝 Inserting test entry:', testEntry);
        const result = await db('journal_entries').insert(testEntry);
        console.log('✅ Test entry created successfully:', result);

        // Verify it was created
        const created = await db('journal_entries')
          .where('reference_type', 'hall_booking')
          .where('reference_id', 999)
          .first();
        console.log('✅ Verified test entry:', created ? 'Found' : 'Not found');

        // Clean up test entry
        await db('journal_entries')
          .where('reference_type', 'hall_booking')
          .where('reference_id', 999)
          .del();
        console.log('🧹 Test entry cleaned up');

      } catch (testError) {
        console.error('❌ Test entry creation failed:', testError.message);
        console.error('❌ Full error:', testError);
      }
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('❌ Full error:', error);
  } finally {
    await db.destroy();
  }
}

debugHallJournal();