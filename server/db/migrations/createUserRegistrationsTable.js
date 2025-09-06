/**
 * Creates the user_registrations table if it doesn't exist
 * @param {Object} db - Knex database instance
 * @returns {Promise<void>}
 */
async function createUserRegistrationsTable(db) {
  if (!(await db.schema.hasTable('user_registrations'))) {
    await db.schema.createTable('user_registrations', (table) => {
      table.increments('id').primary();
      table.integer('temple_id').defaultTo(1);
      table.string('reference_number');
      table.string('date');
      table.string('subdivision');
      table.string('name').notNullable();
      table.string('username');
      table.string('email');
      table.string('alternative_name');
      table.string('wife_name');
      table.string('education');
      table.string('occupation');
      table.string('father_name');
      table.string('address');
      table.string('birth_date');
      table.string('village');
      table.string('mobile_number');
      table.string('aadhaar_number');
      table.string('pan_number');
      table.string('clan');
      table.string('group');
      table.string('postal_code');
      table.integer('male_heirs').defaultTo(0);
      table.integer('female_heirs').defaultTo(0);
      table.string('photo_path');
      table.string('status').defaultTo('active');
      table.text('note');
      table.boolean('is_approved').defaultTo(false);
      table.integer('approved_by').references('id').inTable('users');
      table.timestamp('approved_at');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
    console.log('Created user_registrations table.');
  } else {
    // Check if we need to add missing columns to existing table
    const columns = await db.raw("PRAGMA table_info(user_registrations)");
    const columnNames = columns.map(col => col.name);
    
    const columnsToAdd = [
      { name: 'username', type: 'TEXT' },
      { name: 'email', type: 'TEXT' },
      { name: 'alternative_name', type: 'TEXT' },
      { name: 'wife_name', type: 'TEXT' },
      { name: 'education', type: 'TEXT' },
      { name: 'occupation', type: 'TEXT' },
      { name: 'birth_date', type: 'TEXT' },
      { name: 'pan_number', type: 'TEXT' },
      { name: 'postal_code', type: 'TEXT' },
      { name: 'male_heirs', type: 'INTEGER', defaultValue: 0 },
      { name: 'female_heirs', type: 'INTEGER', defaultValue: 0 },
      { name: 'photo_path', type: 'TEXT' }
    ];

    for (const column of columnsToAdd) {
      if (!columnNames.includes(column.name)) {
        const defaultValue = column.defaultValue !== undefined 
          ? `DEFAULT ${column.defaultValue}` 
          : '';
        await db.raw(`ALTER TABLE user_registrations ADD COLUMN ${column.name} ${column.type} ${defaultValue}`);
        console.log(`Added ${column.name} column to user_registrations table.`);
      }
    }

    // Check if aadhaar_number has NOT NULL constraint and fix it if needed
    try {
      const tableInfo = await db.raw("PRAGMA table_info(user_registrations)");
      const aadhaarColumn = tableInfo.find(col => col.name === 'aadhaar_number');
      
      if (aadhaarColumn && aadhaarColumn.notnull === 1) {
        console.log('Fixing aadhaar_number NOT NULL constraint...');
        
        // Create a new table with correct schema
        await db.schema.createTable('user_registrations_new', (table) => {
          table.increments('id').primary();
          table.integer('temple_id').defaultTo(1);
          table.string('reference_number');
          table.string('date');
          table.string('subdivision');
          table.string('name').notNullable();
          table.string('username');
          table.string('email');
          table.string('alternative_name');
          table.string('wife_name');
          table.string('education');
          table.string('occupation');
          table.string('father_name');
          table.string('address');
          table.string('birth_date');
          table.string('village');
          table.string('mobile_number');
          table.string('aadhaar_number');
          table.string('pan_number');
          table.string('clan');
          table.string('group');
          table.string('postal_code');
          table.integer('male_heirs').defaultTo(0);
          table.integer('female_heirs').defaultTo(0);
          table.string('status').defaultTo('active');
          table.text('note');
          table.boolean('is_approved').defaultTo(false);
          table.integer('approved_by').references('id').inTable('users');
          table.timestamp('approved_at');
          table.timestamp('created_at').defaultTo(db.fn.now());
          table.timestamp('updated_at').defaultTo(db.fn.now());
        });

        // Copy data from old table to new table
        await db.raw(`
          INSERT INTO user_registrations_new 
          SELECT * FROM user_registrations
        `);

        // Drop old table and rename new table
        await db.schema.dropTable('user_registrations');
        await db.schema.renameTable('user_registrations_new', 'user_registrations');
        
        console.log('Fixed aadhaar_number constraint - now nullable.');
      }
    } catch (error) {
      console.log('Note: Could not check/fix aadhaar_number constraint:', error.message);
    }
  }
}

module.exports = createUserRegistrationsTable;
