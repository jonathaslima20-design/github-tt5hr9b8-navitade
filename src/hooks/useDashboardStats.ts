import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardStats {
  totalProducts: number;
  totalViews: number;
  uniqueVisitors: number;
  totalLeads: number;
  loading: boolean;
  error: string | null;
}

export function useDashboardStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalViews: 0,
    uniqueVisitors: 0,
    totalLeads: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!user?.id) {
      setStats({
        totalProducts: 0,
        totalViews: 0,
        uniqueVisitors: 0,
        totalLeads: 0,
        loading: false,
        error: null,
      });
      return;
    }

    fetchDashboardStats();
  }, [user?.id]);

  const fetchDashboardStats = async () => {
    if (!user?.id) return;

    try {
      setStats(prev => ({ ...prev, loading: true, error: null }));

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id);

      if (productsError) throw productsError;

      const productIds = products?.map(p => p.id) || [];

      const [viewsResponse, uniqueVisitorsResponse, leadsResponse] = await Promise.all([
        supabase
          .from('property_views')
          .select('id', { count: 'exact', head: true })
          .in('property_id', productIds.length > 0 ? productIds : ['00000000-0000-0000-0000-000000000000'])
          .gte('viewed_at', thirtyDaysAgo.toISOString()),

        supabase
          .from('property_views')
          .select('viewer_id')
          .in('property_id', productIds.length > 0 ? productIds : ['00000000-0000-0000-0000-000000000000'])
          .gte('viewed_at', thirtyDaysAgo.toISOString()),

        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .in('property_id', productIds.length > 0 ? productIds : ['00000000-0000-0000-0000-000000000000'])
          .gte('created_at', thirtyDaysAgo.toISOString()),
      ]);

      const uniqueViewerIds = new Set(
        uniqueVisitorsResponse.data?.map(v => v.viewer_id) || []
      );

      setStats({
        totalProducts: products?.length || 0,
        totalViews: viewsResponse.count || 0,
        uniqueVisitors: uniqueViewerIds.size,
        totalLeads: leadsResponse.count || 0,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setStats(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erro ao carregar estatísticas',
      }));
    }
  };

  const refresh = () => {
    fetchDashboardStats();
  };

  return { ...stats, refresh };
}
