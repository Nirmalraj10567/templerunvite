export interface MoneyDonationFormData {
  registerNo: string;
  date: string;
  name: string;
  fatherName: string;
  address: string;
  village: string;
  phone: string;
  amount: string; // keep as string in form, cast to number server-side
  reason: string;
  transferTo?: string;
}

export interface MoneyDonationItem {
  id: number;
  register_no: string | null;
  date: string;
  name: string | null;
  father_name: string | null;
  address: string | null;
  village: string | null;
  phone: string | null;
  amount: number;
  reason: string | null;
  temple_id: number;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

class MoneyDonationService {
  private baseUrl = 'http://localhost:4000/api/money-donations';

  private getHeaders(token: string | null): HeadersInit {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  async list(token: string | null): Promise<ApiResponse<MoneyDonationItem[]>> {
    const response = await fetch(this.baseUrl, { headers: this.getHeaders(token) });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  }

  async create(token: string | null, data: MoneyDonationFormData): Promise<ApiResponse<MoneyDonationItem>> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  }
}

export const moneyDonationService = new MoneyDonationService();
