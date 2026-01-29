import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Subscription, Payment } from '@/types';

interface UserSubscriptionData {
  subscription: Subscription | null;
  recentPayments: Payment[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUserSubscription(userId: string | undefined): UserSubscriptionData {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: subscriptionData, error: subError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          user:user_id (
            name,
            email
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError) throw subError;

      setSubscription(subscriptionData);

      if (subscriptionData) {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select(`
            *,
            subscription:subscription_id (
              user:user_id (
                name,
                email
              )
            )
          `)
          .eq('subscription_id', subscriptionData.id)
          .order('payment_date', { ascending: false })
          .limit(5);

        if (paymentsError) throw paymentsError;

        setRecentPayments(paymentsData || []);
      } else {
        setRecentPayments([]);
      }
    } catch (err: any) {
      console.error('Error fetching subscription data:', err);
      setError(err.message || 'Erro ao carregar dados de assinatura');
      setSubscription(null);
      setRecentPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    await fetchData();
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  return {
    subscription,
    recentPayments,
    loading,
    error,
    refetch,
  };
}
