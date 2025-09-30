import { accountingService } from '@/services/accountingService';

/**
 * Initialize basic accounting accounts if they don't exist
 */
export async function initializeBasicAccounts() {
  try {
    console.log('Initializing basic accounting accounts...');
    
    const accounts = await accountingService.getAccounts();
    
    // Check if basic accounts exist
    const cashAccount = accounts.find(acc => 
      acc.code === 'CASH' || acc.name.toLowerCase().includes('cash')
    );
    
    const donationIncomeAccount = accounts.find(acc => 
      acc.code === 'DONATION_INCOME' || acc.name.toLowerCase().includes('donation')
    );
    
    const bankAccount = accounts.find(acc => 
      acc.code === 'BANK' || acc.name.toLowerCase().includes('bank')
    );
    
    const expenseAccount = accounts.find(acc => 
      acc.code === 'GENERAL_EXPENSE' || acc.name.toLowerCase().includes('expense')
    );

    // Create missing accounts
    const accountsToCreate = [];
    
    if (!cashAccount) {
      accountsToCreate.push({
        code: 'CASH',
        name: 'Cash Account',
        type: 'ASSET' as const,
        category: 'Current Assets',
        initial_balance: 0,
        current_balance: 0,
        is_active: true
      });
    }
    
    if (!donationIncomeAccount) {
      accountsToCreate.push({
        code: 'DONATION_INCOME',
        name: 'Donation Income',
        type: 'INCOME' as const,
        category: 'Revenue',
        initial_balance: 0,
        current_balance: 0,
        is_active: true
      });
    }
    
    if (!bankAccount) {
      accountsToCreate.push({
        code: 'BANK',
        name: 'Bank Account',
        type: 'ASSET' as const,
        category: 'Current Assets',
        initial_balance: 0,
        current_balance: 0,
        is_active: true
      });
    }
    
    if (!expenseAccount) {
      accountsToCreate.push({
        code: 'GENERAL_EXPENSE',
        name: 'General Expenses',
        type: 'EXPENSE' as const,
        category: 'Operating Expenses',
        initial_balance: 0,
        current_balance: 0,
        is_active: true
      });
    }

    // Create the accounts
    const createdAccounts = [];
    for (const accountData of accountsToCreate) {
      try {
        const created = await accountingService.createAccount(accountData);
        createdAccounts.push(created);
        console.log(`✅ Created account: ${created.name} (${created.code})`);
      } catch (error) {
        console.error(`❌ Failed to create account ${accountData.name}:`, error);
      }
    }
    
    console.log(`Accounting initialization completed. Created ${createdAccounts.length} accounts.`);
    return {
      success: true,
      created: createdAccounts.length,
      existing: accounts.length - createdAccounts.length
    };
    
  } catch (error) {
    console.error('Failed to initialize accounting accounts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check if accounting system is properly initialized
 */
export async function checkAccountingSetup() {
  try {
    const accounts = await accountingService.getAccounts();
    
    const requiredAccounts = [
      { code: 'CASH', type: 'ASSET' },
      { code: 'DONATION_INCOME', type: 'INCOME' }
    ];
    
    const missing = [];
    for (const required of requiredAccounts) {
      const found = accounts.find(acc => 
        acc.code === required.code || 
        (acc.type === required.type && acc.name.toLowerCase().includes(required.code.toLowerCase().replace('_', ' ')))
      );
      
      if (!found) {
        missing.push(required);
      }
    }
    
    return {
      isSetup: missing.length === 0,
      totalAccounts: accounts.length,
      missingAccounts: missing
    };
    
  } catch (error) {
    console.error('Failed to check accounting setup:', error);
    return {
      isSetup: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}