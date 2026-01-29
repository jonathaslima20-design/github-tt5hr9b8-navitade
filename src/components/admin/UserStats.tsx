import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, TrendingUp, Loader2 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { formatCurrency as formatCurrencyUtil } from '@/lib/utils';

// Helper function to format currency with BRL default for admin pages
const formatCurrency = (value: number) => formatCurrencyUtil(value, 'BRL', 'pt-BR');

interface UserStatsProps {
  userId: string;
}

interface DashboardStats {
  totalProperties: number;
  totalViews: number;
  totalLeads: number;
  conversionRate: number;
}

interface ChartData {
  date: string;
  views: number;
  leads: number;
}

interface LeadsBySource {
  source: string;
  count: number;
}

export function UserStats({ userId }: UserStatsProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    totalViews: 0,
    totalLeads: 0,
    conversionRate: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [leadsBySource, setLeadsBySource] = useState<LeadsBySource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchDashboardData();
    }
  }, [userId]);

  const fetchDashboardData = async () => {
    try {
      // Fetch products (changed from properties to products)
      const { data: propertiesData } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Fetch total views
      const { count: totalViews } = await supabase
        .from('property_views')
        .select('*', { count: 'exact', head: true })
        .in('property_id', propertiesData?.map(p => p.id) || []);

      // Fetch total leads
      const { count: totalLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .in('property_id', propertiesData?.map(p => p.id) || []);

      // Calculate conversion rate
      const conversionRate = totalViews ? (totalLeads / totalViews) * 100 : 0;

      setStats({
        totalProperties: propertiesData?.length || 0,
        totalViews: totalViews || 0,
        totalLeads: totalLeads || 0,
        conversionRate,
      });

      // Fetch chart data for the last 7 days
      const chartData = await Promise.all(
        Array.from({ length: 7 }).map(async (_, i) => {
          const date = subDays(new Date(), i);
          const start = startOfDay(date);
          const end = endOfDay(date);

          const { count: views } = await supabase
            .from('property_views')
            .select('*', { count: 'exact', head: true })
            .in('property_id', propertiesData?.map(p => p.id) || [])
            .gte('viewed_at', start.toISOString())
            .lte('viewed_at', end.toISOString());

          const { count: leads } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .in('property_id', propertiesData?.map(p => p.id) || [])
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString());

          return {
            date: format(date, 'dd/MM', { locale: ptBR }),
            views: views || 0,
            leads: leads || 0,
          };
        })
      );

      setChartData(chartData.reverse());

      // Fetch leads by source
      const { data: leadSourceData } = await supabase
        .from('leads')
        .select('source')
        .in('property_id', propertiesData?.map(p => p.id) || []);

      const sourceCount = leadSourceData?.reduce((acc, curr) => {
        acc[curr.source] = (acc[curr.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      setLeadsBySource(
        Object.entries(sourceCount || {}).map(([source, count]) => ({
          source,
          count,
        }))
      );
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Imóveis</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProperties}</div>
            <p className="text-xs text-muted-foreground">Imóveis cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Visualizações</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews}</div>
            <p className="text-xs text-muted-foreground">Total de visualizações</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeads}</div>
            <p className="text-xs text-muted-foreground">Contatos recebidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.conversionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Visualizações para leads</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Visualizações e Leads</CardTitle>
            <p className="text-sm text-muted-foreground">
              Últimos 7 dias
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="views"
                    stroke="#8884d8"
                    name="Visualizações"
                  />
                  <Line
                    type="monotone"
                    dataKey="leads"
                    stroke="#82ca9d"
                    name="Leads"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leads por Origem</CardTitle>
            <p className="text-sm text-muted-foreground">
              Distribuição dos contatos
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadsBySource}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="source" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}