const knex = require('knex');
const db = knex({
  client: 'mysql2',
  connection: {
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'YourStrongPassword123',
    database: 'templerun',
    timezone: 'Z',
  },
  pool: { min: 2, max: 10 },
});

async function run() {
  try {
    const rows = await db('ledger_entries').select('name', 'under');
    console.log('All Ledger Entries:', JSON.stringify(rows, null, 2));
    
  } catch (err) {
    console.error(err);
  } finally {
    await db.destroy();
  }
}

run();
