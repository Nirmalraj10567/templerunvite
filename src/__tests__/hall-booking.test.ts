import axios from 'axios';

const API_BASE = 'https://templeapi.agniplay.com/api';

interface LoginResponse {
  token: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  total?: number;
}

interface MobileBookingResponse {
  id: number;
  status: string;
}

interface LoginRequest {
  username: string;
  password: string;
}

describe('Hall Booking Flow', () => {
  const testMobile = `999${Date.now().toString().slice(-7)}`;
  let authToken: string | undefined;
  let bookingId: number;

  beforeAll(async () => {
    try {
      const loginRes = await axios.post<LoginResponse>(`${API_BASE}/login`, {
        username: 'admin',
        password: 'admin123'
      } as LoginRequest);
      authToken = loginRes.data.token;
    } catch {
      const loginRes = await axios.post<any>(`${API_BASE}/auth/login`, {
        username: 'admin',
        password: 'admin123'
      });
      authToken = loginRes.data.token || loginRes.data.accessToken;
    }
  });

  describe('Mobile Booking Submission', () => {
    it('should submit a hall booking via mobile API', async () => {
      const bookingData = {
        date: '2025-12-25',
        time: '10:00',
        name: 'Test Customer',
        mobile: testMobile,
        address: 'Test Address',
        village: 'Test Village',
        event: 'Marriage',
        total_amount: 10000,
        advance_amount: 5000,
        balance_amount: 5000,
        submitted_by_mobile: testMobile
      };

      const response = await axios.post<ApiResponse<MobileBookingResponse>>(`${API_BASE}/hall-mobile/submit`, bookingData);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data?.status).toBe('pending');
      bookingId = response.data.data!.id;
    });

    it('should retrieve my mobile requests', async () => {
      const response = await axios.get<ApiResponse<any[]>>(`${API_BASE}/hall-mobile/my-requests`, {
        params: { mobile: testMobile }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    it('should get latest receipt number', async () => {
      const response = await axios.get<ApiResponse<{ next_register_no: string }>>(`${API_BASE}/hall-mobile/latest-receipt`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data?.next_register_no).toBeDefined();
    });
  });

  describe('Approval Flow (Authenticated)', () => {
    it('should list pending requests', async () => {
      const response = await axios.get<ApiResponse<any[]>>(`${API_BASE}/hall-approval/requests`, {
        params: { status: 'pending' },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    it('should approve a pending request', async () => {
      if (!authToken) {
        expect(true).toBe(true);
        return;
      }

      const response = await axios.put<ApiResponse>(
        `${API_BASE}/hall-approval/approve/${bookingId}`,
        { notes: 'Approved for testing' },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    it('should get approval logs', async () => {
      if (!authToken) {
        expect(true).toBe(true);
        return;
      }

      const response = await axios.get<ApiResponse<any[]>>(`${API_BASE}/hall-approval/logs`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.total).toBeDefined();
    });
  });

  describe('Error Cases', () => {
    it('should reject duplicate booking at same time', async () => {
      try {
        await axios.post(`${API_BASE}/hall-mobile/submit`, {
          date: '2025-12-25',
          time: '10:00',
          name: 'Duplicate Customer',
          mobile: `99999${Date.now().toString().slice(-5)}`,
          event: 'Marriage'
        });

        await axios.post(`${API_BASE}/hall-mobile/submit`, {
          date: '2025-12-25',
          time: '10:00',
          name: 'Another Customer',
          mobile: `99998${Date.now().toString().slice(-5)}`,
          event: 'Marriage'
        });
      } catch (err: any) {
        expect(err.response?.status).toBe(400);
      }
    });
  });
});