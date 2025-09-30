import { apiClient } from './api';

export interface Account {
  id: number;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  category: string;
  parent_id?: number;
  initial_balance: number;
  current_balance: number;
  is_active: boolean;
  temple_id: number;
  created_at: string;
  updated_at: string;
}

export interface JournalEntryLine {
  id?: number;
  account_id?: number;
  account_code?: string;
  account_name?: string;
  debit_amount: number;
  credit_amount: number;
  description?: string;
}

export interface JournalEntry {
  id?: number;
  date: string;
  reference_number: string;
  description: string;
  total_amount: number;
  created_by?: number;
  temple_id?: number;
  entries: JournalEntryLine[];
  created_at?: string;
  updated_at?: string;
}

export interface TrialBalanceItem {
  account_code: string;
  account_name: string;
  account_type: string;
  debit_balance: number;
  credit_balance: number;
}

export interface BalanceSheetData {
  assets: {
    current_assets: Array<{ name: string; amount: number }>;
    fixed_assets: Array<{ name: string; amount: number }>;
    total_assets: number;
  };
  liabilities: {
    current_liabilities: Array<{ name: string; amount: number }>;
    long_term_liabilities: Array<{ name: string; amount: number }>;
    total_liabilities: number;
  };
  equity: {
    items: Array<{ name: string; amount: number }>;
    total_equity: number;
  };
}

export interface IncomeStatementData {
  income: {
    items: Array<{ name: string; amount: number }>;
    total_income: number;
  };
  expenses: {
    items: Array<{ name: string; amount: number }>;
    total_expenses: number;
  };
  net_income: number;
}

export const accountingService = {
  // Accounts Management
  async getAccounts(): Promise<Account[]> {
    const response = await apiClient.get('/api/accounting/accounts');
    return response.data.data;
  },

  async getAccount(id: number): Promise<Account> {
    const response = await apiClient.get(`/api/accounting/accounts/${id}`);
    return response.data.data;
  },

  async createAccount(account: Omit<Account, 'id' | 'temple_id' | 'created_at' | 'updated_at'>): Promise<Account> {
    const response = await apiClient.post('/api/accounting/accounts', account);
    return response.data.data;
  },

  async updateAccount(id: number, account: Partial<Account>): Promise<Account> {
    const response = await apiClient.put(`/api/accounting/accounts/${id}`, account);
    return response.data.data;
  },

  async deleteAccount(id: number): Promise<void> {
    await apiClient.delete(`/api/accounting/accounts/${id}`);
  },

  async getAccountBalance(id: number, date?: string): Promise<{ balance: number }> {
    const params = date ? { date } : {};
    const response = await apiClient.get(`/api/accounting/accounts/${id}/balance`, { params });
    return response.data;
  },

  // Journal Entries Management
  async getJournalEntries(params?: { page?: number; limit?: number }): Promise<{
    data: JournalEntry[];
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await apiClient.get('/api/accounting/journal-entries', { params });
    return response.data;
  },

  async getJournalEntry(id: number): Promise<JournalEntry> {
    const response = await apiClient.get(`/api/accounting/journal-entries/${id}`);
    return response.data.data;
  },

  async createJournalEntry(entry: Omit<JournalEntry, 'id' | 'temple_id' | 'created_by' | 'created_at' | 'updated_at'>): Promise<JournalEntry> {
    const response = await apiClient.post('/api/accounting/journal-entries', entry);
    return response.data.data;
  },

  async updateJournalEntry(id: number, entry: Partial<JournalEntry>): Promise<JournalEntry> {
    const response = await apiClient.put(`/api/accounting/journal-entries/${id}`, entry);
    return response.data.data;
  },

  async deleteJournalEntry(id: number): Promise<void> {
    await apiClient.delete(`/api/accounting/journal-entries/${id}`);
  },

  // Reports
  async getTrialBalance(date?: string): Promise<TrialBalanceItem[]> {
    const params = date ? { date } : {};
    const response = await apiClient.get('/api/accounting/reports/trial-balance', { params });
    return response.data.data;
  },

  async getBalanceSheet(date?: string): Promise<BalanceSheetData> {
    const params = date ? { date } : {};
    const response = await apiClient.get('/api/accounting/reports/balance-sheet', { params });
    return response.data.data;
  },

  async getIncomeStatement(startDate: string, endDate: string): Promise<IncomeStatementData> {
    const params = { start_date: startDate, end_date: endDate };
    const response = await apiClient.get('/api/accounting/reports/income-statement', { params });
    return response.data.data;
  },

  // Utility functions
  validateJournalEntry(entry: JournalEntry): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!entry.date) errors.push('Date is required');
    if (!entry.reference_number) errors.push('Reference number is required');
    if (!entry.description) errors.push('Description is required');
    if (!entry.entries || entry.entries.length < 2) {
      errors.push('At least 2 journal entry lines are required');
    }

    if (entry.entries) {
      const totalDebits = entry.entries.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
      const totalCredits = entry.entries.reduce((sum, line) => sum + (line.credit_amount || 0), 0);
      
      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        errors.push('Debits must equal credits');
      }

      entry.entries.forEach((line, index) => {
        if (!line.account_id && !line.account_code) {
          errors.push(`Line ${index + 1}: Account is required`);
        }
        if (line.debit_amount <= 0 && line.credit_amount <= 0) {
          errors.push(`Line ${index + 1}: Either debit or credit amount must be greater than 0`);
        }
        if (line.debit_amount > 0 && line.credit_amount > 0) {
          errors.push(`Line ${index + 1}: Cannot have both debit and credit amounts`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  },

  getAccountTypeColor(type: Account['type']): string {
    const colors = {
      ASSET: 'bg-green-100 text-green-800',
      LIABILITY: 'bg-red-100 text-red-800',
      EQUITY: 'bg-blue-100 text-blue-800',
      INCOME: 'bg-purple-100 text-purple-800',
      EXPENSE: 'bg-orange-100 text-orange-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  }
};