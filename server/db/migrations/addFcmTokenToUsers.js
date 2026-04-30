/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if fcm_token column exists in users table
  const hasColumn = await knex.schema.hasColumn('users', 'fcm_token');
  if (!hasColumn) {
    await knex.schema.alterTable('users', (table) => {
      table.string('fcm_token');
    });
    console.log('Added fcm_token column to users table.');
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('users', 'fcm_token');
  if (hasColumn) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('fcm_token');
    });
  }
};
