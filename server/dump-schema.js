const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite3');

db.serialize(() => {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) throw err;
    
    tables.forEach(table => {
      db.all(`PRAGMA table_info(${table.name})`, (err, columns) => {
        if (err) throw err;
        console.log(`\nTable: ${table.name}`);
        console.table(columns);
      });
    });
  });
});

db.close();
