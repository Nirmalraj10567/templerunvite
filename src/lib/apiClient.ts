import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

// JWT token utilities
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Error parsing JWT token:', error);
    return true;
  }
}

export function getTokenExpirationTime(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000;
  } catch (error) {
    console.error('Error parsing JWT token:', error);
    return null;
  }
}

// Global logout callback
let globalLogoutCallback: (() => void) | null = null;

export function setGlobalLogoutCallback(callback: () => void) {
  globalLogoutCallback = callback;
}

// Create axios instance
const RAW_API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || window.location.origin;
const NORMALIZED_API_BASE = RAW_API_BASE.replace(/\/+$/, '');
const API_BASE_URL = NORMALIZED_API_BASE.endsWith('/api')
  ? NORMALIZED_API_BASE
  : `${NORMALIZED_API_BASE}/api`;

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track if a refresh is in progress to avoid parallel refresh calls
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: any) => void }> = [];

const processQueue = (error: any, token: string | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Attempt to refresh the access token
async function attemptTokenRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;

  try {
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refresh_token: refreshToken,
    });

    if (response.data.success) {
      const { access_token, refresh_token: newRefreshToken } = response.data.data;
      localStorage.setItem('authToken', access_token);
      localStorage.setItem('refreshToken', newRefreshToken);
      return access_token;
    }
    return null;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors with automatic refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized - attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers!['Authorization'] = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await attemptTokenRefresh();
        if (newToken) {
          processQueue(null, newToken);
          originalRequest.headers!['Authorization'] = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        } else {
          // Refresh failed, logout
          processQueue(new Error('Refresh failed'), null);
          if (globalLogoutCallback) {
            globalLogoutCallback();
          }
          return Promise.reject(error);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (globalLogoutCallback) {
          globalLogoutCallback();
        }
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Profile update API
export interface ProfileUpdateData {
  email?: string;
  fullName?: string;
  websiteLink?: string;
  profileImage?: string;
  trustInformation?: string;
  templeData?: {
    name?: string;
    website_link?: string;
    is_trust?: boolean;
    trust_type?: string;
    trust_registration_number?: string;
    date_of_registration?: string;
    pan_number?: string;
    tan_number?: string;
    gst_number?: string;
    reg_12a?: string;
    reg_80g?: string;
  };
}

export async function updateProfile(data: ProfileUpdateData): Promise<any> {
  try {
    const response = await apiClient.put('/users/profile', data);
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.message || 'Failed to update profile';
    throw new Error(errorMessage);
  }
}

export default apiClient;
