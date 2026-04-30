const knex = require('knex');
const db = knex({
  client: 'sqlite3',
  connection: {
    filename: '/var/www/temple.db'
  },
  useNullAsDefault: true
});

async function run() {
  try {
    const rows = await db('ledger_entries').distinct('name', 'under');
    console.log(JSON.stringify(rows, null, 2));
    
    const categories = await db('ledger_categories').select('*');
    console.log('Categories:', JSON.stringify(categories, null, 2));
    
  } catch (err) {
    console.error(err);
  } finally {
    await db.destroy();
  }
}

run();
