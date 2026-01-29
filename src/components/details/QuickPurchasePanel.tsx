import { useState } from 'react';
import { Plus, Minus, ShoppingCart, Palette, Ruler, Trash2, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getColorValue } from '@/lib/utils';
import { formatCurrencyI18n, type SupportedCurrency, type SupportedLanguage } from '@/lib/i18n';
import { toast } from 'sonner';
import type { PriceTier, Product } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import PriceTierBadge from './PriceTierBadge';
import SavingsIndicator from './SavingsIndicator';
import DistributionSummary from './DistributionSummary';

interface DistributionItem {
  id: string;
  color?: string;
  size?: string;
  quantity: number;
}

interface QuickPurchasePanelProps {
  product: Product;
  priceTiers: PriceTier[];
  minimumTieredPrice: number | null;
  currency: SupportedCurrency;
  language: SupportedLanguage;
  onAddToCart: (
    quantity: number,
    distributionItems: DistributionItem[]
  ) => void;
}

export default function QuickPurchasePanel({
  product,
  priceTiers,
  minimumTieredPrice,
  currency,
  language,
  onAddToCart,
}: QuickPurchasePanelProps) {
  const minQuantity = priceTiers.length > 0 && product.has_tiered_pricing ? priceTiers[0].min_quantity : 1;

  const [quantity, setQuantity] = useState(minQuantity);
  const [distributionItems, setDistributionItems] = useState<DistributionItem[]>([]);
  const [newItemColor, setNewItemColor] = useState<string | undefined>();
  const [newItemSize, setNewItemSize] = useState<string | undefined>();
  const [newItemQuantity, setNewItemQuantity] = useState(1);

  const hasColors = product.colors &&
                   Array.isArray(product.colors) &&
                   product.colors.length > 0 &&
                   product.colors.some(color => color && color.trim().length > 0);

  const hasSizes = product.sizes &&
                  Array.isArray(product.sizes) &&
                  product.sizes.length > 0 &&
                  product.sizes.some(size => size && size.trim().length > 0);

  const hasOptions = hasColors || hasSizes;
  const distributionMode = hasOptions && quantity > 1;

  const distributedQuantity = distributionItems.reduce((sum, item) => sum + item.quantity, 0);
  const remainingQuantity = quantity - distributedQuantity;
  const isDistributionComplete = distributedQuantity === quantity;
  const isDistributionOverflow = distributedQuantity > quantity;

  const calculatePricing = () => {
    let effectiveBasePriceForComparison = product.discounted_price || product.price || 0;

    if (product.has_tiered_pricing && effectiveBasePriceForComparison === 0 && minimumTieredPrice) {
      effectiveBasePriceForComparison = minimumTieredPrice;
    }

    const basePrice = effectiveBasePriceForComparison;
    let unitPrice = basePrice;
    let totalPrice = basePrice * quantity;

    if (product.has_tiered_pricing && priceTiers.length > 0) {
      const sortedTiers = [...priceTiers].sort((a, b) => a.min_quantity - b.min_quantity);
      const applicableTier = sortedTiers
        .filter(tier => quantity >= tier.min_quantity && (!tier.max_quantity || quantity <= tier.max_quantity))
        .pop();

      if (applicableTier) {
        const tierUnitPrice = applicableTier.unit_price ?? minimumTieredPrice ?? product.price ?? basePrice;
        const tierDiscountedPrice = applicableTier.discounted_unit_price ?? null;
        unitPrice = tierDiscountedPrice ?? tierUnitPrice;

        if (unitPrice <= 0) {
          console.warn('Invalid unit price calculated, using base price', { applicableTier, unitPrice });
          unitPrice = basePrice;
        }
      }
      totalPrice = unitPrice * quantity;
    }

    const savings = (basePrice * quantity) - totalPrice;
    const showSavings = product.has_tiered_pricing && savings > 0;

    return { unitPrice, totalPrice, savings, showSavings, basePrice };
  };

  const addDistributionItem = () => {
    if (hasColors && !newItemColor) {
      toast.error('Selecione uma cor');
      return;
    }
    if (hasSizes && !newItemSize) {
      toast.error('Selecione um tamanho');
      return;
    }
    if (newItemQuantity <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }
    if (distributedQuantity + newItemQuantity > quantity) {
      toast.error(`Quantidade excede o total. Restante: ${remainingQuantity}`);
      return;
    }

    const isDuplicate = distributionItems.some(
      item => item.color === newItemColor && item.size === newItemSize
    );

    if (isDuplicate) {
      toast.error('Esta combinação de cor e tamanho já foi adicionada');
      return;
    }

    const newItem = {
      id: `${Date.now()}-${Math.random()}`,
      color: hasColors ? newItemColor : undefined,
      size: hasSizes ? newItemSize : undefined,
      quantity: newItemQuantity,
    };

    setDistributionItems([...distributionItems, newItem]);
    setNewItemColor(undefined);
    setNewItemSize(undefined);
    setNewItemQuantity(1);
  };

  const removeDistributionItem = (id: string) => {
    setDistributionItems(distributionItems.filter(item => item.id !== id));
  };

  const updateDistributionItemQuantity = (id: string, newQty: number) => {
    if (newQty <= 0) {
      removeDistributionItem(id);
      return;
    }

    setDistributionItems(distributionItems.map(item =>
      item.id === id ? { ...item, quantity: newQty } : item
    ));
  };

  const handleAddToCart = () => {
    if (distributionMode && hasOptions) {
      if (!isDistributionComplete) {
        toast.error(`Distribua todas as ${quantity} unidades. Restante: ${remainingQuantity}`);
        return;
      }

      if (distributionItems.length === 0) {
        toast.error('Adicione pelo menos uma variação');
        return;
      }
    }

    onAddToCart(quantity, distributionItems);

    setQuantity(product.has_tiered_pricing && priceTiers.length > 0 ? priceTiers[0].min_quantity : 1);
    setDistributionItems([]);
    setNewItemColor(undefined);
    setNewItemSize(undefined);
  };

  const pricing = calculatePricing();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {product.has_tiered_pricing && priceTiers.length > 0 && (
        <PriceTierBadge
          currentQuantity={quantity}
          tiers={priceTiers}
          basePrice={pricing.basePrice}
          currency={currency}
          language={language}
        />
      )}

      {!product.has_tiered_pricing ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Quantidade</CardTitle>
            <CardDescription className="text-xs">Selecione a quantidade desejada</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 justify-center">
              <Button
                size="lg"
                variant="outline"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-5 w-5" />
              </Button>
              <span className="text-2xl font-semibold w-16 text-center">
                {quantity}
              </span>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-blue-600" />
              Seleção Rápida de Quantidade
            </CardTitle>
            <CardDescription className="text-xs">
              Clique para selecionar uma quantidade e ver o preço
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {priceTiers.slice(0, 4).map((tier) => {
                const tierUnitPrice = tier.unit_price ?? product.price ?? 0;
                const tierDiscountedPrice = tier.discounted_unit_price ?? null;
                const tierPrice = tierDiscountedPrice ?? tierUnitPrice;

                if (tierPrice <= 0) {
                  console.warn('Invalid tier price detected:', { tier, tierPrice });
                  return null;
                }

                const tierTotal = tierPrice * tier.min_quantity;
                const effectiveBasePrice = product.discounted_price || product.price || minimumTieredPrice || 0;
                const savings = (effectiveBasePrice * tier.min_quantity) - tierTotal;
                const savingsPercent = effectiveBasePrice > 0
                  ? Math.round((savings / (effectiveBasePrice * tier.min_quantity)) * 100)
                  : 0;

                return (
                  <Button
                    key={tier.id}
                    variant={quantity === tier.min_quantity ? "default" : "outline"}
                    className="h-auto py-3 px-3 flex flex-col items-start"
                    onClick={() => setQuantity(tier.min_quantity)}
                  >
                    <div className="text-sm font-semibold">{tier.min_quantity} {tier.min_quantity === 1 ? 'Unidade' : 'Unidades'}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrencyI18n(tierPrice, currency, language)}/un
                    </div>
                    {savingsPercent > 0 && (
                      <div className="text-xs text-green-600 font-medium">
                        -{savingsPercent}%
                      </div>
                    )}
                  </Button>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t">
              <Label className="text-xs font-medium mb-2 block">Quantidade Personalizada</Label>
              <div className="flex items-center gap-3 justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setQuantity(Math.max(minQuantity, quantity - 1))}
                  disabled={quantity <= minQuantity}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-lg font-semibold w-12 text-center">
                  {quantity}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {quantity < minQuantity && (
                <p className="text-xs text-amber-600 mt-2 text-center">
                  Quantidade mínima: {minQuantity}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <AnimatePresence>
        {distributionMode && hasOptions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Distribuir por Cor e Tamanho</CardTitle>
                <CardDescription className="text-xs">
                  Distribua as {quantity} unidades entre cores e tamanhos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Distribuído</span>
                    <span className={isDistributionOverflow ? 'text-destructive font-bold' : isDistributionComplete ? 'text-green-600 font-bold' : 'font-medium'}>
                      {distributedQuantity} / {quantity}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Restante</span>
                    <span className={remainingQuantity < 0 ? 'text-destructive font-bold' : remainingQuantity === 0 ? 'text-green-600 font-bold' : 'font-medium'}>
                      {remainingQuantity}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                  <Label className="text-xs font-medium">Adicionar Variação</Label>
                  <div className="grid gap-2">
                    {hasColors && (
                      <Select value={newItemColor || ''} onValueChange={(value) => setNewItemColor(value || undefined)}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Cor">
                            {newItemColor && (
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full border border-gray-300"
                                  style={{ backgroundColor: getColorValue(newItemColor) }}
                                />
                                <span className="capitalize text-xs">{newItemColor}</span>
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {product.colors!.map((color: string) => (
                            <SelectItem key={color} value={color}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full border border-gray-300"
                                  style={{ backgroundColor: getColorValue(color) }}
                                />
                                <span className="capitalize text-xs">{color}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {hasSizes && (
                      <Select value={newItemSize || ''} onValueChange={(value) => setNewItemSize(value || undefined)}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Tamanho">
                            {newItemSize && (
                              <span className="text-xs">{newItemSize}</span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {product.sizes!.map((size: string) => (
                            <SelectItem key={size} value={size}>
                              <span className="text-xs">{size}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    <div className="flex gap-2">
                      <div className="flex-1 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 w-9 p-0"
                          onClick={() => setNewItemQuantity(Math.max(1, newItemQuantity - 1))}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-medium w-8 text-center">{newItemQuantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 w-9 p-0"
                          onClick={() => setNewItemQuantity(newItemQuantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        onClick={addDistributionItem}
                        disabled={remainingQuantity <= 0 || (hasColors && !newItemColor) || (hasSizes && !newItemSize)}
                        className="h-9"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </div>

                {distributionItems.length > 0 && (
                  <DistributionSummary
                    items={distributionItems}
                    hasColors={hasColors}
                    hasSizes={hasSizes}
                    onUpdateQuantity={updateDistributionItemQuantity}
                    onRemove={removeDistributionItem}
                  />
                )}

                {!isDistributionComplete && distributionItems.length > 0 && (
                  <div className="p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      Você ainda precisa distribuir {remainingQuantity} {remainingQuantity === 1 ? 'unidade' : 'unidades'}
                    </p>
                  </div>
                )}

                {isDistributionOverflow && (
                  <div className="p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-xs text-destructive">
                      Você distribuiu {Math.abs(remainingQuantity)} {Math.abs(remainingQuantity) === 1 ? 'unidade' : 'unidades'} a mais que o total
                    </p>
                  </div>
                )}

                {isDistributionComplete && (
                  <div className="p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-xs text-green-800 dark:text-green-200 flex items-center gap-1">
                      <Badge className="bg-green-600 text-white h-4 w-4 p-0 flex items-center justify-center">
                        ✓
                      </Badge>
                      Distribuição completa!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {pricing.showSavings && (
        <SavingsIndicator
          savings={pricing.savings}
          currency={currency}
          language={language}
        />
      )}

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Preço por unidade:</span>
              <span className="font-semibold">
                {formatCurrencyI18n(pricing.unitPrice, currency, language)}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Quantidade:</span>
              <span className="font-semibold">{quantity} {quantity === 1 ? 'unidade' : 'unidades'}</span>
            </div>

            {pricing.showSavings && (
              <div className="flex justify-between items-center text-sm pt-2 border-t">
                <span className="text-green-600 font-medium">Economia:</span>
                <span className="text-green-600 font-bold">
                  {formatCurrencyI18n(pricing.savings, currency, language)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t">
              <span className="text-lg font-medium">Total:</span>
              <span className="text-2xl font-bold text-primary">
                {formatCurrencyI18n(pricing.totalPrice, currency, language)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        size="lg"
        className="w-full"
        onClick={handleAddToCart}
        disabled={distributionMode ? !isDistributionComplete : false}
      >
        <ShoppingCart className="h-5 w-5 mr-2" />
        Adicionar {quantity > 1 ? `(${quantity})` : ''}
      </Button>
    </motion.div>
  );
}
