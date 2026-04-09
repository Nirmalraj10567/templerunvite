/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('user_tax_registrations');
  if (!hasTable) {
    await knex.schema.createTable('user_tax_registrations', (table) => {
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
      // Family chain columns for multi-generational tax linking
      table.string('parent_reference_id');
      table.string('gender');
      table.string('marital_status');
      table.string('wife_father_name');
      table.string('family_head_reference');
      table.string('relationship_type').defaultTo('self');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
    console.log('Created user_tax_registrations table.');
  } else {
    // Ensure required columns exist (safe ALTERs)
    try {
      const cols = await knex.raw('PRAGMA table_info(user_tax_registrations)');
      const columnNames = cols.map(c => c.name);

      const addIfMissing = async (name, sql) => {
        if (!columnNames.includes(name)) {
          try {
            await knex.raw(sql);
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
      await addIfMissing('transfer_to_account', 'ALTER TABLE user_tax_registrations ADD COLUMN transfer_to_account TEXT');
      await addIfMissing('from_account', 'ALTER TABLE user_tax_registrations ADD COLUMN from_account TEXT');
      await addIfMissing('donation_amount', 'ALTER TABLE user_tax_registrations ADD COLUMN donation_amount DECIMAL(10,2) DEFAULT 0');
      // Family chain columns for multi-generational tax linking
      await addIfMissing('parent_reference_id', 'ALTER TABLE user_tax_registrations ADD COLUMN parent_reference_id TEXT');
      await addIfMissing('gender', 'ALTER TABLE user_tax_registrations ADD COLUMN gender TEXT');
      await addIfMissing('marital_status', 'ALTER TABLE user_tax_registrations ADD COLUMN marital_status TEXT');
      await addIfMissing('wife_father_name', 'ALTER TABLE user_tax_registrations ADD COLUMN wife_father_name TEXT');
      await addIfMissing('family_head_reference', 'ALTER TABLE user_tax_registrations ADD COLUMN family_head_reference TEXT');
      await addIfMissing('relationship_type', 'ALTER TABLE user_tax_registrations ADD COLUMN relationship_type TEXT DEFAULT \'self\'');
    } catch (e) {
      console.log('Note: Column synchronization for user_tax_registrations skipped:', e.message);
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('user_tax_registrations');
};
