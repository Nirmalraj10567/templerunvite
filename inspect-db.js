const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./server/database.sqlite3');

// Get all tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
  if (err) throw err;
  
  console.log('Database Tables:');
  
  tables.forEach(table => {
    // Get table schema
    db.get(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`, [table.name], (err, row) => {
      if (err) throw err;
      console.log(`\nTable: ${table.name}`);
      console.log('Schema:', row.sql);
      
      // Get columns info
      db.all(`PRAGMA table_info(${table.name})`, (err, columns) => {
        if (err) throw err;
        
        console.log('Columns:');
        console.table(columns);
        
        if (table.name === 'users') {
          console.log('Sample data:');
          db.all(`SELECT * FROM ${table.name} LIMIT 1`, (err, row) => {
            console.log(row);
            db.close();
          });
        }
      });
    });
  });
});
