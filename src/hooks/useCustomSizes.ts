import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface CustomSize {
  id: string;
  size_name: string;
  size_type: 'apparel' | 'shoe' | 'custom';
  created_at: string;
}

interface UseCustomSizesReturn {
  customSizes: string[];
  allSizesWithType: CustomSize[];
  loading: boolean;
  addCustomSize: (sizeName: string, sizeType?: 'apparel' | 'shoe' | 'custom') => Promise<boolean>;
  removeCustomSize: (sizeName: string) => Promise<boolean>;
  refreshCustomSizes: () => Promise<void>;
  getSizesByType: (sizeType: 'apparel' | 'shoe' | 'custom') => string[];
  error: string | null;
}

const CACHE_KEY = 'custom_sizes_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useCustomSizes(userId?: string): UseCustomSizesReturn {
  const [customSizes, setCustomSizes] = useState<string[]>([]);
  const [allSizesWithType, setAllSizesWithType] = useState<CustomSize[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<{ timestamp: number; data: CustomSize[] } | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const loadCustomSizes = useCallback(async (forceRefresh = false) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Check cache if not forcing refresh
    if (!forceRefresh && cacheRef.current && Date.now() - cacheRef.current.timestamp < CACHE_DURATION) {
      setAllSizesWithType(cacheRef.current.data);
      setCustomSizes(cacheRef.current.data.map(item => item.size_name));
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: queryError } = await supabase
        .from('user_custom_sizes')
        .select('id, size_name, size_type, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (queryError) throw queryError;

      const sizes = data as CustomSize[] || [];
      const sizeNames = sizes.map(item => item.size_name);

      // Update cache
      cacheRef.current = { timestamp: Date.now(), data: sizes };

      setAllSizesWithType(sizes);
      setCustomSizes(sizeNames);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar tamanhos personalizados';
      console.error('Error loading custom sizes:', err);
      setError(errorMessage);
      setCustomSizes([]);
      setAllSizesWithType([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const addCustomSize = useCallback(
    async (sizeName: string, sizeType: 'apparel' | 'shoe' | 'custom' = 'custom'): Promise<boolean> => {
      if (!userId || !sizeName.trim()) return false;

      try {
        setError(null);
        const trimmedSize = sizeName.trim().toUpperCase();

        // Check if size already exists locally
        if (customSizes.includes(trimmedSize)) {
          return true;
        }

        const { data, error: insertError } = await supabase
          .from('user_custom_sizes')
          .insert({
            user_id: userId,
            size_name: trimmedSize,
            size_type: sizeType,
          })
          .select();

        if (insertError) {
          // If it's a duplicate error, just ignore it
          if (insertError.code === '23505') {
            return true;
          }
          throw insertError;
        }

        // Update local state with new size
        if (data && data.length > 0) {
          const newSize = data[0] as CustomSize;
          setAllSizesWithType(prev => [...prev, newSize]);
          setCustomSizes(prev => [...prev, trimmedSize]);

          // Invalidate cache
          cacheRef.current = null;
        }

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao adicionar tamanho';
        console.error('Error adding custom size:', err);
        setError(errorMessage);
        return false;
      }
    },
    [userId, customSizes]
  );

  const removeCustomSize = useCallback(
    async (sizeName: string): Promise<boolean> => {
      if (!userId) return false;

      try {
        setError(null);
        const { error: deleteError } = await supabase
          .from('user_custom_sizes')
          .delete()
          .eq('user_id', userId)
          .eq('size_name', sizeName);

        if (deleteError) throw deleteError;

        // Update local state
        setCustomSizes(prev => prev.filter(size => size !== sizeName));
        setAllSizesWithType(prev => prev.filter(size => size.size_name !== sizeName));

        // Invalidate cache
        cacheRef.current = null;

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao remover tamanho';
        console.error('Error removing custom size:', err);
        setError(errorMessage);
        return false;
      }
    },
    [userId]
  );

  const refreshCustomSizes = useCallback(async () => {
    // Clear cache to force refresh
    cacheRef.current = null;
    await loadCustomSizes(true);
  }, [loadCustomSizes]);

  const getSizesByType = useCallback(
    (sizeType: 'apparel' | 'shoe' | 'custom') => {
      return allSizesWithType
        .filter(size => size.size_type === sizeType)
        .map(size => size.size_name);
    },
    [allSizesWithType]
  );

  useEffect(() => {
    loadCustomSizes();
  }, [userId, loadCustomSizes]);

  return {
    customSizes,
    allSizesWithType,
    loading,
    addCustomSize,
    removeCustomSize,
    refreshCustomSizes,
    getSizesByType,
    error,
  };
}