import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useReferralData } from '@/hooks/useReferralData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Gift,
  Users,
  DollarSign,
  CheckCircle2,
  TrendingUp,
  Share2,
  UserPlus,
  Zap,
  Crown,
  CreditCard,
  Copy,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import PixKeyDialog from '@/components/referral/PixKeyDialog';
import WithdrawalDialog from '@/components/referral/WithdrawalDialog';

export default function ReferralPage() {
  const { user } = useAuth();
  const { stats, pixKeys, referralLink, isLoading, refreshData, error } = useReferralData(user?.id);
  const [showPixDialog, setShowPixDialog] = useState(false);
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false);

  console.log('[ReferralPage] Render:', { user: user?.id, stats, pixKeys, referralLink, isLoading, error });

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success('Link copiado para área de transferência!');
    } catch (error) {
      toast.error('Erro ao copiar link');
    }
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !referralLink) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Não foi possível gerar seu link de indicação. Por favor, recarregue a página.'}
          </AlertDescription>
        </Alert>
        <Button onClick={refreshData} className="w-full max-w-md mx-auto block">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      {/* Header Section */}
      <div className="text-center space-y-4 py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-900 dark:bg-slate-100 mb-4">
          <Gift className="h-8 w-8 text-white dark:text-slate-900" />
        </div>
        <h1 className="text-4xl font-bold">Indique e Ganhe</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Compartilhe o VitrineTurbo com amigos e ganhe <span className="font-bold text-foreground">até R$ 100</span> por cada indicação que ativar um plano
        </p>
      </div>

      {/* Empty State Banner - Show when no referrals yet */}
      {(stats?.totalReferrals || 0) === 0 && (
        <Alert className="border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-900/20">
          <Share2 className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Comece agora!</strong> Compartilhe seu link de indicação e ganhe até R$ 100 por cada amigo que ativar um plano.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Indicações</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalReferrals || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.activeReferrals || 0} com planos ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissões Totais</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(stats?.totalCommissions || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Valor total gerado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disponível para Saque</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(stats?.availableForWithdrawal || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Pronto para retirada</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissões Pagas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(stats?.paidCommissions || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Já recebidas</p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Link Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Seu Link de Indicação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={referralLink}
              readOnly
              className="font-mono text-sm"
            />
            <Button onClick={copyToClipboard} className="shrink-0">
              <Copy className="h-4 w-4 mr-2" />
              Copiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* How it Works Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Como Funciona
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-900 dark:bg-slate-100">
                <Share2 className="h-6 w-6 text-white dark:text-slate-900" />
              </div>
              <h3 className="font-semibold">1. Compartilhe</h3>
              <p className="text-sm text-muted-foreground">
                Envie seu link de indicação para amigos e conhecidos
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-900 dark:bg-slate-100">
                <UserPlus className="h-6 w-6 text-white dark:text-slate-900" />
              </div>
              <h3 className="font-semibold">2. Eles se Cadastram</h3>
              <p className="text-sm text-muted-foreground">
                Seus amigos criam conta e ativam um plano
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-900 dark:bg-slate-100">
                <DollarSign className="h-6 w-6 text-white dark:text-slate-900" />
              </div>
              <h3 className="font-semibold">3. Você Ganha</h3>
              <p className="text-sm text-muted-foreground">
                Receba sua comissão automaticamente
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commission Plans */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
          <CardContent className="pt-6 text-center space-y-2">
            <Zap className="h-8 w-8 mx-auto" />
            <div className="text-3xl font-bold">R$ 50</div>
            <div className="text-sm opacity-90">Plano Trimestral</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center space-y-2">
            <Crown className="h-8 w-8 mx-auto" />
            <div className="text-3xl font-bold">R$ 70</div>
            <div className="text-sm text-muted-foreground">Plano Semestral</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center space-y-2">
            <TrendingUp className="h-8 w-8 mx-auto" />
            <div className="text-3xl font-bold">R$ 100</div>
            <div className="text-sm text-muted-foreground">Plano Anual</div>
          </CardContent>
        </Card>
      </div>

      {/* PIX and Withdrawal Section */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* PIX Key Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Chave PIX
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pixKeys.length > 0 ? (
              <div className="space-y-2">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">{pixKeys[0].holder_name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pixKeys[0].pix_key_type.toUpperCase()}: {pixKeys[0].pix_key}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowPixDialog(true)}
                >
                  Editar Chave PIX
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Configure sua chave PIX para receber os saques
                </p>
                <Button
                  className="w-full"
                  onClick={() => setShowPixDialog(true)}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Configurar PIX
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Withdrawal Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Solicitar Saque
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4">
              <div className="text-4xl font-bold">
                {formatCurrency(stats?.availableForWithdrawal || 0)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Disponível para saque</p>
            </div>

            {(stats?.availableForWithdrawal || 0) >= 50 ? (
              <Button
                className="w-full"
                onClick={() => setShowWithdrawalDialog(true)}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Solicitar Saque
              </Button>
            ) : (
              <Button className="w-full" disabled variant="secondary">
                <DollarSign className="h-4 w-4 mr-2" />
                Solicitar Saque
              </Button>
            )}

            <p className="text-xs text-center text-muted-foreground">
              {pixKeys.length === 0
                ? 'Configure sua chave PIX primeiro'
                : 'Valor mínimo para saque: R$ 50,00'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <PixKeyDialog
        open={showPixDialog}
        onOpenChange={setShowPixDialog}
        onSuccess={refreshData}
        existingKey={pixKeys[0] || null}
      />

      <WithdrawalDialog
        open={showWithdrawalDialog}
        onOpenChange={setShowWithdrawalDialog}
        onSuccess={refreshData}
        availableAmount={stats?.availableForWithdrawal || 0}
        pixKeys={pixKeys}
        onConfigurePixKey={() => {
          setShowWithdrawalDialog(false);
          setShowPixDialog(true);
        }}
      />
    </div>
  );
}
