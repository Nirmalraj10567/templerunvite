const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/env') });
const db = require('/var/www/templerunvite/server/db');

async function migrate() {
  try {
    const hasEntryDate = await db.schema.hasColumn('annadhanam', 'entry_date');
    if (!hasEntryDate) {
      console.log('Adding entry_date column to annadhanam table...');
      await db.schema.alterTable('annadhanam', (table) => {
        table.date('entry_date').nullable();
      });
      console.log('Column added successfully.');
      
      // Update existing rows with from_date
      console.log('Updating existing rows...');
      await db('annadhanam').update({
        entry_date: db.ref('from_date')
      });
      console.log('Existing rows updated.');
    } else {
      console.log('entry_date column already exists.');
    }
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit();
  }
}

migrate();
