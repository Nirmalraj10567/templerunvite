const db = require('./db');

/**
 * Setup script for the accounting system
 * This script initializes default accounts for a temple
 */

// Default chart of accounts
const defaultAccounts = [
    // Assets
    { code: 'CASH', name: 'Cash in Hand', type: 'ASSET', category: 'Current Assets', initial_balance: 0 },
    { code: 'BANK_CURRENT', name: 'Bank Current Account', type: 'ASSET', category: 'Current Assets', initial_balance: 0 },
    { code: 'BANK_SAVINGS', name: 'Bank Savings Account', type: 'ASSET', category: 'Current Assets', initial_balance: 0 },
    { code: 'ACCOUNTS_RECEIVABLE', name: 'Accounts Receivable', type: 'ASSET', category: 'Current Assets', initial_balance: 0 },
    { code: 'BUILDING', name: 'Temple Building', type: 'ASSET', category: 'Fixed Assets', initial_balance: 0 },
    { code: 'EQUIPMENT', name: 'Equipment', type: 'ASSET', category: 'Fixed Assets', initial_balance: 0 },

    // Liabilities
    { code: 'ACCOUNTS_PAYABLE', name: 'Accounts Payable', type: 'LIABILITY', category: 'Current Liabilities', initial_balance: 0 },
    { code: 'LOANS_PAYABLE', name: 'Loans Payable', type: 'LIABILITY', category: 'Long-term Liabilities', initial_balance: 0 },

    // Equity
    { code: 'TEMPLE_FUND', name: 'Temple Fund', type: 'EQUITY', category: 'Owner Equity', initial_balance: 0 },
    { code: 'RETAINED_EARNINGS', name: 'Retained Earnings', type: 'EQUITY', category: 'Retained Earnings', initial_balance: 0 },
    { code: 'OPENING_BALANCE_EQUITY', name: 'Opening Balance Equity', type: 'EQUITY', category: 'Owner Equity', initial_balance: 0 },

    // Income
    { code: 'DONATION_INCOME', name: 'Donation Income', type: 'INCOME', category: 'Operating Income', initial_balance: 0 },
    { code: 'POOJA_INCOME', name: 'Pooja Income', type: 'INCOME', category: 'Operating Income', initial_balance: 0 },
    { code: 'HALL_RENTAL_INCOME', name: 'Hall Rental Income', type: 'INCOME', category: 'Operating Income', initial_balance: 0 },
    { code: 'TAX_INCOME', name: 'Tax Income', type: 'INCOME', category: 'Operating Income', initial_balance: 0 },
    { code: 'MISCELLANEOUS_INCOME', name: 'Miscellaneous Income', type: 'INCOME', category: 'Other Income', initial_balance: 0 },

    // Expenses
    { code: 'PRIEST_SALARY', name: 'Priest Salary', type: 'EXPENSE', category: 'Operating Expenses', initial_balance: 0 },
    { code: 'UTILITIES', name: 'Utilities', type: 'EXPENSE', category: 'Operating Expenses', initial_balance: 0 },
    { code: 'MAINTENANCE', name: 'Maintenance', type: 'EXPENSE', category: 'Operating Expenses', initial_balance: 0 },
    { code: 'SUPPLIES', name: 'Supplies', type: 'EXPENSE', category: 'Operating Expenses', initial_balance: 0 },
    { code: 'ADMINISTRATIVE', name: 'Administrative Expenses', type: 'EXPENSE', category: 'Administrative Expenses', initial_balance: 0 },
    { code: 'MISCELLANEOUS_EXPENSE', name: 'Miscellaneous Expenses', type: 'EXPENSE', category: 'Other Expenses', initial_balance: 0 }
];

async function setupAccountingForTemple(templeId) {
    console.log(`🏛️  Setting up accounting system for temple ID: ${templeId}`);

    try {
        let created = 0;
        let skipped = 0;

        for (const account of defaultAccounts) {
            // Check if account already exists
            const existing = await db('accounts')
                .where({ code: account.code, temple_id: templeId })
                .first();

            if (existing) {
                console.log(`⏭️  Skipping existing account: ${account.code} - ${account.name}`);
                skipped++;
                continue;
            }

            // Create the account
            await db('accounts').insert({
                code: account.code,
                name: account.name,
                type: account.type,
                category: account.category,
                initial_balance: account.initial_balance,
                current_balance: account.initial_balance,
                is_active: true,
                temple_id: templeId
            });

            console.log(`✅ Created account: ${account.code} - ${account.name}`);
            created++;
        }

        console.log(`\n📊 Setup Summary:`);
        console.log(`   - Created: ${created} accounts`);
        console.log(`   - Skipped: ${skipped} accounts`);
        console.log(`   - Total: ${created + skipped} accounts`);

        if (created > 0) {
            console.log(`\n🎉 Accounting system setup completed for temple ${templeId}!`);
            console.log(`\n📋 Next steps:`);
            console.log(`   1. Update account initial balances if needed`);
            console.log(`   2. Start creating journal entries for transactions`);
            console.log(`   3. Generate reports to verify the setup`);
        } else {
            console.log(`\n✨ Accounting system already set up for temple ${templeId}`);
        }

        return true;
    } catch (error) {
        console.error('❌ Error setting up accounting system:', error.message);
        return false;
    }
}

async function listTemples() {
    try {
        // Try to get temples from users table (assuming temple_id is stored there)
        const temples = await db('users')
            .select('temple_id')
            .whereNotNull('temple_id')
            .groupBy('temple_id')
            .orderBy('temple_id');

        if (temples.length === 0) {
            console.log('⚠️  No temples found in the database');
            console.log('💡 Make sure you have users with temple_id assigned');
            return [];
        }

        console.log('🏛️  Available temples:');
        temples.forEach((temple, index) => {
            console.log(`   ${index + 1}. Temple ID: ${temple.temple_id}`);
        });

        return temples.map(t => t.temple_id);
    } catch (error) {
        console.error('❌ Error listing temples:', error.message);
        return [];
    }
}

async function setupAllTemples() {
    console.log('🚀 Setting up accounting system for all temples...\n');

    const templeIds = await listTemples();

    if (templeIds.length === 0) {
        return;
    }

    let successCount = 0;

    for (const templeId of templeIds) {
        console.log(`\n${'='.repeat(50)}`);
        const success = await setupAccountingForTemple(templeId);
        if (success) successCount++;
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`📊 Overall Summary: ${successCount}/${templeIds.length} temples set up successfully`);
}

async function checkAccountingStatus(templeId) {
    try {
        const accounts = await db('accounts')
            .where({ temple_id: templeId })
            .select('type')
            .count('id as count')
            .groupBy('type');

        const journalEntries = await db('journal_entries')
            .where({ temple_id: templeId })
            .count('id as count')
            .first();

        console.log(`\n📊 Accounting Status for Temple ${templeId}:`);
        console.log(`   Accounts by type:`);
        accounts.forEach(row => {
            console.log(`     - ${row.type}: ${row.count} accounts`);
        });
        console.log(`   Journal Entries: ${journalEntries.count}`);

        return accounts.length > 0;
    } catch (error) {
        console.error('❌ Error checking accounting status:', error.message);
        return false;
    }
}

// Command line interface
async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
📖 Accounting System Setup Tool

Usage: node setup-accounting.js [command] [options]

Commands:
  setup [temple_id]    Set up accounting for specific temple (or all if no ID provided)
  list                 List all available temples
  status [temple_id]   Check accounting status for temple
  --help, -h          Show this help message

Examples:
  node setup-accounting.js setup 1        # Setup for temple ID 1
  node setup-accounting.js setup          # Setup for all temples
  node setup-accounting.js list           # List all temples
  node setup-accounting.js status 1       # Check status for temple ID 1
`);
        process.exit(0);
    }

    const command = args[0] || 'setup';
    const templeId = args[1] ? parseInt(args[1]) : null;

    try {
        switch (command) {
            case 'setup':
                if (templeId) {
                    await setupAccountingForTemple(templeId);
                } else {
                    await setupAllTemples();
                }
                break;

            case 'list':
                await listTemples();
                break;

            case 'status':
                if (templeId) {
                    await checkAccountingStatus(templeId);
                } else {
                    console.log('❌ Please provide a temple ID for status check');
                    console.log('💡 Usage: node setup-accounting.js status [temple_id]');
                }
                break;

            default:
                console.log(`❌ Unknown command: ${command}`);
                console.log('💡 Use --help to see available commands');
        }
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    } finally {
        await db.destroy();
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = {
    setupAccountingForTemple,
    listTemples,
    checkAccountingStatus,
    defaultAccounts
};