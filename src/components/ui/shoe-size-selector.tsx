import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface ShoeSizeSelectorProps {
  value: string[];
  onChange: (sizes: string[]) => void;
  maxSizes?: number;
}

export function ShoeSizeSelector({ value, onChange, maxSizes = 20 }: ShoeSizeSelectorProps) {
  // Expanded range from 17 to 43
  const shoeSizes = Array.from({ length: 27 }, (_, i) => (17 + i).toString());

  const toggleSize = (size: string) => {
    const currentSizes = value || [];
    
    if (currentSizes.includes(size)) {
      onChange(currentSizes.filter(s => s !== size));
    } else {
      if (currentSizes.length >= maxSizes) {
        return; // Don't add if at max limit
      }
      onChange([...currentSizes, size]);
    }
  };

  const removeSize = (size: string) => {
    onChange((value || []).filter(s => s !== size));
  };

  return (
    <div className="space-y-4">
      {/* Selected Sizes */}
      {value && value.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">
            Tamanhos Selecionados ({value.length}/{maxSizes})
          </div>
          <div className="flex flex-wrap gap-2">
            {value.map((size) => (
              <Badge key={size} variant="secondary" className="flex items-center gap-1">
                {size}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => removeSize(size)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Size Grid */}
      <div className="space-y-2">
        <div className="text-sm font-medium">
          Numeração de Calçados (17 - 43)
        </div>
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
          {shoeSizes.map((size) => {
            const isSelected = value?.includes(size);
            const isDisabled = !isSelected && (value?.length || 0) >= maxSizes;
            
            return (
              <Button
                key={size}
                type="button"
                variant={isSelected ? "default" : "outline"}
                size="sm"
                className={`h-10 w-10 p-0 text-sm ${
                  isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={() => toggleSize(size)}
                disabled={isDisabled}
              >
                {size}
              </Button>
            );
          })}
        </div>
      </div>

      {value && value.length >= maxSizes && (
        <div className="text-xs text-muted-foreground">
          Máximo de {maxSizes} tamanhos atingido. Remova alguns para adicionar outros.
        </div>
      )}
    </div>
  );
}