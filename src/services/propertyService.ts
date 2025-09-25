import axios from 'axios';

const API_BASE_URL = 'http://localhost:4000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to inject auth token
api.interceptors.request.use(
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

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

interface Property {
  id: number;
  name: string;
  details: string;
  value: string;
  created_at: string;
  updated_at: string;
}

interface PropertyResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

const propertyService = {
  // Get all properties with pagination and search
  async getProperties(page = 1, pageSize = 10, search = ''): Promise<Property[]> {
    try {
      const response = await api.get<Property[]>('/properties', {
        params: { page, pageSize, search },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching properties:', error);
      throw error;
    }
  },

  // Get single property by ID
  async getProperty(id: string): Promise<PropertyResponse<Property>> {
    try {
      const response = await api.get<PropertyResponse<Property>>(`/properties/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching property:', error);
      throw error;
    }
  },

  // Create new property
  async createProperty(propertyData: Property): Promise<PropertyResponse<Property>> {
    try {
      const response = await api.post<PropertyResponse<Property>>('/properties', propertyData);
      return response.data;
    } catch (error) {
      console.error('Error creating property:', error);
      throw error;
    }
  },

  // Update existing property
  async updateProperty(id: string, propertyData: Property): Promise<PropertyResponse<Property>> {
    try {
      const response = await api.put<PropertyResponse<Property>>(
        `/properties/${id}`,
        propertyData
      );
      return response.data;
    } catch (error) {
      console.error('Error updating property:', error);
      throw error;
    }
  },

  // Delete property
  async deleteProperty(id: string): Promise<PropertyResponse<void>> {
    try {
      const response = await api.delete<PropertyResponse<void>>(`/properties/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting property:', error);
      throw error;
    }
  }
};

export default propertyService;
