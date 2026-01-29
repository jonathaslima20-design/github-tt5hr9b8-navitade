import { Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Loader2, GripVertical, ArrowUpDown, CheckSquare, Square, Move } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/types';
import { useState, useEffect } from 'react';
import { fetchProductPriceTiers, getMinimumPriceFromTiers, getFirstTierPrices } from '@/lib/tieredPricingUtils';

import { EnhancedProductGrid } from './EnhancedProductGrid';

interface ProductGridProps {
  products: Product[];
  isDragMode: boolean;
  reordering: boolean;
  bulkActionLoading: boolean;
  selectedProducts: Set<string>;
  updatingProductId: string | null;
  user: any;
  onSelectProduct: (productId: string, checked: boolean) => void;
  onToggleVisibility: (productId: string, currentVisibility: boolean) => Promise<void>;
  onDragEnd: (result: any) => Promise<void>;
  onSaveOrder?: () => Promise<void>;
  onCancelReorder?: () => void;
}

export function ProductGrid({
  products,
  isDragMode,
  reordering,
  bulkActionLoading,
  selectedProducts,
  updatingProductId,
  user,
  onSelectProduct,
  onToggleVisibility,
  onDragEnd,
  onSaveOrder,
  onCancelReorder,
}: ProductGridProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'vendido':
        return <Badge variant="destructive">Vendido</Badge>;
      case 'reservado':
        return <Badge variant="secondary">Reservado</Badge>;
      default:
        return null;
    }
  };

  // Use enhanced grid for drag mode
  if (isDragMode) {
    return (
      <EnhancedProductGrid
        products={products}
        isDragMode={isDragMode}
        onDragEnd={onDragEnd}
        onSaveOrder={onSaveOrder || (() => Promise.resolve())}
        onCancelReorder={onCancelReorder || (() => {})}
        user={user}
        reordering={reordering}
      />
    );
  }

  const ProductCard = ({ product, index, isDragMode }: {
    product: Product;
    index: number;
    isDragMode: boolean;
  }) => {
    const isSelected = selectedProducts.has(product.id);
    const [minimumTieredPrice, setMinimumTieredPrice] = useState<number | null>(null);
    const [firstTierPrices, setFirstTierPrices] = useState<any>(null);
    const [loadingTiers, setLoadingTiers] = useState(false);

    useEffect(() => {
      if (product.has_tiered_pricing) {
        setLoadingTiers(true);
        fetchProductPriceTiers(product.id)
          .then(tiers => {
            const minPrice = getMinimumPriceFromTiers(tiers);
            const firstTierData = getFirstTierPrices(tiers);
            setMinimumTieredPrice(minPrice);
            setFirstTierPrices(firstTierData);
          })
          .catch(err => console.error('Error loading price tiers:', err))
          .finally(() => setLoadingTiers(false));
      }
    }, [product.id, product.has_tiered_pricing]);

    // Calculate discount information
    const effectiveMinPrice = product.has_tiered_pricing && minimumTieredPrice && minimumTieredPrice > 0 ? minimumTieredPrice : null;
    const hasDiscount = product.discounted_price && product.discounted_price < product.price;
    const baseDisplayPrice = hasDiscount ? product.discounted_price : product.price;
    const displayPrice = effectiveMinPrice !== null ? effectiveMinPrice : baseDisplayPrice;
    const originalPrice = hasDiscount ? product.price : null;
    const discountPercentage = hasDiscount
      ? Math.round(((product.price - product.discounted_price!) / product.price) * 100)
      : null;
    const isTieredPricing = product.has_tiered_pricing && effectiveMinPrice !== null && effectiveMinPrice > 0;

    return (
      <Card className={`h-full hover:shadow-lg transition-all duration-200 group ${isDragMode ? 'cursor-grab active:cursor-grabbing' : ''} ${isSelected ? 'ring-2 ring-primary' : ''}`}>
        <CardContent className="p-2 md:p-3 relative">
          {/* Selection Checkbox - Only show when not in drag mode */}
          {!isDragMode && (
            <div className="absolute top-1 left-1 md:top-2 md:left-2 z-10">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelectProduct(product.id, checked as boolean)}
                className="bg-background/90 backdrop-blur-sm border-2 scale-75 md:scale-100"
              />
            </div>
          )}
          
          {/* Drag Handle - Only show when in drag mode */}
          {isDragMode && (
            <div className="absolute top-1 right-1 md:top-2 md:right-2 z-10 bg-primary/90 backdrop-blur-sm rounded-md p-1 md:p-1.5 opacity-80 group-hover:opacity-100 transition-all duration-200 border border-primary/30">
              <GripVertical className="h-3 w-3 md:h-4 md:w-4 text-primary" />
            </div>
          )}

          <Link to={`/dashboard/products/${product.id}/edit`} className={isDragMode ? 'pointer-events-none' : ''}>
            {/* Container da imagem EXATAMENTE como na imagem de referência */}
            <div className="aspect-square relative mb-2 md:mb-3">
              <div className="w-full h-full bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                {product.featured_image_url ? (
                  <img
                    src={product.featured_image_url}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-white flex items-center justify-center">
                    <span className="text-muted-foreground text-xs">Sem imagem</span>
                  </div>
                )}
              </div>
              
              {/* Badges - Top Right */}
              <div className="absolute top-1 right-1 flex flex-col gap-1">
                {(hasDiscount && discountPercentage || (isTieredPricing && firstTierPrices?.discountPercentage)) && (
                  <Badge className="bg-green-600 hover:bg-green-700 text-white border-transparent text-xs px-1 py-0">
                    -{firstTierPrices?.discountPercentage || discountPercentage}%
                  </Badge>
                )}
                {getStatusBadge(product.status)}
              </div>

              {/* Visibility Indicator */}
              <div className="absolute top-1 left-1">
                {product.is_visible_on_storefront ? (
                  <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-[10px] md:text-xs px-1 py-0">
                    <CheckSquare className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                    <span className="hidden md:inline">Visível</span>
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] md:text-xs px-1 py-0">
                    <Square className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                    <span className="hidden md:inline">Oculto</span>
                  </Badge>
                )}
              </div>
            </div>
            
            <h2 className="font-semibold mb-1 md:mb-2 line-clamp-2 text-[10px] md:text-xs leading-tight">{product.title}</h2>

            {/* Price Display with Discount Support */}
            <div className="mb-2 md:mb-3">
              {loadingTiers && product.has_tiered_pricing ? (
                <div className="text-xs md:text-sm font-bold text-muted-foreground animate-pulse">
                  Carregando preços...
                </div>
              ) : isTieredPricing && firstTierPrices && firstTierPrices.hasPromotionalPricing ? (
                <div className="space-y-0.5 md:space-y-1">
                  <div className="text-[10px] md:text-xs text-muted-foreground line-through">
                    De {formatCurrency(firstTierPrices.unitPrice, user?.currency || 'BRL', user?.language || 'pt-BR')}
                  </div>
                  <div className="text-xs md:text-sm font-bold text-primary">
                    por {formatCurrency(firstTierPrices.discountedPrice, user?.currency || 'BRL', user?.language || 'pt-BR')}
                  </div>
                </div>
              ) : isTieredPricing ? (
                <div className="space-y-0.5 md:space-y-1">
                  {firstTierPrices && firstTierPrices.hasPromotionalPricing ? (
                    <div className="text-[10px] md:text-xs text-muted-foreground line-through">
                      De {formatCurrency(firstTierPrices.unitPrice, user?.currency || 'BRL', user?.language || 'pt-BR')}
                    </div>
                  ) : hasDiscount && originalPrice && originalPrice > 0 ? (
                    <div className="text-[10px] md:text-xs text-muted-foreground line-through">
                      {formatCurrency(originalPrice, user?.currency || 'BRL', user?.language || 'pt-BR')}
                    </div>
                  ) : null}
                  <div className="text-xs md:text-sm font-bold text-primary">
                    a partir de {formatCurrency(minimumTieredPrice!, user?.currency || 'BRL', user?.language || 'pt-BR')}
                  </div>
                </div>
              ) : hasDiscount ? (
                <div className="space-y-0.5 md:space-y-1">
                  {/* Original price with strikethrough */}
                  <div className="text-[10px] md:text-xs text-muted-foreground line-through">
                    {product.is_starting_price ? 'A partir de ' : ''}
                    {formatCurrency(originalPrice!, user?.currency || 'BRL', user?.language || 'pt-BR')}
                  </div>
                  {/* Discounted price */}
                  <div className="text-xs md:text-sm font-bold text-primary">
                    {product.is_starting_price ? 'A partir de ' : ''}
                    {formatCurrency(displayPrice!, user?.currency || 'BRL', user?.language || 'pt-BR')}
                  </div>
                </div>
              ) : displayPrice && displayPrice > 0 ? (
                <div className="text-xs md:text-sm font-bold text-primary">
                  {product.is_starting_price ? 'A partir de ' : ''}
                  {formatCurrency(displayPrice!, user?.currency || 'BRL', user?.language || 'pt-BR')}
                </div>
              ) : null}

              {/* Short Description (Promotional phrase) */}
              {product.short_description && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-1 md:line-clamp-2">
                  {product.short_description}
                </p>
              )}
            </div>
          </Link>

          {/* Quick Visibility Toggle */}
          <div className={`flex items-center justify-between pt-1.5 md:pt-2 border-t ${isDragMode ? 'pointer-events-none opacity-50' : ''}`}>
            <span className="text-[10px] md:text-xs text-muted-foreground">
              Vitrine
            </span>
            <Switch
              checked={product.is_visible_on_storefront ?? true}
              onCheckedChange={() => onToggleVisibility(
                product.id, 
                product.is_visible_on_storefront ?? true
              )}
              disabled={updatingProductId === product.id || isDragMode}
              size="sm"
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  if (products.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <h2 className="text-xl font-semibold mb-2">Nenhum produto encontrado</h2>
          <p className="text-muted-foreground mb-4">
            Tente ajustar os filtros ou termo de busca
          </p>
          <Button 
            variant="outline"
            onClick={() => {
              // This would need to be passed as props or handled by parent
              console.log('Clear filters clicked');
            }}
          >
            Limpar Filtros
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {isDragMode ? (
        // Drag and Drop enabled grid with improved drop zones
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="sliding-puzzle-grid">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7 gap-2 md:gap-4 lg:gap-5 xl:gap-6 p-2 md:p-6 min-h-[400px] transition-all duration-500 ease-in-out ${
                  snapshot.isDraggingOver 
                    ? 'bg-gradient-to-br from-primary/5 to-blue-500/5 border-2 border-dashed border-primary/30 rounded-xl shadow-inner scale-[1.02]' 
                    : 'border-2 border-transparent rounded-xl scale-100'
                } ${reordering ? 'pointer-events-none opacity-70' : ''}`}
              >
                {products.map((product, index) => (
                  <Draggable 
                    key={product.id} 
                    draggableId={product.id} 
                    index={index}
                    isDragDisabled={reordering}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`h-full transition-all duration-500 ease-out transform-gpu ${
                          snapshot.isDragging 
                            ? 'z-50 scale-110 shadow-2xl opacity-95 cursor-grabbing rotate-2 ring-2 ring-primary/50 brightness-110' 
                            : 'cursor-grab hover:scale-[1.02] hover:shadow-lg hover:z-10 hover:-translate-y-0.5'
                        }`}
                        style={provided.draggableProps.style}
                      >
                        <div className={`relative ${snapshot.isDragging ? 'animate-bounce' : ''}`}>
                          <ProductCard product={product} index={index} isDragMode={true} />
                          {snapshot.isDragging && (
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-xl border-2 border-primary/40 pointer-events-none animate-pulse" />
                          )}
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                
                {/* Sliding Puzzle Drop Zone Indicator */}
                {snapshot.isDraggingOver && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-primary/90 text-primary-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-bounce">
                      Solte para reorganizar
                    </div>
                  </div>
                )}
                
                <div className={`transition-all duration-500 ${
                  snapshot.isDraggingOver ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                }`}>
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        // Regular grid without drag and drop
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7 gap-2 md:gap-4 lg:gap-5 xl:gap-6">
          {products.map((product, index) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              index={index} 
              isDragMode={false}
            />
          ))}
        </div>
      )}

      {/* Loading overlay during reordering */}
      {(reordering || bulkActionLoading) && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-4 flex items-center gap-3 shadow-lg">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>
              {reordering ? 'Atualizando ordem dos produtos...' : 'Processando ação em massa...'}
            </span>
          </div>
        </div>
      )}
    </>
  );
}