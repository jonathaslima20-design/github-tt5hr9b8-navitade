import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ApparelSizeSelectorProps {
  value: string[];
  onChange: (sizes: string[]) => void;
  maxSizes?: number;
}

export function ApparelSizeSelector({ value, onChange, maxSizes = 15 }: ApparelSizeSelectorProps) {
  const standardSizes = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'];
  
  const toggleSize = (size: string) => {
    if (value.includes(size)) {
      onChange(value.filter(s => s !== size));
    } else if (value.length < maxSizes) {
      onChange([...value, size]);
    }
  };

  const removeSize = (size: string) => {
    onChange(value.filter(s => s !== size));
  };

  return (
    <div className="space-y-4">
      {/* Selected Sizes */}
      {value.length > 0 && (
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
      )}

      {/* Standard Sizes */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {standardSizes.map((size) => (
            <Button
              key={size}
              type="button"
              variant={value.includes(size) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleSize(size)}
              disabled={!value.includes(size) && value.length >= maxSizes}
            >
              {size}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}