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
    // Check if ANNADHANAM A/C exists as a name or a category
    const row = await db('ledger_entries').where('name', 'ANNADHANAM A/C').first();
    console.log('ANNADHANAM A/C entry:', JSON.stringify(row, null, 2));
    
    const cat = await db('ledger_categories').where('label', 'ANNADHANAM A/C').first();
    console.log('ANNADHANAM A/C category:', JSON.stringify(cat, null, 2));
    
    // Maybe it's in master_records?
    const master = await db('master_records').where('name', 'ANNADHANAM A/C').first();
    console.log('ANNADHANAM A/C master:', JSON.stringify(master, null, 2));
    
  } catch (err) {
    console.error(err);
  } finally {
    await db.destroy();
  }
}

run();
