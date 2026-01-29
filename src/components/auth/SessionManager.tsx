import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { validateSession, extendSession } from '@/lib/auth/simpleAuth';
import { trackActivity } from '@/lib/auth/authUtils';

/**
 * Component for managing user session and activity tracking
 */
export default function SessionManager() {
  const { refreshUser } = useAuth();

  useEffect(() => {
    // Set up activity tracking
    const trackUserActivity = () => {
      trackActivity();
    };

    // Track activity on user interactions
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, trackUserActivity, { passive: true });
    });

    // Set up session validation interval
    const sessionInterval = setInterval(() => {
      if (!validateSession()) {
        console.log('🔐 Session validation failed, refreshing user state');
        refreshUser();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    // Set up session extension interval
    const extensionInterval = setInterval(() => {
      extendSession();
    }, 30 * 60 * 1000); // Extend every 30 minutes

    return () => {
      // Cleanup event listeners
      events.forEach(event => {
        document.removeEventListener(event, trackUserActivity);
      });
      
      // Cleanup intervals
      clearInterval(sessionInterval);
      clearInterval(extensionInterval);
    };
  }, [refreshUser]);

  // This component doesn't render anything
  return null;
}