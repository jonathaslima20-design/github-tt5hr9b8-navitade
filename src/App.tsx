import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { SubscriptionModalProvider } from '@/contexts/SubscriptionModalContext';
import { CorretorPageStateProvider } from '@/contexts/CorretorPageStateContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useEffect, useState, Suspense } from 'react';
import { CircleAlert as AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SessionManager from '@/components/auth/SessionManager';
import FloatingWhatsAppButton from '@/components/FloatingWhatsAppButton';

// Layouts
import PublicLayout from '@/components/layouts/PublicLayout';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import AdminLayout from '@/components/layouts/AdminLayout';

// Public Pages
import LoginPage from '@/pages/LoginPage.tsx';
import RegisterPage from '@/pages/RegisterPage.tsx';
import CorretorPage from '@/pages/CorretorPage.tsx';
import ProductDetailsPage from '@/pages/ProductDetailsPage.tsx';
import HelpCenterPage from '@/pages/HelpCenterPage.tsx';
import HelpCategoryPage from '@/pages/HelpCategoryPage.tsx';
import HelpArticlePage from '@/pages/HelpArticlePage.tsx';

// Dashboard Pages
import DashboardPage from '@/pages/dashboard/DashboardPage.tsx';
import SettingsPage from '@/pages/dashboard/SettingsPage.tsx';
import ListingsPage from '@/pages/dashboard/ListingsPage.tsx';
import CreateProductPage from '@/pages/dashboard/CreateProductPage.tsx';
import EditProductPage from '@/pages/dashboard/EditProductPage.tsx';
import TrackingSettingsPage from '@/pages/dashboard/TrackingSettingsPage.tsx';
import CategoriesPage from '@/pages/dashboard/CategoriesPage.tsx';
import ReferralPage from '@/pages/dashboard/ReferralPage.tsx';

// Admin Pages
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage.tsx';
import FinancialPage from '@/pages/admin/FinancialPage.tsx';
import UsersManagementPage from '@/pages/admin/UsersManagementPage.tsx';
import UserDetailPage from '@/pages/admin/UserDetailPage.tsx';
import CreateUserPage from '@/pages/admin/CreateUserPage.tsx';
import AdminSettingsPage from '@/pages/admin/SettingsPage.tsx';
import SubscriptionPlansPage from '@/pages/admin/SubscriptionPlansPage.tsx';
import ReferralManagementPage from '@/pages/admin/ReferralManagementPage.tsx';
import HelpManagementPage from '@/pages/admin/HelpManagementPage.tsx';

// Route Guards
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminRoute from '@/components/AdminRoute';

function AppContent() {
  const { isLoaded } = useTheme();
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Error boundary effect
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      
      if (event.error?.message?.includes('Supabase') || 
          event.error?.message?.includes('VITE_SUPABASE')) {
        setHasError(true);
        setErrorMessage(event.error.message);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      if (event.reason?.message?.includes('Supabase') || 
          event.reason?.message?.includes('VITE_SUPABASE')) {
        setHasError(true);
        setErrorMessage(event.reason.message);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Erro de Configuração
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="whitespace-pre-line">
                {errorMessage}
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2 text-sm">
              <p><strong>Ambiente:</strong> {import.meta.env.MODE}</p>
              <p><strong>Variáveis encontradas:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                {Object.keys(import.meta.env)
                  .filter(key => key.startsWith('VITE_'))
                  .map(key => (
                    <li key={key}>
                      {key}: {import.meta.env[key] ? '✅ Configurada' : '❌ Não encontrada'}
                    </li>
                  ))}
              </ul>
            </div>
            
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <SessionManager />
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Help Center Routes */}
          <Route path="/help" element={<HelpCenterPage />} />
          <Route path="/help/category/:categorySlug" element={<HelpCategoryPage />} />
          <Route path="/help/category/:categorySlug/:articleSlug" element={<HelpArticlePage />} />
          
          {/* Corretor Public Profile Routes */}
          <Route path="/:slug" element={<CorretorPage />} />
          <Route path="/:slug/produtos/:productId" element={<ProductDetailsPage />} />
        </Route>

        {/* Protected Dashboard Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/settings" element={<SettingsPage />} />
            <Route path="/dashboard/listings" element={<ListingsPage />} />
            <Route path="/dashboard/products/new" element={<CreateProductPage />} />
            <Route path="/dashboard/products/:id/edit" element={<EditProductPage />} />
            <Route path="/dashboard/categories" element={<CategoriesPage />} />
            <Route path="/dashboard/referral" element={<ReferralPage />} />
          </Route>
        </Route>

        {/* Protected Admin Routes */}
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/plans" element={<SubscriptionPlansPage />} />
            <Route path="/admin/users" element={<UsersManagementPage />} />
            <Route path="/admin/users/new" element={<CreateUserPage />} />
            <Route path="/admin/users/:userId" element={<UserDetailPage />} />
            <Route path="/admin/referrals" element={<ReferralManagementPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            <Route path="/admin/help" element={<HelpManagementPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <SubscriptionModalProvider>
            <CartProvider>
              <CorretorPageStateProvider>
                <AppContent />
                <Toaster />
                <FloatingWhatsAppButton />
              </CorretorPageStateProvider>
            </CartProvider>
          </SubscriptionModalProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}