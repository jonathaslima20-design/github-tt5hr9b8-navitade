import { Users, Shield, Ban, Crown, TrendingUp, Calendar, XCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { User } from '@/types';

interface UserSummaryCardsProps {
  users: User[];
}

export function UserSummaryCards({ users }: UserSummaryCardsProps) {
  const totalUsers = users.length;
  const activeUsers = users.filter(user => !user.is_blocked).length;
  const blockedUsers = users.filter(user => user.is_blocked).length;

  const activePlans = users.filter(user => user.plan_status === 'active').length;
  const inactivePlans = users.filter(user => user.plan_status === 'inactive').length;
  const suspendedPlans = users.filter(user => user.plan_status === 'suspended').length;
  const noPlans = users.filter(user => !user.plan_status || user.plan_status === 'inactive').length;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const recentUsers7Days = users.filter(user => {
    if (!user.created_at) return false;
    return new Date(user.created_at) >= sevenDaysAgo;
  }).length;

  const recentUsers30Days = users.filter(user => {
    if (!user.created_at) return false;
    return new Date(user.created_at) >= thirtyDaysAgo;
  }).length;

  const cards = [
    {
      title: 'Total de Usuários',
      value: totalUsers,
      description: 'Usuários cadastrados',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20'
    },
    {
      title: 'Usuários Ativos',
      value: activeUsers,
      description: 'Não bloqueados',
      icon: Shield,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/20'
    },
    {
      title: 'Planos Ativos',
      value: activePlans,
      description: 'Com assinatura ativa',
      icon: Crown,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20'
    },
    {
      title: 'Sem Plano',
      value: noPlans,
      description: 'Sem assinatura',
      icon: XCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950/20'
    },
    {
      title: 'Planos Suspensos',
      value: suspendedPlans,
      description: 'Assinatura suspensa',
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/20'
    },
    {
      title: 'Cadastros (7 dias)',
      value: recentUsers7Days,
      description: 'Últimos 7 dias',
      icon: TrendingUp,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50 dark:bg-teal-950/20'
    },
    {
      title: 'Cadastros (30 dias)',
      value: recentUsers30Days,
      description: 'Últimos 30 dias',
      icon: Calendar,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50 dark:bg-cyan-950/20'
    },
    {
      title: 'Usuários Bloqueados',
      value: blockedUsers,
      description: 'Acesso suspenso',
      icon: Ban,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/20'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <Card key={card.title} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}