/**
 * Adds include_previous_years column to tax_settings table if it doesn't exist
 * @param {Object} db - Knex database instance
 * @returns {Promise<void>}
 */
async function addIncludePreviousYearsToTaxSettings(db) {
  const hasIncludePreviousYearsColumn = await db.schema.hasColumn('tax_settings', 'include_previous_years');
  if (!hasIncludePreviousYearsColumn) {
    await db.schema.alterTable('tax_settings', (table) => {
      table.boolean('include_previous_years').defaultTo(false);
    });
    console.log('Added include_previous_years column to tax_settings table.');
  }
}

module.exports = addIncludePreviousYearsToTaxSettings;
