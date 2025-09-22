const knex = require('knex');
const config = require('./server/knexfile.cjs');

async function runMigration() {
  const db = knex(config.development);
  
  try {
    console.log('Running migration...');
    
    // Check if the column already exists
    const hasColumn = await db.schema.hasColumn('user_tax_registrations', 'from_account');
    
    if (!hasColumn) {
      console.log('Adding from_account column to user_tax_registrations table...');
      await db.schema.table('user_tax_registrations', function(table) {
        table.string('from_account').defaultTo('TAX A/C');
      });
      
      console.log('Successfully added from_account column');
    } else {
      console.log('from_account column already exists');
    }
    
    // Verify the column was added
    const columns = await db('user_tax_registrations').columnInfo();
    console.log('Current columns in user_tax_registrations table:');
    console.log(Object.keys(columns).join(', '));
    
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    await db.destroy();
  }
}

runMigration();
