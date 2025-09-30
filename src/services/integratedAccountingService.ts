import { apiClient } from './api';
import { accountingService, JournalEntry } from './accountingService';

/**
 * Service to integrate money donations with the accounting system
 * Creates proper double-entry journal entries for money donations
 */
export class IntegratedAccountingService {
  
  /**
   * Create a journal entry for a money donation
   * Debit: Cash/Bank Account, Credit: Donation Income Account
   */
  async createMoneyDonationJournalEntry(donationData: {
    id: number;
    date: string;
    amount: number;
    name: string;
    reason?: string;
    registerNo: string;
  }): Promise<JournalEntry | null> {
    try {
      console.log('🔄 Creating journal entry for money donation:', donationData);
      
      // Get the required accounts
      console.log('📋 Fetching accounts...');
      const accounts = await accountingService.getAccounts();
      console.log(`✅ Found ${accounts.length} accounts`);
      
      // Find Cash account (or create if not exists)
      let cashAccount = accounts.find(acc => 
        acc.code === 'CASH' || 
        acc.name.toLowerCase().includes('cash') ||
        acc.code === '1001'
      );
      console.log('💰 Cash account:', cashAccount ? `Found: ${cashAccount.name} (${cashAccount.code})` : 'Not found');
      
      // Find Donation Income account (or create if not exists)
      let donationIncomeAccount = accounts.find(acc => 
        acc.code === 'DONATION_INCOME' || 
        acc.name.toLowerCase().includes('donation') ||
        acc.code === '4001'
      );
      console.log('🎁 Donation account:', donationIncomeAccount ? `Found: ${donationIncomeAccount.name} (${donationIncomeAccount.code})` : 'Not found');

      // Create accounts if they don't exist
      if (!cashAccount) {
        cashAccount = await accountingService.createAccount({
          code: 'CASH',
          name: 'Cash Account',
          type: 'ASSET',
          category: 'Current Assets',
          initial_balance: 0,
          current_balance: 0,
          is_active: true
        });
      }

      if (!donationIncomeAccount) {
        donationIncomeAccount = await accountingService.createAccount({
          code: 'DONATION_INCOME',
          name: 'Donation Income',
          type: 'INCOME',
          category: 'Revenue',
          initial_balance: 0,
          current_balance: 0,
          is_active: true
        });
      }

      // Create the journal entry - CUSTOM CONVENTION:
      // CREDIT: Cash in Hand (money received)
      // DEBIT: Donation Income (revenue earned)
      const journalEntry: Omit<JournalEntry, 'id' | 'temple_id' | 'created_by' | 'created_at' | 'updated_at'> = {
        date: donationData.date,
        reference_number: `MD-${donationData.registerNo}`,
        description: `Money donation from ${donationData.name}${donationData.reason ? ` - ${donationData.reason}` : ''}`,
        total_amount: donationData.amount,
        entries: [
          {
            account_id: cashAccount.id,
            debit_amount: 0,
            credit_amount: donationData.amount,
            description: `Money donation received from ${donationData.name}`
          },
          {
            account_id: donationIncomeAccount.id,
            debit_amount: donationData.amount,
            credit_amount: 0,
            description: `Donation income from ${donationData.name}`
          }
        ]
      };
      
      console.log('📝 Journal entry to create:', {
        reference: journalEntry.reference_number,
        amount: journalEntry.total_amount,
        entries: journalEntry.entries.length
      });

      // Validate the journal entry
      const validation = accountingService.validateJournalEntry(journalEntry as JournalEntry);
      if (!validation.isValid) {
        console.error('Journal entry validation failed:', validation.errors);
        return null;
      }

      // Create the journal entry
      console.log('🚀 Calling accounting service to create journal entry...');
      const createdEntry = await accountingService.createJournalEntry(journalEntry);
      console.log('✅ Journal entry created successfully:', {
        id: createdEntry.id,
        reference: createdEntry.reference_number,
        amount: createdEntry.total_amount
      });
      
      return createdEntry;
    } catch (error) {
      console.error('❌ Error creating money donation journal entry:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      return null;
    }
  }

  /**
   * Update a journal entry for a money donation
   */
  async updateMoneyDonationJournalEntry(donationData: {
    id: number;
    date: string;
    amount: number;
    name: string;
    reason?: string;
    registerNo: string;
  }): Promise<JournalEntry | null> {
    try {
      // Find existing journal entry by reference number
      const journalEntries = await accountingService.getJournalEntries();
      const existingEntry = journalEntries.data.find(entry => 
        entry.reference_number === `MD-${donationData.registerNo}`
      );

      if (!existingEntry) {
        // If no existing entry, create a new one
        return await this.createMoneyDonationJournalEntry(donationData);
      }

      // Get the required accounts
      const accounts = await accountingService.getAccounts();
      
      const cashAccount = accounts.find(acc => 
        acc.code === 'CASH' || 
        acc.name.toLowerCase().includes('cash') ||
        acc.code === '1001'
      );
      
      const donationIncomeAccount = accounts.find(acc => 
        acc.code === 'DONATION_INCOME' || 
        acc.name.toLowerCase().includes('donation') ||
        acc.code === '4001'
      );

      if (!cashAccount || !donationIncomeAccount) {
        console.error('Required accounts not found for money donation update');
        return null;
      }

      // Update the journal entry
      const updatedEntry = await accountingService.updateJournalEntry(existingEntry.id!, {
        date: donationData.date,
        description: `Money donation from ${donationData.name}${donationData.reason ? ` - ${donationData.reason}` : ''}`,
        total_amount: donationData.amount,
        entries: [
          {
            account_id: cashAccount.id,
            debit_amount: donationData.amount,
            credit_amount: 0,
            description: `Money donation received from ${donationData.name}`
          },
          {
            account_id: donationIncomeAccount.id,
            debit_amount: 0,
            credit_amount: donationData.amount,
            description: `Donation income from ${donationData.name}`
          }
        ]
      });

      console.log('Updated journal entry for money donation:', updatedEntry);
      return updatedEntry;
    } catch (error) {
      console.error('Error updating money donation journal entry:', error);
      return null;
    }
  }

  /**
   * Delete a journal entry for a money donation
   */
  async deleteMoneyDonationJournalEntry(registerNo: string): Promise<boolean> {
    try {
      // Find existing journal entry by reference number
      const journalEntries = await accountingService.getJournalEntries();
      const existingEntry = journalEntries.data.find(entry => 
        entry.reference_number === `MD-${registerNo}`
      );

      if (!existingEntry) {
        console.log('No journal entry found for money donation:', registerNo);
        return true; // Consider it successful if no entry exists
      }

      await accountingService.deleteJournalEntry(existingEntry.id!);
      console.log('Deleted journal entry for money donation:', registerNo);
      return true;
    } catch (error) {
      console.error('Error deleting money donation journal entry:', error);
      return false;
    }
  }

  /**
   * Sync existing money donations to create missing journal entries
   */
  async syncExistingMoneyDonations(): Promise<{ success: number; failed: number }> {
    try {
      // Get all money donations
      const response = await apiClient.get('/api/money-donations');
      const donations = response.data.data || [];

      let success = 0;
      let failed = 0;

      for (const donation of donations) {
        try {
          // Check if journal entry already exists
          const journalEntries = await accountingService.getJournalEntries();
          const existingEntry = journalEntries.data.find(entry => 
            entry.reference_number === `MD-${donation.register_no}`
          );

          if (!existingEntry) {
            // Create journal entry for this donation
            const result = await this.createMoneyDonationJournalEntry({
              id: donation.id,
              date: donation.date,
              amount: donation.amount,
              name: donation.name || 'Unknown',
              reason: donation.reason,
              registerNo: donation.register_no || `${donation.id}`
            });

            if (result) {
              success++;
            } else {
              failed++;
            }
          }
        } catch (error) {
          console.error(`Error syncing donation ${donation.id}:`, error);
          failed++;
        }
      }

      console.log(`Money donation sync completed: ${success} success, ${failed} failed`);
      return { success, failed };
    } catch (error) {
      console.error('Error syncing money donations:', error);
      return { success: 0, failed: 0 };
    }
  }
}

export const integratedAccountingService = new IntegratedAccountingService();