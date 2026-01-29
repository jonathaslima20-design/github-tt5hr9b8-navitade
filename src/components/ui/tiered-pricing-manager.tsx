import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { NumericFormat } from 'react-number-format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormLabel } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plus, Pencil, Trash2, AlertTriangle, Info, TrendingDown, Package, Loader2 } from 'lucide-react';
import { getCurrencySymbol, type SupportedLanguage, type SupportedCurrency, getLocaleConfig } from '@/lib/i18n';
import { toast } from 'sonner';

export interface PriceTier {
  id?: string;
  min_quantity: number;
  max_quantity?: number | null;
  unit_price: number;
  discounted_unit_price?: number | null;
}

interface ValidationError {
  type: 'duplicate' | 'invalid_quantity' | 'invalid_price' | 'invalid_discount';
  message: string;
  tierIndex?: number;
}

interface TieredPricingManagerProps {
  tiers: PriceTier[];
  onChange: (tiers: PriceTier[]) => void;
  currency?: SupportedCurrency;
  locale?: SupportedLanguage;
  productId?: string;
  onValidationChange?: (isValid: boolean) => void;
}

export function TieredPricingManager({
  tiers,
  onChange,
  currency = 'BRL',
  locale = 'pt-BR',
  productId,
  onValidationChange
}: TieredPricingManagerProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);
  const [editingTier, setEditingTier] = useState<Partial<PriceTier> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newTier, setNewTier] = useState<Partial<PriceTier>>({
    min_quantity: 1,
    unit_price: 0,
    discounted_unit_price: null
  });

  const localeConfig = getLocaleConfig(locale);
  const currencySymbol = getCurrencySymbol(currency, locale);

  const numberFormatConfig = useMemo(() => ({
    thousandSeparator: localeConfig.thousandsSeparator,
    decimalSeparator: localeConfig.decimalSeparator,
    prefix: currencySymbol + ' ',
    decimalScale: 2,
    fixedDecimalScale: true,
    allowNegative: false,
    allowLeadingZeros: false,
  }), [localeConfig, currencySymbol]);

  const validateTiers = useCallback((tiersToValidate: PriceTier[]): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (tiersToValidate.length === 0) {
      return errors;
    }

    const quantitySet = new Set<number>();

    for (let i = 0; i < tiersToValidate.length; i++) {
      const tier = tiersToValidate[i];

      if (tier.min_quantity <= 0) {
        errors.push({
          type: 'invalid_quantity',
          message: `Faixa ${i + 1}: Quantidade mínima deve ser maior que 0`,
          tierIndex: i
        });
      }

      if (quantitySet.has(tier.min_quantity)) {
        errors.push({
          type: 'duplicate',
          message: `Faixa ${i + 1}: Quantidade mínima ${tier.min_quantity} duplicada`,
          tierIndex: i
        });
      }
      quantitySet.add(tier.min_quantity);

      if (tier.unit_price <= 0) {
        errors.push({
          type: 'invalid_price',
          message: `Faixa ${i + 1}: Preço unitário deve ser maior que 0`,
          tierIndex: i
        });
      }

      if (tier.discounted_unit_price !== null && tier.discounted_unit_price !== undefined) {
        if (tier.discounted_unit_price <= 0) {
          errors.push({
            type: 'invalid_discount',
            message: `Faixa ${i + 1}: Preço promocional deve ser maior que 0`,
            tierIndex: i
          });
        }
        if (tier.discounted_unit_price >= tier.unit_price) {
          errors.push({
            type: 'invalid_discount',
            message: `Faixa ${i + 1}: Preço promocional deve ser menor que o preço normal`,
            tierIndex: i
          });
        }
      }
    }

    return errors;
  }, []);

  const errors = useMemo(() => validateTiers(tiers), [tiers, validateTiers]);
  const isValid = useMemo(() => errors.length === 0, [errors]);

  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(isValid);
    }
  }, [isValid, onValidationChange]);

  const minPrice = useMemo(() => {
    if (tiers.length === 0) return null;
    return Math.min(...tiers.map(t => t.discounted_unit_price ?? t.unit_price));
  }, [tiers]);

  const handleAddTier = useCallback(() => {
    if (!newTier.min_quantity || newTier.min_quantity <= 0) {
      toast.error('A quantidade mínima deve ser maior que zero');
      return;
    }

    if (!newTier.unit_price || newTier.unit_price <= 0) {
      toast.error('O preço unitário deve ser maior que zero');
      return;
    }

    const quantityExists = tiers.some(t => t.min_quantity === newTier.min_quantity);
    if (quantityExists) {
      toast.error(`Já existe uma faixa para ${newTier.min_quantity} unidades`);
      return;
    }

    const tierToAdd: PriceTier = {
      min_quantity: newTier.min_quantity,
      max_quantity: newTier.max_quantity,
      unit_price: newTier.unit_price,
      discounted_unit_price: newTier.discounted_unit_price ?? null
    };

    const newTiers = [...tiers, tierToAdd];
    console.log('Adding new tier:', tierToAdd);
    console.log('Updated tiers array:', newTiers);

    onChange(newTiers);
    toast.success('Faixa de preço adicionada. Clique em "Salvar Alterações" no final da página para confirmar.');

    setNewTier({
      min_quantity: (newTier.min_quantity || 1) + 10,
      unit_price: 0,
      discounted_unit_price: null
    });
  }, [newTier, tiers, onChange]);

  const handleDeleteTier = useCallback((index: number) => {
    setIsDeleting(true);
    try {
      const updatedTiers = tiers.filter((_, i) => i !== index);
      console.log('Removing tier at index:', index);
      console.log('Updated tiers after removal:', updatedTiers);
      onChange(updatedTiers);
      toast.success('Faixa de preço removida. Clique em "Salvar Alterações" no final da página para confirmar.');
      setDeleteConfirmIndex(null);
    } catch (error) {
      console.error('Error deleting tier:', error);
      toast.error('Erro ao remover faixa de preço');
    } finally {
      setIsDeleting(false);
    }
  }, [tiers, onChange]);

  const handleStartEdit = useCallback((index: number) => {
    const tier = tiers[index];
    setEditingIndex(index);
    setEditingTier({
      min_quantity: tier.min_quantity,
      max_quantity: tier.max_quantity,
      unit_price: tier.unit_price,
      discounted_unit_price: tier.discounted_unit_price
    });
  }, [tiers]);

  const handleCancelEdit = useCallback(() => {
    setEditingIndex(null);
    setEditingTier(null);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingIndex === null || !editingTier) return;

    if (!editingTier.min_quantity || editingTier.min_quantity <= 0) {
      toast.error('A quantidade mínima deve ser maior que zero');
      return;
    }

    if (!editingTier.unit_price || editingTier.unit_price <= 0) {
      toast.error('O preço unitário deve ser maior que zero');
      return;
    }

    const quantityExists = tiers.some((t, idx) =>
      idx !== editingIndex && t.min_quantity === editingTier.min_quantity
    );
    if (quantityExists) {
      toast.error(`Já existe uma faixa para ${editingTier.min_quantity} unidades`);
      return;
    }

    if (editingTier.discounted_unit_price) {
      if (editingTier.discounted_unit_price <= 0) {
        toast.error('O preço promocional deve ser maior que zero');
        return;
      }
      if (editingTier.discounted_unit_price >= editingTier.unit_price) {
        toast.error('O preço promocional deve ser menor que o preço normal');
        return;
      }
    }

    const updatedTiers = [...tiers];
    updatedTiers[editingIndex] = {
      ...tiers[editingIndex],
      min_quantity: editingTier.min_quantity,
      max_quantity: editingTier.max_quantity,
      unit_price: editingTier.unit_price,
      discounted_unit_price: editingTier.discounted_unit_price ?? null
    };

    console.log('Updating tier at index:', editingIndex);
    console.log('Updated tier data:', updatedTiers[editingIndex]);

    onChange(updatedTiers);
    toast.success('Faixa de preço atualizada. Clique em "Salvar Alterações" no final da página para confirmar.');
    handleCancelEdit();
  }, [editingIndex, editingTier, tiers, onChange, handleCancelEdit]);

  const calculateSavings = (unitPrice: number, discountedPrice?: number | null) => {
    if (!discountedPrice) return null;
    const savings = unitPrice - discountedPrice;
    const percentage = Math.round((savings / unitPrice) * 100);
    return { savings, percentage };
  };

  return (
    <div className="space-y-4">

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Erros de validação detectados:</p>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, idx) => (
                  <li key={idx} className="text-sm">{error.message}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {tiers.length > 0 && (
        <Card className="p-4 md:p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Faixas de Preço Cadastradas</h3>
              <p className="text-sm text-muted-foreground">
                Visualize e gerencie seus preços por quantidade
              </p>
            </div>

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Preço Unitário</TableHead>
                    <TableHead>Preço Promocional</TableHead>
                    <TableHead>Economia</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...tiers].sort((a, b) => a.min_quantity - b.min_quantity).map((tier, index) => {
                    const savings = calculateSavings(tier.unit_price, tier.discounted_unit_price);
                    const hasError = errors.some(e => e.tierIndex === index);
                    const isEditing = editingIndex === index;

                    if (isEditing && editingTier) {
                      return (
                        <TableRow key={index} className="bg-blue-50 dark:bg-blue-950/20">
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              value={editingTier.min_quantity || ''}
                              onChange={(e) => setEditingTier({
                                ...editingTier,
                                min_quantity: e.target.value ? parseInt(e.target.value) : undefined
                              })}
                              className="w-24"
                              placeholder="Ex: 10"
                            />
                          </TableCell>
                          <TableCell>
                            <NumericFormat
                              {...numberFormatConfig}
                              value={editingTier.unit_price || ''}
                              onValueChange={(values) => {
                                setEditingTier({
                                  ...editingTier,
                                  unit_price: parseFloat(values.value) || 0
                                });
                              }}
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </TableCell>
                          <TableCell>
                            <NumericFormat
                              {...numberFormatConfig}
                              value={editingTier.discounted_unit_price || ''}
                              onValueChange={(values) => {
                                setEditingTier({
                                  ...editingTier,
                                  discounted_unit_price: values.value ? parseFloat(values.value) : null
                                });
                              }}
                              placeholder="Opcional"
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">-</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSaveEdit}
                              >
                                Salvar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelEdit}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return (
                      <TableRow key={index} className={hasError ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            {tier.min_quantity}+ unidade{tier.min_quantity > 1 ? 's' : ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          {currencySymbol} {tier.unit_price.toLocaleString(locale, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </TableCell>
                        <TableCell>
                          {tier.discounted_unit_price ? (
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-green-600 dark:text-green-400">
                                {currencySymbol} {tier.discounted_unit_price.toLocaleString(locale, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {savings ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="default" className="bg-green-600">
                                -{savings.percentage}%
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Economize {currencySymbol} {savings.savings.toLocaleString(locale, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleStartEdit(index)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar faixa</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setDeleteConfirmIndex(index);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Remover faixa</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {minPrice !== null && (
              <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                <TrendingDown className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Preço exibido na vitrine
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    A partir de {currencySymbol} {minPrice.toLocaleString(locale, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} por unidade
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card className="p-4 md:p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-base md:text-lg font-semibold mb-2">Adicionar Nova Quantidade</h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              Defina uma quantidade específica e seu preço unitário
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <FormLabel className="text-sm">Quantidade Mínima *</FormLabel>
              <Input
                type="number"
                min={1}
                value={newTier.min_quantity || ''}
                onChange={(e) => setNewTier({ ...newTier, min_quantity: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="Ex: 10"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <FormLabel className="text-sm">Preço Unitário *</FormLabel>
              <NumericFormat
                {...numberFormatConfig}
                value={newTier.unit_price || ''}
                onValueChange={(values) => {
                  setNewTier({ ...newTier, unit_price: parseFloat(values.value) || 0 });
                }}
                placeholder={`${currencySymbol} 0,00`}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <FormLabel className="text-sm">Preço Promocional (opcional)</FormLabel>
              <NumericFormat
                {...numberFormatConfig}
                value={newTier.discounted_unit_price || ''}
                onValueChange={(values) => {
                  setNewTier({
                    ...newTier,
                    discounted_unit_price: values.value ? parseFloat(values.value) : null
                  });
                }}
                placeholder={`${currencySymbol} 0,00`}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          <Button type="button" onClick={handleAddTier} className="w-full" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Quantidade
          </Button>
        </div>
      </Card>

      <AlertDialog open={deleteConfirmIndex !== null} onOpenChange={(open) => !open && setDeleteConfirmIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta faixa de preço? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (deleteConfirmIndex !== null) {
                  handleDeleteTier(deleteConfirmIndex);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removendo...
                </>
              ) : (
                'Remover'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
