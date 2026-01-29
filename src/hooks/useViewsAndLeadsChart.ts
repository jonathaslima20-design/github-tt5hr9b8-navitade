import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export interface ChartDataPoint {
  date: string;
  views: number;
  leads: number;
}

interface UseViewsAndLeadsChartReturn {
  data: ChartDataPoint[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useViewsAndLeadsChart(days: number = 7): UseViewsAndLeadsChartReturn {
  const { user } = useAuth();
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChartData = async () => {
    if (!user?.id) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('📊 Fetching products for user:', user.id);
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id);

      if (productsError) throw productsError;

      const productIds = products?.map(p => p.id) || [];
      console.log('📊 Found products:', productIds.length);

      if (productIds.length === 0) {
        console.log('📊 No products found, showing empty chart');
        const emptyData = generateEmptyData(days);
        setData(emptyData);
        setLoading(false);
        return;
      }

      const startDate = startOfDay(subDays(new Date(), days - 1));
      const endDate = endOfDay(new Date());

      console.log('📊 Fetching views and leads from', startDate, 'to', endDate);

      const [viewsResponse, leadsResponse] = await Promise.all([
        supabase
          .from('property_views')
          .select('viewed_at')
          .in('property_id', productIds)
          .gte('viewed_at', startDate.toISOString())
          .lte('viewed_at', endDate.toISOString()),

        supabase
          .from('leads')
          .select('created_at')
          .in('property_id', productIds)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
      ]);

      if (viewsResponse.error) throw viewsResponse.error;
      if (leadsResponse.error) throw leadsResponse.error;

      console.log('📊 Views data:', viewsResponse.data?.length || 0, 'records');
      console.log('📊 Leads data:', leadsResponse.data?.length || 0, 'records');

      const viewsByDate = groupByDate(viewsResponse.data || [], 'viewed_at');
      const leadsByDate = groupByDate(leadsResponse.data || [], 'created_at');

      const chartData = generateChartData(days, viewsByDate, leadsByDate);
      console.log('�� Chart data generated:', chartData);
      setData(chartData);
      setLoading(false);
    } catch (err) {
      console.error('❌ Error fetching chart data:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do gráfico');
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('📊 Chart hook mounted/updated', { userId: user?.id, days });
    fetchChartData();
  }, [user?.id, days]);

  const refresh = () => {
    fetchChartData();
  };

  return { data, loading, error, refresh };
}

function groupByDate(data: any[], dateField: string): Map<string, number> {
  const grouped = new Map<string, number>();

  data.forEach(item => {
    const date = format(new Date(item[dateField]), 'dd/MM');
    grouped.set(date, (grouped.get(date) || 0) + 1);
  });

  return grouped;
}

function generateChartData(
  days: number,
  viewsByDate: Map<string, number>,
  leadsByDate: Map<string, number>
): ChartDataPoint[] {
  const chartData: ChartDataPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dateKey = format(date, 'dd/MM');

    chartData.push({
      date: dateKey,
      views: viewsByDate.get(dateKey) || 0,
      leads: leadsByDate.get(dateKey) || 0,
    });
  }

  return chartData;
}

function generateEmptyData(days: number): ChartDataPoint[] {
  const emptyData: ChartDataPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dateKey = format(date, 'dd/MM');

    emptyData.push({
      date: dateKey,
      views: 0,
      leads: 0,
    });
  }

  return emptyData;
}
