import axios from 'axios';
import { getAuthToken } from '@/lib/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://templeapi.agniplay.com';

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use(config => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface DaybookEntry {
  id: number;
  temple_id: number;
  entry_date: string;
  entry_type: 'income' | 'expense' | 'journal';
  description: string;
  reference_type?: string | null;
  reference_id?: number | null;
  receipt_number: string;
  amount: number;
  payment_mode: 'cash' | 'card' | 'upi' | 'cheque' | 'bank_transfer' | 'in_kind';
  party_name?: string | null;
  party_mobile?: string | null;
  notes?: string | null;
  running_balance: number;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
}

export interface DaybookLog {
  id: number;
  daybook_entry_id: number;
  action: 'created' | 'updated' | 'deleted';
  created_at: string;
  created_by?: number | null;
  entry_description?: string | null;
  receipt_number?: string | null;
  details?: any;
}

export interface DaybookStats {
  total_income: number;
  total_expense: number;
  total_entries: number;
  income_count: number;
  expense_count: number;
  journal_count: number;
  opening_balance: number;
  period_net: number;
  current_balance: number;
  closing_balance: number;
  period: {
    from?: string;
    to?: string;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DaybookFormData {
  entry_date: string;
  entry_type: 'income' | 'expense' | 'journal';
  description: string;
  amount: string;
  payment_mode: 'cash' | 'card' | 'upi' | 'cheque' | 'bank_transfer' | 'in_kind';
  party_name?: string;
  party_mobile?: string;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
}

export const daybookService = {
  async getEntries(params?: {
    q?: string;
    from?: string;
    to?: string;
    type?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<DaybookEntry>> {
    const response = await api.get('/api/daybook', { params });
    // API returns { success, data, total, page, pageSize }
    return response.data as PaginatedResponse<DaybookEntry>;
  },

  async getEntry(id: number): Promise<{ success: boolean; data: DaybookEntry }> {
    const response = await api.get(`/api/daybook/${id}`);
    return response.data as { success: boolean; data: DaybookEntry };
  },

  async createEntry(data: DaybookFormData): Promise<{ success: boolean; data: DaybookEntry }> {
    const response = await api.post('/api/daybook', data);
    return response.data as { success: boolean; data: DaybookEntry };
  },

  async updateEntry(
    id: number,
    data: Partial<DaybookFormData>
  ): Promise<{ success: boolean; data: DaybookEntry }> {
    const response = await api.put(`/api/daybook/${id}`, data);
    return response.data as { success: boolean; data: DaybookEntry };
  },

  async deleteEntry(id: number): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/api/daybook/${id}`);
    return response.data as { success: boolean; message: string };
  },

  async getNextReceiptNumber(): Promise<{ success: boolean; receipt_number: string }> {
    const response = await api.get('/api/daybook/next-receipt');
    return response.data as { success: boolean; receipt_number: string };
  },

  async getLogs(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<DaybookLog>> {
    const response = await api.get('/api/daybook/logs', { params });
    return response.data as PaginatedResponse<DaybookLog>;
  },

  async getEntryLogs(id: number): Promise<PaginatedResponse<DaybookLog>> {
    const response = await api.get(`/api/daybook/${id}/logs`);
    return response.data as PaginatedResponse<DaybookLog>;
  },

  async getStats(params?: {
    from?: string;
    to?: string;
  }): Promise<{ success: boolean; data: DaybookStats }> {
    const response = await api.get('/api/daybook/stats/summary', { params });
    return response.data as { success: boolean; data: DaybookStats };
  },

  async exportCSV(params?: {
    from?: string;
    to?: string;
    type?: string;
  }): Promise<void> {
    const response = await api.get('/api/daybook/export', {
      params,
      responseType: 'blob',
    });
    
    // Create a download link
    const url = window.URL.createObjectURL(new Blob([response.data as any]));
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `daybook_export_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
