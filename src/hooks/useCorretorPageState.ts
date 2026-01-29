import { useContext, useEffect, useRef, useCallback } from 'react';
import { CorretorPageStateContext, CorretorPageState } from '@/contexts/CorretorPageStateContext';

interface UseCorretorPageStateOptions {
  slug: string;
  currentPage: number;
  isSearchActive: boolean;
  filters: any;
  searchQuery: string;
}

export function useCorretorPageState(options: UseCorretorPageStateOptions) {
  const context = useContext(CorretorPageStateContext);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstMountRef = useRef(true);

  if (!context) {
    throw new Error('useCorretorPageState must be used within CorretorPageStateProvider');
  }

  const { saveState, restoreState, clearState } = context;

  const saveCurrentState = useCallback((scrollPosition: number = 0) => {
    const state: CorretorPageState = {
      currentPage: options.currentPage,
      isSearchActive: options.isSearchActive,
      filters: options.filters,
      searchQuery: options.searchQuery,
      scrollPosition,
      slug: options.slug,
      timestamp: Date.now(),
    };
    saveState(state);
  }, [options, saveState]);

  const restoreCurrentState = useCallback((): CorretorPageState | null => {
    const state = restoreState(options.slug);
    // Only return state if it's recent (within 30 minutes)
    if (state && (Date.now() - state.timestamp) < 30 * 60 * 1000) {
      return state;
    }
    return null;
  }, [options.slug, restoreState]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const currentScrollPosition = window.scrollY || document.documentElement.scrollTop;
      saveCurrentState(currentScrollPosition);
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [options.currentPage, options.isSearchActive, options.filters, options.searchQuery, saveCurrentState]);

  useEffect(() => {
    return () => {
      if (!isFirstMountRef.current) {
        const currentScrollPosition = window.scrollY || document.documentElement.scrollTop;
        saveCurrentState(currentScrollPosition);
      }
    };
  }, [saveCurrentState]);

  return {
    restoreCurrentState,
    saveCurrentState,
    clearState: () => clearState(options.slug),
    isFirstMount: isFirstMountRef.current,
    setFirstMountDone: () => {
      isFirstMountRef.current = false;
    },
  };
}
