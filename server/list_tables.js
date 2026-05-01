const db = require('./db');

async function check() {
  try {
    const tables = await db.raw('SHOW TABLES');
    console.log('Tables:', tables[0].map(t => Object.values(t)[0]));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();
