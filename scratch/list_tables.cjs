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
    const tables = await db.raw("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Tables:', JSON.stringify(tables, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await db.destroy();
  }
}

run();
