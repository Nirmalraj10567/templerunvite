/**
 * Sample migration file for MySQL
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('sample_table', function(table) {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.timestamps(true, true); // created_at, updated_at with default values
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('sample_table');
};