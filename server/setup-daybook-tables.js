const knex = require('knex')({ 
  client: 'mysql2', 
  connection: { 
    host: '127.0.0.1', 
    user: 'root', 
    password: 'root', 
    database: 'templerun' 
  }, 
  pool: { min: 0, max: 5 } 
});

async function createTables() {
  try {
    // Create daybook_entries table
    await knex.raw(`
      CREATE TABLE IF NOT EXISTS daybook_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        temple_id INT NOT NULL,
        entry_date DATE NOT NULL,
        entry_type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        reference_type VARCHAR(100),
        reference_id INT,
        receipt_number VARCHAR(50),
        amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
        payment_mode VARCHAR(50) DEFAULT 'cash',
        party_name VARCHAR(255),
        party_mobile VARCHAR(20),
        notes TEXT,
        running_balance DECIMAL(15, 2) DEFAULT 0.00,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Created daybook_entries table');

    // Create daybook_logs table
    await knex.raw(`
      CREATE TABLE IF NOT EXISTS daybook_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        temple_id INT NOT NULL,
        daybook_entry_id INT NOT NULL,
        action VARCHAR(50) NOT NULL,
        details JSON,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created daybook_logs table');

    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

createTables();