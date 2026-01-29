import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader } from 'lucide-react';
import { isAuthenticated } from '@/lib/auth/simpleAuth';

export default function AdminRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Additional check with simplified auth
  const isSimpleAuth = isAuthenticated();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If no user or not authenticated, redirect to login
  if (!user || !isSimpleAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If not admin or partner, redirect to dashboard
  if (user.role !== 'admin' && user.role !== 'parceiro') {
    return <Navigate to="/dashboard" replace />;
  }

  // If partner and trying to access settings, redirect to users
  if (user.role === 'parceiro' && location.pathname === '/admin/settings') {
    return <Navigate to="/admin/users" replace />;
  }

  // Allow access to admin routes
  return <Outlet />;
}