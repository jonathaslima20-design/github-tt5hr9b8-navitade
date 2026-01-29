import { useState, useEffect } from 'react';
import { 
  getStoredUser, 
  isAuthenticated, 
  validateSession,
  setupSessionMonitoring,
  type StoredUser 
} from '@/lib/auth/simpleAuth';

interface UseSimpleAuthReturn {
  user: StoredUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshAuth: () => void;
}

/**
 * Hook for simplified authentication state management
 */
export function useSimpleAuth(): UseSimpleAuthReturn {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isAuth, setIsAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = () => {
    try {
      const authenticated = isAuthenticated();
      const currentUser = authenticated ? getStoredUser() : null;
      
      setIsAuth(authenticated);
      setUser(currentUser);
      
      console.log('🔄 Auth state refreshed:', {
        authenticated,
        userId: currentUser?.id,
        userRole: currentUser?.role
      });
    } catch (error) {
      console.error('❌ Error refreshing auth:', error);
      setIsAuth(false);
      setUser(null);
    }
  };

  useEffect(() => {
    // Initial auth check
    refreshAuth();
    setIsLoading(false);
    
    // Set up session monitoring
    const cleanup = setupSessionMonitoring(() => {
      console.log('🔐 Session expired, clearing auth state');
      setUser(null);
      setIsAuth(false);
      // Redirect to login could be handled here
      window.location.href = '/login';
    });
    
    // Listen for storage changes (for multi-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('vitrineturbo_')) {
        refreshAuth();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      cleanup();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Periodic session validation
  useEffect(() => {
    if (isAuth) {
      const interval = setInterval(() => {
        if (!validateSession()) {
          refreshAuth();
        }
      }, 60000); // Check every minute
      
      return () => clearInterval(interval);
    }
  }, [isAuth]);

  return {
    user,
    isAuthenticated: isAuth,
    isLoading,
    refreshAuth
  };
}