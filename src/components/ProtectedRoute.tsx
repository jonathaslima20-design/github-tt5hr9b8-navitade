import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader } from 'lucide-react';
import { isAuthenticated } from '@/lib/auth/simpleAuth';
import SubscriptionBlocker from '@/components/SubscriptionBlocker';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  const isSimpleAuth = isAuthenticated();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isSimpleAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  if (user.role === 'parceiro') {
    return <Navigate to="/admin/users" replace />;
  }

  if (user.role === 'corretor') {
    return (
      <>
        <SubscriptionBlocker />
        <Outlet />
      </>
    );
  }

  return <Navigate to="/login" replace />;
}