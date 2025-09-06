import axios from 'axios';
import { getAuthToken } from '@/lib/auth';

// Using Vite environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

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
  name: string;
  type: 'credit' | 'debit';
  under?: string;
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
    const response = await api.post<LedgerEntry>(`/api/ledger/entries`, entry);
    return response.data;
  },

  async updateEntry(entry: LedgerEntry): Promise<LedgerEntry> {
    const { id, ...updateData } = entry;
    const response = await api.put<LedgerEntry>(`/api/ledger/entries/${id}`, {
      date: updateData.date,
      name: updateData.name,
      type: updateData.type,
      under: updateData.under,
      amount: updateData.amount,
      remarks: updateData.remarks
    });
    return response.data;
  },

  async deleteEntry(id: number): Promise<void> {
    await api.delete(`/api/ledger/entries/${id}`);
  },

  async getEntry(id: number): Promise<LedgerEntry> {
    const response = await api.get<LedgerEntry>(`/api/ledger/entries/${id}`);
    return response.data;
  },

  async getEntries(params?: {
    startDate?: string;
    endDate?: string;
    type?: 'credit' | 'debit';
    under?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<LedgerEntry>> {
    const response = await api.get<PaginatedResponse<LedgerEntry>>(`/api/ledger/entries`, { params });
    return response.data;
  },

  async getCurrentBalance(): Promise<number> {
    const response = await api.get<BalanceResponse>(`/api/ledger/balance`);
    return response.data.balance;
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

  async getCategories(): Promise<string[]> {
    const response = await api.get<any>(`/api/ledger/categories`);
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

  async exportAsCSV(params: Record<string, any>): Promise<Blob> {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`/api/ledger/export?${query}`, {
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
