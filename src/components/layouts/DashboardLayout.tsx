import { Outlet } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { motion } from 'framer-motion';
import { useEffect } from 'react';

export default function DashboardLayout() {
  const location = useLocation();
  
  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-muted/30">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardHeader />
        <motion.main
          className="flex-1 w-full"
          key={location.pathname}
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
}