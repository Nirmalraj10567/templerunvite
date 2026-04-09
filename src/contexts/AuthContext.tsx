import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { setGlobalLogoutCallback, isTokenExpired } from '@/lib/apiClient';

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

interface UserPermission {
  permission_id: string;
  access_level: 'view' | 'edit' | 'full';
}

interface RegisterData {
  name: string;
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
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
  error: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  userPermissions: UserPermission[];
  isSuperAdmin: boolean;
  temple: Temple | null;
  isLoading: boolean;
  error: string;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  userPermissions: [], // already initialized
  isSuperAdmin: false,
  temple: null,
  login: async () => {},
  register: async () => ({ success: false, error: 'Not initialized' }),
  logout: () => {},
  isLoading: false,
  error: '',
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    userPermissions: [],
    isSuperAdmin: false,
    temple: null,
    isLoading: true,
    error: '',
  });

  // Function to fetch temple data
  const fetchTempleData = async (templeId: number, token: string): Promise<Temple | null> => {
    try {
      const response = await fetch(`http://localhost:4000/api/temples/${templeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch temple data');
        return null;
      }

      const data = await response.json();
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
    
    if (savedToken && savedUser) {
      // Check if token is expired before restoring session
      if (isTokenExpired(savedToken)) {
        console.warn('Saved token is expired, clearing session');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('userPermissions');
        localStorage.removeItem('templeInfo');
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
        isLoading: false,
      }));
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = async (identifier: string, password: string) => {
    if (!identifier || !password) {
      setState(prev => ({ ...prev, error: 'Username/Mobile and password are required', isLoading: false }));
      return;
    }
    // Allow either username or mobile number; backend accepts either
    
    setState(prev => ({ ...prev, isLoading: true, error: '' }));
    
    try {
      const response = await fetch('http://localhost:4000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: identifier, username: identifier, password }),
      });

      const loginData = await response.json();
      if (!response.ok) {
        throw new Error(loginData.error || 'Login failed');
      }
      
      // Check if user is blocked
      if (loginData.user?.status === 'blocked') {
        throw new Error('Your account has been blocked. Please contact support.');
      }

      const { token, user } = loginData;
      const permsFromLogin = (user?.permissions || []).map((p: any) => ({
        permission_id: p.permission_id || p.id,
        access_level: p.access_level || p.access,
      })) as UserPermission[];

      // Fetch temple data if user has templeId
      let templeData: Temple | null = null;
      if (user?.templeId) {
        templeData = await fetchTempleData(user.templeId, token);
      }

      setState(prev => ({
        ...prev,
        token,
        user,
        userPermissions: permsFromLogin,
        isSuperAdmin: user.mobile === '9999999999',
        temple: templeData,
        isLoading: false,
      }));
      localStorage.setItem('authToken', token);
      localStorage.setItem('userInfo', JSON.stringify(user));
      localStorage.setItem('userPermissions', JSON.stringify(permsFromLogin));
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

  const register = async (userData: RegisterData) => {
    setState(prev => ({ ...prev, isLoading: true, error: '' }));
    
    try {
      const response = await fetch('http://localhost:4000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: userData.mobileNumber,
          username: (userData.username?.trim() || userData.name.replace(/\s+/g, '').toLowerCase()),
          password: userData.password,
          email: userData.gmail,
          fullName: userData.name,
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors or other API errors
        const errorMessage = data.message || data.error || 'Registration failed';
        throw new Error(errorMessage);
      }

      if (data.success) {
        // Ensure loading state is cleared on success
        setState(prev => ({ ...prev, isLoading: false, error: '' }));
        return { success: true };
      } else {
        const message = data.message || data.error || 'Registration failed';
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
      isLoading: false,
      error: '',
    });
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('userPermissions');
    localStorage.removeItem('templeInfo');
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
      login,
      register,
      logout,
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
