import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format, addMonths, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CircleCheck as CheckCircle, Circle as XCircle, CreditCard as Edit, Plus, Calendar } from 'lucide-react';
import type { Subscription, SubscriptionStatus, PaymentStatus, BillingCycle } from '@/types';

interface SubscriptionManagementProps {
  subscription: Subscription | null;
  userId?: string;
  userName: string;
  currency?: string;
  onSubscriptionUpdate: () => void;
}

export default function SubscriptionManagement({
  subscription,
  userId,
  userName,
  currency = 'BRL',
  onSubscriptionUpdate,
}: SubscriptionManagementProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [editForm, setEditForm] = useState({
    plan_name: subscription?.plan_name || '',
    monthly_price: subscription?.monthly_price || 0,
    billing_cycle: (subscription?.billing_cycle as BillingCycle) || 'monthly',
    status: subscription?.status || 'pending',
    payment_status: subscription?.payment_status || 'pending',
    next_payment_date: subscription?.next_payment_date || '',
  });

  const [createForm, setCreateForm] = useState({
    plan_name: 'Plano Básico',
    monthly_price: 29.90,
    billing_cycle: 'monthly' as BillingCycle,
    status: 'active' as SubscriptionStatus,
    payment_status: 'paid' as PaymentStatus,
    start_date: format(new Date(), 'yyyy-MM-dd'),
    next_payment_date: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
  });

  const handleToggleStatus = async () => {
    if (!subscription) return;

    const newStatus: SubscriptionStatus = subscription.status === 'active' ? 'suspended' : 'active';

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: newStatus })
        .eq('id', subscription.id);

      if (error) throw error;

      toast.success(
        newStatus === 'active'
          ? 'Plano ativado com sucesso'
          : 'Plano suspenso com sucesso'
      );

      await updateUserPlanStatus(userId, newStatus);
      onSubscriptionUpdate();
    } catch (error) {
      console.error('Error toggling subscription status:', error);
      toast.error('Erro ao atualizar status do plano');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTogglePaymentStatus = async () => {
    if (!subscription) return;

    const newPaymentStatus: PaymentStatus = subscription.payment_status === 'paid' ? 'pending' : 'paid';

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ payment_status: newPaymentStatus })
        .eq('id', subscription.id);

      if (error) throw error;

      toast.success('Status de pagamento atualizado com sucesso');
      onSubscriptionUpdate();
    } catch (error) {
      console.error('Error toggling payment status:', error);
      toast.error('Erro ao atualizar status de pagamento');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateSubscription = async () => {
    if (!subscription) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          plan_name: editForm.plan_name,
          monthly_price: editForm.monthly_price,
          billing_cycle: editForm.billing_cycle as BillingCycle,
          status: editForm.status,
          payment_status: editForm.payment_status,
          next_payment_date: editForm.next_payment_date,
        })
        .eq('id', subscription.id);

      if (error) throw error;

      await updateUserPlanStatus(userId, editForm.status as SubscriptionStatus);

      toast.success('Assinatura atualizada com sucesso');
      setIsEditDialogOpen(false);
      onSubscriptionUpdate();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('Erro ao atualizar assinatura');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateSubscription = async () => {
    if (!userId) {
      toast.error('ID do usuário não encontrado');
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_name: createForm.plan_name,
          monthly_price: createForm.monthly_price,
          billing_cycle: createForm.billing_cycle as BillingCycle,
          status: createForm.status,
          payment_status: createForm.payment_status,
          start_date: createForm.start_date,
          next_payment_date: createForm.next_payment_date,
        });

      if (error) throw error;

      await updateUserPlanStatus(userId, createForm.status);

      toast.success('Assinatura criada com sucesso');
      setIsCreateDialogOpen(false);
      onSubscriptionUpdate();
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast.error('Erro ao criar assinatura');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', subscription.id);

      if (error) throw error;

      await updateUserPlanStatus(userId, 'cancelled');

      toast.success('Assinatura cancelada com sucesso');
      onSubscriptionUpdate();
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast.error('Erro ao cancelar assinatura');
    } finally {
      setIsUpdating(false);
    }
  };

  const updateUserPlanStatus = async (userId: string | undefined, subscriptionStatus: SubscriptionStatus) => {
    if (!userId) return;

    let planStatus: 'active' | 'inactive' | 'suspended' = 'inactive';

    if (subscriptionStatus === 'active') {
      planStatus = 'active';
    } else if (subscriptionStatus === 'suspended') {
      planStatus = 'suspended';
    }

    const { error } = await supabase
      .from('users')
      .update({ plan_status: planStatus })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user plan_status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'cancelled':
        return 'bg-red-500';
      case 'suspended':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'pending':
        return 'Pendente';
      case 'cancelled':
        return 'Cancelado';
      case 'suspended':
        return 'Suspenso';
      default:
        return status;
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pago';
      case 'pending':
        return 'Pendente';
      case 'overdue':
        return 'Vencido';
      default:
        return status;
    }
  };

  const getBillingCycleLabel = (cycle: string) => {
    switch (cycle) {
      case 'monthly':
        return 'Mensal';
      case 'quarterly':
        return 'Trimestral';
      case 'semiannually':
        return 'Semestral';
      case 'annually':
        return 'Anual';
      default:
        return cycle;
    }
  };

  const calculateNextPaymentDate = (startDate: string, cycle: BillingCycle): string => {
    const date = new Date(startDate);
    switch (cycle) {
      case 'monthly':
        return format(addMonths(date, 1), 'yyyy-MM-dd');
      case 'quarterly':
        return format(addMonths(date, 3), 'yyyy-MM-dd');
      case 'semiannually':
        return format(addMonths(date, 6), 'yyyy-MM-dd');
      case 'annually':
        return format(addMonths(date, 12), 'yyyy-MM-dd');
      default:
        return format(addMonths(date, 1), 'yyyy-MM-dd');
    }
  };

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assinatura</CardTitle>
          <CardDescription>
            Este usuário não possui assinatura ativa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Criar Assinatura
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Assinatura</DialogTitle>
                <DialogDescription>
                  Crie uma nova assinatura para {userName}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="create-billing-cycle">Periodicidade do Plano</Label>
                  <Select
                    value={createForm.billing_cycle}
                    onValueChange={(value) => {
                      const newCycle = value as BillingCycle;
                      setCreateForm({
                        ...createForm,
                        billing_cycle: newCycle,
                        next_payment_date: calculateNextPaymentDate(createForm.start_date, newCycle)
                      });
                    }}
                  >
                    <SelectTrigger id="create-billing-cycle">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="quarterly">Trimestral (3 meses)</SelectItem>
                      <SelectItem value="semiannually">Semestral (6 meses)</SelectItem>
                      <SelectItem value="annually">Anual (12 meses)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-monthly-price">Valor Mensal</Label>
                  <Input
                    id="create-monthly-price"
                    type="number"
                    step="0.01"
                    value={createForm.monthly_price}
                    onChange={(e) => setCreateForm({ ...createForm, monthly_price: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-status">Status</Label>
                  <Select
                    value={createForm.status}
                    onValueChange={(value) => setCreateForm({ ...createForm, status: value as SubscriptionStatus })}
                  >
                    <SelectTrigger id="create-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="suspended">Suspenso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-payment-status">Status de Pagamento</Label>
                  <Select
                    value={createForm.payment_status}
                    onValueChange={(value) => setCreateForm({ ...createForm, payment_status: value as PaymentStatus })}
                  >
                    <SelectTrigger id="create-payment-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Pago</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="overdue">Vencido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-next-payment">Próximo Pagamento</Label>
                  <Input
                    id="create-next-payment"
                    type="date"
                    value={createForm.next_payment_date}
                    onChange={(e) => setCreateForm({ ...createForm, next_payment_date: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateSubscription} disabled={isUpdating}>
                  {isUpdating ? 'Criando...' : 'Criar Assinatura'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gerenciar Assinatura</CardTitle>
            <CardDescription>
              Controle a assinatura do usuário
            </CardDescription>
          </div>
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Editar Assinatura</DialogTitle>
                <DialogDescription>
                  Atualize as informações da assinatura de {userName}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-billing-cycle">Periodicidade do Plano</Label>
                  <Select
                    value={editForm.billing_cycle}
                    onValueChange={(value) => {
                      setEditForm({
                        ...editForm,
                        billing_cycle: value
                      });
                    }}
                  >
                    <SelectTrigger id="edit-billing-cycle">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="quarterly">Trimestral (3 meses)</SelectItem>
                      <SelectItem value="semiannually">Semestral (6 meses)</SelectItem>
                      <SelectItem value="annually">Anual (12 meses)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-monthly-price">Valor Mensal</Label>
                  <Input
                    id="edit-monthly-price"
                    type="number"
                    step="0.01"
                    value={editForm.monthly_price}
                    onChange={(e) => setEditForm({ ...editForm, monthly_price: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(value) => setEditForm({ ...editForm, status: value })}
                  >
                    <SelectTrigger id="edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="suspended">Suspenso</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-payment-status">Status de Pagamento</Label>
                  <Select
                    value={editForm.payment_status}
                    onValueChange={(value) => setEditForm({ ...editForm, payment_status: value })}
                  >
                    <SelectTrigger id="edit-payment-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Pago</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="overdue">Vencido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-next-payment">Próximo Pagamento</Label>
                  <Input
                    id="edit-next-payment"
                    type="date"
                    value={editForm.next_payment_date}
                    onChange={(e) => setEditForm({ ...editForm, next_payment_date: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdateSubscription} disabled={isUpdating}>
                  {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Periodicidade</div>
              <Badge variant="outline">
                {getBillingCycleLabel(subscription.billing_cycle)}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Valor Mensal</div>
              <div className="font-semibold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: currency,
                }).format(subscription.monthly_price)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Status</div>
              <Badge className={getStatusColor(subscription.status)}>
                {getStatusLabel(subscription.status)}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Status Pagamento</div>
              <Badge
                variant={
                  subscription.payment_status === 'paid' ? 'default' :
                  subscription.payment_status === 'overdue' ? 'destructive' :
                  'secondary'
                }
              >
                {getPaymentStatusLabel(subscription.payment_status)}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Próximo Pagamento</div>
              <div className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {format(new Date(subscription.next_payment_date), 'dd/MM/yyyy', { locale: ptBR })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button
              variant={subscription.status === 'active' ? 'destructive' : 'default'}
              onClick={handleToggleStatus}
              disabled={isUpdating || subscription.status === 'cancelled'}
              className="flex-1"
            >
              {subscription.status === 'active' ? (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Suspender Plano
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Ativar Plano
                </>
              )}
            </Button>

            <Button
              variant={subscription.payment_status === 'paid' ? 'outline' : 'default'}
              onClick={handleTogglePaymentStatus}
              disabled={isUpdating || subscription.status === 'cancelled'}
              className="flex-1"
            >
              {subscription.payment_status === 'paid' ? 'Marcar como Pendente' : 'Marcar como Pago'}
            </Button>
          </div>

          {subscription.status !== 'cancelled' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  Cancelar Assinatura
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar assinatura</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja cancelar a assinatura de "{userName}"?
                    Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancelSubscription}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sim, cancelar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
