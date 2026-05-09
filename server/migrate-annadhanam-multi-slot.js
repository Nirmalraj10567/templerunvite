const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'env') });
const db = require('./db');

async function migrate() {
  try {
    console.log('Starting Annadhanam Multi-Slot Migration (Fix)...');

    // 1. Add enable_multi_slot to annadhanam table
    const hasMultiSlot = await db.schema.hasColumn('annadhanam', 'enable_multi_slot');
    if (!hasMultiSlot) {
      await db.schema.alterTable('annadhanam', (table) => {
        table.boolean('enable_multi_slot').defaultTo(false);
      });
      console.log('Added enable_multi_slot column to annadhanam table');
    } else {
      console.log('enable_multi_slot column already exists');
    }

    // 2. Drop and Recreate annadhanam_slots table with correct types
    await db.schema.dropTableIfExists('annadhanam_slots');
    
    await db.schema.createTable('annadhanam_slots', (table) => {
      table.increments('id').primary();
      // Match type of annadhanam.id (INT, not unsigned)
      table.integer('annadhanam_id').notNullable();
      table.string('donation_date').notNullable();
      table.string('time_slot').notNullable();
      table.string('donation_time').notNullable();
      table.text('food_details').notNullable();
      table.integer('count').defaultTo(0);
      table.timestamp('created_at').defaultTo(db.fn.now());
      
      table.index('annadhanam_id');
      table.index('donation_date');
    });
    console.log('Created annadhanam_slots table');

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
