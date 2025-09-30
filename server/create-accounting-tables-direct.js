const db = require('./db');

async function createAccountingTables() {
    console.log('🚀 Creating accounting tables directly...');

    try {
        // Check if accounts table exists
        const accountsExists = await db.schema.hasTable('accounts');
        console.log('Accounts table exists:', accountsExists);

        if (!accountsExists) {
            console.log('📋 Creating accounts table...');
            await db.schema.createTable('accounts', (table) => {
                table.increments('id').primary();
                table.string('code', 50).notNullable();
                table.string('name', 255).notNullable();
                table.enum('type', ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']).notNullable();
                table.string('category', 100).notNullable();
                table.integer('parent_id').nullable();
                table.decimal('initial_balance', 15, 2).defaultTo(0.00);
                table.decimal('current_balance', 15, 2).defaultTo(0.00);
                table.boolean('is_active').defaultTo(true);
                table.integer('temple_id').notNullable();
                table.timestamps(true, true);
                
                table.unique(['code', 'temple_id']);
                table.index(['temple_id', 'type']);
                table.index(['temple_id', 'is_active']);
            });
            console.log('✅ Accounts table created');
        }

        // Check if journal_entries table exists
        const journalEntriesExists = await db.schema.hasTable('journal_entries');
        console.log('Journal entries table exists:', journalEntriesExists);

        if (!journalEntriesExists) {
            console.log('📋 Creating journal_entries table...');
            await db.schema.createTable('journal_entries', (table) => {
                table.increments('id').primary();
                table.date('date').notNullable();
                table.string('reference_number', 50).notNullable();
                table.text('description').notNullable();
                table.decimal('total_amount', 15, 2).notNullable();
                table.integer('created_by').notNullable();
                table.integer('temple_id').notNullable();
                table.timestamps(true, true);
                
                table.unique(['reference_number', 'temple_id']);
                table.index(['temple_id', 'date']);
                table.index(['temple_id', 'created_by']);
            });
            console.log('✅ Journal entries table created');
        }

        // Check if journal_entry_lines table exists
        const journalEntryLinesExists = await db.schema.hasTable('journal_entry_lines');
        console.log('Journal entry lines table exists:', journalEntryLinesExists);

        if (!journalEntryLinesExists) {
            console.log('📋 Creating journal_entry_lines table...');
            await db.schema.createTable('journal_entry_lines', (table) => {
                table.increments('id').primary();
                table.integer('journal_entry_id').notNullable();
                table.integer('account_id').notNullable();
                table.decimal('debit_amount', 15, 2).defaultTo(0.00);
                table.decimal('credit_amount', 15, 2).defaultTo(0.00);
                table.text('description').nullable();
                table.timestamp('created_at').defaultTo(db.fn.now());
                
                table.index('journal_entry_id');
                table.index('account_id');
            });
            console.log('✅ Journal entry lines table created');
        }

        // Check if account_balances table exists
        const accountBalancesExists = await db.schema.hasTable('account_balances');
        console.log('Account balances table exists:', accountBalancesExists);

        if (!accountBalancesExists) {
            console.log('📋 Creating account_balances table...');
            await db.schema.createTable('account_balances', (table) => {
                table.increments('id').primary();
                table.integer('account_id').notNullable();
                table.date('balance_date').notNullable();
                table.decimal('debit_balance', 15, 2).defaultTo(0.00);
                table.decimal('credit_balance', 15, 2).defaultTo(0.00);
                table.decimal('running_balance', 15, 2).defaultTo(0.00);
                table.integer('temple_id').notNullable();
                table.timestamps(true, true);
                
                table.unique(['account_id', 'balance_date']);
                table.index(['temple_id', 'balance_date']);
            });
            console.log('✅ Account balances table created');
        }

        // Add foreign key constraints if they don't exist
        console.log('🔗 Adding foreign key constraints...');
        
        try {
            // Add foreign key from journal_entry_lines to journal_entries
            await db.schema.alterTable('journal_entry_lines', (table) => {
                table.foreign('journal_entry_id').references('id').inTable('journal_entries').onDelete('CASCADE');
            });
            console.log('✅ Added journal_entry_lines -> journal_entries foreign key');
        } catch (error) {
            if (error.code !== 'ER_DUP_KEYNAME') {
                console.log('⚠️ Foreign key constraint already exists or failed:', error.message);
            }
        }

        try {
            // Add foreign key from journal_entry_lines to accounts
            await db.schema.alterTable('journal_entry_lines', (table) => {
                table.foreign('account_id').references('id').inTable('accounts').onDelete('RESTRICT');
            });
            console.log('✅ Added journal_entry_lines -> accounts foreign key');
        } catch (error) {
            if (error.code !== 'ER_DUP_KEYNAME') {
                console.log('⚠️ Foreign key constraint already exists or failed:', error.message);
            }
        }

        try {
            // Add foreign key from account_balances to accounts
            await db.schema.alterTable('account_balances', (table) => {
                table.foreign('account_id').references('id').inTable('accounts').onDelete('CASCADE');
            });
            console.log('✅ Added account_balances -> accounts foreign key');
        } catch (error) {
            if (error.code !== 'ER_DUP_KEYNAME') {
                console.log('⚠️ Foreign key constraint already exists or failed:', error.message);
            }
        }

        console.log('\n🎉 Accounting tables created successfully!');
        console.log('\n📋 Next steps:');
        console.log('   1. Run: node setup-accounting.js');
        console.log('   2. Start your server');
        console.log('   3. Test money donations');

    } catch (error) {
        console.error('❌ Failed to create accounting tables:', error);
        throw error;
    } finally {
        await db.destroy();
    }
}

createAccountingTables();