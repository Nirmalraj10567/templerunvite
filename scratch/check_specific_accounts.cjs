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
    const row = await db('ledger_entries').where('name', 'INCOME A/C').first();
    console.log('INCOME A/C entry:', JSON.stringify(row, null, 2));
    
    const ebill = await db('ledger_entries').where('name', 'ebill').first();
    console.log('ebill entry:', JSON.stringify(ebill, null, 2));
    
  } catch (err) {
    console.error(err);
  } finally {
    await db.destroy();
  }
}

run();
