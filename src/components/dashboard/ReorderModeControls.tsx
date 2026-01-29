import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, X, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ReorderModeControlsProps {
  isActive: boolean;
  isReordering: boolean;
  hasChanges: boolean;
  onSave: () => Promise<void>;
  onCancel: () => void;
  onUndo: () => void;
  changedCount: number;
}

export function ReorderModeControls({
  isActive,
  isReordering,
  hasChanges,
  onSave,
  onCancel,
  onUndo,
  changedCount
}: ReorderModeControlsProps) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave();
      toast.success('Ordem dos produtos salva com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar ordem dos produtos');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
        >
          <Card className="shadow-xl border-primary/20 bg-background/95 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Status Indicator */}
                <div className="flex items-center gap-2">
                  {isReordering ? (
                    <div className="flex items-center gap-2 text-amber-600">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                      <span className="text-sm font-medium">Reordenando produtos...</span>
                    </div>
                  ) : hasChanges ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Produtos reordenados - pronto para salvar
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Arraste produtos para reordenar</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {hasChanges && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onUndo}
                      disabled={isReordering || saving}
                      className="h-8"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Desfazer
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isReordering || saving}
                    className="h-8"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancelar
                  </Button>
                  
                  {hasChanges && (
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={isReordering || saving}
                      className="h-8 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                    >
                      {saving ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                      ) : (
                        <Save className="h-3 w-3 mr-1" />
                      )}
                      Salvar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}