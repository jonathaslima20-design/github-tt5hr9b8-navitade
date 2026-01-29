/**
 * Authentication middleware for API calls and route protection
 */

import { 
  isAuthenticated, 
  getStoredUser, 
  validateSession, 
  clearAllStoredData,
  extendSession 
} from './simpleAuth';

/**
 * Middleware to check authentication before API calls
 */
export function withAuth<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    // Validate session before API call
    if (!validateSession()) {
      clearAllStoredData();
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    
    // Extend session on API activity
    extendSession();
    
    return fn(...args);
  };
}

/**
 * Get authorization headers for API calls
 */
export function getAuthHeaders(): Record<string, string> {
  const user = getStoredUser();
  if (!user || !isAuthenticated()) {
    return {};
  }
  
  return {
    'Authorization': `Bearer ${user.sessionId}`,
    'X-User-ID': user.id,
    'X-User-Role': user.role,
  };
}

/**
 * Check if user has permission for specific action
 */
export function checkPermission(
  action: 'read' | 'write' | 'delete' | 'admin',
  resource?: string
): boolean {
  const user = getStoredUser();
  if (!user || !isAuthenticated()) {
    return false;
  }
  
  // Admin has all permissions
  if (user.role === 'admin') {
    return true;
  }
  
  // Partner permissions
  if (user.role === 'parceiro') {
    switch (action) {
      case 'read':
        return true;
      case 'write':
        return ['users', 'products'].includes(resource || '');
      case 'delete':
        return resource === 'users'; // Can delete users they created
      case 'admin':
        return false;
      default:
        return false;
    }
  }
  
  // Corretor permissions
  if (user.role === 'corretor') {
    switch (action) {
      case 'read':
        return true;
      case 'write':
        return ['products', 'profile'].includes(resource || '');
      case 'delete':
        return resource === 'products'; // Can delete own products
      case 'admin':
        return false;
      default:
        return false;
    }
  }
  
  return false;
}

/**
 * Require specific permission or throw error
 */
export function requirePermission(
  action: 'read' | 'write' | 'delete' | 'admin',
  resource?: string
): void {
  if (!checkPermission(action, resource)) {
    throw new Error('Permissão insuficiente para esta ação');
  }
}

/**
 * Enhanced API wrapper with authentication and permission checking
 */
export function createAuthenticatedAPI<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  requiredAction: 'read' | 'write' | 'delete' | 'admin' = 'read',
  resource?: string
) {
  return withAuth(async (...args: T): Promise<R> => {
    requirePermission(requiredAction, resource);
    return fn(...args);
  });
}