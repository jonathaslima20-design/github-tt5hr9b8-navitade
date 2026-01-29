import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface AdminDashboardStats {
  totalUsers: number;
  totalProducts: number;
  growthPercentage: number;
  totalRevenue: number;
  loading: boolean;
  error: string | null;
}

export function useAdminDashboardStats() {
  const [stats, setStats] = useState<AdminDashboardStats>({
    totalUsers: 0,
    totalProducts: 0,
    growthPercentage: 0,
    totalRevenue: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      setStats(prev => ({ ...prev, loading: true, error: null }));

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const [
        usersResponse,
        productsResponse,
        recentUsersResponse,
        previousUsersResponse,
        subscriptionsResponse,
      ] = await Promise.all([
        supabase
          .from('users')
          .select('id', { count: 'exact', head: true }),

        supabase
          .from('products')
          .select('id', { count: 'exact', head: true }),

        supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString()),

        supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', sixtyDaysAgo.toISOString())
          .lt('created_at', thirtyDaysAgo.toISOString()),

        supabase
          .from('subscriptions')
          .select('monthly_price')
          .eq('status', 'active')
          .gte('created_at', thirtyDaysAgo.toISOString()),
      ]);

      const recentUsersCount = recentUsersResponse.count || 0;
      const previousUsersCount = previousUsersResponse.count || 0;

      let growthPercentage = 0;
      if (previousUsersCount > 0) {
        growthPercentage = ((recentUsersCount - previousUsersCount) / previousUsersCount) * 100;
      } else if (recentUsersCount > 0) {
        growthPercentage = 100;
      }

      const totalRevenue = subscriptionsResponse.data?.reduce(
        (sum, sub) => sum + (sub.monthly_price || 0),
        0
      ) || 0;

      setStats({
        totalUsers: usersResponse.count || 0,
        totalProducts: productsResponse.count || 0,
        growthPercentage: Math.round(growthPercentage * 10) / 10,
        totalRevenue,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      setStats(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erro ao carregar estatísticas',
      }));
    }
  };

  const refresh = () => {
    fetchAdminStats();
  };

  return { ...stats, refresh };
}
