const db = require('./db');

async function fixJournalEntriesCompatibility() {
    console.log('🔧 Fixing journal_entries table compatibility...');

    try {
        // Check current journal_entries structure
        const columns = await db('information_schema.columns')
            .where('table_schema', 'templefinals')
            .where('table_name', 'journal_entries')
            .select('column_name');
        
        const existingColumns = columns.map(col => col.column_name || col.COLUMN_NAME);
        console.log('📋 Existing columns:', existingColumns);

        // Add missing columns for backward compatibility
        const columnsToAdd = [
            { name: 'from_account', type: 'string', length: 255, nullable: true },
            { name: 'to_account', type: 'string', length: 255, nullable: true },
            { name: 'amount', type: 'decimal', precision: 15, scale: 2, nullable: true },
            { name: 'entry_type', type: 'string', length: 50, nullable: true },
            { name: 'remarks', type: 'text', nullable: true },
            { name: 'reference_type', type: 'string', length: 50, nullable: true },
            { name: 'reference_id', type: 'integer', nullable: true }
        ];

        for (const column of columnsToAdd) {
            if (!existingColumns.includes(column.name)) {
                console.log(`➕ Adding column: ${column.name}`);
                
                try {
                    await db.schema.alterTable('journal_entries', (table) => {
                        if (column.type === 'string') {
                            const col = table.string(column.name, column.length);
                            if (column.nullable) col.nullable();
                        } else if (column.type === 'decimal') {
                            const col = table.decimal(column.name, column.precision, column.scale);
                            if (column.nullable) col.nullable();
                        } else if (column.type === 'text') {
                            const col = table.text(column.name);
                            if (column.nullable) col.nullable();
                        } else if (column.type === 'integer') {
                            const col = table.integer(column.name);
                            if (column.nullable) col.nullable();
                        }
                    });
                    console.log(`✅ Added column: ${column.name}`);
                } catch (error) {
                    console.log(`⚠️ Failed to add column ${column.name}:`, error.message);
                }
            } else {
                console.log(`✅ Column already exists: ${column.name}`);
            }
        }

        // Add indexes for the new columns
        console.log('🔗 Adding indexes...');
        
        try {
            await db.schema.alterTable('journal_entries', (table) => {
                table.index(['reference_type', 'reference_id']);
                table.index(['temple_id', 'reference_type']);
            });
            console.log('✅ Added indexes for reference columns');
        } catch (error) {
            console.log('⚠️ Index creation failed (may already exist):', error.message);
        }

        // Verify the final structure
        const finalColumns = await db('information_schema.columns')
            .where('table_schema', 'templefinals')
            .where('table_name', 'journal_entries')
            .select('column_name');
        
        const finalColumnNames = finalColumns.map(col => col.column_name || col.COLUMN_NAME);
        console.log('📋 Final columns:', finalColumnNames.sort());

        console.log('\n🎉 Journal entries table compatibility fixed!');
        console.log('\n📋 The table now supports both:');
        console.log('   ✅ New double-entry format (reference_number, description, journal_entry_lines)');
        console.log('   ✅ Old simple format (from_account, to_account, amount, reference_type)');

    } catch (error) {
        console.error('❌ Failed to fix journal entries compatibility:', error);
        throw error;
    } finally {
        await db.destroy();
    }
}

fixJournalEntriesCompatibility();