import { useState } from 'react';
import { Trash2, Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCustomSizes } from '@/hooks/useCustomSizes';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CustomSizesManagementProps {
  userId?: string;
}

export function CustomSizesManagement({ userId }: CustomSizesManagementProps) {
  const [newSize, setNewSize] = useState('');
  const [sizeToDelete, setSizeToDelete] = useState<string | null>(null);
  const [isAddingSize, setIsAddingSize] = useState(false);
  const { customSizes, allSizesWithType, loading, error, addCustomSize, removeCustomSize } = useCustomSizes(userId);

  const handleAddSize = async () => {
    if (!newSize.trim()) {
      toast.error('Digite um tamanho');
      return;
    }

    setIsAddingSize(true);
    const success = await addCustomSize(newSize.trim(), 'custom');

    if (success) {
      toast.success('Tamanho adicionado com sucesso');
      setNewSize('');
    } else {
      toast.error('Erro ao adicionar tamanho');
    }

    setIsAddingSize(false);
  };

  const handleDeleteSize = async () => {
    if (!sizeToDelete) return;

    const success = await removeCustomSize(sizeToDelete);

    if (success) {
      toast.success('Tamanho removido permanentemente');
      setSizeToDelete(null);
    } else {
      toast.error('Erro ao remover tamanho');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSize();
    }
  };

  if (!userId) {
    return (
      <div className="p-4 bg-muted rounded-lg text-center">
        <p className="text-sm text-muted-foreground">Faça login para gerenciar seus tamanhos personalizados</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">Adicionar novo tamanho personalizado</label>
          <p className="text-xs text-muted-foreground mt-1">
            Crie tamanhos personalizados que você possa reutilizar em seus produtos
          </p>
        </div>

        <div className="flex gap-2">
          <Input
            value={newSize}
            onChange={(e) => setNewSize(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ex: XS, 4XL, Único, PP Plus..."
            disabled={isAddingSize || loading}
          />
          <Button
            onClick={handleAddSize}
            disabled={!newSize.trim() || isAddingSize || loading}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">Tamanhos Salvos ({customSizes.length})</label>
          <p className="text-xs text-muted-foreground mt-1">
            Estes tamanhos estão disponíveis para você usar ao criar ou editar produtos
          </p>
        </div>

        {loading ? (
          <div className="p-4 bg-muted rounded-lg text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="h-2 w-2 bg-foreground rounded-full animate-pulse" />
              <p className="text-sm text-muted-foreground">Carregando tamanhos...</p>
            </div>
          </div>
        ) : customSizes.length === 0 ? (
          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Nenhum tamanho personalizado criado ainda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allSizesWithType.map((sizeData) => (
              <div
                key={sizeData.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {sizeData.size_name}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Criado em {new Date(sizeData.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSizeToDelete(sizeData.size_name)}
                  className="hover:bg-destructive hover:text-white"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!sizeToDelete} onOpenChange={(open) => !open && setSizeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar tamanho permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o tamanho <strong>{sizeToDelete}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSize} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Deletar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
