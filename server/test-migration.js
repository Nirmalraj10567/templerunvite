const knex = require('knex');

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: './database.sqlite3'
  },
  useNullAsDefault: true
});

async function testMigration() {
  try {
    console.log('Testing pooja table creation...');
    
    // Check if pooja table exists
    const hasPoojaTable = await db.schema.hasTable('pooja');
    console.log('Pooja table exists:', hasPoojaTable);
    
    if (!hasPoojaTable) {
      console.log('Creating pooja table...');
      await db.schema.createTable('pooja', (table) => {
        table.increments('id').primary();
        table.integer('temple_id').notNullable().defaultTo(1);
        table.string('receipt_number').notNullable();
        table.string('name').notNullable();
        table.string('mobile_number').notNullable();
        table.string('time').notNullable();
        table.date('from_date').notNullable();
        table.date('to_date').notNullable();
        table.text('remarks');
        table.integer('created_by').references('id').inTable('users').onDelete('SET NULL');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        
        table.foreign('temple_id').references('id').inTable('temples').onDelete('CASCADE');
        table.index(['temple_id']);
        table.index(['receipt_number']);
        table.index(['name']);
        table.index(['mobile_number']);
        table.index(['from_date']);
        table.index(['to_date']);
      });
      console.log('✅ Pooja table created successfully!');
    } else {
      console.log('Pooja table already exists');
    }
    
    // Check if pooja_approval_logs table exists
    const hasLogsTable = await db.schema.hasTable('pooja_approval_logs');
    console.log('Pooja approval logs table exists:', hasLogsTable);
    
    if (!hasLogsTable) {
      console.log('Creating pooja_approval_logs table...');
      await db.schema.createTable('pooja_approval_logs', (table) => {
        table.increments('id').primary();
        table.integer('pooja_id').notNullable().references('id').inTable('pooja').onDelete('CASCADE');
        table.string('action').notNullable();
        table.integer('performed_by').references('id').inTable('users').onDelete('SET NULL');
        table.timestamp('performed_at').defaultTo(db.fn.now());
        table.text('notes');
        table.string('old_status');
        table.string('new_status');
        
        table.index(['pooja_id']);
        table.index(['action']);
      });
      console.log('✅ Pooja approval logs table created successfully!');
    } else {
      console.log('Pooja approval logs table already exists');
    }
    
    // List all tables
    const tables = await db.raw("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('All tables:', tables.map(t => t.name));
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await db.destroy();
  }
}

testMigration();
