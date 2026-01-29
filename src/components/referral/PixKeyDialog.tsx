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
import { toast } from 'sonner';
import { Loader2, CreditCard } from 'lucide-react';
import { validatePixKey, formatPixKey } from '@/lib/referralUtils';
import type { UserPixKey } from '@/types';

interface PixKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingKey?: UserPixKey | null;
}

export default function PixKeyDialog({
  open,
  onOpenChange,
  onSuccess,
  existingKey
}: PixKeyDialogProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'cnpj' | 'email' | 'phone' | 'random'>('cpf');
  const [pixKey, setPixKey] = useState('');
  const [holderName, setHolderName] = useState('');

  useEffect(() => {
    if (existingKey) {
      setPixKeyType(existingKey.pix_key_type);
      setPixKey(existingKey.pix_key);
      setHolderName(existingKey.holder_name);
    } else {
      setPixKeyType('cpf');
      setPixKey('');
      setHolderName(user?.name || '');
    }
  }, [existingKey, user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return;
    }

    if (!validatePixKey(pixKey, pixKeyType)) {
      toast.error('Chave PIX inválida para o tipo selecionado');
      return;
    }

    if (!holderName.trim()) {
      toast.error('Nome do titular é obrigatório');
      return;
    }

    setIsSubmitting(true);

    try {
      if (existingKey) {
        const { error } = await supabase
          .from('user_pix_keys')
          .update({
            pix_key: pixKey,
            pix_key_type: pixKeyType,
            holder_name: holderName,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingKey.id);

        if (error) throw error;
        toast.success('Chave PIX atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('user_pix_keys')
          .insert({
            user_id: user.id,
            pix_key: pixKey,
            pix_key_type: pixKeyType,
            holder_name: holderName
          });

        if (error) throw error;
        toast.success('Chave PIX cadastrada com sucesso!');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving PIX key:', error);
      toast.error('Erro ao salvar chave PIX');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPlaceholder = () => {
    switch (pixKeyType) {
      case 'cpf':
        return '000.000.000-00';
      case 'cnpj':
        return '00.000.000/0000-00';
      case 'email':
        return 'seuemail@exemplo.com';
      case 'phone':
        return '(00) 00000-0000';
      case 'random':
        return 'chave-aleatoria-pix';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {existingKey ? 'Editar Chave PIX' : 'Configurar Chave PIX'}
          </DialogTitle>
          <DialogDescription>
            Configure sua chave PIX para receber os saques das comissões
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pixKeyType">Tipo de Chave</Label>
            <Select value={pixKeyType} onValueChange={(value: any) => setPixKeyType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="cnpj">CNPJ</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="phone">Telefone</SelectItem>
                <SelectItem value="random">Chave Aleatória</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pixKey">Chave PIX</Label>
            <Input
              id="pixKey"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder={getPlaceholder()}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="holderName">Nome do Titular</Label>
            <Input
              id="holderName"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              placeholder="Nome completo do titular da conta"
              required
            />
          </div>

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
              {existingKey ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
