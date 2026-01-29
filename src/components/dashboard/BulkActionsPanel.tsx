import { useState, useEffect } from 'react';
import { Trash2, Eye, EyeOff, Edit3, X, Tag, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TagInput } from '@/components/ui/tag-input';
import { Input } from '@/components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { getCroppedImg } from '@/lib/image';

interface BulkActionsPanelProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkVisibilityToggle: (visible: boolean) => Promise<void>;
  onBulkCategoryChange: (categories: string[]) => Promise<void>;
  onBulkBrandChange: (brand: string) => Promise<void>;
  onBulkDelete: () => Promise<void>;
  onBulkImageCompression: () => Promise<void>;
  loading: boolean;
  userId?: string;
}

export function BulkActionsPanel({
  selectedCount,
  onClearSelection,
  onBulkVisibilityToggle,
  onBulkCategoryChange,
  onBulkBrandChange,
  onBulkDelete,
  onBulkImageCompression,
  loading,
  userId
}: BulkActionsPanelProps) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [newCategories, setNewCategories] = useState<string[]>([]);
  const [newBrand, setNewBrand] = useState<string>('');
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showBrandDialog, setShowBrandDialog] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchCategories();
    }
  }, [userId]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('user_product_categories')
        .select('id, name')
        .eq('user_id', userId)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleCategoryChange = async () => {
    if (newCategories.length === 0) return;
    
    await onBulkCategoryChange(newCategories);
    setNewCategories([]);
    setShowCategoryDialog(false);
  };

  const handleBrandChange = async () => {
    if (!newBrand.trim()) return;
    
    await onBulkBrandChange(newBrand.trim());
    setNewBrand('');
    setShowBrandDialog(false);
  };
  if (selectedCount === 0) return null;

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {selectedCount} produto{selectedCount > 1 ? 's' : ''} selecionado{selectedCount > 1 ? 's' : ''}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="h-8 px-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Visibility Actions */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkVisibilityToggle(true)}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Mostrar na Vitrine
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkVisibilityToggle(false)}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <EyeOff className="h-4 w-4" />
              Ocultar da Vitrine
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* Category Change */}
            <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Edit3 className="h-4 w-4" />
                  Alterar Categoria
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Alterar Categoria em Massa</DialogTitle>
                  <DialogDescription>
                    Selecione as novas categorias para os {selectedCount} produtos selecionados.
                    As categorias atuais serão substituídas.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <TagInput
                    value={newCategories}
                    onChange={setNewCategories}
                    suggestions={categories.map(c => c.name)}
                    placeholder="Adicionar categoria..."
                    maxTags={5}
                  />
                  
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCategoryDialog(false);
                        setNewCategories([]);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleCategoryChange}
                      disabled={newCategories.length === 0 || loading}
                    >
                      Aplicar Alteração
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Brand Change */}
            <Dialog open={showBrandDialog} onOpenChange={setShowBrandDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Tag className="h-4 w-4" />
                  Alterar Marca
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Alterar Marca em Massa</DialogTitle>
                  <DialogDescription>
                    Digite a nova marca para os {selectedCount} produtos selecionados.
                    A marca atual será substituída.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <Input
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    placeholder="Digite a nova marca..."
                    maxLength={50}
                  />
                  
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowBrandDialog(false);
                        setNewBrand('');
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleBrandChange}
                      disabled={!newBrand.trim() || loading}
                    >
                      Aplicar Alteração
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Separator orientation="vertical" className="h-6" />

            {/* Image Compression */}
            <Button
              variant="outline"
              size="sm"
              onClick={onBulkImageCompression}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <ImageIcon className="h-4 w-4" />
              Comprimir Imagens
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* Delete Action */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir Selecionados
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Exclusão em Massa</AlertDialogTitle>
                  <AlertDialogDescription>
                    Você está prestes a excluir {selectedCount} produto{selectedCount > 1 ? 's' : ''}.
                    Esta ação não pode ser desfeita e todas as imagens associadas também serão removidas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onBulkDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir {selectedCount} Produto{selectedCount > 1 ? 's' : ''}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}