import { useAuth } from '@/contexts/AuthContext';

interface PoojaBooking {
  id: number;
  receipt_number: string;
  name: string;
  from_date: string;
  to_date: string;
  time: string;
}

interface Pooja {
  id: number;
  receipt_number: string;
  name: string;
  mobile_number: string;
  time: string;
  from_date: string;
  to_date: string;
  remarks?: string;
  transfer_to_account?: string;
  amount?: number;
  created_at: string;
  updated_at: string;
}

interface PoojaFormData {
  receiptNumber: string;
  name: string;
  mobileNumber: string;
  time: string;
  fromDate: string;
  toDate: string;
  remarks?: string;
  transferTo?: string;
  amount?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

class PoojaService {
  private baseUrl = 'http://localhost:4000/api/pooja';
  private token: string | null = null;

  constructor() {
    // Get token from localStorage
    this.token = localStorage.getItem('authToken');
  }

  private getHeaders() {
    // Get fresh token from localStorage on each request
    const token = localStorage.getItem('authToken');
    
    // Debug logging
    if (!token) {
      console.warn('⚠️ No authToken found in localStorage');
    } else {
      console.log('🔑 Using token:', token.substring(0, 20) + '...');
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      
      // Special handling for token errors
      if (response.status === 401 || errorData.error?.includes('token')) {
        console.error('🔒 Authentication error:', errorData.error);
        console.error('💡 Please check if you are logged in and the token is valid');
      }
      
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    return await response.json();
  }

  // Get all pooja entries with pagination and search
  async getPoojaList(page: number = 1, pageSize: number = 20, searchTerm: string = ''): Promise<ApiResponse<Pooja[]>> {
    const url = `${this.baseUrl}?page=${page}&pageSize=${pageSize}&q=${encodeURIComponent(searchTerm)}`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Get single pooja entry by ID
  async getPoojaById(id: number): Promise<ApiResponse<Pooja>> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Create new pooja entry
  async createPooja(data: PoojaFormData): Promise<ApiResponse<Pooja>> {
    const payload = {
      receiptNumber: data.receiptNumber,
      name: data.name,
      mobileNumber: data.mobileNumber,
      time: data.time,
      fromDate: data.fromDate,
      toDate: data.toDate,
      remarks: data.remarks || '',
      transferTo: data.transferTo || '',
      amount: data.amount || ''
    };

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    return this.handleResponse(response);
  }

  // Update existing pooja entry
  async updatePooja(id: number, data: PoojaFormData): Promise<ApiResponse<Pooja>> {
    const payload = {
      receiptNumber: data.receiptNumber,
      name: data.name,
      mobileNumber: data.mobileNumber,
      time: data.time,
      fromDate: data.fromDate,
      toDate: data.toDate,
      remarks: data.remarks || '',
      transferTo: data.transferTo || '',
      amount: data.amount || ''
    };

    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    return this.handleResponse(response);
  }

  // Delete pooja entry
  async deletePooja(id: number): Promise<ApiResponse<void>> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Get bookings for calendar view
  async getBookings(year: number, month: number): Promise<ApiResponse<PoojaBooking[]>> {
    const response = await fetch(`${this.baseUrl}/bookings?year=${year}&month=${month}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Check for double-booking conflicts
  async checkDoubleBooking(fromDate: string, toDate: string, time: string, excludeId?: number): Promise<boolean> {
    try {
      const year = new Date(fromDate).getFullYear();
      const month = new Date(fromDate).getMonth() + 1;
      
      const result = await this.getBookings(year, month);
      const bookings = result.data || [];
      
      // Check for overlapping bookings
      const hasConflict = bookings.some((booking) => {
        if (excludeId && booking.id === excludeId) return false;
        
        const bookingStart = new Date(booking.from_date);
        const bookingEnd = new Date(booking.to_date);
        const newStart = new Date(fromDate);
        const newEnd = new Date(toDate);
        
        // Check if dates overlap
        const datesOverlap = newStart <= bookingEnd && newEnd >= bookingStart;
        
        // If dates overlap, check if times are the same
        if (datesOverlap && booking.time === time) {
          return true;
        }
        
        return false;
      });
      
      return hasConflict;
    } catch (error) {
      console.error('Error checking double booking:', error);
      return false;
    }
  }

  // Export pooja data to CSV
  async exportPooja(): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/export`, {
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to export data');
    }
    
    return await response.blob();
  }

  // Get pooja statistics
  async getStatistics(from?: string, to?: string): Promise<ApiResponse<any>> {
    let url = `${this.baseUrl}/stats/summary`;
    const params = new URLSearchParams();
    
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Update token (useful when token changes)
  updateToken(token: string) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }
}

// Create and export a singleton instance
export const poojaService = new PoojaService();

// Export types for use in components
export type { Pooja, PoojaFormData, PoojaBooking, ApiResponse };
