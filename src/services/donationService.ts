export interface DonationItem {
  id: number;
  temple_id: number;
  product_name: string;
  description: string;
  price: number | null;
  quantity: number | null;
  category: string;
  donor_name: string;
  donor_contact: string;
  donation_date: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DonationFormData {
  registerNo: string;
  date: string;
  name: string;
  fatherName: string;
  address: string;
  village: string;
  phone: string;
  amount: string;
  product: string;
  unit: string;
  reason: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

class DonationService {
  private baseUrl = 'http://localhost:4000/api/donations';

  private getHeaders(token: string | null): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async getDonations(token: string | null, params?: { q?: string; from?: string; to?: string; }): Promise<ApiResponse<DonationItem[]>> {
    const url = new URL(this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.append(key, value);
      });
    }
    const response = await fetch(url.toString(), {
      headers: this.getHeaders(token),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async createDonation(token: string | null, data: DonationFormData): Promise<ApiResponse<DonationItem>> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async exportDonations(token: string | null): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/export`, {
      headers: this.getHeaders(token),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.blob();
  }
}

export const donationService = new DonationService();