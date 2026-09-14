import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '../types';

const SESSION_KEY = 'fleetpro_admin_session';

interface AuthContextValue {
  admin: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setAdmin(JSON.parse(raw));
    } catch {
      /* ignore corrupt session */
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback((user: User) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    setAdmin(user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setAdmin(null);
  }, []);

  return <AuthContext.Provider value={{ admin, isLoading, login, logout }}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
