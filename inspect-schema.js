const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./server/database.sqlite3');

const output = [];

db.serialize(() => {
  db.all("SELECT name, sql FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) throw err;
    
    tables.forEach(table => {
      output.push(`\nTable: ${table.name}\nSchema: ${table.sql}\n`);
      
      db.all(`PRAGMA table_info(${table.name})`, (err, columns) => {
        if (err) throw err;
        
        output.push('Columns:');
        output.push(columns.map(c => `- ${c.name}: ${c.type}`).join('\n'));
        
        if (table.name === 'users') {
          db.all(`SELECT * FROM ${table.name} LIMIT 1`, (err, row) => {
            output.push('\nSample row:');
            output.push(JSON.stringify(row, null, 2));
            
            fs.writeFileSync('schema-inspection.txt', output.join('\n'));
            console.log('Schema inspection complete. Results saved to schema-inspection.txt');
            db.close();
          });
        }
      });
    });
  });
});
