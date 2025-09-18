/**
 * Adds include_previous_years column to tax_settings table if it doesn't exist
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasIncludePreviousYearsColumn = await knex.schema.hasColumn('tax_settings', 'include_previous_years');
  if (!hasIncludePreviousYearsColumn) {
    await knex.schema.alterTable('tax_settings', (table) => {
      table.boolean('include_previous_years').defaultTo(false);
    });
    console.log('Added include_previous_years column to tax_settings table.');
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasIncludePreviousYearsColumn = await knex.schema.hasColumn('tax_settings', 'include_previous_years');
  if (hasIncludePreviousYearsColumn) {
    await knex.schema.alterTable('tax_settings', (table) => {
      table.dropColumn('include_previous_years');
    });
    console.log('Dropped include_previous_years column from tax_settings table.');
  }
};
