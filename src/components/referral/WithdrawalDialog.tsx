import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Loader2, DollarSign, AlertCircle } from 'lucide-react';
import { formatPixKey } from '@/lib/referralUtils';
import type { UserPixKey } from '@/types';

interface WithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  availableAmount: number;
  pixKeys: UserPixKey[];
  onConfigurePixKey: () => void;
}

const MIN_WITHDRAWAL_AMOUNT = 50.00;

export default function WithdrawalDialog({
  open,
  onOpenChange,
  onSuccess,
  availableAmount,
  pixKeys,
  onConfigurePixKey
}: WithdrawalDialogProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPixKeyId, setSelectedPixKeyId] = useState<string>('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (pixKeys.length > 0 && !selectedPixKeyId) {
      setSelectedPixKeyId(pixKeys[0].id);
    }
  }, [pixKeys]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return;
    }

    const withdrawalAmount = parseFloat(amount);

    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      toast.error('Valor inválido');
      return;
    }

    if (withdrawalAmount < MIN_WITHDRAWAL_AMOUNT) {
      toast.error(`Valor mínimo para saque é R$ ${MIN_WITHDRAWAL_AMOUNT.toFixed(2)}`);
      return;
    }

    if (withdrawalAmount > availableAmount) {
      toast.error('Valor maior que o disponível para saque');
      return;
    }

    if (!selectedPixKeyId) {
      toast.error('Selecione uma chave PIX');
      return;
    }

    const selectedPixKey = pixKeys.find(k => k.id === selectedPixKeyId);
    if (!selectedPixKey) {
      toast.error('Chave PIX não encontrada');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user.id,
          amount: withdrawalAmount,
          pix_key: selectedPixKey.pix_key,
          pix_key_type: selectedPixKey.pix_key_type,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Solicitação de saque enviada com sucesso!');
      setAmount('');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating withdrawal request:', error);
      toast.error('Erro ao solicitar saque');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.,]/g, '');
    setAmount(value);
  };

  if (pixKeys.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Solicitar Saque
            </DialogTitle>
          </DialogHeader>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Você precisa configurar uma chave PIX antes de solicitar um saque.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              onOpenChange(false);
              onConfigurePixKey();
            }}>
              Configurar PIX
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Solicitar Saque
          </DialogTitle>
          <DialogDescription>
            Solicite o saque das suas comissões via PIX
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted rounded-lg p-4 mb-4">
          <p className="text-sm text-muted-foreground mb-1">Disponível para saque</p>
          <p className="text-2xl font-bold">
            R$ {availableAmount.toFixed(2).replace('.', ',')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Valor do Saque</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                R$
              </span>
              <Input
                id="amount"
                type="text"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0,00"
                className="pl-10"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Valor mínimo: R$ {MIN_WITHDRAWAL_AMOUNT.toFixed(2)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pixKey">Chave PIX para Recebimento</Label>
            <Select value={selectedPixKeyId} onValueChange={setSelectedPixKeyId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pixKeys.map((key) => (
                  <SelectItem key={key.id} value={key.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{key.holder_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {key.pix_key_type.toUpperCase()}: {formatPixKey(key.pix_key, key.pix_key_type)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              A solicitação será analisada e o pagamento será processado em até 5 dias úteis.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Solicitar Saque
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
