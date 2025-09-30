const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'rootroot',
    database: process.env.MYSQL_DATABASE || 'templefinals',
    multipleStatements: true
};

async function runSafeAccountingMigration() {
    let connection;

    try {
        console.log('🚀 Starting SAFE accounting system migration...');
        console.log('⚠️  This will rename existing journal_entries to journal_entries_old');

        // Create database connection
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to database');

        // Read the safe migration SQL file
        const migrationPath = path.join(__dirname, 'migrations', 'create_accounting_tables_safe.sql');

        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Migration file not found: ${migrationPath}`);
        }

        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        console.log('📄 Safe migration SQL loaded');

        // Split SQL into individual statements to handle them one by one
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        console.log(`⚡ Executing ${statements.length} migration statements...`);

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim()) {
                try {
                    console.log(`   ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
                    await connection.execute(statement);
                } catch (error) {
                    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                        console.log(`   ⚠️  Table already exists, skipping...`);
                    } else if (error.code === 'ER_NO_SUCH_TABLE') {
                        console.log(`   ⚠️  Table doesn't exist, skipping rename...`);
                    } else {
                        throw error;
                    }
                }
            }
        }

        console.log('✅ Accounting tables created successfully!');

        // Verify tables were created
        const [tables] = await connection.execute(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME IN ('accounts', 'journal_entries', 'journal_entry_lines', 'account_balances', 'journal_entries_old')
        `, [dbConfig.database]);

        console.log('📊 Database tables:');
        tables.forEach(table => {
            console.log(`   - ${table.TABLE_NAME}`);
        });

        // Check journal_entries structure
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = 'journal_entries'
            ORDER BY ORDINAL_POSITION
        `, [dbConfig.database]);

        console.log('📋 journal_entries columns:');
        columns.forEach(col => {
            console.log(`   - ${col.COLUMN_NAME}`);
        });

        console.log('\n🎉 Safe accounting system migration completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('   1. Run: node setup-accounting.js');
        console.log('   2. Restart your server');
        console.log('   3. Test money donations - they should now appear in accounting reports');
        console.log('\n💡 Your old journal_entries data is preserved in journal_entries_old table');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Full error:', error);

        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('\n💡 Database access denied. Please check:');
            console.error('   - Database credentials in environment variables');
            console.error('   - User has CREATE, ALTER, INSERT privileges');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.error('\n💡 Database not found. Please check:');
            console.error('   - Database name is correct');
            console.error('   - Database exists');
        }

        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run the migration
runSafeAccountingMigration();