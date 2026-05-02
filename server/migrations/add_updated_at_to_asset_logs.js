/**
 * Migration: Add updated_at column to asset_logs table
 */
exports.up = async function(knex) {
  // Check if column exists first
  const hasColumn = await knex.schema.hasColumn('asset_logs', 'updated_at');
  
  if (!hasColumn) {
    await knex.schema.alterTable('asset_logs', (table) => {
      table.timestamp('updated_at').nullable();
    });
    console.log('Added updated_at column to asset_logs table');
  } else {
    console.log('updated_at column already exists in asset_logs table');
  }
};

exports.down = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('asset_logs', 'updated_at');
  
  if (hasColumn) {
    await knex.schema.alterTable('asset_logs', (table) => {
      table.dropColumn('updated_at');
    });
    console.log('Dropped updated_at column from asset_logs table');
  }
};
