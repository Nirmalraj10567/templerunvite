/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if fcm_token column exists
  const hasColumn = await knex.schema.hasColumn('user_registrations', 'fcm_token');
  if (!hasColumn) {
    await knex.schema.alterTable('user_registrations', (table) => {
      table.string('fcm_token');
    });
    console.log('Added fcm_token column to user_registrations table.');
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('user_registrations', 'fcm_token');
  if (hasColumn) {
    await knex.schema.alterTable('user_registrations', (table) => {
      table.dropColumn('fcm_token');
    });
  }
};