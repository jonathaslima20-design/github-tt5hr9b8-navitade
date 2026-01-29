import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ShoppingCart, Package } from 'lucide-react';

interface PricingModeToggleProps {
  isTieredPricing: boolean;
  onModeChange: (useTieredPricing: boolean) => void;
  hasSinglePriceData: boolean;
  hasTieredPriceData: boolean;
  disabled?: boolean;
}

export function PricingModeToggle({
  isTieredPricing,
  onModeChange,
  hasSinglePriceData,
  hasTieredPriceData,
  disabled = false
}: PricingModeToggleProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingMode, setPendingMode] = useState<boolean | null>(null);

  const handleToggle = (checked: boolean) => {
    const hasDataInCurrentMode = checked ? hasSinglePriceData : hasTieredPriceData;

    if (hasDataInCurrentMode) {
      setPendingMode(checked);
      setShowConfirmDialog(true);
    } else {
      onModeChange(checked);
    }
  };

  const confirmModeChange = () => {
    if (pendingMode !== null) {
      onModeChange(pendingMode);
    }
    setShowConfirmDialog(false);
    setPendingMode(null);
  };

  const cancelModeChange = () => {
    setShowConfirmDialog(false);
    setPendingMode(null);
  };

  return (
    <>
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold mb-1">Tipo de Venda</h3>
          <p className="text-sm text-muted-foreground">
            Selecione como deseja vender este produto
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleToggle(false)}
            disabled={disabled}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              !isTieredPricing
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex flex-col gap-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                !isTieredPricing ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Varejo</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Preço único por unidade
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleToggle(true)}
            disabled={disabled}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              isTieredPricing
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex flex-col gap-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isTieredPricing ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Atacado</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Preços por quantidade
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar mudança de tipo de venda</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a mudar o tipo de venda. Os dados do modo atual serão perdidos.
              {pendingMode ? (
                <>
                  <br /><br />
                  <strong>Mudando para Atacado:</strong> O preço de varejo será removido
                  e você precisará configurar as faixas de quantidade.
                </>
              ) : (
                <>
                  <br /><br />
                  <strong>Mudando para Varejo:</strong> Todas as faixas de atacado
                  serão removidas e você precisará configurar um preço único.
                </>
              )}
              <br /><br />
              Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelModeChange}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmModeChange}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
