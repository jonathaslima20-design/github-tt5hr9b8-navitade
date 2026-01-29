import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface SubscriptionModalContextType {
  isOpen: boolean;
  isForced: boolean;
  openModal: (forced?: boolean) => void;
  closeModal: () => void;
  setForced: (forced: boolean) => void;
}

const SubscriptionModalContext = createContext<SubscriptionModalContextType | undefined>(undefined);

export function SubscriptionModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isForced, setIsForced] = useState(false);

  const openModal = useCallback((forced = false) => {
    setIsOpen(true);
    setIsForced(forced);
  }, []);

  const closeModal = useCallback(() => {
    if (!isForced) {
      setIsOpen(false);
    }
  }, [isForced]);

  const setForcedState = useCallback((forced: boolean) => {
    setIsForced(forced);
    if (!forced && isOpen) {
      setIsOpen(false);
    }
  }, [isOpen]);

  const value = {
    isOpen,
    isForced,
    openModal,
    closeModal,
    setForced: setForcedState,
  };

  return (
    <SubscriptionModalContext.Provider value={value}>
      {children}
    </SubscriptionModalContext.Provider>
  );
}

export function useSubscriptionModal() {
  const context = useContext(SubscriptionModalContext);
  if (context === undefined) {
    throw new Error('useSubscriptionModal must be used within SubscriptionModalProvider');
  }
  return context;
}
