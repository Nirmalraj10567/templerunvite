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
    const rows = await db('ledger_entries').distinct('name', 'under');
    console.log('Ledger Entries (name/under):', JSON.stringify(rows, null, 2));
    
    const categories = await db('ledger_categories').select('*');
    console.log('Categories:', JSON.stringify(categories, null, 2));
    
  } catch (err) {
    console.error(err);
  } finally {
    await db.destroy();
  }
}

run();
