/**
 * Creates the master_halls table if it doesn't exist
 * @param {Object} db - Knex database instance
 * @returns {Promise<void>}
 */
async function createMasterHallsTable(db) {
  if (!(await db.schema.hasTable('master_halls'))) {
    await db.schema.createTable('master_halls', (table) => {
      table.increments('id').primary();
      table.integer('temple_id').defaultTo(1);
      table.string('name').notNullable();
      table.decimal('base_price', 10, 2).nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
    console.log('Created master_halls table.');
  }
}

module.exports = createMasterHallsTable;
