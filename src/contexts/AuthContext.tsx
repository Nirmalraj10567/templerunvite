import { createContext, useContext, useState, ReactNode } from 'react';
import { useEffect } from 'react';

type AuthContextType = {
  login: (mobile: string, username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
  error: string;
  user: User | null;
  token: string | null;
};

interface User {
  id: number;
  mobile: string;
  username: string;
  role: string;
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

const AuthContext = createContext<AuthContextType>({
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: () => {},
  isLoading: false,
  error: '',
  user: null,
  token: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Restore session from localStorage on first load
  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('userInfo');
    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        // If parsing fails, clear corrupted data
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
      }
    }
  }, []);

  const login = async (mobile: string, username: string, password: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:4000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, username, password }),
      });

      const data = await response.json();

      if (data.success) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userInfo', JSON.stringify(data.user));
        return { success: true };
      } else {
        setError(data.error || 'Login failed');
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (err) {
      setError('Network error. Please try again.');
      return { success: false, error: 'Network error' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:4000/api/register', {
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

      const data = await response.json();

      if (data.success) {
        return { success: true };
      } else {
        setError(data.error || 'Registration failed');
        return { success: false, error: data.error };
      }
    } catch (err) {
      setError('Network error. Please try again.');
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
  };

  return (
    <AuthContext.Provider value={{ login, register, logout, isLoading, error, user, token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
