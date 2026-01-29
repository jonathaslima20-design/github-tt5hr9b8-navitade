import { supabase } from './supabase';
import type { ReferralStats } from '@/types';

/**
 * Utility functions for referral system
 */

/**
 * Get referral statistics for a user
 */
export async function getReferralStats(userId: string): Promise<ReferralStats> {
  try {
    // Get all commissions for this user
    const { data: commissions, error: commissionsError } = await supabase
      .from('referral_commissions')
      .select(`
        *,
        subscription:subscriptions(status)
      `)
      .eq('referrer_id', userId);

    if (commissionsError) throw commissionsError;

    // Get withdrawal requests
    const { data: withdrawals, error: withdrawalsError } = await supabase
      .from('withdrawal_requests')
      .select('amount, status')
      .eq('user_id', userId);

    if (withdrawalsError) throw withdrawalsError;

    // Calculate stats
    const totalCommissions = commissions?.reduce((sum, c) => sum + c.amount, 0) || 0;
    const pendingCommissions = commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0) || 0;
    const paidCommissions = commissions?.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0) || 0;
    
    // Calculate available for withdrawal (pending commissions - pending/approved withdrawals)
    const pendingWithdrawals = withdrawals?.filter(w => w.status === 'pending' || w.status === 'approved').reduce((sum, w) => sum + w.amount, 0) || 0;
    const availableForWithdrawal = Math.max(0, pendingCommissions - pendingWithdrawals);

    return {
      totalReferrals: commissions?.length || 0,
      activeReferrals: commissions?.filter(c => c.subscription?.status === 'active').length || 0,
      totalCommissions,
      pendingCommissions,
      paidCommissions,
      availableForWithdrawal,
    };
  } catch (error) {
    console.error('Error calculating referral stats:', error);
    return {
      totalReferrals: 0,
      activeReferrals: 0,
      totalCommissions: 0,
      pendingCommissions: 0,
      paidCommissions: 0,
      availableForWithdrawal: 0,
    };
  }
}

/**
 * Generate referral link for a user
 */
export function generateReferralLink(referralCode: string, baseUrl?: string): string {
  const base = baseUrl || window.location.origin;
  return `${base}/register?ref=${referralCode}`;
}

/**
 * Validate PIX key format based on type
 */
export function validatePixKey(key: string, type: string): boolean {
  const cleanKey = key.replace(/\D/g, ''); // Remove non-digits for CPF/CNPJ/Phone
  
  switch (type) {
    case 'cpf':
      return cleanKey.length === 11;
    case 'cnpj':
      return cleanKey.length === 14;
    case 'phone':
      return cleanKey.length === 10 || cleanKey.length === 11;
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key);
    case 'random':
      return key.length >= 8; // Minimum length for random keys
    default:
      return false;
  }
}

/**
 * Format PIX key for display
 */
export function formatPixKey(key: string, type: string): string {
  switch (type) {
    case 'cpf':
      const cpf = key.replace(/\D/g, '');
      return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    case 'cnpj':
      const cnpj = key.replace(/\D/g, '');
      return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    case 'phone':
      const phone = key.replace(/\D/g, '');
      if (phone.length === 11) {
        return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      } else if (phone.length === 10) {
        return phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
      }
      return key;
    default:
      return key;
  }
}

/**
 * Get commission amount based on plan type
 */
export function getCommissionAmount(planType: string): number {
  const planLower = planType.toLowerCase();
  
  if (planLower.includes('trimestral') || planLower.includes('3')) {
    return 50.00;
  } else if (planLower.includes('semestral') || planLower.includes('6')) {
    return 70.00;
  } else if (planLower.includes('anual') || planLower.includes('12') || planLower.includes('ano')) {
    return 100.00;
  }
  
  return 0.00;
}