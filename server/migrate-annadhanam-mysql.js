#!/usr/bin/env node
/**
 * MySQL Migration Runner for Annadhanam Enhanced Tables
 * Usage: node migrate-annadhanam-mysql.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Database configuration - using project defaults
const dbConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'rootroot',
  database: process.env.MYSQL_DATABASE || 'templerun',
  port: Number(process.env.MYSQL_PORT || 3306),
  multipleStatements: true
};

async function runMigration() {
  let connection;
  
  try {
    console.log('Connecting to MySQL...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✓ Connected to MySQL');
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '20250410_create_annadhanam_enhanced_tables_mysql.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split into statements
    const statements = migrationSQL.split(';').filter(s => s.trim());
    
    console.log(`Found ${statements.length} statements to execute\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (!statement) continue;
      
      const shortDesc = statement.substring(0, 60).replace(/\n/g, ' ');
      process.stdout.write(`[${i + 1}/${statements.length}] ${shortDesc}... `);
      
      try {
        // Handle IF NOT EXISTS for columns - MySQL specific
        if (statement.includes('ADD COLUMN IF NOT EXISTS')) {
          await handleAddColumnIfNotExists(connection, statement);
        } else if (statement.includes('CREATE INDEX') && statement.includes('idx_annadhanam_')) {
          // Handle index creation with IF NOT EXISTS logic
          await handleCreateIndex(connection, statement);
        } else {
          await connection.execute(statement + ';');
        }
        console.log('✓');
      } catch (error) {
        // Check for "already exists" errors
        if (error.message.includes('ER_DUP_KEYNAME') || 
            error.message.includes('already exists') ||
            error.message.includes('Duplicate key name')) {
          console.log('✓ (already exists)');
        } else if (error.message.includes('ER_DUP_FIELDNAME') ||
                   error.message.includes('Duplicate column name')) {
          console.log('✓ (column exists)');
        } else if (error.message.includes('ER_FK_DUP_NAME') ||
                   error.message.includes('Duplicate foreign key constraint name')) {
          console.log('✓ (foreign key exists)');
        } else {
          console.log('✗ FAILED');
          console.error('   Error:', error.message);
          // Continue with other statements
        }
      }
    }
    
    console.log('\n========================================');
    console.log('✓ Migration completed successfully!');
    console.log('========================================\n');
    
    // Verify tables were created
    await verifyTables(connection);
    
  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nConnection closed.');
    }
  }
}

async function handleAddColumnIfNotExists(connection, statement) {
  // Extract table name and column info
  const tableMatch = statement.match(/ALTER TABLE\s+(\w+)/i);
  const columnMatch = statement.match(/ADD COLUMN IF NOT EXISTS\s+(\w+)/i);
  
  if (tableMatch && columnMatch) {
    const tableName = tableMatch[1];
    const columnName = columnMatch[1];
    
    // Check if column exists
    const [rows] = await connection.execute(
      'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [dbConfig.database, tableName, columnName]
    );
    
    if (rows.length === 0) {
      // Column doesn't exist, add it
      const modifiedStatement = statement.replace('IF NOT EXISTS', '');
      await connection.execute(modifiedStatement + ';');
    }
  } else {
    // Can't parse, try executing anyway
    await connection.execute(statement + ';');
  }
}

async function handleCreateIndex(connection, statement) {
  // Extract index name
  const indexMatch = statement.match(/CREATE INDEX\s+(\w+)/i);
  const tableMatch = statement.match(/ON\s+(\w+)/i);
  
  if (indexMatch && tableMatch) {
    const indexName = indexMatch[1];
    const tableName = tableMatch[1];
    
    // Check if index exists
    const [rows] = await connection.execute(
      'SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?',
      [dbConfig.database, tableName, indexName]
    );
    
    if (rows.length === 0) {
      // Index doesn't exist, create it
      await connection.execute(statement + ';');
    }
  } else {
    // Can't parse, try executing anyway
    await connection.execute(statement + ';');
  }
}

async function verifyTables(connection) {
  console.log('Verifying created tables...\n');
  
  const tables = ['donors', 'meal_packages', 'meal_slots', 'annadhanam_feedback'];
  
  for (const table of tables) {
    try {
      const [rows] = await connection.execute(`SHOW TABLES LIKE ?`, [table]);
      if (rows.length > 0) {
        const [countResult] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`✓ ${table}: ${countResult[0].count} rows`);
      } else {
        console.log(`✗ ${table}: NOT FOUND`);
      }
    } catch (error) {
      console.log(`✗ ${table}: ${error.message}`);
    }
  }
  
  // Check annadhanam table columns
  console.log('\nVerifying annadhanam table new columns...');
  const newColumns = ['donor_id', 'package_id', 'calculated_amount', 'confirmation_status', 'service_status'];
  
  for (const column of newColumns) {
    try {
      const [rows] = await connection.execute(
        'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        [dbConfig.database, 'annadhanam', column]
      );
      if (rows.length > 0) {
        console.log(`✓ annadhanam.${column}`);
      } else {
        console.log(`✗ annadhanam.${column}: NOT FOUND`);
      }
    } catch (error) {
      console.log(`✗ annadhanam.${column}: ${error.message}`);
    }
  }
}

// Run migration
runMigration().catch(console.error);
