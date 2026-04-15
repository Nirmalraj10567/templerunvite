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

  async getById(token: string | null, id: number): Promise<ApiResponse<MoneyDonationItem>> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders(token),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  }

  async update(token: string | null, id: number, data: Partial<MoneyDonationFormData>): Promise<ApiResponse<MoneyDonationItem>> {
    console.log('=== DEBUG: moneyDonationService.update called ===');
    console.log('URL:', `${this.baseUrl}/${id}`);
    console.log('Method: PUT');
    console.log('Headers:', this.getHeaders(token));
    console.log('Data being sent:', data);
    console.log('JSON stringified data:', JSON.stringify(data));
    
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(token),
        body: JSON.stringify(data),
      });
      
      console.log('DEBUG: Update response received');
      console.log('DEBUG: Update response status:', response.status);
      console.log('DEBUG: Update response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('DEBUG: Update error response text:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('DEBUG: Update success response data:', result);
      return result;
    } catch (error) {
      console.error('DEBUG: Update fetch error:', error);
      throw error;
    }
  }

  async list(token: string | null): Promise<ApiResponse<MoneyDonationItem[]>> {
    const response = await fetch(this.baseUrl, { headers: this.getHeaders(token) });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  }

  async create(token: string | null, data: MoneyDonationFormData): Promise<ApiResponse<MoneyDonationItem>> {
    console.log('=== DEBUG: moneyDonationService.create called ===');
    console.log('URL:', this.baseUrl);
    console.log('Method: POST');
    console.log('Headers:', this.getHeaders(token));
    console.log('Data being sent:', data);
    console.log('JSON stringified data:', JSON.stringify(data));
    
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.getHeaders(token),
        body: JSON.stringify(data),
      });
      
      console.log('DEBUG: Response received');
      console.log('DEBUG: Response status:', response.status);
      console.log('DEBUG: Response ok:', response.ok);
      console.log('DEBUG: Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('DEBUG: Error response text:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('DEBUG: Success response data:', result);
      return result;
    } catch (error) {
      console.error('DEBUG: Fetch error:', error);
      throw error;
    }
  }

  async delete(token: string | null, id: number): Promise<ApiResponse<{ id: number }>> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(token),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  }

  // Get logs for a specific donation
  async getLogs(token: string | null, donationId: number): Promise<ApiResponse<Array<{
    id: number;
    action: string;
    created_at: string;
    created_by: number | null;
    details: any;
  }>>> {
    console.log('=== DEBUG: moneyDonationService.getLogs called ===');
    console.log('URL:', `${this.baseUrl}/${donationId}/logs`);
    console.log('Headers:', this.getHeaders(token));
    
    const response = await fetch(`${this.baseUrl}/${donationId}/logs`, {
      headers: this.getHeaders(token),
    });
    
    console.log('DEBUG: Logs response status:', response.status);
    console.log('DEBUG: Logs response ok:', response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('DEBUG: Logs error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('DEBUG: Logs response data:', result);
    return result;
  }

  // Get all logs for the temple
  async getAllLogs(token: string | null, page: number = 1, pageSize: number = 50): Promise<ApiResponse<{
    data: Array<{
      id: number;
      donation_id: number;
      action: string;
      created_at: string;
      created_by: number | null;
      donation_name: string | null;
      register_no: string | null;
      details: any;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }>> {
    console.log('=== DEBUG: moneyDonationService.getAllLogs called ===');
    console.log('Page:', page, 'PageSize:', pageSize);
    
    const params = new URLSearchParams({ 
      page: String(page), 
      pageSize: String(pageSize) 
    });
    const url = `${this.baseUrl}/logs?${params.toString()}`;
    console.log('URL:', url);
    console.log('Headers:', this.getHeaders(token));
    
    const response = await fetch(url, {
      headers: this.getHeaders(token),
    });
    
    console.log('DEBUG: All logs response status:', response.status);
    console.log('DEBUG: All logs response ok:', response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('DEBUG: All logs error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('DEBUG: All logs response data:', result);
    return result;
  }

  // Build receipt PDF URL for a donation id; token is passed via query for file download
  receiptUrl(id: number, token: string | null): string {
    const t = token ? encodeURIComponent(token) : '';
    return `${this.baseUrl}/${id}/receipt.pdf${t ? `?token=${t}` : ''}`;
  }
}

export const moneyDonationService = new MoneyDonationService();
