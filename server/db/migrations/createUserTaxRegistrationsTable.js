/**
 * Creates the user_tax_registrations table if it doesn't exist
 * @param {Object} db - Knex database instance
 * @returns {Promise<void>}
 */
async function createUserTaxRegistrationsTable(db) {
  const hasTable = await db.schema.hasTable('user_tax_registrations');
  if (!hasTable) {
    await db.schema.createTable('user_tax_registrations', (table) => {
      table.increments('id').primary();
      table.integer('temple_id').defaultTo(1);
      table.string('reference_number');
      table.string('date');
      table.string('subdivision');
      table.string('name').notNullable();
      table.string('alternative_name');
      table.string('father_name');
      table.string('address');
      table.string('village');
      table.string('mobile_number');
      table.string('aadhaar_number');
      table.string('clan');
      table.string('group');
      table.string('wife_name');
      table.string('education');
      table.string('occupation');
      table.string('birth_date');
      table.string('pan_number');
      table.string('postal_code');
      table.integer('male_heirs').defaultTo(0);
      table.integer('female_heirs').defaultTo(0);
      table.integer('year');
      table.decimal('tax_amount', 10, 2).defaultTo(0);
      table.decimal('amount_paid', 10, 2).defaultTo(0);
      table.decimal('outstanding_amount', 10, 2).defaultTo(0);
      table.boolean('is_approved').defaultTo(false);
      table.integer('approved_by').references('id').inTable('users');
      table.timestamp('approved_at');
      table.text('note');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
    console.log('Created user_tax_registrations table.');
  } else {
    // Ensure required columns exist (safe ALTERs)
    try {
      const cols = await db.raw('PRAGMA table_info(user_tax_registrations)');
      const columnNames = cols.map(c => c.name);

      const addIfMissing = async (name, sql) => {
        if (!columnNames.includes(name)) {
          try {
            await db.raw(sql);
            console.log(`Added column ${name} to user_tax_registrations.`);
          } catch (e) {
            console.log(`Note: Could not add column ${name}: ${e.message}`);
          }
        }
      };

      // Financial and year fields used by backend insert/update
      await addIfMissing('year', 'ALTER TABLE user_tax_registrations ADD COLUMN year INTEGER');
      await addIfMissing('tax_amount', 'ALTER TABLE user_tax_registrations ADD COLUMN tax_amount DECIMAL(10,2) DEFAULT 0');

      await addIfMissing('amount_paid', 'ALTER TABLE user_tax_registrations ADD COLUMN amount_paid DECIMAL(10,2) DEFAULT 0');
      await addIfMissing('outstanding_amount', 'ALTER TABLE user_tax_registrations ADD COLUMN outstanding_amount DECIMAL(10,2) DEFAULT 0');
      await addIfMissing('wife_name', 'ALTER TABLE user_tax_registrations ADD COLUMN wife_name TEXT');
      await addIfMissing('education', 'ALTER TABLE user_tax_registrations ADD COLUMN education TEXT');
      await addIfMissing('occupation', 'ALTER TABLE user_tax_registrations ADD COLUMN occupation TEXT');
      await addIfMissing('birth_date', 'ALTER TABLE user_tax_registrations ADD COLUMN birth_date TEXT');
      await addIfMissing('pan_number', 'ALTER TABLE user_tax_registrations ADD COLUMN pan_number TEXT');
      await addIfMissing('postal_code', 'ALTER TABLE user_tax_registrations ADD COLUMN postal_code TEXT');
      await addIfMissing('male_heirs', 'ALTER TABLE user_tax_registrations ADD COLUMN male_heirs INTEGER DEFAULT 0');
      await addIfMissing('female_heirs', 'ALTER TABLE user_tax_registrations ADD COLUMN female_heirs INTEGER DEFAULT 0');
      await addIfMissing('is_approved', "ALTER TABLE user_tax_registrations ADD COLUMN is_approved BOOLEAN DEFAULT 0");
      await addIfMissing('approved_by', 'ALTER TABLE user_tax_registrations ADD COLUMN approved_by INTEGER REFERENCES users(id)');
      await addIfMissing('approved_at', 'ALTER TABLE user_tax_registrations ADD COLUMN approved_at TIMESTAMP');
      await addIfMissing('note', 'ALTER TABLE user_tax_registrations ADD COLUMN note TEXT');
    } catch (e) {
      console.log('Note: Column synchronization for user_tax_registrations skipped:', e.message);
    }
  }
}

module.exports = createUserTaxRegistrationsTable;
