import axios from 'axios';
import { getAuthToken } from '@/lib/auth';

// Using Vite environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://tmsapi.xesstechlink.com';

// Create configured axios instance
const api = axios.create({
  baseURL: API_BASE_URL
});

// Add auth token to requests
api.interceptors.request.use(config => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Handle token expiration
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface LedgerEntry {
  id?: number;
  date: string;
  // Optional legacy fields
  name?: string;
  type?: 'credit' | 'debit';
  under?: string;
  // Required for journal API
  from_account: string;
  to_account?: string;
  amount: number;
  remarks?: string;
  temple_id?: number;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProfitAndLossItem {
  period: string; // YYYY-MM for monthly, YYYY-MM-DD for daily
  total_income: number;
  total_expenses: number;
  net_profit_loss: number;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface BalanceResponse {
  balance: number;
}

type CategoryApiItem = string | { id?: number; value?: string; label?: string };
interface CategoriesResponse {
  data: CategoryApiItem[];
}

export interface ProfitAndLoss {
  period: string;
}

export const ledgerService = {
  async createEntry(entry: Omit<LedgerEntry, 'id' | 'created_at' | 'updated_at'>): Promise<LedgerEntry> {
    // Backend journal API expects from_account/to_account/amount/date and optional remarks/entry_type
    const payload: any = {
      date: entry.date,
      from_account: entry.from_account,
      amount: entry.amount,
      remarks: entry.remarks,
      // Map UI type to backend-supported entry_type (MySQL ENUM)
      // credit -> receipt, debit -> payment, undefined -> transfer (handled by backend default)
      ...(entry.type
        ? { entry_type: entry.type === 'credit' ? 'receipt' : 'payment' }
        : {}),
    };
    if (entry.to_account) payload.to_account = entry.to_account;
    const response = await api.post<any>(`/api/journal/entries`, payload);
    return (response.data?.data || response.data) as LedgerEntry;
  },

  async updateEntry(entry: LedgerEntry): Promise<LedgerEntry> {
    const { id, ...updateData } = entry;
    const response = await api.put<any>(`/api/journal/entries/${id}`, updateData as any);
    return (response.data?.data || response.data) as LedgerEntry;
  },

  async deleteEntry(id: number): Promise<void> {
    await api.delete(`/api/journal/entries/${id}`);
  },

  async getEntry(id: number): Promise<LedgerEntry> {
    const response = await api.get<any>(`/api/journal/entries/${id}`);
    return (response.data?.data || response.data) as LedgerEntry;
  },

  async getEntries(params?: {
    startDate?: string;
    endDate?: string;
    type?: 'credit' | 'debit';
    under?: string;
    name?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<LedgerEntry>> {
    // Use ledger entries so 'under' (category) is available for UI display
    const response = await api.get<any>(`/api/ledger/entries`, { params });
    const raw = response.data?.data ?? response.data?.rows ?? [];
    // Adapt backend journal rows to UI LedgerEntry shape
    const adapted: LedgerEntry[] = (raw as any[]).map((r) => {
      const entryType: string = String(r.entry_type || r.type || '').toLowerCase();
      let type: 'credit' | 'debit' = 'credit';
      if (entryType === 'expense' || entryType === 'debit') type = 'debit';
      else if (entryType === 'income' || entryType === 'credit') type = 'credit';
      else {
        // Transfer heuristic: treat as credit if to_account is CASH A/C else debit
        type = (String(r.to_account || '').toUpperCase() === 'CASH A/C') ? 'credit' : 'debit';
      }
      return {
        id: r.id,
        date: r.date,
        name: r.name || r.from_account || '',
        under: r.under || '',
        type,
        amount: Number(r.amount ?? 0) || 0,
        // Optional passthroughs (not displayed in list but kept for edit dialog compatibility)
        remarks: r.remarks,
        temple_id: r.temple_id,
        created_by: r.created_by,
        created_at: r.created_at,
      } as LedgerEntry;
    });
    const pagination = response.data?.pagination ?? { total: adapted.length, page: params?.page || 1, limit: params?.limit || 20, totalPages: 1 };
    return { data: adapted, pagination } as PaginatedResponse<LedgerEntry>;
  },

  async getCurrentBalance(): Promise<number> {
    // Use compatibility endpoint which supports defaulting to CASH A/C when no account is provided
    const response = await api.get<any>(`/api/ledger/balance`);
    const body = response.data;
    return (body?.balance ?? body?.data?.balance ?? 0) as number;
  },

  async getProfitAndLoss(params?: { 
    year?: string; 
    startDate?: string; 
    endDate?: string; 
    type?: 'credit' | 'debit'; 
    under?: string; 
    groupBy?: 'month' | 'day';
  }): Promise<ProfitAndLossItem[]> {
    const response = await api.get<ProfitAndLossItem[]>(
      `/api/ledger/profit-and-loss`,
      { params }
    );
    return response.data;
  },

  async getCategories(templeId?: number): Promise<string[]> {
    const url = templeId 
      ? `/api/ledger/categories?templeId=${templeId}`
      : `/api/ledger/categories`;
    const response = await api.get<any>(url);
    const raw = response?.data;
    const list: CategoryApiItem[] = Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw)
      ? raw
      : [];
    // Normalize to string[] using label -> value fallback
    const normalized = (list as CategoryApiItem[])
      .map((it) => (typeof it === 'string' ? it : (it.label || it.value || '')))
      .filter((s): s is string => !!s && typeof s === 'string');
    return normalized;
  },

  async getNames(): Promise<string[]> {
    const response = await api.get<any>(`/api/journal/accounts`);
    const list: any[] = Array.isArray(response.data?.data) ? response.data.data : [];
    return list
      .map((it) => (typeof it === 'string' ? it : it?.name))
      .filter((s: any): s is string => !!s && typeof s === 'string');
  },

  async exportAsCSV(params: Record<string, any>): Promise<Blob> {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`https://tmsapi.xesstechlink.com/api/ledger/export?${query}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to export data');
    }
    
    return await response.blob();
  }
};
