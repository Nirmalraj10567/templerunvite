/**
 * Creates the master_hall_events table if it doesn't exist
 * @param {Object} db - Knex database instance
 * @returns {Promise<void>}
 */
async function createMasterHallEventsTable(db) {
  if (!(await db.schema.hasTable('master_hall_events'))) {
    await db.schema.createTable('master_hall_events', (table) => {
      table.increments('id').primary();
      table.integer('temple_id').defaultTo(1);
      table.string('name').notNullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
    console.log('Created master_hall_events table.');
  }
}

module.exports = createMasterHallEventsTable;
