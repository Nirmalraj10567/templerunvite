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

async function run() {
  try {
    console.log('--- Recent Hall Bookings ---');
    const bookings = await db('marriage_hall_bookings').orderBy('id', 'desc').limit(5);
    console.log(JSON.stringify(bookings, null, 2));

    console.log('\n--- Journal Entries (Hall A/C) ---');
    const journals = await db('journal_entries')
      .where('from_account', 'HALL A/C')
      .orWhere('to_account', 'HALL A/C')
      .orderBy('id', 'desc').limit(10);
    console.log(JSON.stringify(journals, null, 2));

    console.log('\n--- Ledger Entries (Hall related) ---');
    const ledgers = await db('ledger_entries')
      .where('name', 'like', '%Hall%')
      .orderBy('id', 'desc').limit(10);
    console.log(JSON.stringify(ledgers, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
