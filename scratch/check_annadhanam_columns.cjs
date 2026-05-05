const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/env') });
const db = require('/var/www/templerunvite/server/db');

async function check() {
  try {
    const columns = await db('annadhanam').columnInfo();
    console.log('Columns in annadhanam table:', Object.keys(columns));
  } catch (error) {
    console.error('Check failed:', error);
  } finally {
    process.exit();
  }
}

check();
