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
    const fromAccounts = await db('journal_entries').distinct('from_account');
    const toAccounts = await db('journal_entries').distinct('to_account');
    console.log('From Accounts:', JSON.stringify(fromAccounts, null, 2));
    console.log('To Accounts:', JSON.stringify(toAccounts, null, 2));
    
  } catch (err) {
    console.error(err);
  } finally {
    await db.destroy();
  }
}

run();
