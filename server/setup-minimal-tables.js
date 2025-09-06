const knex = require('knex');

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: './database.sqlite3'
  },
  useNullAsDefault: true
});

async function setupMinimalTables() {
  try {
    console.log('Setting up minimal tables for mobile API...');
    
    // Create temples table
    if (!(await db.schema.hasTable('temples'))) {
      await db.schema.createTable('temples', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.string('registration_id');
        table.text('address');
        table.string('phone');
        table.string('email');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('✅ Created temples table');
      
      // Insert default temple
      await db('temples').insert({
        id: 1,
        name: 'Main Temple',
        registration_id: 'TEMPLE001',
        address: 'Main Temple Address',
        phone: '+91-1234567890',
        email: 'temple@example.com'
      });
      console.log('✅ Inserted default temple');
    } else {
      console.log('⚠️  Temples table already exists');
    }
    
    // Create users table
    if (!(await db.schema.hasTable('users'))) {
      await db.schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.string('username').unique().notNullable();
        table.string('password').notNullable();
        table.string('name').notNullable();
        table.string('mobile').unique();
        table.string('email');
        table.string('role').defaultTo('member');
        table.integer('temple_id').defaultTo(1);
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        
        table.foreign('temple_id').references('id').inTable('temples').onDelete('CASCADE');
      });
      console.log('✅ Created users table');
      
      // Insert default admin user
      await db('users').insert({
        id: 1,
        username: 'admin',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
        name: 'Admin User',
        mobile: '9999999999',
        email: 'admin@example.com',
        role: 'admin',
        temple_id: 1
      });
      console.log('✅ Inserted default admin user');
    } else {
      console.log('⚠️  Users table already exists');
    }
    
    // List all tables
    const tables = await db.raw("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('\n📋 All tables:', tables.map(t => t.name));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.destroy();
  }
}

setupMinimalTables();
