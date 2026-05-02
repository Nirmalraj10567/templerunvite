export interface DonationItem {
  id: number;
  temple_id: number;
  register_no?: string | null;
  entry_date?: string | null;
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
  entryDate: string;
  bookingDate: string;
  date: string; // legacy support
  name: string;
  fatherName: string;
  address: string;
  village: string;
  phone: string;
  amount?: string;
  product: string;
  quantity: string;
  unit: string;
  reason: string;
  transferTo?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

class DonationService {
  private baseUrl = 'https://templeapi.agniplay.com/api/donations';

  private getHeaders(token: string | null): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async getDonationById(token: string | null, id: number): Promise<ApiResponse<DonationItem>> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders(token),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
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

  async updateDonation(
    token: string | null,
    id: number,
    data: Partial<{
      product: string;
      productName: string;
      description: string;
      price: number;
      quantity: number;
      unit: string;
      category: string;
      donorName: string;
      donorContact: string;
      donationDate: string;
      entryDate: string;
      registerNo: string;
      status: string;
      notes: string;
      transferTo: string;
    }>
  ): Promise<ApiResponse<DonationItem>> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(token),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async deleteDonation(token: string | null, id: number): Promise<ApiResponse<{ success: true }>> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(token),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
}

export const donationService = new DonationService();