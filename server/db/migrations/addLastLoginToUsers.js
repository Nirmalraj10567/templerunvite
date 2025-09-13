const { db } = require('../db');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if the column already exists
  const hasColumn = await knex.schema.hasColumn('users', 'last_login');
  
  if (!hasColumn) {
    await knex.schema.alterTable('users', (table) => {
      table.timestamp('last_login').nullable();
    });
    console.log('Added last_login column to users table');
  } else {
    console.log('last_login column already exists in users table');
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('last_login');
  });
  console.log('Dropped last_login column from users table');
};
