import { apiClient } from './api';

// Default chart of accounts for new temples
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

export interface AccountingInitResult {
    success: boolean;
    accountsCreated: number;
    accountsSkipped: number;
    error?: string;
}

export const accountingInitService = {
    /**
     * Initialize default accounting accounts for a new temple
     * This should be called after successful user registration
     */
    async initializeDefaultAccounts(): Promise<AccountingInitResult> {
        try {
            console.log('🏛️ Initializing default accounting accounts...');

            let accountsCreated = 0;
            let accountsSkipped = 0;

            // Create each default account
            for (const account of defaultAccounts) {
                try {
                    await apiClient.post('/api/accounting/accounts', {
                        code: account.code,
                        name: account.name,
                        type: account.type,
                        category: account.category,
                        initial_balance: account.initial_balance,
                        is_active: true
                    });

                    console.log(`✅ Created account: ${account.code} - ${account.name}`);
                    accountsCreated++;

                } catch (error: any) {
                    // If account already exists, skip it
                    if (error.response?.status === 400 && error.response?.data?.error?.includes('already exists')) {
                        console.log(`⏭️ Skipping existing account: ${account.code} - ${account.name}`);
                        accountsSkipped++;
                    } else {
                        console.error(`❌ Failed to create account ${account.code}:`, error.response?.data?.error || error.message);
                        // Continue with other accounts even if one fails
                    }
                }
            }

            console.log(`📊 Accounting initialization completed: ${accountsCreated} created, ${accountsSkipped} skipped`);

            return {
                success: true,
                accountsCreated,
                accountsSkipped
            };

        } catch (error: any) {
            console.error('❌ Failed to initialize accounting accounts:', error);
            return {
                success: false,
                accountsCreated: 0,
                accountsSkipped: 0,
                error: error.message || 'Failed to initialize accounting system'
            };
        }
    },

    /**
     * Check if accounting system is already initialized for the current temple
     */
    async isAccountingInitialized(): Promise<boolean> {
        try {
            const response = await apiClient.get('/api/accounting/accounts');
            const accounts = response.data.data || [];

            // Check if we have the basic required accounts
            const requiredAccounts = ['CASH', 'DONATION_INCOME', 'TEMPLE_FUND'];
            const existingCodes = accounts.map((acc: any) => acc.code);

            return requiredAccounts.every(code => existingCodes.includes(code));
        } catch (error) {
            console.error('Error checking accounting initialization:', error);
            return false;
        }
    },

    /**
     * Get the list of default accounts that would be created
     */
    getDefaultAccountsList() {
        return defaultAccounts.map(account => ({
            code: account.code,
            name: account.name,
            type: account.type,
            category: account.category
        }));
    }
};

export default accountingInitService;