// File: server/migrations/20240920150300_add_reference_columns_to_journal_entries.js

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('journal_entries', function(table) {
    table.integer('reference_id').nullable().after('reference_type');
    table.integer('temple_id').nullable().after('reference_id');
    
    // Add indexes for better query performance
    table.index(['reference_type', 'reference_id'], 'idx_journal_entries_reference');
    table.index(['temple_id'], 'idx_journal_entries_temple');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('journal_entries', function(table) {
    table.dropIndex('idx_journal_entries_reference');
    table.dropIndex('idx_journal_entries_temple');
    table.dropColumn('reference_id');
    table.dropColumn('temple_id');
  });
};
