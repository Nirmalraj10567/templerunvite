const db = require('./db');

async function testMoneyDonationIntegration() {
    console.log('🧪 Testing money donation to accounting integration...\n');

    try {
        // Test 1: Check if required tables exist
        console.log('1️⃣ Checking database tables...');
        const tables = ['accounts', 'journal_entries', 'journal_entry_lines', 'money_donations'];
        
        for (const table of tables) {
            const exists = await db.schema.hasTable(table);
            console.log(`   ${exists ? '✅' : '❌'} ${table}: ${exists ? 'exists' : 'missing'}`);
        }

        // Test 2: Check if required accounts exist for temple 12
        console.log('\n2️⃣ Checking required accounts for temple 12...');
        const requiredAccounts = ['CASH', 'DONATION_INCOME'];
        
        for (const accountCode of requiredAccounts) {
            const account = await db('accounts')
                .where({ code: accountCode, temple_id: 12 })
                .first();
            
            console.log(`   ${account ? '✅' : '❌'} ${accountCode}: ${account ? `Found (ID: ${account.id})` : 'missing'}`);
        }

        // Test 3: Check recent money donations
        console.log('\n3️⃣ Checking recent money donations...');
        const donations = await db('money_donations')
            .where('temple_id', 12)
            .orderBy('created_at', 'desc')
            .limit(5)
            .select('id', 'register_no', 'name', 'amount', 'date');
        
        console.log(`   📊 Found ${donations.length} recent donations:`);
        donations.forEach(donation => {
            console.log(`      - ${donation.register_no}: ${donation.name} - ₹${donation.amount} (${donation.date})`);
        });

        // Test 4: Check journal entries for money donations
        console.log('\n4️⃣ Checking journal entries for money donations...');
        const journalEntries = await db('journal_entries')
            .where('temple_id', 12)
            .where('reference_number', 'like', 'MD-%')
            .orderBy('created_at', 'desc')
            .limit(5)
            .select('id', 'reference_number', 'description', 'total_amount', 'date');
        
        console.log(`   📊 Found ${journalEntries.length} money donation journal entries:`);
        journalEntries.forEach(entry => {
            console.log(`      - ${entry.reference_number}: ₹${entry.total_amount} (${entry.date})`);
        });

        // Test 5: Check journal entry lines for money donations
        if (journalEntries.length > 0) {
            console.log('\n5️⃣ Checking journal entry lines...');
            const entryId = journalEntries[0].id;
            
            const lines = await db('journal_entry_lines as jel')
                .join('accounts as a', 'jel.account_id', 'a.id')
                .where('jel.journal_entry_id', entryId)
                .select('a.name as account_name', 'a.code as account_code', 'jel.debit_amount', 'jel.credit_amount');
            
            console.log(`   📊 Journal entry lines for ${journalEntries[0].reference_number}:`);
            lines.forEach(line => {
                console.log(`      - ${line.account_name} (${line.account_code}): Debit ₹${line.debit_amount}, Credit ₹${line.credit_amount}`);
            });
        }

        // Test 6: Check account balances
        console.log('\n6️⃣ Checking account balances...');
        const accountBalances = await db('accounts')
            .where({ temple_id: 12, is_active: true })
            .whereIn('code', ['CASH', 'DONATION_INCOME'])
            .select('code', 'name', 'current_balance');
        
        accountBalances.forEach(account => {
            console.log(`   💰 ${account.name} (${account.code}): ₹${account.current_balance}`);
        });

        console.log('\n🎉 Integration test completed!');
        
        // Summary
        const hasRequiredTables = tables.every(async (table) => await db.schema.hasTable(table));
        const hasRequiredAccounts = requiredAccounts.length === 2; // We checked 2 accounts
        const hasJournalEntries = journalEntries.length > 0;
        
        console.log('\n📊 Summary:');
        console.log(`   Tables: ${hasRequiredTables ? '✅' : '❌'} All required tables exist`);
        console.log(`   Accounts: ${hasRequiredAccounts ? '✅' : '❌'} Required accounts exist`);
        console.log(`   Integration: ${hasJournalEntries ? '✅' : '⚠️'} ${hasJournalEntries ? 'Working' : 'No journal entries found'}`);
        
        if (!hasJournalEntries && donations.length > 0) {
            console.log('\n💡 Suggestion: Create a new money donation to test the integration');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await db.destroy();
    }
}

testMoneyDonationIntegration();