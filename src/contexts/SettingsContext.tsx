import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

export type UserSettings = {
  landing_route?: string;
  sidebar_collapsed_default?: boolean;
  hidden_menu_keys?: string[]; // labels or route paths
  quick_actions?: string[];
  shortcuts?: Record<string, string>; // route -> keystroke (e.g., "ctrl+k")
  language?: string | null;
  theme?: string | null;
};

const defaultSettings: UserSettings = {
  landing_route: '/dashboard',
  sidebar_collapsed_default: false,
  hidden_menu_keys: [],
  quick_actions: [],
  shortcuts: {},
  language: null,
  theme: null,
};

const SettingsContext = createContext<{
  settings: UserSettings;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateSettings: (partial: Partial<UserSettings>) => Promise<boolean>;
}>({
  settings: defaultSettings,
  loading: false,
  error: null,
  refresh: async () => {},
  updateSettings: async () => false,
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = (import.meta as any)?.env?.VITE_API_BASE_URL || 'https://tmsapi.xesstechlink.com';

  const refresh = useMemo(() => {
    return async () => {
      if (!token) {
        setSettings(defaultSettings);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/user-settings/me`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load settings');
        const data: UserSettings = json?.data || {};
        setSettings({ ...defaultSettings, ...data });
      } catch (e: any) {
        setError(e?.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateSettings = async (partial: Partial<UserSettings>) => {
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE}/api/user-settings/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(partial),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Failed to update settings');
      }
      // Merge local state optimistically
      setSettings((prev) => ({ ...prev, ...partial }));
      return true;
    } catch (e) {
      console.error('updateSettings failed:', e);
      return false;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, error, refresh, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
