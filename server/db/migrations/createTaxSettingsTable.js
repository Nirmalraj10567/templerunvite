/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  if (!(await knex.schema.hasTable('tax_settings'))) {
    await knex.schema.createTable('tax_settings', (table) => {
      table.increments('id').primary();
      table.integer('temple_id').notNullable();
      table.integer('year').notNullable();
      table.decimal('tax_amount', 10, 2).notNullable();
      table.string('description');
      table.boolean('is_active').defaultTo(true);
      table.boolean('include_previous_years').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Add unique constraint to prevent duplicate year entries per temple
      table.unique(['temple_id', 'year']);
    });
    console.log('Created tax_settings table.');
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('tax_settings');
};
