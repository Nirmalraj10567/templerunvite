import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://templeapi.agniplay.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface Asset {
  id: number;
  name: string;
  details: string;
  value: number;
  quantity?: number;
  asset_source?: string;
  source_details?: string;
  donor_name?: string;
  donor_contact?: string;
  status?: string;
  converted_at?: string;
  conversion_income_id?: number;
  used_qty?: number;
  for_sell_qty?: number;
  convert_price?: number;
  created_by?: number;
  temple_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AssetLog {
  id: number;
  asset_id: number;
  action: string;
  details: string;
  created_by: number;
  created_at: string;
}

export interface PropertyResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: { page: number; pageSize: number; total: number };
}

const propertyService = {
  async getAssets(page = 1, pageSize = 50, search = ''): Promise<Asset[]> {
    const response = await api.get<{ success: boolean; data: Asset[] }>('/assets', {
      params: { page, pageSize, q: search },
    });
    return response.data.data || [];
  },

  async getAsset(id: string): Promise<Asset> {
    const response = await api.get<{ success: boolean; data: Asset }>(`/assets/${id}`);
    return response.data.data;
  },

  async createAsset(data: Partial<Asset>): Promise<{ success: boolean; assetId: number }> {
    const response = await api.post<{ success: boolean; assetId: number }>('/assets', data);
    return response.data;
  },

  async updateAsset(id: string, data: Partial<Asset>): Promise<{ success: boolean }> {
    const response = await api.put<{ success: boolean }>(`/assets/${id}`, data);
    return response.data;
  },

  async deleteAsset(id: string): Promise<{ success: boolean }> {
    const response = await api.delete<{ success: boolean }>(`/assets/${id}`);
    return response.data;
  },

  async convertToCash(id: string, convertValue: number, usedQty: number = 0, forSellQty: number = 0, convertPrice: number = 0): Promise<{ success: boolean }> {
    const response = await api.post<{ success: boolean }>(`/assets/${id}/convert-to-cash`, {
      convertValue,
      usedQty,
      forSellQty,
      convertPrice,
    });
    return response.data;
  },

  async updateAssetQty(id: string, usedQty: number, forSellQty: number): Promise<{ success: boolean }> {
    const response = await api.put<{ success: boolean }>(`/assets/${id}/qty`, {
      usedQty,
      forSellQty,
    });
    return response.data;
  },

  async getAssetLogs(id: string): Promise<AssetLog[]> {
    const response = await api.get<{ success: boolean; data: AssetLog[] }>(`/assets/${id}/logs`);
    return response.data.data || [];
  },

  async getAllLogs(): Promise<AssetLog[]> {
    const response = await api.get<{ success: boolean; data: AssetLog[] }>('/assets/logs/all');
    return response.data.data || [];
  },

  async updateAssetLog(logId: string, data: Partial<Pick<AssetLog, 'action' | 'details'>>): Promise<{ success: boolean }> {
    const response = await api.put<{ success: boolean }>(`/assets/logs/${logId}`, data);
    return response.data;
  },

  async deleteAssetLog(logId: string): Promise<{ success: boolean }> {
    const response = await api.delete<{ success: boolean }>(`/assets/logs/${logId}`);
    return response.data;
  },

  async getStats(): Promise<{ total: number; active: number; converted: number; totalValue: number }> {
    const response = await api.get<{ success: boolean; data: { total: number; active: number; converted: number; totalValue: number } }>('/assets/stats');
    return response.data.data;
  },
};

export default propertyService;