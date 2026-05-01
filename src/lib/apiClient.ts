import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

// JWT token utilities
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Error parsing JWT token:', error);
    return true; // Consider invalid tokens as expired
  }
}

export function getTokenExpirationTime(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000; // Convert to milliseconds
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

// Create axios instance with automatic token handling
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

// Request interceptor to add auth token and check expiration
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    
    if (token) {
      // Check if token is expired before making the request
      if (isTokenExpired(token)) {
        console.warn('Token is expired, logging out automatically');
        if (globalLogoutCallback) {
          globalLogoutCallback();
        }
        return Promise.reject(new Error('Token expired'));
      }
      
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors and token expiration
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle 401 Unauthorized responses
    if (error.response?.status === 401) {
      console.warn('Received 401 Unauthorized, token may be expired');
      if (globalLogoutCallback) {
        globalLogoutCallback();
      }
    }
    
    // Handle network errors that might indicate token issues
    if (error.code === 'ERR_NETWORK' && error.message.includes('401')) {
      console.warn('Network error with 401, token may be expired');
      if (globalLogoutCallback) {
        globalLogoutCallback();
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
