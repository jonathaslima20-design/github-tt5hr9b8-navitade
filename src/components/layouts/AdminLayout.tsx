import { Outlet } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function AdminLayout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-muted/30">
      <AdminSidebar
        mobileOpen={mobileMenuOpen}
        onMobileToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />
      <div className="flex-1 flex flex-col">
        <AdminHeader onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <motion.main
          className="flex-1 p-3 md:p-6 lg:p-8 max-w-screen-2xl mx-auto w-full"
          key={location.pathname}
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
}