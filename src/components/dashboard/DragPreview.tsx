import { motion } from 'framer-motion';
import { GripVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/types';

interface DragPreviewProps {
  product: Product;
  isDragging: boolean;
  user: any;
}

export function DragPreview({ product, isDragging, user }: DragPreviewProps) {
  const hasDiscount = product.discounted_price && product.discounted_price < product.price;
  const displayPrice = hasDiscount ? product.discounted_price : product.price;

  return (
    <motion.div
      animate={isDragging ? {
        scale: 1.05,
        rotate: 2,
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
      } : {
        scale: 1,
        rotate: 0,
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
      }}
      transition={{ duration: 0.2 }}
      className={`relative ${isDragging ? 'z-50' : ''}`}
    >
      <Card className={`h-full transition-all duration-300 ${
        isDragging 
          ? 'ring-2 ring-primary/50 bg-background/95 backdrop-blur-sm' 
          : 'hover:shadow-lg'
      }`}>
        <CardContent className="p-3 relative">
          {/* Drag Handle */}
          {isDragging && (
            <div className="absolute top-2 right-2 z-10 bg-primary/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
              <GripVertical className="h-4 w-4 text-white" />
            </div>
          )}

          {/* Product Image */}
          <div className="aspect-square relative mb-3">
            <div className="w-full h-full bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
              {product.featured_image_url ? (
                <img
                  src={product.featured_image_url}
                  alt={product.title}
                  className={`w-full h-full object-cover transition-transform duration-300 ${
                    isDragging ? 'scale-110' : ''
                  }`}
                />
              ) : (
                <div className="w-full h-full bg-white flex items-center justify-center">
                  <span className="text-muted-foreground text-xs">Sem imagem</span>
                </div>
              )}
            </div>
          </div>

          {/* Product Info */}
          <h2 className="font-semibold mb-2 line-clamp-2 text-xs leading-tight">
            {product.title}
          </h2>
          
          <div className="text-sm font-bold text-primary">
            {product.is_starting_price ? 'A partir de ' : ''}
            {formatCurrency(displayPrice!, user?.currency || 'BRL', user?.language || 'pt-BR')}
          </div>

          {/* Dragging Overlay */}
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-gradient-to-br from-primary/10 to-blue-500/10 rounded-lg pointer-events-none"
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}