/**
 * MySQL Migration Script for Asset Management Tables
 * Run with: node migrate-assets-mysql.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// MySQL Configuration
const dbConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'rootroot',
  database: process.env.MYSQL_DATABASE || 'temple',
  multipleStatements: true
};

console.log('========================================');
console.log('ASSET MANAGEMENT - MYSQL MIGRATION');
console.log('========================================');
console.log(`Host: ${dbConfig.host}:${dbConfig.port}`);
console.log(`Database: ${dbConfig.database}`);
console.log('----------------------------------------\n');

async function runMigration() {
  let connection;
  
  try {
    // Create connection
    console.log('Connecting to MySQL...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✓ Connected successfully\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '20250410_create_assets_table_mysql.sql');
    console.log(`Reading migration file: ${migrationPath}`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✓ Migration file loaded\n');

    // Split SQL statements (safer execution)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    console.log('Executing migration...');
    console.log('----------------------------------------');
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      const shortStmt = statement.substring(0, 60).replace(/\n/g, ' ');
      
      try {
        await connection.execute(statement);
        console.log(`✓ Statement ${i + 1}/${statements.length}: ${shortStmt}...`);
      } catch (err) {
        // Handle "already exists" errors gracefully
        if (err.message.includes('already exists') || err.message.includes('Duplicate entry')) {
          console.log(`⚠ Statement ${i + 1}/${statements.length}: ${shortStmt}... (already exists, skipping)`);
        } else {
          throw err;
        }
      }
    }

    console.log('----------------------------------------');
    console.log('✓ Migration completed successfully!\n');

    // Verify tables were created
    console.log('Verifying tables...');
    const [tables] = await connection.execute(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name IN ('assets', 'asset_logs')",
      [dbConfig.database]
    );
    
    console.log(`✓ Found ${tables.length}/2 tables:`);
    tables.forEach(t => console.log(`  - ${t.table_name}`));

    // Verify columns in assets table
    const [columns] = await connection.execute(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = 'assets'",
      [dbConfig.database]
    );
    
    console.log(`\n✓ Assets table has ${columns.length} columns`);
    
    // Verify permissions were added
    const [permissions] = await connection.execute(
      "SELECT id FROM permissions WHERE id = 'asset_management'"
    );
    
    if (permissions.length > 0) {
      console.log('✓ asset_management permission exists');
    } else {
      console.log('⚠ asset_management permission not found');
    }

    console.log('\n========================================');
    console.log('MIGRATION COMPLETE');
    console.log('========================================');
    console.log('\nNext steps:');
    console.log('1. Start the backend server: npm run dev (or node backend.js)');
    console.log('2. Run tests: node test-assets-api.js');
    console.log('\nAPI Endpoints available at:');
    console.log('  POST   /api/assets              - Create asset');
    console.log('  GET    /api/assets              - List assets');
    console.log('  GET    /api/assets/:id          - Get single asset');
    console.log('  PUT    /api/assets/:id          - Update asset');
    console.log('  DELETE /api/assets/:id          - Delete asset');
    console.log('  POST   /api/assets/:id/convert-to-cash - Convert to cash');
    console.log('  GET    /api/assets/:id/logs     - Get asset logs');
    console.log('========================================');

  } catch (error) {
    console.error('\n✗ Migration failed:');
    console.error(error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\nMake sure MySQL is running and accessible.');
      console.error(`Check: mysql -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.user} -p`);
    }
    
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.error(`\nDatabase '${dbConfig.database}' does not exist.`);
      console.error('Create it first: CREATE DATABASE temple;');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nConnection closed.');
    }
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node migrate-assets-mysql.js [options]

Options:
  --help, -h      Show this help message
  --dry-run       Show SQL without executing
  --env=<file>    Load environment variables from file

Environment Variables:
  MYSQL_HOST      MySQL host (default: 127.0.0.1)
  MYSQL_PORT      MySQL port (default: 3306)
  MYSQL_USER      MySQL user (default: root)
  MYSQL_PASSWORD  MySQL password (default: rootroot)
  MYSQL_DATABASE  MySQL database (default: temple)

Examples:
  node migrate-assets-mysql.js
  MYSQL_HOST=192.168.1.100 MYSQL_PASSWORD=secret node migrate-assets-mysql.js
`);
  process.exit(0);
}

if (args.includes('--dry-run')) {
  const migrationPath = path.join(__dirname, 'migrations', '20250410_create_assets_table_mysql.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  console.log('DRY RUN - SQL to be executed:\n');
  console.log(sql);
  process.exit(0);
}

// Run migration
runMigration();
