const db = require('../db');

async function createJournalEntryLogsTable() {
  try {
    console.log('Creating journal_entry_logs table...');
    
    // Create the table
    await db.schema.createTable('journal_entry_logs', function (table) {
      table.increments('id').primary();
      table.integer('journal_entry_id').notNullable();
      table.string('action', 20).notNullable(); // 'create', 'update', 'delete'
      table.integer('created_by').nullable();
      table.text('details').nullable(); // JSON string containing the change details
      table.timestamp('created_at').defaultTo(db.fn.now());
      
      table.foreign('journal_entry_id').references('id').inTable('journal_entries').onDelete('CASCADE');
      table.foreign('created_by').references('id').inTable('users').onDelete('SET NULL');
    });

    // Create indexes for better performance
    await db.schema.alterTable('journal_entry_logs', function (table) {
      table.index('journal_entry_id', 'idx_journal_entry_logs_journal_entry_id');
      table.index('created_by', 'idx_journal_entry_logs_created_by');
      table.index('created_at', 'idx_journal_entry_logs_created_at');
      table.index('action', 'idx_journal_entry_logs_action');
    });

    console.log('✅ journal_entry_logs table created successfully');
  } catch (error) {
    console.error('❌ Error creating journal_entry_logs table:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  createJournalEntryLogsTable()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = createJournalEntryLogsTable;
