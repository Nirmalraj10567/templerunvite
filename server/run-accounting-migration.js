const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    user: process.env.MYSQL_USER || 'test',
    password: process.env.MYSQL_PASSWORD || 'rootroot',
    database: process.env.MYSQL_DATABASE || 'templefinals',
    multipleStatements: true
};

async function runAccountingMigration() {
    let connection;

    try {
        console.log('🚀 Starting accounting system migration...');

        // Create database connection
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to database');

        // Read the migration SQL file
        const migrationPath = path.join(__dirname, 'migrations', 'create_accounting_tables.sql');

        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Migration file not found: ${migrationPath}`);
        }

        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        console.log('📄 Migration SQL loaded');

        // Execute the migration
        console.log('⚡ Executing migration...');
        await connection.execute(migrationSQL);

        console.log('✅ Accounting tables created successfully!');

        // Verify tables were created
        const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN ('accounts', 'journal_entries', 'journal_entry_lines', 'account_balances')
    `, [dbConfig.database]);

        console.log('📊 Created tables:');
        tables.forEach(table => {
            console.log(`   - ${table.TABLE_NAME}`);
        });

        // Check if triggers were created
        const [triggers] = await connection.execute(`
      SELECT TRIGGER_NAME 
      FROM INFORMATION_SCHEMA.TRIGGERS 
      WHERE TRIGGER_SCHEMA = ? 
      AND TRIGGER_NAME LIKE 'update_account_balance%'
    `, [dbConfig.database]);

        console.log('🔧 Created triggers:');
        triggers.forEach(trigger => {
            console.log(`   - ${trigger.TRIGGER_NAME}`);
        });

        console.log('\\n🎉 Accounting system migration completed successfully!');
        console.log('\\n📋 Next steps:');
        console.log('   1. Run: node setup-accounting.js setup');
        console.log('   2. Restart your server');
        console.log('   3. Access accounting APIs at /api/accounting/*');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);

        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('\\n💡 Database access denied. Please check:');
            console.error('   - Database credentials in environment variables');
            console.error('   - User has CREATE, ALTER, INSERT privileges');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.error('\\n💡 Database not found. Please check:');
            console.error('   - Database name is correct');
            console.error('   - Database exists');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('\\n💡 Connection refused. Please check:');
            console.error('   - MySQL server is running');
            console.error('   - Host and port are correct');
        } else if (error.code === 'ENOENT') {
            console.error('\\n💡 Migration file not found. Please check:');
            console.error('   - migrations/create_accounting_tables.sql exists');
            console.error('   - File path is correct');
        }

        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
📖 Accounting System Migration Tool

Usage: node run-accounting-migration.js [options]

Options:
  --help, -h     Show this help message
  --dry-run      Show what would be executed without running

Environment Variables:
  MYSQL_HOST        Database host (default: 127.0.0.1)
  MYSQL_USER        Database user (default: root)
  MYSQL_PASSWORD    Database password (default: root)
  MYSQL_DATABASE    Database name (default: templefinals)
`);
    process.exit(0);
}

if (process.argv.includes('--dry-run')) {
    console.log('🔍 Dry run mode - showing migration SQL:');
    const migrationPath = path.join(__dirname, 'migrations', 'create_accounting_tables.sql');

    if (!fs.existsSync(migrationPath)) {
        console.error(`❌ Migration file not found: ${migrationPath}`);
        process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('\\n' + '='.repeat(80));
    console.log(migrationSQL);
    console.log('='.repeat(80) + '\\n');
    console.log('✅ Dry run completed. Use without --dry-run to execute.');
    process.exit(0);
}

// Run the migration
runAccountingMigration();