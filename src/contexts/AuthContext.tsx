import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { setGlobalLogoutCallback, isTokenExpired } from '@/lib/apiClient';
import apiClient from '@/lib/apiClient';

const RAW_API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || window.location.origin;
const NORMALIZED_API_BASE = RAW_API_BASE.replace(/\/+$/, '');
const API_BASE = NORMALIZED_API_BASE.endsWith('/api')
  ? NORMALIZED_API_BASE
  : `${NORMALIZED_API_BASE}/api`;

interface User {
  id: number;
  name: string;
  email: string;
  mobile: string;
  role: string;
  templeId?: number;
}

interface Temple {
  id: number;
  name: string;
  registration_id: string;
  address: string;
  phone: string;
  email: string;
}

export interface CompanyInfo {
  templeId: number;
  username: string;
  role: string;
  templeName: string;
  templeAddress: string | null;
  templeLogo: string | null;
  branch: string | null;
}

interface UserPermission {
  permission_id: string;
  access_level: 'view' | 'edit' | 'full';
}

interface RegisterData {
  name: string;
  templeName?: string;
  username?: string;
  mobileNumber: string;
  gmail: string;
  weblink: string;
  password: string;
  image?: File | null;
  isTrust: boolean;
  trustType?: string;
  trustRegistrationNumber?: string;
  dateOfRegistration?: string;
  panNumber?: string;
  tanNumber?: string;
  gstNumber?: string;
  reg12A?: string;
  reg80G?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  userPermissions: UserPermission[];
  isSuperAdmin: boolean;
  temple: Temple | null;
  isGuest: boolean;
  planFeatures: Record<string, unknown>;
  planName: string;
  subscriptionStatus: string;
  login: (email: string, password: string, companyId?: number) => Promise<void>;
  lookupCompaniesByMobile: (mobile: string) => Promise<CompanyInfo[]>;
  guestLogin: () => Promise<{ success: boolean; error?: string }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshSubscription: () => Promise<void>;
  isLoading: boolean;
  error: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  userPermissions: UserPermission[];
  isSuperAdmin: boolean;
  temple: Temple | null;
  planFeatures: Record<string, unknown>;
  planName: string;
  subscriptionStatus: string;
  isLoading: boolean;
  error: string;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  userPermissions: [],
  isSuperAdmin: false,
  temple: null,
  isGuest: false,
  planFeatures: {},
  planName: '',
  subscriptionStatus: '',
  login: async () => {},
  lookupCompaniesByMobile: async () => [],
  guestLogin: async () => ({ success: false, error: 'Not initialized' }),
  register: async () => ({ success: false, error: 'Not initialized' }),
  logout: () => {},
  refreshSubscription: async () => {},
  isLoading: false,
  error: '',
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState & { isGuest: boolean }>({
    user: null,
    token: null,
    userPermissions: [],
    isSuperAdmin: false,
    temple: null,
    planFeatures: {},
    planName: '',
    subscriptionStatus: '',
    isGuest: false,
    isLoading: true,
    error: '',
  });

  // Function to fetch subscription plan data
  const fetchSubscriptionData = async (templeId: number, token: string): Promise<{ planFeatures: Record<string, unknown>; planName: string; subscriptionStatus: string }> => {
    try {
      const response = await apiClient.get('/subscription');
      const data = response.data;
      if (data.success && data.data?.subscription?.plan) {
        return {
          planFeatures: data.data.subscription.plan.features || {},
          planName: data.data.subscription.plan.name || '',
          subscriptionStatus: data.data.subscription.status || '',
        };
      }
      return { planFeatures: {}, planName: '', subscriptionStatus: 'none' };
    } catch {
      return { planFeatures: {}, planName: '', subscriptionStatus: '' };
    }
  };

  // Function to fetch temple data
  const fetchTempleData = async (templeId: number, token: string): Promise<Temple | null> => {
    try {
      const response = await apiClient.get(`/temples/${templeId}`);
      const data = response.data;
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Error fetching temple data:', error);
      return null;
    }
  };

  // Restore session from localStorage on first load
  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('userInfo');
    const savedPermissions = localStorage.getItem('userPermissions');
    const savedTemple = localStorage.getItem('templeInfo');
    const savedIsGuest = localStorage.getItem('isGuest') === 'true';
    const savedPlanFeatures = localStorage.getItem('planFeatures');
    const savedPlanName = localStorage.getItem('planName');
    const savedSubStatus = localStorage.getItem('subscriptionStatus');

    if (savedToken && savedUser) {
      // Check if token is expired before restoring session
      if (isTokenExpired(savedToken)) {
        console.warn('Saved token is expired, attempting refresh...');
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          (async () => {
            try {
              const response = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken }),
              });
              const data = await response.json();
              if (data.success) {
                localStorage.setItem('authToken', data.data.access_token);
                localStorage.setItem('refreshToken', data.data.refresh_token);
                const newToken = data.data.access_token;
                const parsedUser = JSON.parse(savedUser);
                const parsedPermissions: UserPermission[] = savedPermissions
                  ? JSON.parse(savedPermissions)
                  : (parsedUser.userPermissions || []).map((permission: any) => ({
                      permission_id: permission.permission_id,
                      access_level: permission.access_level,
                    }));
                const parsedTemple = savedTemple ? JSON.parse(savedTemple) : null;

                setState(prev => ({
                  ...prev,
                  token: newToken,
                  user: parsedUser,
                  userPermissions: parsedPermissions,
                  isSuperAdmin: parsedUser.mobile === '9999999999',
                  temple: parsedTemple,
                  isGuest: savedIsGuest,
                  planFeatures: savedPlanFeatures ? JSON.parse(savedPlanFeatures) : {},
                  planName: savedPlanName || '',
                  subscriptionStatus: savedSubStatus || '',
                  isLoading: false,
                }));

                if (parsedUser?.templeId) {
                  fetchSubscriptionData(parsedUser.templeId, newToken).then(result => {
                    setState(prev => ({ ...prev, ...result }));
                    localStorage.setItem('planFeatures', JSON.stringify(result.planFeatures));
                    localStorage.setItem('planName', result.planName);
                    localStorage.setItem('subscriptionStatus', result.subscriptionStatus);
                  });
                }
                return;
              }
            } catch (e) {
              console.warn('Refresh token also expired, clearing session');
            }
            // Clear session if refresh failed
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('userInfo');
            localStorage.removeItem('userPermissions');
            localStorage.removeItem('templeInfo');
            localStorage.removeItem('isGuest');
            localStorage.removeItem('planFeatures');
            localStorage.removeItem('planName');
            localStorage.removeItem('subscriptionStatus');
            setState(prev => ({ ...prev, isLoading: false }));
          })();
          return;
        }
        // No refresh token, clear session
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('userPermissions');
        localStorage.removeItem('templeInfo');
        localStorage.removeItem('isGuest');
        localStorage.removeItem('planFeatures');
        localStorage.removeItem('planName');
        localStorage.removeItem('subscriptionStatus');
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }
      
      const parsedUser = JSON.parse(savedUser);
      const parsedPermissions: UserPermission[] = savedPermissions
        ? JSON.parse(savedPermissions)
        : (parsedUser.userPermissions || []).map((permission: any) => ({
            permission_id: permission.permission_id,
            access_level: permission.access_level,
          }));
      const parsedTemple = savedTemple ? JSON.parse(savedTemple) : null;
      
      setState(prev => ({
        ...prev,
        token: savedToken,
        user: parsedUser,
        userPermissions: parsedPermissions,
        isSuperAdmin: parsedUser.mobile === '9999999999',
        temple: parsedTemple,
        isGuest: savedIsGuest,
        planFeatures: savedPlanFeatures ? JSON.parse(savedPlanFeatures) : {},
        planName: savedPlanName || '',
        subscriptionStatus: savedSubStatus || '',
        isLoading: false,
      }));

      // Fetch subscription data in background
      if (parsedUser?.templeId) {
        fetchSubscriptionData(parsedUser.templeId, savedToken).then(result => {
          setState(prev => ({ ...prev, ...result }));
          localStorage.setItem('planFeatures', JSON.stringify(result.planFeatures));
          localStorage.setItem('planName', result.planName);
          localStorage.setItem('subscriptionStatus', result.subscriptionStatus);
        });
      }
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const lookupCompaniesByMobile = async (mobile: string): Promise<CompanyInfo[]> => {
    try {
      const response = await fetch(`${API_BASE}/users/lookup-by-mobile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Lookup failed');
      return data.companies || [];
    } catch (err) {
      console.error('lookupCompaniesByMobile error:', err);
      return [];
    }
  };

  const login = async (identifier: string, password: string, companyId?: number) => {
    if (!identifier || !password) {
      setState(prev => ({ ...prev, error: 'Username/Mobile and password are required', isLoading: false }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: '' }));

    try {
      const body: Record<string, unknown> = { username: identifier, password };
      if (companyId) body.companyId = companyId;
      const response = await fetch(`${API_BASE}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const loginData = await response.json();
      if (!response.ok) {
        throw new Error(loginData.error || 'Login failed');
      }
      
      // Check if user is blocked
      if (loginData.user?.status === 'blocked') {
        throw new Error('Your account has been blocked. Please contact support.');
      }

      const { token, refresh_token, user } = loginData;
      const permsFromLogin = (user?.permissions || []).map((p: any) => ({
        permission_id: p.permission_id || p.id,
        access_level: p.access_level || p.access,
      })) as UserPermission[];

      // Fetch temple data if user has templeId
      let templeData: Temple | null = null;
      let planFeatures: Record<string, unknown> = {};
      let planName = '';
      let subscriptionStatus = '';
      if (user?.templeId) {
        templeData = await fetchTempleData(user.templeId, token);
        const subData = await fetchSubscriptionData(user.templeId, token);
        planFeatures = subData.planFeatures;
        planName = subData.planName;
        subscriptionStatus = subData.subscriptionStatus;
      }

      setState(prev => ({
        ...prev,
        token,
        user,
        userPermissions: permsFromLogin,
        isSuperAdmin: user.mobile === '9999999999',
        temple: templeData,
        planFeatures,
        planName,
        subscriptionStatus,
        isLoading: false,
      }));
      localStorage.setItem('authToken', token);
      if (refresh_token) localStorage.setItem('refreshToken', refresh_token);
      localStorage.setItem('userInfo', JSON.stringify(user));
      localStorage.setItem('userPermissions', JSON.stringify(permsFromLogin));
      localStorage.setItem('planFeatures', JSON.stringify(planFeatures));
      localStorage.setItem('planName', planName);
      localStorage.setItem('subscriptionStatus', subscriptionStatus);
      if (templeData) {
        localStorage.setItem('templeInfo', JSON.stringify(templeData));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      }));
    }
  };

  // Guest login for mobile - allows limited access without registration
  const guestLogin = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: '' }));

    try {
      // Get device info if available
      const deviceId = localStorage.getItem('deviceId') || `device_${Date.now()}`;
      localStorage.setItem('deviceId', deviceId);

      const response = await fetch(`${API_BASE}/mobile-auth/guest-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          deviceName: navigator.userAgent || 'Unknown Device'
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Guest login failed');
      }

      const { token, user } = data;

      // Store guest session
      setState(prev => ({
        ...prev,
        token,
        user: {
          id: 0, // Guest users get id 0
          name: user.name,
          mobile: '',
          email: '',
          role: 'guest',
        },
        isGuest: true,
        userPermissions: user.permissions?.map((p: string) => ({ permission_id: p, access_level: 'view' })) || [],
        isSuperAdmin: false,
        temple: null,
        isLoading: false,
      }));

      localStorage.setItem('authToken', token);
      localStorage.setItem('userInfo', JSON.stringify({ ...user, role: 'guest' }));
      localStorage.setItem('isGuest', 'true');

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Guest login failed';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      return { success: false, error: errorMessage };
    }
  };

  const register = async (userData: RegisterData) => {
    setState(prev => ({ ...prev, isLoading: true, error: '' }));
    
    try {
      const payload = {
        mobile: userData.mobileNumber,
        username: (userData.username?.trim() || userData.name.replace(/\s+/g, '').toLowerCase()),
        password: userData.password,
        email: userData.gmail,
        fullName: userData.name,
        templeName: userData.templeName || userData.name, // Temple name from registration form
        websiteLink: userData.weblink,
        isTrust: userData.isTrust,
        trustType: userData.trustType,
        trustRegistrationNumber: userData.trustRegistrationNumber,
        dateOfRegistration: userData.dateOfRegistration,
        panNumber: userData.panNumber,
        tanNumber: userData.tanNumber,
        gstNumber: userData.gstNumber,
        reg12A: userData.reg12A,
        reg80G: userData.reg80G,
      };

      let response: Response;
      if (userData.image) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (v !== undefined && v !== null) fd.append(k, String(v));
        });
        fd.append('image', userData.image);
        response = await fetch(`${API_BASE}/register`, {
          method: 'POST',
          body: fd,
        });
      } else {
        response = await fetch(`${API_BASE}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors or other API errors
        const errorMessage = data.error || data.message || 'Registration failed';
        throw new Error(errorMessage);
      }

      if (data.success !== false) {
        // Ensure loading state is cleared on success
        setState(prev => ({ ...prev, isLoading: false, error: '' }));
        return { success: true, user: data.user };
      } else {
        const message = data.error || data.message || 'Registration failed';
        setState(prev => ({ ...prev, error: message, isLoading: false }));
        return { success: false, error: message };
      }
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred during registration';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    setState({
      user: null,
      token: null,
      userPermissions: [],
      isSuperAdmin: false,
      temple: null,
      planFeatures: {},
      planName: '',
      subscriptionStatus: '',
      isGuest: false,
      isLoading: false,
      error: '',
    });
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('userPermissions');
    localStorage.removeItem('templeInfo');
    localStorage.removeItem('isGuest');
    localStorage.removeItem('planFeatures');
    localStorage.removeItem('planName');
    localStorage.removeItem('subscriptionStatus');
  };

  // Refresh subscription data from server and sync to state + localStorage
  const refreshSubscription = async () => {
    if (!state.user?.templeId || !state.token) return;
    try {
      const result = await fetchSubscriptionData(state.user.templeId, state.token);
      setState(prev => ({ ...prev, ...result }));
      localStorage.setItem('planFeatures', JSON.stringify(result.planFeatures));
      localStorage.setItem('planName', result.planName);
      localStorage.setItem('subscriptionStatus', result.subscriptionStatus);
    } catch {
      // silent - stale data is fine
    }
  };

  // Set up global logout callback for API client
  useEffect(() => {
    setGlobalLogoutCallback(logout);
  }, []);

  // Periodic token expiration check
  useEffect(() => {
    if (!state.token) return;

    const checkTokenExpiration = () => {
      if (state.token && isTokenExpired(state.token)) {
        console.warn('Token expired during session, logging out automatically');
        logout();
      }
    };

    // Check token expiration every 5 minutes
    const interval = setInterval(checkTokenExpiration, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [state.token]);

  return (
    <AuthContext.Provider value={{
      user: state.user,
      token: state.token,
      userPermissions: state.userPermissions,
      isSuperAdmin: state.isSuperAdmin,
      temple: state.temple,
      isGuest: state.isGuest,
      planFeatures: state.planFeatures,
      planName: state.planName,
      subscriptionStatus: state.subscriptionStatus,
      login,
      lookupCompaniesByMobile,
      guestLogin,
      register,
      logout,
      refreshSubscription,
      isLoading: state.isLoading,
      error: state.error,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useHasPermission = () => {
  const { userPermissions = [], isSuperAdmin } = useAuth();
  return (permissionId: string, requiredLevel: 'view' | 'edit' | 'full') => {
    return (
      isSuperAdmin || (userPermissions || []).some(
        (perm) =>
          perm?.permission_id === permissionId &&
          (requiredLevel === 'view' ||
            (requiredLevel === 'edit' && perm.access_level !== 'view') ||
            (requiredLevel === 'full' && perm.access_level === 'full'))
      )
    );
  };
};
