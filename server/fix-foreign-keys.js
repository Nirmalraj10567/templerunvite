const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'root',
    database: process.env.MYSQL_DATABASE || 'templefinals'
};

async function fixForeignKeys() {
    let connection;

    try {
        console.log('🔧 Fixing foreign key constraints...');
        
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to database');

        // Check current foreign keys
        const [currentFKs] = await connection.execute(`
            SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = 'journal_entry_lines' 
            AND REFERENCED_TABLE_NAME IS NOT NULL
        `, [dbConfig.database]);

        console.log('Current foreign keys:', currentFKs);

        // Drop existing foreign key constraints
        for (const fk of currentFKs) {
            try {
                console.log(`Dropping foreign key: ${fk.CONSTRAINT_NAME}`);
                await connection.execute(`ALTER TABLE journal_entry_lines DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
            } catch (error) {
                console.log(`⚠️ Could not drop ${fk.CONSTRAINT_NAME}:`, error.message);
            }
        }

        // Add correct foreign key constraints
        console.log('Adding correct foreign key constraints...');
        
        try {
            await connection.execute(`
                ALTER TABLE journal_entry_lines 
                ADD CONSTRAINT fk_journal_entry_lines_journal_entry 
                FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE
            `);
            console.log('✅ Added journal_entries foreign key');
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('✅ Foreign key already exists');
            } else {
                console.log('⚠️ Could not add journal_entries foreign key:', error.message);
            }
        }

        try {
            await connection.execute(`
                ALTER TABLE journal_entry_lines 
                ADD CONSTRAINT fk_journal_entry_lines_account 
                FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT
            `);
            console.log('✅ Added accounts foreign key');
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('✅ Accounts foreign key already exists');
            } else {
                console.log('⚠️ Could not add accounts foreign key:', error.message);
            }
        }

        // Verify the fixes
        const [newFKs] = await connection.execute(`
            SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = 'journal_entry_lines' 
            AND REFERENCED_TABLE_NAME IS NOT NULL
        `, [dbConfig.database]);

        console.log('\n✅ Updated foreign keys:', newFKs);

        console.log('\n🎉 Foreign key constraints fixed!');

    } catch (error) {
        console.error('❌ Failed to fix foreign keys:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

fixForeignKeys();