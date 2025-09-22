// File: server/scripts/fix-journal-entries.js
const knex = require('../db');

async function fixJournalEntriesTable() {
  try {
    // Check if table exists
    const hasTable = await knex.schema.hasTable('journal_entries');
    if (!hasTable) {
      console.log('Creating journal_entries table...');
      await knex.schema.createTable('journal_entries', (table) => {
        table.increments('id').primary();
        table.date('date').notNullable();
        table.string('from_account').notNullable();
        table.string('to_account').notNullable();
        table.decimal('amount', 15, 2).notNullable();
        table.string('entry_type').notNullable();
        table.string('reference_type');
        table.integer('reference_id');
        table.integer('temple_id');
        table.text('remarks');
        table.timestamps(true, true);
      });
      console.log('Created journal_entries table');
      return;
    }

    // Check and add missing columns
    const columns = await knex('sqlite_master')
      .where({ type: 'table', name: 'journal_entries' })
      .first()
      .then(async (table) => {
        if (!table) return [];
        const createTable = table.sql;
        return createTable
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.startsWith('"'));
      });

    console.log('Current columns:', columns);

    // Add missing columns if they don't exist
    if (!columns.some(col => col.includes('reference_id'))) {
      console.log('Adding reference_id column...');
      await knex.schema.alterTable('journal_entries', (table) => {
        table.integer('reference_id').nullable();
      });
    }

    if (!columns.some(col => col.includes('temple_id'))) {
      console.log('Adding temple_id column...');
      await knex.schema.alterTable('journal_entries', (table) => {
        table.integer('temple_id').nullable();
      });
    }

    console.log('Table structure verified and updated successfully');
    
  } catch (error) {
    console.error('Error fixing journal_entries table:', error);
  } finally {
    // Close the database connection
    await knex.destroy();
  }
}

// Run the function
fixJournalEntriesTable()
  .then(() => {
    console.log('Database check/update completed');    
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
