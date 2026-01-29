import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Loader as Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { updateUserImageLimit } from '@/lib/adminApi';

const imageLimitFormSchema = z.object({
  maxImages: z.coerce
    .number()
    .min(1, 'O limite mínimo é 1 imagem')
    .max(50, 'O limite máximo é 50 imagens')
    .int('O valor deve ser um número inteiro'),
});

interface EditImageLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentLimit?: number;
  onSuccess?: () => void;
  onUpdate?: (maxImages: number) => Promise<void>;
}

export function EditImageLimitDialog({
  open,
  onOpenChange,
  userId,
  userName,
  currentLimit = 10,
  onSuccess,
  onUpdate,
}: EditImageLimitDialogProps) {
  const [updating, setUpdating] = useState(false);

  const form = useForm<z.infer<typeof imageLimitFormSchema>>({
    resolver: zodResolver(imageLimitFormSchema),
    defaultValues: {
      maxImages: currentLimit,
    },
    values: {
      maxImages: currentLimit,
    },
  });

  const handleUpdateImageLimit = async (values: z.infer<typeof imageLimitFormSchema>) => {
    try {
      setUpdating(true);

      if (onUpdate) {
        await onUpdate(values.maxImages);
      } else {
        await updateUserImageLimit(userId, values.maxImages);
        toast.success(`Limite de ${values.maxImages} imagens definido para ${userName}`);
      }

      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error updating image limit:', error);
      toast.error(error.message || 'Erro ao atualizar limite de imagens');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Definir Limite de Imagens
          </DialogTitle>
          <DialogDescription>
            Ajustar o limite máximo de imagens por produto para <strong>{userName}</strong>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleUpdateImageLimit)} className="space-y-4">
            <FormField
              control={form.control}
              name="maxImages"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número Máximo de Imagens por Produto</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Digite o limite"
                      min="1"
                      max="50"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Intervalo permitido: 1 a 50 imagens. O usuário não poderá adicionar mais imagens que este limite.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Nota:</strong> Esta alteração afetará a capacidade do usuário de adicionar imagens em produtos novos e existentes. O limite será validado em tempo real durante a criação e edição de produtos.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  form.reset();
                }}
                disabled={updating}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updating}>
                {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Limite
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
