import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader as Loader2, Copy, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { copyProductsBetweenUsers } from '@/lib/adminApi';
import { toast } from 'sonner';
import { syncUserCategoriesWithStorefrontSettings } from '@/lib/utils';

const copyFormSchema = z.object({
  sourceUserId: z.string().min(1, 'Selecione o usuário de origem'),
  targetUserId: z.string().min(1, 'Selecione o usuário de destino'),
});

interface User {
  id: string;
  name: string;
  email: string;
  listing_limit: number;
}

interface SimpleCopyProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSourceUserId?: string;
  defaultTargetUserId?: string;
}

export function SimpleCopyProductsDialog({
  open,
  onOpenChange,
  defaultSourceUserId,
  defaultTargetUserId,
}: SimpleCopyProductsDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [copying, setCopying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [sourceProductCount, setSourceProductCount] = useState<number | null>(null);
  const [sourceProductCountLoading, setSourceProductCountLoading] = useState(false);

  const form = useForm<z.infer<typeof copyFormSchema>>({
    resolver: zodResolver(copyFormSchema),
    defaultValues: {
      sourceUserId: defaultSourceUserId || '',
      targetUserId: defaultTargetUserId || '',
    },
  });

  const sourceUserId = form.watch('sourceUserId');
  const targetUserId = form.watch('targetUserId');

  useEffect(() => {
    if (open) {
      fetchUsers();
      if (defaultSourceUserId) {
        form.setValue('sourceUserId', defaultSourceUserId);
        fetchSourceProductCount(defaultSourceUserId);
      }
      if (defaultTargetUserId) {
        form.setValue('targetUserId', defaultTargetUserId);
      }
    }
  }, [open, defaultSourceUserId, defaultTargetUserId]);

  useEffect(() => {
    if (sourceUserId) {
      fetchSourceProductCount(sourceUserId);
    } else {
      setSourceProductCount(null);
    }
  }, [sourceUserId]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, listing_limit')
        .order('name', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchSourceProductCount = async (userId: string) => {
    try {
      setSourceProductCountLoading(true);
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) throw error;
      setSourceProductCount(count || 0);
    } catch (error) {
      console.error('Error fetching product count:', error);
      setSourceProductCount(null);
    } finally {
      setSourceProductCountLoading(false);
    }
  };

  const copyProductsAndCategories = async (sourceId: string, targetId: string) => {
    try {
      setProgress(10);
      setProgressMessage('Iniciando cópia de produtos...');

      const result = await copyProductsBetweenUsers(sourceId, targetId);

      setProgress(80);
      setProgressMessage('Sincronizando configurações...');

      try {
        await syncUserCategoriesWithStorefrontSettings(targetId);
      } catch (syncError) {
        console.warn('Category sync warning (non-critical):', syncError);
      }

      setProgress(100);
      setProgressMessage('Cópia concluída!');

      return result;
    } catch (error) {
      console.error('Error copying products:', error);
      throw error;
    }
  };

  const handleSubmit = async (values: z.infer<typeof copyFormSchema>) => {
    try {
      setCopying(true);
      setProgress(10);
      setProgressMessage('Iniciando cópia...');

      const sourceUser = users.find(u => u.id === values.sourceUserId);
      const targetUser = users.find(u => u.id === values.targetUserId);

      if (!sourceUser || !targetUser) {
        throw new Error('Usuário de origem não encontrado');
      }

      if (values.sourceUserId === values.targetUserId) {
        throw new Error('Usuário de origem e destino não podem ser o mesmo');
      }

      const result = await copyProductsAndCategories(values.sourceUserId, values.targetUserId);

      const stats = result.stats || {};
      toast.success(
        `Cópia concluída: ${stats.copiedCategories || 0} categorias, ${stats.copiedProducts || 0} produtos, ${stats.copiedImages || 0} imagens, ${stats.copiedPriceTiers || 0} faixas de preço`
      );

      onOpenChange(false);
      form.reset();

      setTimeout(() => {
        setProgress(0);
        setProgressMessage('');
      }, 1000);

    } catch (error: any) {
      console.error('Copy operation failed:', error);

      let errorMessage = 'Erro ao copiar produtos';

      if (error.message) {
        errorMessage = error.message;
      }

      // User-friendly error messages
      if (errorMessage.includes('Nenhum produto encontrado')) {
        errorMessage = 'O usuário de origem não possui produtos para copiar.';
      } else if (errorMessage.includes('não encontrado')) {
        errorMessage = 'Um dos usuários selecionados não foi encontrado. Tente recarregar a página.';
      } else if (errorMessage.includes('conflitos')) {
        errorMessage = 'Não foi possível copiar alguns produtos devido a conflitos de nomes. Os nomes foram ajustados automaticamente.';
      }

      toast.error(errorMessage);
    } finally {
      setCopying(false);
    }
  };

  const sourceUser = users.find(u => u.id === sourceUserId);
  const targetUser = users.find(u => u.id === targetUserId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-primary" />
            Copiar Produtos e Categorias
          </DialogTitle>
          <DialogDescription>
            Copia todas as categorias e produtos (incluindo imagens) de um usuário para outro.
            O usuário de destino deve já existir na plataforma.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        {copying && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{progressMessage}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Source and Target User Selection */}
            <FormField
              control={form.control}
              name="sourceUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuário de Origem (copiar DE)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={loadingUsers || copying}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o usuário de origem" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Produtos e categorias deste usuário serão copiados
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuário de Destino (copiar PARA)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={loadingUsers || copying}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o usuário de destino" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users
                        .filter(user => user.id !== sourceUserId) // Não mostrar o mesmo usuário
                        .map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Os produtos serão adicionados a este usuário
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Summary */}
            {sourceUser && targetUser && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="space-y-3">
                  <h4 className="font-medium mb-2">Resumo da Operação:</h4>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                    <span className="text-sm">DE: {sourceUser.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    <span className="text-sm">PARA: {targetUser.name}</span>
                  </div>
                  {sourceProductCountLoading ? (
                    <p className="text-sm text-muted-foreground">Carregando contagem de produtos...</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {sourceProductCount === null
                        ? 'Não foi possível contar produtos'
                        : sourceProductCount === 0
                          ? 'Nenhum produto para copiar'
                          : `${sourceProductCount} produto${sourceProductCount !== 1 ? 's' : ''} serão copiados`
                      }
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    Será copiado: categorias, produtos, imagens e faixas de preço.
                  </p>
                </div>
              </div>
            )}

            {/* Info Alert */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Cópia de Produtos:</strong> Esta operação copia todos os produtos e categorias 
                do usuário de origem para o usuário de destino. As imagens são duplicadas fisicamente 
                para evitar conflitos. Produtos duplicados não serão criados.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  form.reset();
                }}
                disabled={copying}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={copying || !sourceUserId || !targetUserId || sourceProductCount === 0 || sourceProductCountLoading}
                title={sourceProductCount === 0 ? 'O usuário de origem não possui produtos' : ''}
              >
                {copying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Copiando...
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar Produtos
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}