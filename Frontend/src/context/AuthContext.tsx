import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { api } from '../api/client';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('matibox_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('matibox_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api.auth
      .me()
      .then((freshUser) => {
        setUser(freshUser);
        localStorage.setItem('matibox_user', JSON.stringify(freshUser));
      })
      .catch(() => {
        localStorage.removeItem('matibox_token');
        localStorage.removeItem('matibox_user');
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login(email, password);
    localStorage.setItem('matibox_token', res.token);
    localStorage.setItem('matibox_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('matibox_token');
    localStorage.removeItem('matibox_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
