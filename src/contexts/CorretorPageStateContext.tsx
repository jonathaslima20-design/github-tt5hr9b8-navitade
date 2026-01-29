import React, { createContext, ReactNode } from 'react';

export interface CorretorPageState {
  currentPage: number;
  isSearchActive: boolean;
  filters: any;
  searchQuery: string;
  scrollPosition: number;
  slug: string;
  timestamp: number;
}

export interface CorretorPageStateContextType {
  state: CorretorPageState | null;
  saveState: (state: CorretorPageState) => void;
  restoreState: (slug: string) => CorretorPageState | null;
  clearState: (slug: string) => void;
}

export const CorretorPageStateContext = createContext<CorretorPageStateContextType | undefined>(undefined);

export function CorretorPageStateProvider({ children }: { children: ReactNode }) {
  const saveState = (state: CorretorPageState) => {
    const key = `corretor_page_state_${state.slug}`;
    try {
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save corretor page state:', error);
    }
  };

  const restoreState = (slug: string): CorretorPageState | null => {
    const key = `corretor_page_state_${slug}`;
    try {
      const stored = sessionStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to restore corretor page state:', error);
    }
    return null;
  };

  const clearState = (slug: string) => {
    const key = `corretor_page_state_${slug}`;
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to clear corretor page state:', error);
    }
  };

  const value: CorretorPageStateContextType = {
    state: null,
    saveState,
    restoreState,
    clearState,
  };

  return (
    <CorretorPageStateContext.Provider value={value}>
      {children}
    </CorretorPageStateContext.Provider>
  );
}
