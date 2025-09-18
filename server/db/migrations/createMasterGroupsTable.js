/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  if (!(await knex.schema.hasTable('master_groups'))) {
    await knex.schema.createTable('master_groups', (table) => {
      table.increments('id').primary();
      table.integer('temple_id').defaultTo(1);
      table.string('name').notNullable();
      table.string('description');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
    console.log('Created master_groups table.');
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('master_groups');
};
