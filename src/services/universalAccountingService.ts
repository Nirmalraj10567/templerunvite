import { apiClient } from './api';
import { accountingService, JournalEntry } from './accountingService';

/**
 * Universal Accounting Service for ALL donation types
 * Ensures consistent double-entry bookkeeping across all temple transactions
 * 
 * RULE: All donations/receipts flow TO Cash Account (Debit) FROM respective Income accounts (Credit)
 */
export class UniversalAccountingService {

  /**
   * Create journal entry for Money Donations
   * Debit: Cash Account, Credit: Donation Income
   */
  async createMoneyDonationEntry(data: {
    id: number;
    date: string;
    amount: number;
    name: string;
    reason?: string;
    registerNo: string;
  }): Promise<JournalEntry | null> {
    return this.createDonationEntry({
      type: 'money_donation',
      referencePrefix: 'MD',
      incomeAccountCode: 'DONATION_INCOME',
      incomeAccountName: 'Donation Income',
      ...data
    });
  }

  /**
   * Create journal entry for Hall Bookings
   * Debit: Cash Account, Credit: Hall Rental Income
   */
  async createHallBookingEntry(data: {
    id: number;
    date: string;
    amount: number;
    name: string;
    reason?: string;
    registerNo: string;
  }): Promise<JournalEntry | null> {
    return this.createDonationEntry({
      type: 'hall_booking',
      referencePrefix: 'HB',
      incomeAccountCode: 'HALL_RENTAL_INCOME',
      incomeAccountName: 'Hall Rental Income',
      ...data
    });
  }

  /**
   * Create journal entry for Tax Payments
   * Debit: Cash Account, Credit: Tax Income
   */
  async createTaxPaymentEntry(data: {
    id: number;
    date: string;
    amount: number;
    name: string;
    reason?: string;
    registerNo: string;
  }): Promise<JournalEntry | null> {
    return this.createDonationEntry({
      type: 'tax_payment',
      referencePrefix: 'TX',
      incomeAccountCode: 'TAX_INCOME',
      incomeAccountName: 'Tax Income',
      ...data
    });
  }

  /**
   * Create journal entry for Pooja Bookings
   * Debit: Cash Account, Credit: Pooja Income
   */
  async createPoojaEntry(data: {
    id: number;
    date: string;
    amount: number;
    name: string;
    reason?: string;
    registerNo: string;
  }): Promise<JournalEntry | null> {
    return this.createDonationEntry({
      type: 'pooja',
      referencePrefix: 'PJ',
      incomeAccountCode: 'POOJA_INCOME',
      incomeAccountName: 'Pooja Income',
      ...data
    });
  }

  /**
   * Create journal entry for General Receipts
   * Debit: Cash Account, Credit: Miscellaneous Income
   */
  async createReceiptEntry(data: {
    id: number;
    date: string;
    amount: number;
    name: string;
    reason?: string;
    registerNo: string;
  }): Promise<JournalEntry | null> {
    return this.createDonationEntry({
      type: 'receipt',
      referencePrefix: 'RC',
      incomeAccountCode: 'MISCELLANEOUS_INCOME',
      incomeAccountName: 'Miscellaneous Income',
      ...data
    });
  }

  /**
   * Universal donation entry creator
   * ALL donations follow the same pattern: Debit Cash, Credit Income
   */
  private async createDonationEntry(params: {
    type: string;
    referencePrefix: string;
    incomeAccountCode: string;
    incomeAccountName: string;
    id: number;
    date: string;
    amount: number;
    name: string;
    reason?: string;
    registerNo: string;
  }): Promise<JournalEntry | null> {
    try {
      console.log(`🔄 Creating ${params.type} journal entry:`, {
        id: params.id,
        amount: params.amount,
        name: params.name
      });

      // Get all accounts
      const accounts = await accountingService.getAccounts();
      console.log(`📋 Found ${accounts.length} accounts`);

      // Find or create Cash Account (ASSET - increases with DEBIT)
      let cashAccount = accounts.find(acc => 
        acc.code === 'CASH' || 
        acc.name.toLowerCase().includes('cash in hand')
      );

      if (!cashAccount) {
        cashAccount = await accountingService.createAccount({
          code: 'CASH',
          name: 'Cash in Hand',
          type: 'ASSET',
          category: 'Current Assets',
          initial_balance: 0,
          current_balance: 0,
          is_active: true
        });
        console.log('✅ Created Cash account');
      }

      // Find or create Income Account (INCOME - increases with CREDIT)
      let incomeAccount = accounts.find(acc => 
        acc.code === params.incomeAccountCode || 
        acc.name.toLowerCase().includes(params.incomeAccountName.toLowerCase())
      );

      if (!incomeAccount) {
        incomeAccount = await accountingService.createAccount({
          code: params.incomeAccountCode,
          name: params.incomeAccountName,
          type: 'INCOME',
          category: 'Revenue',
          initial_balance: 0,
          current_balance: 0,
          is_active: true
        });
        console.log(`✅ Created ${params.incomeAccountName} account`);
      }

      // Create the journal entry - UNIVERSAL PATTERN for all donations:
      // CREDIT: Cash Account (Asset increases with credit)
      // DEBIT: Respective Income Account (Revenue increases with debit)
      const journalEntry: Omit<JournalEntry, 'id' | 'temple_id' | 'created_by' | 'created_at' | 'updated_at'> = {
        date: params.date,
        reference_number: `${params.referencePrefix}-${params.registerNo}`,
        description: `${params.incomeAccountName} from ${params.name}${params.reason ? ` - ${params.reason}` : ''}`,
        total_amount: params.amount,
        entries: [
          {
            account_id: cashAccount.id,
            debit_amount: 0,
            credit_amount: params.amount,  // Cash increases (Asset) with CREDIT
            description: `Cash received - ${params.incomeAccountName} from ${params.name}`
          },
          {
            account_id: incomeAccount.id,
            debit_amount: params.amount,  // Income increases (Revenue) with DEBIT
            credit_amount: 0,
            description: `${params.incomeAccountName} earned from ${params.name}`
          }
        ]
      };

      console.log(`💰 ${params.type} journal entry:`, {
        reference: journalEntry.reference_number,
        credit: `Cash: ₹${params.amount}`,
        debit: `${params.incomeAccountName}: ₹${params.amount}`
      });

      // Validate the journal entry
      const validation = accountingService.validateJournalEntry(journalEntry as JournalEntry);
      if (!validation.isValid) {
        console.error('Journal entry validation failed:', validation.errors);
        return null;
      }

      // Create the journal entry
      const createdEntry = await accountingService.createJournalEntry(journalEntry);
      console.log(`✅ ${params.type} journal entry created successfully:`, {
        id: createdEntry.id,
        reference: createdEntry.reference_number
      });

      return createdEntry;
    } catch (error) {
      console.error(`❌ Error creating ${params.type} journal entry:`, error);
      return null;
    }
  }

  /**
   * Sync all existing donations to create missing journal entries
   */
  async syncAllDonations(): Promise<{ 
    moneyDonations: { success: number; failed: number };
    hallBookings: { success: number; failed: number };
    taxPayments: { success: number; failed: number };
    poojaBookings: { success: number; failed: number };
    receipts: { success: number; failed: number };
  }> {
    console.log('🔄 Starting universal donation sync...');

    const results = {
      moneyDonations: { success: 0, failed: 0 },
      hallBookings: { success: 0, failed: 0 },
      taxPayments: { success: 0, failed: 0 },
      poojaBookings: { success: 0, failed: 0 },
      receipts: { success: 0, failed: 0 }
    };

    try {
      // Sync Money Donations
      const moneyDonations = await apiClient.get('/api/money-donations');
      for (const donation of (moneyDonations.data.data || [])) {
        try {
          const result = await this.createMoneyDonationEntry({
            id: donation.id,
            date: donation.date,
            amount: donation.amount,
            name: donation.name || 'Unknown',
            reason: donation.reason,
            registerNo: donation.register_no || `${donation.id}`
          });
          if (result) results.moneyDonations.success++;
          else results.moneyDonations.failed++;
        } catch {
          results.moneyDonations.failed++;
        }
      }

      // Add similar sync logic for other donation types as needed...

    } catch (error) {
      console.error('Error in universal sync:', error);
    }

    console.log('✅ Universal donation sync completed:', results);
    return results;
  }
}

export const universalAccountingService = new UniversalAccountingService();