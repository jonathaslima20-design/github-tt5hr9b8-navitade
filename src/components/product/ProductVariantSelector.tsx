import { useState } from 'react';
import { ShoppingCart, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/contexts/CartContext';
import { formatCurrencyI18n, type SupportedLanguage, type SupportedCurrency } from '@/lib/i18n';
import { getColorValue } from '@/lib/utils';
import type { Product } from '@/types';

interface ProductVariantSelectorProps {
  product: Product;
  currency?: SupportedCurrency;
  language?: SupportedLanguage;
}

export default function ProductVariantSelector({
  product,
  currency = 'BRL',
  language = 'pt-BR'
}: ProductVariantSelectorProps) {
  const [selectedColor, setSelectedColor] = useState<string | undefined>();
  const [selectedSize, setSelectedSize] = useState<string | undefined>();
  const { addToCart, hasVariant, getVariantQuantity, updateVariantQuantity } = useCart();

  const isAvailable = product.status === 'disponivel';
  const hasPrice = product.price && product.price > 0;
  const hasColors = product.colors && product.colors.length > 0;
  const hasSizes = product.sizes && product.sizes.length > 0;
  const hasOptions = hasColors || hasSizes;

  // Separate apparel sizes from shoe sizes
  const separateSizes = (sizes: string[]) => {
    const apparelSizes: string[] = [];
    const shoeSizes: string[] = [];
    
    sizes.forEach((size: string) => {
      const numericSize = parseInt(size);
      if (!isNaN(numericSize) && numericSize >= 17 && numericSize <= 43) {
        shoeSizes.push(size);
      } else {
        apparelSizes.push(size);
      }
    });

    return { apparelSizes, shoeSizes };
  };

  const sortSizes = (sizes: string[], isShoe: boolean) => {
    if (isShoe) {
      return sizes.sort((a, b) => parseInt(a) - parseInt(b));
    } else {
      const sizeOrder = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'];
      return sizes.sort((a, b) => {
        const indexA = sizeOrder.indexOf(a);
        const indexB = sizeOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
      });
    }
  };

  const currentVariantQuantity = getVariantQuantity(product.id, selectedColor, selectedSize);
  const inCart = hasVariant(product.id, selectedColor, selectedSize);

  const handleAddToCart = () => {
    if (isAvailable && hasPrice) {
      addToCart(product, selectedColor, selectedSize);
    }
  };

  const handleUpdateQuantity = (newQuantity: number) => {
    const variantId = `${product.id}-${selectedColor || 'no-color'}-${selectedSize || 'no-size'}`;
    updateVariantQuantity(variantId, newQuantity);
  };

  if (!isAvailable || !hasPrice) {
    return null;
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Adicionar ao Carrinho
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Color Selection */}
        {hasColors && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Cor {hasColors && '*'}</Label>
            <div className="flex flex-wrap gap-2">
              {product.colors!.map((color: string) => {
                const colorValue = getColorValue(color);
                const isLightColor = ['branco', 'amarelo', 'bege', 'off-white', 'creme'].includes(color.toLowerCase());
                const isSelected = selectedColor === color;

                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(isSelected ? undefined : color)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/10 text-primary' 
                        : 'border-gray-300 hover:border-primary/50 hover:bg-accent'
                    }`}
                  >
                    <div 
                      className={`w-4 h-4 rounded-full border ${isLightColor ? 'border-gray-400' : 'border-gray-300'} shadow-sm`}
                      style={{ backgroundColor: colorValue }}
                    />
                    <span className="text-sm capitalize">{color}</span>
                  </button>
                );
              })}
            </div>
            {hasColors && !selectedColor && (
              <p className="text-xs text-muted-foreground">* Selecione uma cor</p>
            )}
          </div>
        )}

        {/* Size Selection */}
        {hasSizes && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Tamanho {hasSizes && '*'}</Label>
            
            {(() => {
              const { apparelSizes, shoeSizes } = separateSizes(product.sizes!);
              const sortedApparelSizes = sortSizes(apparelSizes, false);
              const sortedShoeSizes = sortSizes(shoeSizes, true);

              return (
                <div className="space-y-4">
                  {/* Apparel Sizes */}
                  {sortedApparelSizes.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Tamanhos de Roupa</Label>
                      <div className="flex flex-wrap gap-2">
                        {sortedApparelSizes.map((size: string) => {
                          const isSelected = selectedSize === size;
                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() => setSelectedSize(isSelected ? undefined : size)}
                              className={`flex items-center justify-center w-12 h-10 border rounded-lg transition-all text-sm font-medium ${
                                isSelected 
                                  ? 'border-primary bg-primary text-primary-foreground' 
                                  : 'border-gray-300 hover:border-primary/50 hover:bg-accent'
                              }`}
                            >
                              {size}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Shoe Sizes */}
                  {sortedShoeSizes.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Numeração de Calçados</Label>
                      <div className="flex flex-wrap gap-2">
                        {sortedShoeSizes.map((size: string) => {
                          const isSelected = selectedSize === size;
                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() => setSelectedSize(isSelected ? undefined : size)}
                              className={`flex items-center justify-center w-12 h-10 border rounded-lg transition-all text-sm font-medium ${
                                isSelected 
                                  ? 'border-primary bg-primary text-primary-foreground' 
                                  : 'border-gray-300 hover:border-primary/50 hover:bg-accent'
                              }`}
                            >
                              {size}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            
            {hasSizes && !selectedSize && (
              <p className="text-xs text-muted-foreground">* Selecione um tamanho</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}