import { useState, useEffect } from 'react';
import { Plus, X, Palette, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { HexColorPicker } from 'react-colorful';
import { toast } from 'sonner';
import { useCustomColors } from '@/hooks/useCustomColors';

interface CustomColorSelectorProps {
  value: string[];
  onChange: (colors: string[]) => void;
  userId?: string;
  maxColors?: number;
}

export function CustomColorSelector({
  value = [],
  onChange,
  userId,
  maxColors = 100
}: CustomColorSelectorProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#000000');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const { customColors, loading, addCustomColor, removeCustomColor } = useCustomColors(userId);

  const handleAddColor = async () => {
    if (!newColorName.trim()) {
      toast.error('Digite um nome para a cor');
      return;
    }

    const success = await addCustomColor(newColorName.trim(), newColorHex);
    if (success) {
      toast.success(`Cor "${newColorName}" adicionada com sucesso`);
      setNewColorName('');
      setNewColorHex('#000000');
      setShowAddDialog(false);
    } else {
      toast.error('Erro ao adicionar cor');
    }
  };

  const handleSelectColor = (colorName: string) => {
    if (value.includes(colorName)) {
      // Remove color
      onChange(value.filter(c => c !== colorName));
    } else {
      // Add color
      if (value.length >= maxColors) {
        toast.error(`Máximo de ${maxColors} cores permitido`);
        return;
      }
      onChange([...value, colorName]);
    }
  };

  const handleRemoveCustomColor = async (colorName: string) => {
    const success = await removeCustomColor(colorName);
    if (success) {
      // Also remove from selected colors if it was selected
      if (value.includes(colorName)) {
        onChange(value.filter(c => c !== colorName));
      }
      toast.success(`Cor "${colorName}" removida`);
    } else {
      toast.error('Erro ao remover cor');
    }
  };

  const getColorValue = (colorName: string) => {
    const customColor = customColors.find(c => c.name === colorName);
    return customColor?.hex_value || '#6B7280';
  };

  return (
    <div className="space-y-4">
      {/* Selected Colors Display */}
      {value.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Cores Selecionadas</Label>
          <div className="flex flex-wrap gap-2">
            {value.map((colorName) => {
              const colorValue = getColorValue(colorName);
              const isLightColor = ['branco', 'amarelo', 'bege', 'off-white', 'creme'].includes(colorName.toLowerCase());

              return (
                <Badge
                  key={colorName}
                  variant="outline"
                  className="flex items-center gap-2 px-3 py-1"
                >
                  <div 
                    className={`w-3 h-3 rounded-full border ${isLightColor ? 'border-gray-400' : 'border-gray-300'} shadow-sm`}
                    style={{ backgroundColor: colorValue }}
                  />
                  <span className="capitalize">{colorName}</span>
                  <button
                    type="button"
                    onClick={() => handleSelectColor(colorName)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Colors Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Cores Disponíveis</Label>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Cor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Nova Cor</DialogTitle>
                <DialogDescription>
                  Crie uma nova cor personalizada para usar em seus produtos
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Cor</Label>
                  <Input
                    value={newColorName}
                    onChange={(e) => setNewColorName(e.target.value)}
                    placeholder="Ex: Azul Royal, Verde Militar, etc."
                    maxLength={30}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex items-center gap-3">
                    <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-16 h-10 p-0 border-2"
                          style={{ backgroundColor: newColorHex }}
                        >
                          <span className="sr-only">Selecionar cor</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3">
                        <HexColorPicker color={newColorHex} onChange={setNewColorHex} />
                        <div className="mt-3">
                          <Input
                            value={newColorHex}
                            onChange={(e) => setNewColorHex(e.target.value)}
                            placeholder="#000000"
                            className="font-mono text-sm"
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{newColorHex}</div>
                      <div className="text-xs text-muted-foreground">Código hexadecimal</div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddDialog(false);
                      setNewColorName('');
                      setNewColorHex('#000000');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleAddColor}>
                    Adicionar Cor
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando cores...</div>
        ) : customColors.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
            Nenhuma cor cadastrada. Clique em "Adicionar Cor" para criar sua primeira cor personalizada.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-60 overflow-y-auto p-2 border rounded-lg">
            {customColors.map((color) => {
              const isSelected = value.includes(color.name);
              const isLightColor = ['branco', 'amarelo', 'bege', 'off-white', 'creme'].includes(color.name.toLowerCase());

              return (
                <div
                  key={color.id}
                  className={`relative group cursor-pointer rounded-lg border-2 transition-all ${
                    isSelected 
                      ? 'border-primary bg-primary/10' 
                      : 'border-gray-200 hover:border-primary/50'
                  }`}
                  onClick={() => handleSelectColor(color.name)}
                >
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div 
                        className={`w-6 h-6 rounded-full border ${isLightColor ? 'border-gray-400' : 'border-gray-300'} shadow-sm`}
                        style={{ backgroundColor: color.hex_value }}
                      />
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium capitalize line-clamp-1">
                        {color.name}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {color.hex_value}
                      </div>
                    </div>
                  </div>

                  {/* Remove button - only show on hover */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveCustomColor(color.name);
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {value.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {value.length} de {maxColors} cores selecionadas
        </div>
      )}
    </div>
  );
}