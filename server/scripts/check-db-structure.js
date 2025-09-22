// File: server/scripts/check-db-structure.js
const knex = require('../db');

async function checkAndFixDatabase() {
  try {
    console.log('🔍 Checking database structure...');
    
    // Check if journal_entries table exists
    const hasJournalTable = await knex.schema.hasTable('journal_entries');
    
    if (!hasJournalTable) {
      console.log('❌ journal_entries table does not exist. Creating it now...');
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
        table.integer('created_by');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
      });
      console.log('✅ Created journal_entries table');
    } else {
      console.log('✅ journal_entries table exists');
      
      // Check for required columns
      const columns = await knex.raw('PRAGMA table_info(journal_entries)');
      const columnNames = columns.map(col => col.name);
      
      // List of required columns and their types
      const requiredColumns = {
        'reference_id': 'INTEGER',
        'temple_id': 'INTEGER',
        'created_by': 'INTEGER',
        'updated_at': 'TIMESTAMP'
      };
      
      let changesMade = false;
      
      // Check and add missing columns
      for (const [colName, colType] of Object.entries(requiredColumns)) {
        if (!columnNames.includes(colName)) {
          console.log(`⚠️  Adding missing column: ${colName} (${colType})`);
          await knex.schema.alterTable('journal_entries', (table) => {
            if (colType === 'INTEGER') {
              table.integer(colName).nullable();
            } else if (colType === 'TIMESTAMP') {
              table.timestamp(colName).defaultTo(knex.fn.now());
            } else {
              table.string(colName).nullable();
            }
          });
          changesMade = true;
        }
      }
      
      if (changesMade) {
        console.log('✅ Database structure updated successfully');
      } else {
        console.log('✅ Database structure is up to date');
      }
    }
    
    // Verify the structure
    const structure = await knex.raw('PRAGMA table_info(journal_entries)');
    console.log('\n📋 Current journal_entries structure:');
    console.table(structure.map(col => ({
      name: col.name,
      type: col.type,
      notnull: col.notnull ? 'YES' : 'NO',
      default: col.dflt_value || 'NULL',
      primary: col.pk ? 'YES' : 'NO'
    })));
    
  } catch (error) {
    console.error('❌ Error checking/updating database structure:', error);
    throw error;
  } finally {
    await knex.destroy();
  }
}

// Run the check
checkAndFixDatabase()
  .then(() => {
    console.log('\n✨ Database check completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Database check failed:', error);
    process.exit(1);
  });
