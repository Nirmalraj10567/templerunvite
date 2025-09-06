/**
 * Creates the master_people table if it doesn't exist
 * @param {Object} db - Knex database instance
 * @returns {Promise<void>}
 */
async function createMasterPeopleTable(db) {
  if (!(await db.schema.hasTable('master_people'))) {
    await db.schema.createTable('master_people', (table) => {
      table.increments('id').primary();
      table.integer('temple_id').defaultTo(1);
      table.string('name').notNullable();
      table.string('gender');
      table.string('dob');
      table.string('address');
      table.string('village');
      table.string('mobile');
      table.string('email');
      table.string('note');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
    console.log('Created master_people table.');
  }
}

module.exports = createMasterPeopleTable;
