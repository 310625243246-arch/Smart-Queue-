import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { request, setAuthToken, clearAuthSession } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  switchRole: (role: 'ADMIN' | 'STAFF' | 'CUSTOMER') => Promise<User>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('smartqueue_user');
      const token = localStorage.getItem('smartqueue_token');
      if (token && isTokenExpired(token)) {
        clearAuthSession();
        return null;
      }
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    try {
      const savedToken = localStorage.getItem('smartqueue_token');
      if (savedToken && isTokenExpired(savedToken)) {
        clearAuthSession();
        return null;
      }
      return savedToken;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState<boolean>(true);

  const login = (newToken: string, newUser: User) => {
    setAuthToken(newToken);
    localStorage.setItem('smartqueue_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setLoading(false);
  };

  const logout = () => {
    clearAuthSession();
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  const switchRole = async (role: 'ADMIN' | 'STAFF' | 'CUSTOMER'): Promise<User> => {
    const data = await request<{ token: string; user: User }>('/auth/switch-role', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });

    login(data.token, data.user);
    return data.user;
  };

  const refreshProfile = async () => {
    const currentToken = localStorage.getItem('smartqueue_token');
    if (!currentToken || isTokenExpired(currentToken)) {
      logout();
      return;
    }
    try {
      const data = await request<{ user: User }>('/auth/me');
      setUser(data.user);
      localStorage.setItem('smartqueue_user', JSON.stringify(data.user));
    } catch (err: any) {
      if (err?.status === 401) {
        logout();
      }
    }
  };

  // Initial startup session restore and verification
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const storedToken = localStorage.getItem('smartqueue_token');
      if (!storedToken || isTokenExpired(storedToken)) {
        clearAuthSession();
        if (isMounted) {
          setToken(null);
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const data = await request<{ user: User }>('/auth/me');
        if (isMounted) {
          setUser(data.user);
          localStorage.setItem('smartqueue_user', JSON.stringify(data.user));
        }
      } catch (err: any) {
        if (err?.status === 401 && isMounted) {
          clearAuthSession();
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Listen for unauthorized 401 events dispatched from API client
  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
      setLoading(false);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, switchRole, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

