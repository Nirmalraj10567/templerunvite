/**
 * Creates master database tables if they don't exist
 * @param {Object} db - Knex database instance
 * @returns {Promise<void>}
 */
async function createMasterTables(db) {
  // Create master_records table if it doesn't exist
  if (!(await db.schema.hasTable('master_records'))) {
    await db.schema.createTable('master_records', (table) => {
      table.increments('id').primary();
      table.integer('temple_id').defaultTo(1);
      table.string('date').notNullable();
      table.string('name').notNullable();
      table.string('under').notNullable();
      table.string('opening_balance').defaultTo('0');
      table.string('balance_type').defaultTo('credit');
      table.string('address_line1').defaultTo('');
      table.string('address_line2').defaultTo('');
      table.string('address_line3').defaultTo('');
      table.string('address_line4').defaultTo('');
      table.string('village').defaultTo('');
      table.string('telephone').defaultTo('');
      table.string('mobile').defaultTo('');
      table.string('email').defaultTo('');
      table.string('note').defaultTo('');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
    console.log('Created master_records table.');
  }

  // Create user_permissions table if it doesn't exist
  if (!(await db.schema.hasTable('user_permissions'))) {
    await db.schema.createTable('user_permissions', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
      table.string('permission_id').notNullable();
      table.enum('access_level', ['view', 'edit', 'full', 'none']).defaultTo('none');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
      
      // Unique constraint to prevent duplicate permissions for same user
      table.unique(['user_id', 'permission_id']);
    });
    console.log('Created user_permissions table.');
  }

  // Create activity_logs table if it doesn't exist
  if (!(await db.schema.hasTable('activity_logs'))) {
    await db.schema.createTable('activity_logs', (table) => {
      table.increments('id').primary();
      table.integer('temple_id').notNullable();
      table.integer('actor_user_id').notNullable();
      table.string('action').notNullable(); // e.g., member_created
      table.string('target_table'); // e.g., user_registrations
      table.integer('target_id');
      table.text('details'); // JSON string for extra info
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
    console.log('Created activity_logs table.');
  }
}

module.exports = createMasterTables;
