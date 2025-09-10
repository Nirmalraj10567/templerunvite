import axios from 'axios';
import { getAuthToken } from '@/lib/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface JournalEntryPayload {
  date: string; // YYYY-MM-DD
  from_account: string;
  to_account: string;
  amount: number;
  entry_type?: 'transfer' | 'income' | 'expense';
  remarks?: string;
  reference_type?: string;
  reference_id?: number;
}

type ApiOk<T> = { success?: boolean; data?: T } | T | any;

export const journalService = {
  async createEntry(payload: JournalEntryPayload): Promise<any> {
    const resp = await api.post<ApiOk<any>>('/api/journal/entries', payload);
    return resp.data;
  },

  async getBalance(account: string): Promise<number> {
    const resp = await api.get<ApiOk<{ account: string; balance: number }>>('/api/journal/balance', { params: { account } });
    const body: any = resp.data as any;
    const bal = typeof body?.balance === 'number' ? body.balance : Number(body?.data?.balance ?? 0);
    return Number.isFinite(bal) ? bal : 0;
  },

  async getAccounts(): Promise<string[]> {
    // Prefer journal accounts; fallback handled by backend
    const resp = await api.get<ApiOk<Array<{ name: string } | string>>>('/api/journal/accounts');
    const payload: any = resp.data as any;
    const list: any[] = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
    const names = list.map((x: any) => (typeof x === 'string' ? x : x?.name)).filter((s: any) => !!s);
    // Also merge with /api/ledger/names for compatibility
    try {
      const extraResp = await api.get<ApiOk<string[] | Array<{ name: string }>>>('/api/ledger/names');
      const extra: any = extraResp.data as any;
      const more = (Array.isArray(extra?.data) ? extra.data : Array.isArray(extra) ? extra : [])
        .map((x: any) => (typeof x === 'string' ? x : x?.name))
        .filter((s: any) => !!s);
      const set = new Set<string>([...names, ...more]);
      return Array.from(set).sort();
    } catch {
      return names;
    }
  },
};
