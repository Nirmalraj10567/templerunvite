/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  if (!(await knex.schema.hasTable('master_hall_events'))) {
    await knex.schema.createTable('master_hall_events', (table) => {
      table.increments('id').primary();
      table.integer('temple_id').defaultTo(1);
      table.string('name').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
    console.log('Created master_hall_events table.');
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('master_hall_events');
};
