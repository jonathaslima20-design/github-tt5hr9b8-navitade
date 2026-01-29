import { Outlet } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Loader } from 'lucide-react';
import { scrollCoordinator } from '@/lib/scrollCoordinator';

export default function PublicLayout() {
  const location = useLocation();

  useEffect(() => {
    const isReturningFromProduct = (location.state as any)?.from === 'product-detail';
    const isRestoringScroll = scrollCoordinator.isScrollRestorationInProgress();

    if (!isReturningFromProduct && !isRestoringScroll) {
      window.scrollTo(0, 0);
    }
  }, [location.state]);

  // Only hide Footer on auth pages
  const hideFooter = ['/login', '/register', '/reset-password'].includes(location.pathname);

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <motion.main 
        className="flex-1"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        key={location.pathname}
      >
        <Outlet />
      </motion.main>
      {!hideFooter && <Footer />}
    </div>
  );
}