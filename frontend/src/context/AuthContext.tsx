import React, { createContext, useContext, useState, useCallback } from 'react';
import { Region, User } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, region: Region) => Promise<boolean>;
  logout: () => void;
  selectedRegion: Region | null;
  setSelectedRegion: (region: Region | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Static credentials for Phase 1
const CREDENTIALS: Record<Region, { email: string; password: string }> = {
  russia: { email: 'russia@bora.tech', password: 'russia@54321' },
  dubai: { email: 'dubai@bora.tech', password: 'dubai@54321' },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);

  const login = useCallback(async (email: string, password: string, region: Region): Promise<boolean> => {
    const validCredentials = CREDENTIALS[region];
    
    if (email === validCredentials.email && password === validCredentials.password) {
      setUser({ email, region });
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setSelectedRegion(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        selectedRegion,
        setSelectedRegion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
