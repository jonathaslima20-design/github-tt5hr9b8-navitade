import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CustomColorSelector } from '@/components/ui/custom-color-selector';
import { CustomSizeInput } from '@/components/ui/custom-size-input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SizesColorsSelectorProps {
  colors: string[];
  onColorsChange: (colors: string[]) => void;
  sizes: string[];
  onSizesChange: (sizes: string[]) => void;
  userId?: string;
}

const APPAREL_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'];
const SHOE_SIZES = Array.from({ length: 27 }, (_, i) => (17 + i).toString());

export function SizesColorsSelector({
  colors,
  onColorsChange,
  sizes,
  onSizesChange,
  userId,
}: SizesColorsSelectorProps) {
  const [colorsExpanded, setColorsExpanded] = useState(false);
  const [sizesExpanded, setSizesExpanded] = useState(true);
  const [apparelExpanded, setApparelExpanded] = useState(true);
  const [shoesExpanded, setShoesExpanded] = useState(false);
  const [customExpanded, setCustomExpanded] = useState(false);

  const handleSizeToggle = (size: string) => {
    if (sizes.includes(size)) {
      onSizesChange(sizes.filter((s) => s !== size));
    } else {
      onSizesChange([...sizes, size]);
    }
  };

  return (
    <div className="space-y-4">
      <Collapsible open={colorsExpanded} onOpenChange={setColorsExpanded}>
        <div className="border rounded-lg">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
            >
              <Label className="text-base font-medium cursor-pointer">
                Cores (opcional)
              </Label>
              {colorsExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 border-t">
              <CustomColorSelector
                value={colors}
                onChange={onColorsChange}
                userId={userId}
              />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <Collapsible open={sizesExpanded} onOpenChange={setSizesExpanded}>
        <div className="border rounded-lg">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
            >
              <Label className="text-base font-medium cursor-pointer">
                Tamanhos (opcional)
              </Label>
              {sizesExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 border-t space-y-4">
              <Collapsible open={apparelExpanded} onOpenChange={setApparelExpanded}>
                <div className="space-y-3">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between text-sm font-medium hover:text-foreground/80 transition-colors"
                    >
                      <span>Tamanhos de Vestuário</span>
                      {apparelExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {APPAREL_SIZES.map((size) => (
                        <Button
                          key={size}
                          type="button"
                          variant={sizes.includes(size) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleSizeToggle(size)}
                          className="h-9 min-w-[3rem]"
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              <Collapsible open={shoesExpanded} onOpenChange={setShoesExpanded}>
                <div className="space-y-3">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between text-sm font-medium hover:text-foreground/80 transition-colors"
                    >
                      <span>Numeração de Calçados</span>
                      {shoesExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pt-2 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Numeração de Calçados (17 - 43)
                      </p>
                      <div className="grid grid-cols-6 gap-2">
                        {SHOE_SIZES.map((size) => (
                          <Button
                            key={size}
                            type="button"
                            variant={sizes.includes(size) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleSizeToggle(size)}
                            className="h-9"
                          >
                            {size}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              <Collapsible open={customExpanded} onOpenChange={setCustomExpanded}>
                <div className="space-y-3">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between text-sm font-medium hover:text-foreground/80 transition-colors"
                    >
                      <span>Tamanhos Personalizados</span>
                      {customExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pt-2 space-y-3">
                      <CustomSizeInput
                        value={sizes}
                        onChange={onSizesChange}
                        userId={userId}
                        maxSizes={10}
                        placeholder="Digite um tamanho personalizado como 'XS', '4XL', 'Único', etc..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Os tamanhos criados serão salvos automaticamente para uso futuro em outros produtos.
                      </p>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}
