interface PoojaMobileRequest {
  receipt_number: string;
  name: string;
  mobile_number: string;
  time: string;
  from_date: string;
  to_date: string;
  remarks?: string;
  submitted_by_mobile?: string;
}

interface PoojaMobileResponse {
  id: number;
  receipt_number: string;
  name: string;
  mobile_number: string;
  time: string;
  from_date: string;
  to_date: string;
  remarks?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  submitted_by_mobile: string;
  submitted_at: string;
  approved_at?: string;
  rejection_reason?: string;
  admin_notes?: string;
}

interface AvailableSlotsResponse {
  available_slots: string[];
  booked_slots: string[];
  total_available: number;
  total_booked: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class PoojaMobileService {
  private baseUrl = 'http://localhost:4000/api/pooja-mobile';

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Submit a new pooja request from mobile
   */
  async submitRequest(request: PoojaMobileRequest): Promise<ApiResponse<{ id: number; status: string }>> {
    const response = await fetch(`${this.baseUrl}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    return this.handleResponse(response);
  }

  /**
   * Get user's submitted pooja requests
   */
  async getMyRequests(mobileNumber: string): Promise<ApiResponse<PoojaMobileResponse[]>> {
    const response = await fetch(`${this.baseUrl}/my-requests?mobile_number=${encodeURIComponent(mobileNumber)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return this.handleResponse(response);
  }

  /**
   * Get single pooja request details
   */
  async getRequestDetails(requestId: number, mobileNumber: string): Promise<ApiResponse<PoojaMobileResponse>> {
    const response = await fetch(`${this.baseUrl}/request/${requestId}?mobile_number=${encodeURIComponent(mobileNumber)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return this.handleResponse(response);
  }

  /**
   * Cancel a pooja request (only if pending)
   */
  async cancelRequest(requestId: number, mobileNumber: string, reason?: string): Promise<ApiResponse<void>> {
    const response = await fetch(`${this.baseUrl}/cancel/${requestId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mobile_number: mobileNumber,
        reason: reason || 'No reason provided'
      }),
    });

    return this.handleResponse(response);
  }

  /**
   * Get available time slots for a date range
   */
  async getAvailableSlots(fromDate: string, toDate: string): Promise<ApiResponse<AvailableSlotsResponse>> {
    const response = await fetch(`${this.baseUrl}/available-slots?from_date=${encodeURIComponent(fromDate)}&to_date=${encodeURIComponent(toDate)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return this.handleResponse(response);
  }

  /**
   * Generate a unique receipt number
   */
  generateReceiptNumber(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `POO${timestamp}${random}`.toUpperCase();
  }

  /**
   * Validate mobile number format
   */
  validateMobileNumber(mobile: string): boolean {
    const mobileRegex = /^[6-9]\d{9}$/;
    return mobileRegex.test(mobile);
  }

  /**
   * Validate time format (HH:MM)
   */
  validateTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Validate date format (YYYY-MM-DD)
   */
  validateDateFormat(date: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) return false;
    
    const parsedDate = new Date(date);
    return parsedDate instanceof Date && !isNaN(parsedDate.getTime());
  }

  /**
   * Check if date is in the future
   */
  isFutureDate(date: string): boolean {
    const inputDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inputDate >= today;
  }

  /**
   * Check if from_date is before or equal to to_date
   */
  isValidDateRange(fromDate: string, toDate: string): boolean {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    return from <= to;
  }

  /**
   * Format date for display
   */
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString();
  }

  /**
   * Format date and time for display
   */
  formatDateTime(dateTime: string): string {
    return new Date(dateTime).toLocaleString();
  }

  /**
   * Get status badge color
   */
  getStatusColor(status: string): string {
    const statusColors = {
      pending: 'text-yellow-600 bg-yellow-100',
      approved: 'text-green-600 bg-green-100',
      rejected: 'text-red-600 bg-red-100',
      cancelled: 'text-gray-600 bg-gray-100'
    };
    return statusColors[status as keyof typeof statusColors] || statusColors.pending;
  }

  /**
   * Get status text in Tamil
   */
  getStatusText(status: string): string {
    const statusTexts = {
      pending: 'நிலுவையில்',
      approved: 'அனுமதிக்கப்பட்டது',
      rejected: 'நிராகரிக்கப்பட்டது',
      cancelled: 'ரத்து செய்யப்பட்டது'
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  }
}

export const poojaMobileService = new PoojaMobileService();
export type { PoojaMobileRequest, PoojaMobileResponse, AvailableSlotsResponse, ApiResponse };
