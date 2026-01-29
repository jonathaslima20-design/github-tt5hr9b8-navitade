import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User as AppUser } from '@/types';
import { 
  authenticateUser, 
  registerUser, 
  logoutUser, 
  updateUserProfile, 
  autoLogin,
  getStoredUser,
  isAuthenticated,
  validateSession,
  extendSession,
  type StoredUser 
} from '@/lib/auth/simpleAuth';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, userData: { name: string; niche_type?: string; whatsapp?: string }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<AppUser>) => Promise<{ error: string | null }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize authentication state
  useEffect(() => {
    initializeAuth();
    
    // Set up session validation interval
    const sessionInterval = setInterval(() => {
      if (isAuthenticated()) {
        validateSession();
        extendSession();
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(sessionInterval);
  }, []);

  const initializeAuth = async () => {
    try {
      console.log('🔐 Initializing simplified auth...');
      
      // Try to get stored user first
      const storedUser = getStoredUser();
      if (storedUser && isAuthenticated()) {
        setUser(storedUser);
        setLoading(false);
        console.log('✅ User restored from localStorage');
        return;
      }
      
      // Try auto-login with stored credentials
      const { user: autoLoginUser, error } = await autoLogin();
      if (autoLoginUser && !error) {
        setUser(autoLoginUser);
        console.log('✅ Auto-login successful');
      } else {
        console.log('ℹ️ No valid stored session found');
      }
      
    } catch (error) {
      console.error('❌ Auth initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { user: authenticatedUser, error } = await authenticateUser(email, password);
      
      if (error) {
        return { error };
      }
      
      if (authenticatedUser) {
        setUser(authenticatedUser);
      }
      
      return { error: null };
    } catch (err: any) {
      console.error('❌ SignIn error:', err);
      return { error: err.message || 'Erro inesperado no login' };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData: { name: string; niche_type?: string; whatsapp?: string }) => {
    try {
      setLoading(true);
      const { user: registeredUser, error } = await registerUser(email, password, userData);
      
      if (error) {
        return { error };
      }
      
      if (registeredUser) {
        setUser(registeredUser);
      }
      
      return { error: null };
    } catch (err: any) {
      console.error('❌ SignUp error:', err);
      return { error: err.message || 'Erro inesperado no cadastro' };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await logoutUser();
      setUser(null);
    } catch (error) {
      console.error('❌ SignOut error:', error);
      // Clear user state even if logout fails
      setUser(null);
    }
  };

  const updateUser = async (updates: Partial<AppUser>) => {
    try {
      const { user: updatedUser, error } = await updateUserProfile(updates);
      
      if (error) {
        return { error };
      }
      
      if (updatedUser) {
        setUser(updatedUser);
      }
      
      return { error: null };
    } catch (error: any) {
      console.error('❌ UpdateUser error:', error);
      return { error: error.message || 'Erro ao atualizar usuário' };
    }
  };

  const refreshUser = async () => {
    try {
      const storedUser = getStoredUser();
      if (storedUser && validateSession()) {
        setUser(storedUser);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('❌ RefreshUser error:', error);
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};