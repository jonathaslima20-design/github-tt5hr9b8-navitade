import { Plus, Minus, Trash2, Palette, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getColorValue } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface DistributionItem {
  id: string;
  color?: string;
  size?: string;
  quantity: number;
}

interface DistributionSummaryProps {
  items: DistributionItem[];
  hasColors?: boolean;
  hasSizes?: boolean;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

export default function DistributionSummary({
  items,
  hasColors,
  hasSizes,
  onUpdateQuantity,
  onRemove,
}: DistributionSummaryProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 p-2 bg-background border rounded-lg hover:border-primary/40 transition-colors"
          >
            <div className="flex-1 flex items-center gap-2 text-xs">
              {hasColors && item.color && (
                <div className="flex items-center gap-1">
                  <Palette className="h-3 w-3 text-muted-foreground" />
                  <div
                    className="w-3 h-3 rounded-full border border-gray-300"
                    style={{ backgroundColor: getColorValue(item.color) }}
                  />
                  <span className="capitalize">{item.color}</span>
                </div>
              )}
              {hasSizes && item.size && (
                <div className="flex items-center gap-1">
                  <Ruler className="h-3 w-3 text-muted-foreground" />
                  <span>{item.size}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-7 p-0"
                onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Badge variant="secondary" className="text-xs min-w-[2rem] justify-center">
                {item.quantity}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-7 p-0"
                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onRemove(item.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
