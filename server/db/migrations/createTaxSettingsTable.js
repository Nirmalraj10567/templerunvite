/**
 * Creates the tax_settings table if it doesn't exist
 * @param {Object} db - Knex database instance
 * @returns {Promise<void>}
 */
async function createTaxSettingsTable(db) {
  if (!(await db.schema.hasTable('tax_settings'))) {
    await db.schema.createTable('tax_settings', (table) => {
      table.increments('id').primary();
      table.integer('temple_id').notNullable();
      table.integer('year').notNullable();
      table.decimal('tax_amount', 10, 2).notNullable();
      table.string('description');
      table.boolean('is_active').defaultTo(true);
      table.boolean('include_previous_years').defaultTo(false);
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
      
      // Add unique constraint to prevent duplicate year entries per temple
      table.unique(['temple_id', 'year']);
    });
    console.log('Created tax_settings table.');
  }
}

module.exports = createTaxSettingsTable;
