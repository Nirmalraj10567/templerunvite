const knex = require('knex')({ 
  client: 'mysql2', 
  connection: { 
    host: '127.0.0.1', 
    user: 'root', 
    password: 'root', 
    database: 'temp' 
  }, 
  pool: { min: 0, max: 5 } 
});

async function setup() {
  try {
    // Create temples
    await knex('temples').insert({
      id: 1,
      name: 'Test Temple',
      address: 'Test Address'
    }).onConflict('id').ignore();
    console.log('Created temple');

    // Create user
    await knex('users').insert({
      id: 1,
      username: 'superadmin',
      mobile: '9999999999',
      role: 'superadmin',
      temple_id: 1
    }).onConflict('id').ignore();
    console.log('Created user');

    // Create permissions table if not exists
    const hasPerms = await knex.schema.hasTable('permissions');
    if (!hasPerms) {
      await knex.schema.createTable('permissions', table => {
        table.string('id').primary();
        table.string('name');
        table.string('description');
      });
    }
    console.log('Created permissions table');

    // Insert daybook permission
    await knex('permissions').insert({
      id: 'daybook',
      name: 'Daybook',
      description: 'Access to daybook entries and logs'
    }).onConflict('id').ignore();
    console.log('Added daybook permission');

    // Create user_permissions table if not exists
    const hasUserPerms = await knex.schema.hasTable('user_permissions');
    if (!hasUserPerms) {
      await knex.schema.createTable('user_permissions', table => {
        table.increments('id');
        table.integer('user_id');
        table.string('permission_id');
        table.string('access_level').defaultTo('none');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
      });
    }
    console.log('Created user_permissions table');

    // Add daybook permission to user
    await knex('user_permissions').insert({
      user_id: 1,
      permission_id: 'daybook',
      access_level: 'full'
    }).onConflict(['user_id', 'permission_id']).ignore();
    console.log('Added daybook permission to user');

    console.log('\nSetup complete!');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

setup();