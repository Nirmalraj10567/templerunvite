const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'rootroot',
    database: process.env.MYSQL_DATABASE || 'templefinals'
};

async function fixJournalEntries() {
    let connection;

    try {
        console.log('🔧 Fixing journal_entries table...');

        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to database');

        // Check if journal_entries exists
        try {
            const [result] = await connection.execute('DESCRIBE journal_entries');
            console.log('✅ journal_entries table already exists');
            console.log('Columns:', result.map(r => r.Field));
        } catch (error) {
            if (error.code === 'ER_NO_SUCH_TABLE') {
                console.log('❌ journal_entries table does not exist, creating...');

                // Create journal_entries table
                await connection.execute(`
                    CREATE TABLE journal_entries (
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

                console.log('✅ journal_entries table created successfully!');
            } else {
                throw error;
            }
        }

        // Verify the foreign key relationship exists
        try {
            const [fks] = await connection.execute(`
                SELECT CONSTRAINT_NAME 
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                WHERE TABLE_SCHEMA = ? 
                AND TABLE_NAME = 'journal_entry_lines' 
                AND REFERENCED_TABLE_NAME = 'journal_entries'
            `, [dbConfig.database]);

            if (fks.length === 0) {
                console.log('🔗 Adding foreign key constraint...');
                await connection.execute(`
                    ALTER TABLE journal_entry_lines 
                    ADD CONSTRAINT fk_journal_entry_lines_journal_entry 
                    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE
                `);
                console.log('✅ Foreign key constraint added');
            } else {
                console.log('✅ Foreign key constraint already exists');
            }
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('✅ Foreign key constraint already exists');
            } else {
                console.log('⚠️ Could not add foreign key constraint:', error.message);
            }
        }

        console.log('\n🎉 journal_entries table is ready!');
        console.log('\n📋 Next steps:');
        console.log('   1. Restart your server');
        console.log('   2. Try creating a money donation');
        console.log('   3. Check accounting reports');

    } catch (error) {
        console.error('❌ Failed to fix journal_entries:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

fixJournalEntries();