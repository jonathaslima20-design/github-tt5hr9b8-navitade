import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical, Target, ArrowDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { DragDropIndicator, DragDropZone } from './DragDropIndicator';
import { ReorderModeControls } from './ReorderModeControls';
import { useDragDropState } from '@/hooks/useDragDropState';
import type { Product } from '@/types';
import { fetchProductPriceTiers, getMinimumPriceFromTiers, getFirstTierPrices } from '@/lib/tieredPricingUtils';

interface EnhancedProductGridProps {
  products: Product[];
  isDragMode: boolean;
  onDragEnd: (result: any) => Promise<void>;
  onSaveOrder: () => Promise<void>;
  onCancelReorder: () => void;
  user: any;
  reordering: boolean;
}

export function EnhancedProductGrid({
  products,
  isDragMode,
  onDragEnd,
  onSaveOrder,
  onCancelReorder,
  user,
  reordering
}: EnhancedProductGridProps) {
  const { dragState, setDragState, resetDragState, markAsChanged, canUndo, undoChanges } = useDragDropState(products);
  const [localProducts, setLocalProducts] = useState(products);

  useEffect(() => {
    setLocalProducts(products);
  }, [products]);

  const handleDragStart = (start: any) => {
    const draggedProduct = localProducts.find(p => p.id === start.draggableId);
    setDragState({
      isDragging: true,
      draggedItem: draggedProduct || null
    });
    
    // Add drag cursor to body
    document.body.classList.add('drag-cursor-grabbing');
  };

  const handleDragUpdate = (update: any) => {
    setDragState({
      dragOverIndex: update.destination?.index || null
    });
  };

  const handleDragEndInternal = async (result: any) => {
    // Remove drag cursor
    document.body.classList.remove('drag-cursor-grabbing');
    
    setDragState({
      isDragging: false,
      draggedItem: null,
      dragOverIndex: null
    });

    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    // 🧩 SLIDING PUZZLE: Update local state immediately for smooth UX
    const reorderedProducts = Array.from(localProducts);
    const [draggedItem] = reorderedProducts.splice(sourceIndex, 1);
    reorderedProducts.splice(destinationIndex, 0, draggedItem);
    
    setLocalProducts(reorderedProducts);
    markAsChanged();

    // Call the parent's sliding puzzle handler
    await onDragEnd(result);
  };

  const handleSave = async () => {
    await onSaveOrder();
    resetDragState();
  };

  const handleCancel = () => {
    setLocalProducts(products);
    resetDragState();
    onCancelReorder();
  };

  const handleUndo = () => {
    const originalProducts = undoChanges();
    setLocalProducts(originalProducts);
  };

  const ProductCard = ({ product, index, isDragging }: {
    product: Product;
    index: number;
    isDragging: boolean;
  }) => {
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
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.3 }}
        className="relative"
      >
        <Card className={`h-full transition-all duration-300 group ${
          isDragging 
            ? 'shadow-2xl ring-2 ring-primary/50 bg-background/95 backdrop-blur-sm transform rotate-2 scale-105' 
            : 'hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 cursor-grab'
        }`}>
          <CardContent className="p-2 md:p-3 relative">
            {/* Position Indicator */}
            <div className="absolute top-1 left-1 md:top-2 md:left-2 z-20 bg-primary/90 text-primary-foreground rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center text-[10px] md:text-xs font-bold shadow-sm">
              {index + 1}
            </div>

            {/* Enhanced Drag Handle */}
            <div className="absolute top-1 right-1 md:top-2 md:right-2 z-20 bg-gradient-to-br from-primary/90 to-primary/70 backdrop-blur-sm rounded-lg p-1.5 md:p-2 opacity-90 group-hover:opacity-100 transition-all duration-300 border border-primary/40 shadow-lg">
              <GripVertical className="h-3 w-3 md:h-4 md:w-4 text-white drop-shadow-sm" />
              <motion.div
                animate={isDragging ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.5, repeat: isDragging ? Infinity : 0 }}
                className="absolute inset-0 bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
            </div>

            {/* Product Image */}
            <div className="aspect-square relative mb-2 md:mb-3 mt-6 md:mt-8">
              <div className="w-full h-full bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                {product.featured_image_url ? (
                  <img
                    src={product.featured_image_url}
                    alt={product.title}
                    className={`w-full h-full object-cover transition-transform duration-300 ${
                      isDragging ? 'scale-110 blur-[1px]' : 'group-hover:scale-105'
                    }`}
                  />
                ) : (
                  <div className="w-full h-full bg-white flex items-center justify-center">
                    <span className="text-muted-foreground text-xs">Sem imagem</span>
                  </div>
                )}
              </div>

              {/* Badges */}
              <div className="absolute top-1 right-1 flex flex-col gap-1">
                {(hasDiscount && discountPercentage || (isTieredPricing && firstTierPrices?.discountPercentage)) && (
                  <Badge className="bg-green-600 hover:bg-green-700 text-white border-transparent text-xs px-1 py-0">
                    -{firstTierPrices?.discountPercentage || discountPercentage}%
                  </Badge>
                )}
              </div>
            </div>

            {/* Product Info */}
            <h2 className="font-semibold mb-1 md:mb-2 line-clamp-2 text-[10px] md:text-xs leading-tight">
              {product.title}
            </h2>

            {/* Price Display */}
            <div>
              {loadingTiers && product.has_tiered_pricing ? (
                <div className="text-xs md:text-sm font-bold text-muted-foreground animate-pulse">
                  Carregando...
                </div>
              ) : isTieredPricing && firstTierPrices && firstTierPrices.hasPromotionalPricing ? (
                <div className="space-y-0.5">
                  <div className="text-[10px] md:text-xs text-muted-foreground line-through">
                    De {formatCurrency(firstTierPrices.unitPrice, user?.currency || 'BRL', user?.language || 'pt-BR')}
                  </div>
                  <div className="text-xs md:text-sm font-bold text-primary">
                    por {formatCurrency(firstTierPrices.discountedPrice, user?.currency || 'BRL', user?.language || 'pt-BR')}
                  </div>
                </div>
              ) : isTieredPricing ? (
                <div className="space-y-0.5">
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
              ) : displayPrice && displayPrice > 0 ? (
                <div className="text-xs md:text-sm font-bold text-primary">
                  {product.is_starting_price ? 'A partir de ' : ''}
                  {formatCurrency(displayPrice!, user?.currency || 'BRL', user?.language || 'pt-BR')}
                </div>
              ) : null}
            </div>

            {/* Dragging Overlay */}
            {isDragging && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-lg pointer-events-none border-2 border-primary/30"
              />
            )}
          </CardContent>
        </Card>

        {/* Drop Indicator */}
        <DragDropIndicator
          isVisible={dragState.dragOverIndex === index && dragState.isDragging}
          position="middle"
          index={index}
        />
      </motion.div>
    );
  };

  return (
    <>
      {/* Reorder Mode Controls */}
      <ReorderModeControls
        isActive={isDragMode}
        isReordering={reordering}
        hasChanges={dragState.hasChanges}
        onSave={handleSave}
        onCancel={handleCancel}
        onUndo={handleUndo}
        changedCount={dragState.hasChanges ? 1 : 0}
      />

      {/* Enhanced Drag and Drop Grid */}
      <DragDropContext 
        onDragStart={handleDragStart}
        onDragUpdate={handleDragUpdate}
        onDragEnd={handleDragEndInternal}
      >
        <Droppable droppableId="sliding-puzzle-enhanced">
          {(provided, snapshot) => (
            <DragDropZone isActive={snapshot.isDraggingOver}>
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4 p-2 md:p-6 min-h-[400px] transition-all duration-500 ease-in-out ${
                  reordering ? 'pointer-events-none opacity-70' : ''
                }`}
              >
                <AnimatePresence>
                  {localProducts.map((product, index) => (
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
                          className={`h-full transition-all duration-300 ease-out ${
                            snapshot.isDragging 
                              ? 'z-50 scale-105 rotate-1 shadow-2xl' 
                              : 'hover:scale-[1.01] hover:shadow-md'
                          }`}
                          style={provided.draggableProps.style}
                        >
                          <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ 
                              duration: 0.3,
                              type: "spring",
                              stiffness: 300,
                              damping: 30
                            }}
                          >
                            <ProductCard 
                              product={product} 
                              index={index} 
                              isDragging={snapshot.isDragging}
                            />
                          </motion.div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                </AnimatePresence>
                
                {/* Sliding Puzzle Placeholder */}
                <div className={`transition-all duration-500 ${
                  snapshot.isDraggingOver ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                }`}>
                  {provided.placeholder}
                </div>
              </div>
            </DragDropZone>
          )}
        </Droppable>
      </DragDropContext>

      {/* Loading Overlay */}
      <AnimatePresence>
        {reordering && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-background rounded-xl p-6 flex items-center gap-4 shadow-2xl border"
            >
              <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <div className="text-lg font-medium">
                Salvando nova ordem...
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}