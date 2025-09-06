/**
 * Creates the master_villages table if it doesn't exist
 * @param {Object} db - Knex database instance
 * @returns {Promise<void>}
 */
async function createMasterVillagesTable(db) {
  if (!(await db.schema.hasTable('master_villages'))) {
    await db.schema.createTable('master_villages', (table) => {
      table.increments('id').primary();
      table.integer('temple_id').defaultTo(1);
      table.string('name').notNullable();
      table.string('description');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
    console.log('Created master_villages table.');
  }
}

module.exports = createMasterVillagesTable;
