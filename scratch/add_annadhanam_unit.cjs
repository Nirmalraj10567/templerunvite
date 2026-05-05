const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/env') });
const db = require('/var/www/templerunvite/server/db');

async function migrate() {
  try {
    console.log('Adding missing unit column to annadhanam table...');
    const columns = await db('annadhanam').columnInfo();
    
    if (!columns.unit) {
      await db.schema.alterTable('annadhanam', (table) => {
        table.string('unit', 50).nullable();
      });
      console.log('Column unit added.');
    } else {
      console.log('Column unit already exists.');
    }

    console.log('Migration completed.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit();
  }
}

migrate();
