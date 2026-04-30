const knex = require('knex');
const db = knex({
  client: 'mysql2',
  connection: {
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'YourStrongPassword123',
    database: 'templerun',
    timezone: 'Z',
  },
  pool: { min: 2, max: 10 },
});

async function run() {
  try {
    const tables = await db.raw("SHOW TABLES");
    const tableNames = tables[0].map(t => Object.values(t)[0]);
    
    for (const table of tableNames) {
      try {
        const columns = await db.raw(`SHOW COLUMNS FROM ${table}`);
        const colNames = columns[0].map(c => c.Field);
        
        for (const col of colNames) {
          const results = await db(table).where(col, 'LIKE', '%ANNADHANAM%').limit(1);
          if (results.length > 0) {
            console.log(`Found in table: ${table}, column: ${col}`);
          }
        }
      } catch (e) {}
    }
    
  } catch (err) {
    console.error(err);
  } finally {
    await db.destroy();
  }
}

run();
