const db = require('./db');

async function check() {
  try {
    const columns = await db('pooja').columnInfo();
    console.log('pooja columns:', Object.keys(columns));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();
