/**
 * Authentication utilities for simplified auth system
 */

import { 
  getStoredUser, 
  isAuthenticated, 
  validateSession, 
  extendSession,
  clearAllStoredData,
  type StoredUser 
} from './simpleAuth';

/**
 * Hook for authentication state management
 */
export function useAuthState() {
  const user = getStoredUser();
  const authenticated = isAuthenticated();
  
  return {
    user,
    isAuthenticated: authenticated,
    isLoading: false
  };
}

/**
 * Middleware for protecting routes
 */
export function requireAuth(): StoredUser | null {
  if (!isAuthenticated()) {
    return null;
  }
  
  const user = getStoredUser();
  if (!user) {
    clearAllStoredData();
    return null;
  }
  
  // Extend session on activity
  extendSession();
  
  return user;
}

/**
 * Check if user has specific role
 */
export function hasRole(requiredRole: string | string[]): boolean {
  const user = getStoredUser();
  if (!user || !isAuthenticated()) {
    return false;
  }
  
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return roles.includes(user.role);
}

/**
 * Check if user is admin
 */
export function isAdmin(): boolean {
  return hasRole('admin');
}

/**
 * Check if user is partner
 */
export function isPartner(): boolean {
  return hasRole('parceiro');
}

/**
 * Check if user is corretor
 */
export function isCorretor(): boolean {
  return hasRole('corretor');
}

/**
 * Get user permissions
 */
export function getUserPermissions(): {
  canManageUsers: boolean;
  canManageFinances: boolean;
  canManageSettings: boolean;
  canCreateProducts: boolean;
  canViewAnalytics: boolean;
} {
  const user = getStoredUser();
  if (!user || !isAuthenticated()) {
    return {
      canManageUsers: false,
      canManageFinances: false,
      canManageSettings: false,
      canCreateProducts: false,
      canViewAnalytics: false,
    };
  }
  
  const isAdminUser = user.role === 'admin';
  const isPartnerUser = user.role === 'parceiro';
  const isCorretorUser = user.role === 'corretor';
  
  return {
    canManageUsers: isAdminUser || isPartnerUser,
    canManageFinances: isAdminUser,
    canManageSettings: isAdminUser,
    canCreateProducts: isCorretorUser || isAdminUser || isPartnerUser,
    canViewAnalytics: isAdminUser || isPartnerUser || isCorretorUser,
  };
}

/**
 * Session activity tracker
 */
export function trackActivity(): void {
  if (isAuthenticated()) {
    extendSession();
  }
}

/**
 * Auto-logout on session expiry
 */
export function setupSessionMonitoring(onSessionExpired: () => void): () => void {
  const interval = setInterval(() => {
    if (!validateSession()) {
      console.log('🔐 Session expired, logging out...');
      clearAllStoredData();
      onSessionExpired();
    }
  }, 30000); // Check every 30 seconds
  
  return () => clearInterval(interval);
}