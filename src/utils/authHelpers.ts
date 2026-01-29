/**
 * Helper utilities for authentication throughout the app
 */

import { 
  getStoredUser, 
  isAuthenticated, 
  clearAllStoredData,
  type StoredUser 
} from '@/lib/auth/simpleAuth';

/**
 * Get current authenticated user
 */
export function getCurrentUser(): StoredUser | null {
  if (!isAuthenticated()) {
    return null;
  }
  
  return getStoredUser();
}

/**
 * Check if current user has specific role
 */
export function hasUserRole(role: string | string[]): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  
  const roles = Array.isArray(role) ? role : [role];
  return roles.includes(user.role);
}

/**
 * Redirect to login if not authenticated
 */
export function redirectIfNotAuthenticated(): boolean {
  if (!isAuthenticated()) {
    window.location.href = '/login';
    return true;
  }
  return false;
}

/**
 * Force logout and redirect
 */
export function forceLogout(reason?: string): void {
  console.log('🔐 Force logout triggered:', reason);
  clearAllStoredData();
  window.location.href = '/login';
}

/**
 * Get user display name
 */
export function getUserDisplayName(): string {
  const user = getCurrentUser();
  return user?.name || 'Usuário';
}

/**
 * Get user avatar URL
 */
export function getUserAvatarUrl(): string | null {
  const user = getCurrentUser();
  return user?.avatar_url || null;
}

/**
 * Check if user can access admin features
 */
export function canAccessAdmin(): boolean {
  return hasUserRole(['admin', 'parceiro']);
}

/**
 * Check if user can manage other users
 */
export function canManageUsers(): boolean {
  return hasUserRole(['admin', 'parceiro']);
}

/**
 * Check if user can create products
 */
export function canCreateProducts(): boolean {
  return hasUserRole(['admin', 'parceiro', 'corretor']);
}

/**
 * Get user's storefront URL
 */
export function getUserStorefrontUrl(): string | null {
  const user = getCurrentUser();
  if (!user?.slug) return null;
  
  return `/${user.slug}`;
}

/**
 * Format user role for display
 */
export function formatUserRole(role: string): string {
  switch (role) {
    case 'admin':
      return 'Administrador';
    case 'parceiro':
      return 'Parceiro';
    case 'corretor':
      return 'Vendedor';
    default:
      return role;
  }
}