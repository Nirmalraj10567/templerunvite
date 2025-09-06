/**
 * Creates the master_educations table if it doesn't exist
 * @param {Object} db - Knex database instance
 * @returns {Promise<void>}
 */
async function createMasterEducationsTable(db) {
  if (!(await db.schema.hasTable('master_educations'))) {
    await db.schema.createTable('master_educations', (table) => {
      table.increments('id').primary();
      table.integer('temple_id').defaultTo(1);
      table.string('name').notNullable();
      table.string('description');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
    console.log('Created master_educations table.');
  }
}

module.exports = createMasterEducationsTable;
