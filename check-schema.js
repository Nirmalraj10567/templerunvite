const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./server/database.sqlite3');

db.serialize(() => {
  db.all("SELECT name, sql FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) throw err;
    
    tables.forEach(table => {
      console.log(`\nTable: ${table.name}`);
      console.log(`Schema: ${table.sql}`);
      
      db.all(`PRAGMA table_info(${table.name})`, (err, columns) => {
        if (err) throw err;
        console.log('Columns:');
        console.table(columns);
      });
    });
  });
});

db.close();
