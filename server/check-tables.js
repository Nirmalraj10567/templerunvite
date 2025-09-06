const knex = require('./db');

async function checkTables() {
  try {
    // Get all tables
    const tables = await knex.raw(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    
    console.log('Tables in database:');
    
    // For each table, show its schema
    for (const table of tables) {
      const schema = await knex.raw(
        `SELECT sql FROM sqlite_master WHERE type='table' AND name='${table.name}'`
      );
      console.log(`\nTable: ${table.name}`);
      console.log(schema[0].sql);
      
      // Show columns info
      const columns = await knex.raw(
        `PRAGMA table_info('${table.name}')`
      );
      console.log('Columns:');
      console.table(columns);
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkTables();
