export interface AccountItem {
  id: number;
  accountName: string;
  accountType: 'cash' | 'bank' | 'upi';
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  upiId?: string | null;
  openingBalance?: number;
  ledgerId: number;
  ledgerName: string;
}

export interface CreateAccountPayload {
  accountName: string;
  accountType: 'cash' | 'bank' | 'upi';
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  openingBalance?: number;
}

const RAW_API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || window.location.origin;
const NORMALIZED_API_BASE = RAW_API_BASE.replace(/\/+$/, '');
const API_BASE = NORMALIZED_API_BASE.endsWith('/api') ? NORMALIZED_API_BASE : `${NORMALIZED_API_BASE}/api`;

function headers(token: string | null): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

class AccountService {
  private baseUrl = `${API_BASE}/accounts`;

  async list(token: string | null, type?: 'cash' | 'bank' | 'upi'): Promise<AccountItem[]> {
    const query = type ? `?type=${encodeURIComponent(type)}` : '';
    const res = await fetch(`${this.baseUrl}${query}`, { headers: headers(token) });
    if (!res.ok) throw new Error(`Failed to fetch accounts: ${res.status}`);
    const body = await res.json();
    return body?.data || [];
  }

  async create(token: string | null, payload: CreateAccountPayload): Promise<AccountItem> {
    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error || `Failed to create account: ${res.status}`);
    return body.data;
  }
}

export const accountService = new AccountService();
