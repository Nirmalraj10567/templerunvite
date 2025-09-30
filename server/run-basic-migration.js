const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'root',
  database: process.env.MYSQL_DATABASE || 'templefinals'
};

async function runBasicMigration() {
  let connection;
  
  try {
    console.log('🚀 Starting basic accounting migration...');
    
    // Create database connection
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');
    
    // Create accounts table
    console.log('📊 Creating accounts table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        type ENUM('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE') NOT NULL,
        category VARCHAR(100) NOT NULL,
        parent_id INT NULL,
        initial_balance DECIMAL(15,2) DEFAULT 0.00,
        current_balance DECIMAL(15,2) DEFAULT 0.00,
        is_active BOOLEAN DEFAULT TRUE,
        temple_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        UNIQUE KEY unique_code_temple (code, temple_id),
        INDEX idx_temple_type (temple_id, type),
        INDEX idx_temple_active (temple_id, is_active)
      )
    `);
    console.log('✅ Accounts table created');
    
    // Create journal_entries table
    console.log('📝 Creating journal_entries table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        reference_number VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        total_amount DECIMAL(15,2) NOT NULL,
        created_by INT NOT NULL,
        temple_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        UNIQUE KEY unique_reference_temple (reference_number, temple_id),
        INDEX idx_temple_date (temple_id, date),
        INDEX idx_temple_created_by (temple_id, created_by)
      )
    `);
    console.log('✅ Journal entries table created');
    
    // Create journal_entry_lines table
    console.log('📋 Creating journal_entry_lines table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS journal_entry_lines (
        id INT AUTO_INCREMENT PRIMARY KEY,
        journal_entry_id INT NOT NULL,
        account_id INT NOT NULL,
        debit_amount DECIMAL(15,2) DEFAULT 0.00,
        credit_amount DECIMAL(15,2) DEFAULT 0.00,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_journal_entry (journal_entry_id),
        INDEX idx_account (account_id),
        FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT
      )
    `);
    console.log('✅ Journal entry lines table created');
    
    // Create account_balances table
    console.log('⚖️ Creating account_balances table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS account_balances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        account_id INT NOT NULL,
        balance_date DATE NOT NULL,
        debit_balance DECIMAL(15,2) DEFAULT 0.00,
        credit_balance DECIMAL(15,2) DEFAULT 0.00,
        running_balance DECIMAL(15,2) DEFAULT 0.00,
        temple_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        UNIQUE KEY unique_account_date (account_id, balance_date),
        INDEX idx_temple_date (temple_id, balance_date),
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Account balances table created');
    
    // Add self-referencing foreign key for accounts
    console.log('🔗 Adding parent account foreign key...');
    try {
      await connection.execute(`
        ALTER TABLE accounts 
        ADD CONSTRAINT fk_accounts_parent 
        FOREIGN KEY (parent_id) REFERENCES accounts(id) ON DELETE SET NULL
      `);
      console.log('✅ Parent account foreign key added');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('⏭️ Parent account foreign key already exists');
      } else {
        console.log('⚠️ Could not add parent foreign key:', error.message);
      }
    }
    
    // Create triggers for automatic balance updates
    console.log('🔧 Creating balance update triggers...');
    
    // Use query method instead of execute for triggers
    try {
      await connection.query('DROP TRIGGER IF EXISTS update_account_balance_after_insert');
      await connection.query('DROP TRIGGER IF EXISTS update_account_balance_after_update');
      await connection.query('DROP TRIGGER IF EXISTS update_account_balance_after_delete');
    } catch (error) {
      // Ignore errors if triggers don't exist
    }
    
    // Create insert trigger
    await connection.query(`
      CREATE TRIGGER update_account_balance_after_insert
      AFTER INSERT ON journal_entry_lines
      FOR EACH ROW
      BEGIN
        UPDATE accounts 
        SET current_balance = current_balance + NEW.credit_amount - NEW.debit_amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.account_id;
      END
    `);
    
    // Create update trigger
    await connection.query(`
      CREATE TRIGGER update_account_balance_after_update
      AFTER UPDATE ON journal_entry_lines
      FOR EACH ROW
      BEGIN
        UPDATE accounts 
        SET current_balance = current_balance - OLD.credit_amount + OLD.debit_amount + NEW.credit_amount - NEW.debit_amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.account_id;
      END
    `);
    
    // Create delete trigger
    await connection.query(`
      CREATE TRIGGER update_account_balance_after_delete
      AFTER DELETE ON journal_entry_lines
      FOR EACH ROW
      BEGIN
        UPDATE accounts 
        SET current_balance = current_balance - OLD.credit_amount + OLD.debit_amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.account_id;
      END
    `);
    
    console.log('✅ Balance update triggers created');
    
    // Add data integrity constraints
    console.log('🛡️ Adding data integrity constraints...');
    try {
      await connection.execute(`
        ALTER TABLE journal_entry_lines 
        ADD CONSTRAINT chk_amounts_not_both_zero 
        CHECK (debit_amount > 0 OR credit_amount > 0)
      `);
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('⏭️ Constraint chk_amounts_not_both_zero already exists');
      } else {
        console.log('⚠️ Could not add constraint chk_amounts_not_both_zero:', error.message);
      }
    }
    
    try {
      await connection.execute(`
        ALTER TABLE journal_entry_lines 
        ADD CONSTRAINT chk_amounts_not_both_nonzero 
        CHECK (NOT (debit_amount > 0 AND credit_amount > 0))
      `);
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('⏭️ Constraint chk_amounts_not_both_nonzero already exists');
      } else {
        console.log('⚠️ Could not add constraint chk_amounts_not_both_nonzero:', error.message);
      }
    }
    
    // Verify tables were created
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN ('accounts', 'journal_entries', 'journal_entry_lines', 'account_balances')
    `, [dbConfig.database]);
    
    console.log('\\n📊 Created tables:');
    tables.forEach(table => {
      console.log(`   ✅ ${table.TABLE_NAME}`);
    });
    
    // Check triggers
    const [triggers] = await connection.execute(`
      SELECT TRIGGER_NAME 
      FROM INFORMATION_SCHEMA.TRIGGERS 
      WHERE TRIGGER_SCHEMA = ? 
      AND TRIGGER_NAME LIKE 'update_account_balance%'
    `, [dbConfig.database]);
    
    console.log('\\n🔧 Created triggers:');
    triggers.forEach(trigger => {
      console.log(`   ✅ ${trigger.TRIGGER_NAME}`);
    });
    
    console.log('\\n🎉 Accounting system migration completed successfully!');
    console.log('\\n📋 Next steps:');
    console.log('   1. Run: node setup-accounting.js setup');
    console.log('   2. Restart your server');
    console.log('   3. Access accounting APIs at /api/accounting/*');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Error code:', error.code);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the migration
runBasicMigration();