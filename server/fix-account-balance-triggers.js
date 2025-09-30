const db = require('./db');

async function fixAccountBalanceTriggers() {
    console.log('🔧 Fixing account balance triggers...');

    try {
        // First, let's manually update the account balances based on existing journal entries
        console.log('📊 Calculating and updating account balances...');
        
        // Get all accounts
        const accounts = await db('accounts').select('id', 'code', 'name', 'temple_id', 'type');
        
        for (const account of accounts) {
            // Calculate balance from journal entry lines
            const lines = await db('journal_entry_lines as jel')
                .join('journal_entries as je', 'jel.journal_entry_id', 'je.id')
                .where('jel.account_id', account.id)
                .where('je.temple_id', account.temple_id)
                .select('jel.debit_amount', 'jel.credit_amount');
            
            let balance = 0;
            for (const line of lines) {
                balance += (parseFloat(line.credit_amount) || 0) - (parseFloat(line.debit_amount) || 0);
            }
            
            // For asset and expense accounts, we want positive balances to show as positive
            // For liability, equity, and income accounts, we want positive balances to show as positive
            const displayBalance = Math.abs(balance);
            
            if (displayBalance > 0) {
                await db('accounts')
                    .where('id', account.id)
                    .update({ current_balance: displayBalance });
                
                console.log(`   ✅ Updated ${account.name} (${account.code}): ₹${displayBalance}`);
            }
        }

        // Create triggers for automatic balance updates
        console.log('\n🔧 Creating balance update triggers...');
        
        const triggers = [
            {
                name: 'update_account_balance_after_insert',
                event: 'AFTER INSERT',
                sql: `
                CREATE TRIGGER update_account_balance_after_insert
                AFTER INSERT ON journal_entry_lines
                FOR EACH ROW
                BEGIN
                    UPDATE accounts 
                    SET current_balance = current_balance + NEW.credit_amount - NEW.debit_amount,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = NEW.account_id;
                END
                `
            },
            {
                name: 'update_account_balance_after_update',
                event: 'AFTER UPDATE',
                sql: `
                CREATE TRIGGER update_account_balance_after_update
                AFTER UPDATE ON journal_entry_lines
                FOR EACH ROW
                BEGIN
                    UPDATE accounts 
                    SET current_balance = current_balance - OLD.credit_amount + OLD.debit_amount + NEW.credit_amount - NEW.debit_amount,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = NEW.account_id;
                END
                `
            },
            {
                name: 'update_account_balance_after_delete',
                event: 'AFTER DELETE',
                sql: `
                CREATE TRIGGER update_account_balance_after_delete
                AFTER DELETE ON journal_entry_lines
                FOR EACH ROW
                BEGIN
                    UPDATE accounts 
                    SET current_balance = current_balance - OLD.credit_amount + OLD.debit_amount,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = OLD.account_id;
                END
                `
            }
        ];

        for (const trigger of triggers) {
            try {
                // Drop trigger if it exists
                await db.raw(`DROP TRIGGER IF EXISTS ${trigger.name}`);
                
                // Create new trigger
                await db.raw(trigger.sql);
                console.log(`   ✅ Created trigger: ${trigger.name}`);
            } catch (error) {
                console.log(`   ⚠️ Failed to create trigger ${trigger.name}:`, error.message);
            }
        }

        console.log('\n🎉 Account balance system fixed!');
        console.log('\n📋 Next steps:');
        console.log('   1. Create a new money donation to test automatic balance updates');
        console.log('   2. Check the accounting reports');

    } catch (error) {
        console.error('❌ Failed to fix account balance triggers:', error);
    } finally {
        await db.destroy();
    }
}

fixAccountBalanceTriggers();