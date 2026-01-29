import { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionModal } from '@/contexts/SubscriptionModalContext';

export function useSubscriptionCheck() {
  const { user } = useAuth();
  const { openModal, closeModal, setForced } = useSubscriptionModal();

  const checkPlanStatus = useCallback(() => {
    if (!user) {
      closeModal();
      return;
    }

    const isAdmin = user.role === 'admin';
    const isParceiro = user.role === 'parceiro';
    const hasActivePlan = user.plan_status === 'active';

    if (isAdmin || isParceiro) {
      closeModal();
      setForced(false);
      return;
    }

    if (!hasActivePlan) {
      openModal(true);
      setForced(true);
    } else {
      closeModal();
      setForced(false);
    }
  }, [user, openModal, closeModal, setForced]);

  useEffect(() => {
    checkPlanStatus();
  }, [checkPlanStatus]);

  return { hasActivePlan: user?.plan_status === 'active' };
}
