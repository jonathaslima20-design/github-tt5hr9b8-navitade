import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getReferralStats } from '@/lib/referralUtils';
import type { ReferralStats, ReferralCommission, WithdrawalRequest, UserPixKey } from '@/types';

interface UseReferralDataReturn {
  stats: ReferralStats | null;
  commissions: ReferralCommission[];
  withdrawals: WithdrawalRequest[];
  pixKeys: UserPixKey[];
  referralLink: string;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

export function useReferralData(userId: string | undefined): UseReferralDataReturn {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [commissions, setCommissions] = useState<ReferralCommission[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [pixKeys, setPixKeys] = useState<UserPixKey[]>([]);
  const [referralLink, setReferralLink] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('[ReferralData] Fetching data for user:', userId);

      const { data: user, error: userError } = await supabase
        .from('users')
        .select('referral_code')
        .eq('id', userId)
        .single();

      console.log('[ReferralData] User data:', user, 'Error:', userError);

      if (userError) {
        console.error('[ReferralData] Error fetching user:', userError);
        setError('Erro ao carregar dados do usuário');
      }

      let referralCode = user?.referral_code;

      if (!referralCode) {
        console.log('[ReferralData] No referral code found, generating one...');
        referralCode = `REF${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

        const { error: updateError } = await supabase
          .from('users')
          .update({ referral_code: referralCode })
          .eq('id', userId);

        if (updateError) {
          console.error('[ReferralData] Error updating referral code:', updateError);
        } else {
          console.log('[ReferralData] Generated new referral code:', referralCode);
        }
      }

      if (referralCode) {
        const baseUrl = window.location.origin;
        setReferralLink(`${baseUrl}/register?ref=${referralCode}`);
      }

      console.log('[ReferralData] Fetching referral stats...');
      const referralStats = await getReferralStats(userId);
      console.log('[ReferralData] Stats:', referralStats);
      setStats(referralStats);

      console.log('[ReferralData] Fetching commissions...');
      const { data: commissionsData, error: commissionsError } = await supabase
        .from('referral_commissions')
        .select(`
          *,
          referred_user:users!referral_commissions_referred_user_id_fkey(name, email),
          subscription:subscriptions(plan_name, status)
        `)
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false });

      if (commissionsError) {
        console.error('[ReferralData] Error fetching commissions:', commissionsError);
      }
      console.log('[ReferralData] Commissions:', commissionsData);
      setCommissions(commissionsData || []);

      console.log('[ReferralData] Fetching withdrawals...');
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (withdrawalsError) {
        console.error('[ReferralData] Error fetching withdrawals:', withdrawalsError);
      }
      console.log('[ReferralData] Withdrawals:', withdrawalsData);
      setWithdrawals(withdrawalsData || []);

      console.log('[ReferralData] Fetching PIX keys...');
      const { data: pixKeysData, error: pixKeysError } = await supabase
        .from('user_pix_keys')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (pixKeysError) {
        console.error('[ReferralData] Error fetching PIX keys:', pixKeysError);
      }
      console.log('[ReferralData] PIX keys:', pixKeysData);
      setPixKeys(pixKeysData || []);

    } catch (err) {
      console.error('[ReferralData] Error fetching referral data:', err);
      setError('Erro ao carregar dados de indicações');
    } finally {
      console.log('[ReferralData] Fetch complete, loading:', false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  return {
    stats,
    commissions,
    withdrawals,
    pixKeys,
    referralLink,
    isLoading,
    error,
    refreshData: fetchData
  };
}
