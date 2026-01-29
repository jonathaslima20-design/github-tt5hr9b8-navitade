import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { isAuthenticated, getStoredUser, validateSession } from '@/lib/auth/simpleAuth';
import type { User } from '@/types';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  fallbackPath?: string;
}

export default function AuthGuard({ 
  children, 
  requiredRole, 
  fallbackPath = '/login' 
}: AuthGuardProps) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Validate current session
      if (!validateSession()) {
        setLoading(false);
        return;
      }

      // Get authenticated user
      const authenticatedUser = getStoredUser();
      if (!authenticatedUser) {
        setLoading(false);
        return;
      }

      // Check role requirements
      if (requiredRole) {
        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (!roles.includes(authenticatedUser.role)) {
          setUser(null);
          setLoading(false);
          return;
        }
      }

      setUser(authenticatedUser);
    } catch (error) {
      console.error('Auth guard error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAuthenticated()) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}