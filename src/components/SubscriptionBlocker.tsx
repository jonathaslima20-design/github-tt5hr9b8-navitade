import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionModal } from '@/contexts/SubscriptionModalContext';
import SubscriptionModal from '@/components/subscription/SubscriptionModal';

export default function SubscriptionBlocker() {
  const { user, loading } = useAuth();
  const { isOpen, isForced, setForced, openModal, closeModal } = useSubscriptionModal();

  useEffect(() => {
    if (loading || !user) return;

    const isAdmin = user.role === 'admin';
    const isParceiro = user.role === 'parceiro';
    const hasActivePlan = user.plan_status === 'active';
    const isCorretor = user.role === 'corretor';

    // Admin and parceiro roles should never see the modal
    if (isAdmin || isParceiro) {
      setForced(false);
      closeModal();
      return;
    }

    // Only corretor role can have subscription requirements
    if (!isCorretor) {
      setForced(false);
      closeModal();
      return;
    }

    // Show forced modal only if corretor doesn't have active plan
    if (!hasActivePlan && !isOpen) {
      openModal(true);
      setForced(true);
    }

    // Close modal if plan becomes active
    if (hasActivePlan && isOpen) {
      closeModal();
      setForced(false);
    }
  }, [user, loading, isOpen, setForced, openModal, closeModal]);

  return (
    <SubscriptionModal
      open={isOpen}
      onOpenChange={() => {
        // Modal only closes if not forced (plan is active)
      }}
      isForced={isForced}
    />
  );
}
