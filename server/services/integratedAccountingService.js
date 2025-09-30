const db = require('../db');

/**
 * Integrated Accounting Service for Backend
 * Handles automatic journal entry creation for existing forms
 */

class IntegratedAccountingService {
  
  /**
   * Create journal entry for money donation
   */
  async createDonationJournalEntry(donationData, templeId, userId) {
    try {
      const { date, amount, name, register_no, reason } = donationData;
      
      // Get or create accounts
      const cashAccount = await this.getOrCreateAccount('CASH', 'Cash in Hand', 'ASSET', 'Current Assets', templeId);
      const donationIncomeAccount = await this.getOrCreateAccount('DONATION_INCOME', 'Donation Income', 'INCOME', 'Operating Income', templeId);

      const referenceNumber = `DON-${register_no || Date.now()}`;
      const description = `Donation from ${name}${reason ? ` - ${reason}` : ''}`;

      return await this.createJournalEntry({
        date,
        reference_number: referenceNumber,
        description,
        total_amount: amount,
        created_by: userId,
        temple_id: templeId,
        entries: [
          {
            account_id: cashAccount.id,
            debit_amount: amount,
            credit_amount: 0,
            description: 'Cash received from donation'
          },
          {
            account_id: donationIncomeAccount.id,
            debit_amount: 0,
            credit_amount: amount,
            description: 'Donation income'
          }
        ]
      });
    } catch (error) {
      console.error('Error creating donation journal entry:', error);
      throw error;
    }
  }

  /**
   * Create journal entry for pooja booking
   */
  async createPoojaJournalEntry(poojaData, templeId, userId) {
    try {
      const { from_date, amount, name, receipt_number, remarks } = poojaData;
      
      const cashAccount = await this.getOrCreateAccount('CASH', 'Cash in Hand', 'ASSET', 'Current Assets', templeId);
      const poojaIncomeAccount = await this.getOrCreateAccount('POOJA_INCOME', 'Pooja Income', 'INCOME', 'Operating Income', templeId);

      const referenceNumber = `POOJA-${receipt_number || Date.now()}`;
      const description = `Pooja by ${name}${remarks ? ` - ${remarks}` : ''}`;

      return await this.createJournalEntry({
        date: from_date,
        reference_number: referenceNumber,
        description,
        total_amount: amount,
        created_by: userId,
        temple_id: templeId,
        entries: [
          {
            account_id: cashAccount.id,
            debit_amount: amount,
            credit_amount: 0,
            description: 'Cash received from pooja'
          },
          {
            account_id: poojaIncomeAccount.id,
            debit_amount: 0,
            credit_amount: amount,
            description: 'Pooja service income'
          }
        ]
      });
    } catch (error) {
      console.error('Error creating pooja journal entry:', error);
      throw error;
    }
  }

  /**
   * Create journal entry for hall booking
   */
  async createHallBookingJournalEntry(hallData, templeId, userId) {
    try {
      const { date, name, advanceAmount, totalAmount, balanceAmount, registerNo, remarks } = hallData;
      
      const cashAccount = await this.getOrCreateAccount('CASH', 'Cash in Hand', 'ASSET', 'Current Assets', templeId);
      const hallIncomeAccount = await this.getOrCreateAccount('HALL_RENTAL_INCOME', 'Hall Rental Income', 'INCOME', 'Operating Income', templeId);
      const receivableAccount = await this.getOrCreateAccount('ACCOUNTS_RECEIVABLE', 'Accounts Receivable', 'ASSET', 'Current Assets', templeId);

      const entries = [];
      const referenceNumber = `HALL-${registerNo || Date.now()}`;
      const description = `Hall booking by ${name}${remarks ? ` - ${remarks}` : ''}`;

      // Record advance payment if any
      if (advanceAmount && parseFloat(advanceAmount) > 0) {
        entries.push({
          account_id: cashAccount.id,
          debit_amount: parseFloat(advanceAmount),
          credit_amount: 0,
          description: 'Advance payment received'
        });
      }

      // Record balance as receivable if any
      if (balanceAmount && parseFloat(balanceAmount) > 0) {
        entries.push({
          account_id: receivableAccount.id,
          debit_amount: parseFloat(balanceAmount),
          credit_amount: 0,
          description: 'Balance amount receivable'
        });
      }

      // Credit total income
      const totalIncome = parseFloat(totalAmount) || parseFloat(advanceAmount) || 0;
      if (totalIncome > 0) {
        entries.push({
          account_id: hallIncomeAccount.id,
          debit_amount: 0,
          credit_amount: totalIncome,
          description: 'Hall rental income'
        });
      }

      if (entries.length === 0) {
        throw new Error('No valid amounts to record');
      }

      return await this.createJournalEntry({
        date,
        reference_number: referenceNumber,
        description,
        total_amount: totalIncome,
        created_by: userId,
        temple_id: templeId,
        entries
      });
    } catch (error) {
      console.error('Error creating hall booking journal entry:', error);
      throw error;
    }
  }

  /**
   * Create journal entry for tax collection
   */
  async createTaxJournalEntry(taxData, templeId, userId) {
    try {
      const { date, name, amount_paid, reference_number, year } = taxData;
      
      const cashAccount = await this.getOrCreateAccount('CASH', 'Cash in Hand', 'ASSET', 'Current Assets', templeId);
      const taxIncomeAccount = await this.getOrCreateAccount('TAX_INCOME', 'Tax Income', 'INCOME', 'Operating Income', templeId);

      const refNumber = `TAX-${reference_number || Date.now()}`;
      const description = `Tax payment by ${name}${year ? ` - ${year}` : ''}`;

      return await this.createJournalEntry({
        date,
        reference_number: refNumber,
        description,
        total_amount: amount_paid,
        created_by: userId,
        temple_id: templeId,
        entries: [
          {
            account_id: cashAccount.id,
            debit_amount: amount_paid,
            credit_amount: 0,
            description: 'Tax payment received'
          },
          {
            account_id: taxIncomeAccount.id,
            debit_amount: 0,
            credit_amount: amount_paid,
            description: 'Tax collection income'
          }
        ]
      });
    } catch (error) {
      console.error('Error creating tax journal entry:', error);
      throw error;
    }
  }

  /**
   * Create journal entry for receipt (income/expense)
   */
  async createReceiptJournalEntry(receiptData, templeId, userId) {
    try {
      const { date, type, amount, donor, receiver, remarks, receipt_number } = receiptData;
      
      const cashAccount = await this.getOrCreateAccount('CASH', 'Cash in Hand', 'ASSET', 'Current Assets', templeId);
      
      let entries = [];
      let description = '';
      
      if (type === 'income') {
        const incomeAccount = await this.getOrCreateAccount('MISCELLANEOUS_INCOME', 'Miscellaneous Income', 'INCOME', 'Other Income', templeId);
        description = `Income receipt${donor ? ` from ${donor}` : ''}${remarks ? ` - ${remarks}` : ''}`;
        
        entries = [
          {
            account_id: cashAccount.id,
            debit_amount: amount,
            credit_amount: 0,
            description: 'Cash received'
          },
          {
            account_id: incomeAccount.id,
            debit_amount: 0,
            credit_amount: amount,
            description: 'Miscellaneous income'
          }
        ];
      } else {
        const expenseAccount = await this.getOrCreateAccount('MISCELLANEOUS_EXPENSE', 'Miscellaneous Expenses', 'EXPENSE', 'Other Expenses', templeId);
        description = `Expense receipt${receiver ? ` to ${receiver}` : ''}${remarks ? ` - ${remarks}` : ''}`;
        
        entries = [
          {
            account_id: expenseAccount.id,
            debit_amount: amount,
            credit_amount: 0,
            description: 'Miscellaneous expense'
          },
          {
            account_id: cashAccount.id,
            debit_amount: 0,
            credit_amount: amount,
            description: 'Cash paid'
          }
        ];
      }

      const referenceNumber = `RCP-${receipt_number || Date.now()}`;

      return await this.createJournalEntry({
        date,
        reference_number: referenceNumber,
        description,
        total_amount: amount,
        created_by: userId,
        temple_id: templeId,
        entries
      });
    } catch (error) {
      console.error('Error creating receipt journal entry:', error);
      throw error;
    }
  }

  /**
   * Create journal entry for ledger entry
   */
  async createLedgerJournalEntry(ledgerData, templeId, userId) {
    try {
      const { date, name, type, amount, under, note } = ledgerData;
      
      const cashAccount = await this.getOrCreateAccount('CASH', 'Cash in Hand', 'ASSET', 'Current Assets', templeId);
      
      let entries = [];
      let description = `${type === 'credit' ? 'Payment from' : 'Payment to'} ${name}${note ? ` - ${note}` : ''}`;
      
      if (type === 'credit') {
        // Money coming in
        const incomeAccount = await this.getOrCreateAccount(
          under || 'MISCELLANEOUS_INCOME', 
          under || 'Miscellaneous Income', 
          'INCOME', 
          'Operating Income', 
          templeId
        );
        
        entries = [
          {
            account_id: cashAccount.id,
            debit_amount: amount,
            credit_amount: 0,
            description: `Cash received from ${name}`
          },
          {
            account_id: incomeAccount.id,
            debit_amount: 0,
            credit_amount: amount,
            description: `Income from ${name}`
          }
        ];
      } else {
        // Money going out
        const expenseAccount = await this.getOrCreateAccount(
          under || 'MISCELLANEOUS_EXPENSE', 
          under || 'Miscellaneous Expenses', 
          'EXPENSE', 
          'Operating Expenses', 
          templeId
        );
        
        entries = [
          {
            account_id: expenseAccount.id,
            debit_amount: amount,
            credit_amount: 0,
            description: `Payment to ${name}`
          },
          {
            account_id: cashAccount.id,
            debit_amount: 0,
            credit_amount: amount,
            description: `Cash paid to ${name}`
          }
        ];
      }

      const referenceNumber = `LED-${Date.now()}`;

      return await this.createJournalEntry({
        date,
        reference_number: referenceNumber,
        description,
        total_amount: amount,
        created_by: userId,
        temple_id: templeId,
        entries
      });
    } catch (error) {
      console.error('Error creating ledger journal entry:', error);
      throw error;
    }
  }

  /**
   * Get or create account by code
   */
  async getOrCreateAccount(code, name, type, category, templeId) {
    try {
      // Try to find existing account
      let account = await db('accounts')
        .where({ code, temple_id: templeId })
        .first();

      if (!account) {
        // Create new account
        const [accountId] = await db('accounts').insert({
          code,
          name,
          type,
          category,
          initial_balance: 0,
          current_balance: 0,
          is_active: true,
          temple_id: templeId
        });

        account = await db('accounts').where({ id: accountId }).first();
      }

      return account;
    } catch (error) {
      console.error('Error getting or creating account:', error);
      throw error;
    }
  }

  /**
   * Create journal entry with validation
   */
  async createJournalEntry(entryData) {
    const trx = await db.transaction();
    
    try {
      const { date, reference_number, description, total_amount, created_by, temple_id, entries } = entryData;

      // Validate balance
      const totalDebits = entries.reduce((sum, entry) => sum + (parseFloat(entry.debit_amount) || 0), 0);
      const totalCredits = entries.reduce((sum, entry) => sum + (parseFloat(entry.credit_amount) || 0), 0);
      
      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error(`Journal entry is not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}`);
      }

      // Create journal entry header
      const [journalEntryId] = await trx('journal_entries').insert({
        date,
        reference_number,
        description,
        total_amount,
        created_by,
        temple_id
      });

      // Create journal entry lines
      for (const entry of entries) {
        await trx('journal_entry_lines').insert({
          journal_entry_id: journalEntryId,
          account_id: entry.account_id,
          debit_amount: parseFloat(entry.debit_amount) || 0,
          credit_amount: parseFloat(entry.credit_amount) || 0,
          description: entry.description
        });
      }

      await trx.commit();

      // Return created entry
      const createdEntry = await db('journal_entries').where({ id: journalEntryId }).first();
      createdEntry.entries = await db('journal_entry_lines as jel')
        .join('accounts as a', 'jel.account_id', 'a.id')
        .where('jel.journal_entry_id', journalEntryId)
        .select('jel.*', 'a.code as account_code', 'a.name as account_name');

      return createdEntry;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Set initial balance for account
   */
  async setInitialBalance(accountId, balance, date, templeId, userId) {
    try {
      if (Math.abs(balance) < 0.01) {
        return null; // No need to create entry for zero balance
      }

      const account = await db('accounts').where({ id: accountId, temple_id: templeId }).first();
      if (!account) {
        throw new Error('Account not found');
      }

      // Get or create opening balance equity account
      const openingBalanceAccount = await this.getOrCreateAccount(
        'OPENING_BALANCE_EQUITY', 
        'Opening Balance Equity', 
        'EQUITY', 
        'Owner Equity', 
        templeId
      );

      const referenceNumber = `IB-${account.code}-${Date.now()}`;
      const description = `Initial balance for ${account.name}`;

      // Determine debit/credit based on account type and balance
      const isDebitBalance = ['ASSET', 'EXPENSE'].includes(account.type);
      const isPositiveBalance = balance > 0;

      let entries = [];

      if (isDebitBalance) {
        if (isPositiveBalance) {
          // Asset/Expense with positive balance: Debit Account, Credit Opening Balance Equity
          entries = [
            {
              account_id: accountId,
              debit_amount: Math.abs(balance),
              credit_amount: 0,
              description: 'Initial balance'
            },
            {
              account_id: openingBalanceAccount.id,
              debit_amount: 0,
              credit_amount: Math.abs(balance),
              description: 'Opening balance equity'
            }
          ];
        } else {
          // Asset/Expense with negative balance: Credit Account, Debit Opening Balance Equity
          entries = [
            {
              account_id: accountId,
              debit_amount: 0,
              credit_amount: Math.abs(balance),
              description: 'Initial balance'
            },
            {
              account_id: openingBalanceAccount.id,
              debit_amount: Math.abs(balance),
              credit_amount: 0,
              description: 'Opening balance equity'
            }
          ];
        }
      } else {
        // LIABILITY, EQUITY, INCOME
        if (isPositiveBalance) {
          // Liability/Equity/Income with positive balance: Debit Opening Balance Equity, Credit Account
          entries = [
            {
              account_id: openingBalanceAccount.id,
              debit_amount: Math.abs(balance),
              credit_amount: 0,
              description: 'Opening balance equity'
            },
            {
              account_id: accountId,
              debit_amount: 0,
              credit_amount: Math.abs(balance),
              description: 'Initial balance'
            }
          ];
        } else {
          // Liability/Equity/Income with negative balance: Credit Opening Balance Equity, Debit Account
          entries = [
            {
              account_id: openingBalanceAccount.id,
              debit_amount: 0,
              credit_amount: Math.abs(balance),
              description: 'Opening balance equity'
            },
            {
              account_id: accountId,
              debit_amount: Math.abs(balance),
              credit_amount: 0,
              description: 'Initial balance'
            }
          ];
        }
      }

      return await this.createJournalEntry({
        date,
        reference_number: referenceNumber,
        description,
        total_amount: Math.abs(balance),
        created_by: userId,
        temple_id: templeId,
        entries
      });
    } catch (error) {
      console.error('Error setting initial balance:', error);
      throw error;
    }
  }

  /**
   * Get account balance as of date
   */
  async getAccountBalance(accountId, date, templeId) {
    try {
      const account = await db('accounts').where({ id: accountId, temple_id: templeId }).first();
      if (!account) {
        return 0;
      }

      if (!date) {
        return parseFloat(account.current_balance) || 0;
      }

      // Calculate balance as of specific date
      const entries = await db('journal_entry_lines as jel')
        .join('journal_entries as je', 'jel.journal_entry_id', 'je.id')
        .where('jel.account_id', accountId)
        .where('je.temple_id', templeId)
        .where('je.date', '<=', date)
        .select('jel.debit_amount', 'jel.credit_amount');

      const balance = parseFloat(account.initial_balance) + entries.reduce((sum, entry) => {
        return sum + (parseFloat(entry.credit_amount) || 0) - (parseFloat(entry.debit_amount) || 0);
      }, 0);

      return balance;
    } catch (error) {
      console.error('Error getting account balance:', error);
      return 0;
    }
  }

  /**
   * Validate if expense can be made (sufficient balance)
   */
  async validateExpenseTransaction(fromAccountCode, amount, templeId, date) {
    try {
      const account = await db('accounts')
        .where({ code: fromAccountCode, temple_id: templeId })
        .first();

      if (!account) {
        return { valid: false, error: 'Account not found' };
      }

      const balance = await this.getAccountBalance(account.id, date, templeId);
      
      if (balance < amount) {
        return { 
          valid: false, 
          error: `Insufficient balance. Available: ${balance}, Required: ${amount}` 
        };
      }

      return { valid: true, availableBalance: balance };
    } catch (error) {
      console.error('Error validating expense transaction:', error);
      return { valid: false, error: 'Validation failed' };
    }
  }

  /**
   * Generate reference number
   */
  generateReferenceNumber(prefix = 'TXN') {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const time = String(now.getTime()).slice(-6);
    return `${prefix}${year}${month}${day}${time}`;
  }
}

module.exports = new IntegratedAccountingService();