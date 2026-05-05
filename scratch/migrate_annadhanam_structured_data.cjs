const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/env') });
const db = require('/var/www/templerunvite/server/db');

async function migrate() {
  try {
    console.log('Adding structured columns to annadhanam table...');
    
    await db.schema.alterTable('annadhanam', (table) => {
      // Check if columns exist before adding them to avoid errors
      table.string('donation_type', 50).nullable().defaultTo('food');
      table.string('product_name', 255).nullable();
      table.decimal('quantity', 10, 2).nullable();
      table.string('unit', 50).nullable();
      table.decimal('amount', 10, 2).nullable();
    }).catch(e => {
      if (e.message.includes('duplicate column')) {
        console.log('Some columns already exist, skipping...');
      } else {
        throw e;
      }
    });

    console.log('Updating existing records to populate donation_type...');
    
    // Default everything to 'food' first
    await db('annadhanam').update({ donation_type: 'food' });
    
    // Update records that are clearly products
    await db('annadhanam')
      .where('food', 'like', 'Product:%')
      .update({ donation_type: 'product' });
      
    // Update records that are clearly money
    await db('annadhanam')
      .where('food', 'like', 'Money:%')
      .update({ donation_type: 'money' });

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit();
  }
}

migrate();
