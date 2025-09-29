const db = require('../db');

async function createLedgerEntryLogsTable() {
  try {
    console.log('Creating ledger_entry_logs table...');
    
    // Create the table
    await db.schema.createTable('ledger_entry_logs', function (table) {
      table.increments('id').primary();
      table.integer('ledger_entry_id').notNullable();
      table.string('action', 20).notNullable(); // 'create', 'update', 'delete'
      table.integer('created_by').nullable();
      table.text('details').nullable(); // JSON string containing the change details
      table.timestamp('created_at').defaultTo(db.fn.now());
      
      table.foreign('ledger_entry_id').references('id').inTable('ledger_entries').onDelete('CASCADE');
      table.foreign('created_by').references('id').inTable('users').onDelete('SET NULL');
    });

    // Create indexes for better performance
    await db.schema.alterTable('ledger_entry_logs', function (table) {
      table.index('ledger_entry_id', 'idx_ledger_entry_logs_ledger_entry_id');
      table.index('created_by', 'idx_ledger_entry_logs_created_by');
      table.index('created_at', 'idx_ledger_entry_logs_created_at');
      table.index('action', 'idx_ledger_entry_logs_action');
    });

    console.log('✅ ledger_entry_logs table created successfully');
  } catch (error) {
    console.error('❌ Error creating ledger_entry_logs table:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  createLedgerEntryLogsTable()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = createLedgerEntryLogsTable;
