import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  mobile: string;
  role: string;
  templeId?: number;
}

interface UserPermission {
  permission_id: string;
  access_level: 'view' | 'edit' | 'full';
}

interface RegisterData {
  name: string;
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
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  userPermissions: UserPermission[];
  isSuperAdmin: boolean;
  isLoading: boolean;
  error: string;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  userPermissions: [], // already initialized
  isSuperAdmin: false,
  login: async () => {},
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
    isLoading: true,
    error: '',
  });

  // Restore session from localStorage on first load
  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('userInfo');
    const savedPermissions = localStorage.getItem('userPermissions');
    if (savedToken && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      const parsedPermissions: UserPermission[] = savedPermissions
        ? JSON.parse(savedPermissions)
        : (parsedUser.userPermissions || []).map((permission: any) => ({
            permission_id: permission.permission_id,
            access_level: permission.access_level,
          }));
      setState(prev => ({
        ...prev,
        token: savedToken,
        user: parsedUser,
        userPermissions: parsedPermissions,
        isSuperAdmin: parsedUser.mobile === '9999999999',
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

      setState(prev => ({
        ...prev,
        token,
        user,
        userPermissions: permsFromLogin,
        isSuperAdmin: user.mobile === '9999999999',
        isLoading: false,
      }));
      localStorage.setItem('authToken', token);
      localStorage.setItem('userInfo', JSON.stringify(user));
      localStorage.setItem('userPermissions', JSON.stringify(permsFromLogin));
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
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: userData.mobileNumber,
          username: userData.name.replace(/\s+/g, '').toLowerCase(),
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

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();

      if (data.success) {
        return { success: true };
      } else {
        setState(prev => ({ ...prev, error: data.error || 'Registration failed', isLoading: false }));
        return { success: false, error: data.error };
      }
    } catch (err) {
      setState(prev => ({ ...prev, error: 'Network error. Please try again.', isLoading: false }));
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const logout = () => {
    setState({
      user: null,
      token: null,
      userPermissions: [],
      isSuperAdmin: false,
      isLoading: false,
      error: '',
    });
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('userPermissions');
  };

  return (
    <AuthContext.Provider value={{
      user: state.user,
      token: state.token,
      userPermissions: state.userPermissions,
      isSuperAdmin: state.isSuperAdmin,
      login,
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
