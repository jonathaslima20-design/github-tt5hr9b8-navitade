import { PostgrestError, PostgrestFilterBuilder, PostgrestBuilder } from '@supabase/postgrest-js';
import { supabase } from './supabase';

interface RetryConfig {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

const defaultConfig: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 5000,
  backoffFactor: 2,
};

/**
 * Calculates the delay for the next retry attempt using exponential backoff
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const { initialDelay = 1000, maxDelay = 5000, backoffFactor = 2 } = config;
  const delay = initialDelay * Math.pow(backoffFactor, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Checks if an error is a session error that requires refreshing the token
 */
function isSessionError(error: PostgrestError | null): boolean {
  if (!error) return false;
  return error.code === '401' || 
         error.message.includes('JWT expired') || 
         error.message.includes('Invalid JWT') ||
         error.message.includes('jwt') ||
         error.message.includes('token');
}

/**
 * Executes a Supabase query with automatic retries and session refresh
 */
export async function fetchFromSupabase<T>(
  query: PostgrestFilterBuilder<any, any, T[]> | PostgrestBuilder<any>,
  config: RetryConfig = {}
): Promise<{ data: T | null; error: PostgrestError | null }> {
  const mergedConfig = { ...defaultConfig, ...config };
  let lastError: PostgrestError | null = null;
  let attempt = 0;

  while (attempt < (mergedConfig.maxRetries || 3)) {
    try {
      console.log(`🔄 Database query attempt ${attempt + 1}/${mergedConfig.maxRetries}`);
      
      // Execute the query
      const { data, error } = await query;

      // If successful, return the result
      if (!error) {
        console.log('✅ Database query successful');
        return { data, error: null };
      }

      // If it's a session error, try to refresh the session
      if (isSessionError(error)) {
        console.log('🔑 JWT error detected, attempting to refresh session...');
        const { data: session, error: refreshError } = await supabase.auth.refreshSession();
        if (session && !refreshError) {
          console.log('✅ Session refreshed successfully, retrying...');
          // Retry immediately after session refresh
          continue;
        } else {
          console.log('❌ Session refresh failed, redirecting to login...');
          // If refresh fails, redirect to login
          window.location.href = '/login';
          return { data: null, error };
        }
      }

      lastError = error;

      // Calculate delay for next retry
      const delay = calculateDelay(attempt, mergedConfig);
      await new Promise(resolve => setTimeout(resolve, delay));

      attempt++;
    } catch (err) {
      console.error('❌ Error in fetchFromSupabase:', err);
      lastError = err as PostgrestError;
      
      // Calculate delay for next retry
      const delay = calculateDelay(attempt, mergedConfig);
      await new Promise(resolve => setTimeout(resolve, delay));

      attempt++;
    }
  }

  // If all retries failed, return the last error
  return { data: null, error: lastError };
}

/**
 * Executes a Supabase storage operation with automatic retries
 */
export async function storageFromSupabase(
  operation: () => Promise<{ data: any; error: Error | null }>,
  config: RetryConfig = {}
): Promise<{ data: any; error: Error | null }> {
  const mergedConfig = { ...defaultConfig, ...config };
  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt < (mergedConfig.maxRetries || 3)) {
    try {
      const { data, error } = await operation();

      if (!error) {
        return { data, error: null };
      }

      lastError = error;

      // Calculate delay for next retry
      const delay = calculateDelay(attempt, mergedConfig);
      await new Promise(resolve => setTimeout(resolve, delay));

      attempt++;
    } catch (err) {
      console.error('Error in storageFromSupabase:', err);
      lastError = err as Error;
      
      // Calculate delay for next retry
      const delay = calculateDelay(attempt, mergedConfig);
      await new Promise(resolve => setTimeout(resolve, delay));

      attempt++;
    }
  }

  // If all retries failed, return the last error
  return { data: null, error: lastError };
}

/**
 * Helper function to handle Supabase query with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const mergedConfig = { ...defaultConfig, ...config };
  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt < (mergedConfig.maxRetries || 3)) {
    try {
      return await operation();
    } catch (err) {
      console.error('Error in withRetry:', err);
      lastError = err as Error;

      if (err instanceof Error && (err.message.includes('JWT') || err.message.includes('token'))) {
        console.log('JWT error in withRetry, attempting session refresh...');
        const { data: session, error: refreshError } = await supabase.auth.refreshSession();
        if (session && !refreshError) {
          console.log('Session refreshed in withRetry, retrying...');
          // Retry immediately after session refresh
          continue;
        }
      }
      
      // Calculate delay for next retry
      const delay = calculateDelay(attempt, mergedConfig);
      await new Promise(resolve => setTimeout(resolve, delay));

      attempt++;
    }
  }

  // If all retries failed, throw the last error
  throw lastError;
}

/**
 * Helper function to handle Supabase batch operations with retry logic
 */
export async function withBatchRetry<T>(
  operations: (() => Promise<T>)[],
  config: RetryConfig = {}
): Promise<T[]> {
  return Promise.all(operations.map(op => withRetry(op, config)));
}

// Export a pre-configured instance for common use cases
export const db = {
  fetch: fetchFromSupabase,
  storage: storageFromSupabase,
  retry: withRetry,
  batchRetry: withBatchRetry,
};