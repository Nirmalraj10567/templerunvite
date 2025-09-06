/**
 * Creates the user_heirs table if it doesn't exist
 * @param {Object} db - Knex database instance
 * @returns {Promise<void>}
 */
async function createUserHeirsTable(db) {
  if (!(await db.schema.hasTable('user_heirs'))) {
    await db.schema.createTable('user_heirs', (table) => {
      table.increments('id').primary();
      table.integer('registration_id').notNullable().references('id').inTable('user_registrations').onDelete('CASCADE');
      table.integer('serial_number').notNullable().defaultTo(1);
      table.string('name').notNullable();
      table.string('race');
      table.string('marital_status');
      table.string('education');
      table.string('birth_date');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
    console.log('Created user_heirs table.');
  } else {
    // add columns if missing
    const columns = await db.raw('PRAGMA table_info(user_heirs)');
    const names = columns.map((c) => c.name);
    const add = async (name, type) => {
      if (!names.includes(name)) {
        await db.raw(`ALTER TABLE user_heirs ADD COLUMN ${name} ${type}`);
        console.log(`Added ${name} to user_heirs`);
      }
    };
    await add('serial_number', 'INTEGER');
    await add('race', 'TEXT');
    await add('marital_status', 'TEXT');
    await add('education', 'TEXT');
    await add('birth_date', 'TEXT');
  }
}

module.exports = createUserHeirsTable;
