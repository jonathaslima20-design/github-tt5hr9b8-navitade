import { useState } from 'react';
import { Plus, X, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCustomSizes } from '@/hooks/useCustomSizes';
import { toast } from 'sonner';

interface CustomSizeInputProps {
  value: string[];
  onChange: (sizes: string[]) => void;
  userId?: string;
  maxSizes?: number;
  placeholder?: string;
}

export function CustomSizeInput({
  value = [],
  onChange,
  userId,
  maxSizes = 10,
  placeholder = "Digite um tamanho personalizado..."
}: CustomSizeInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isAddingSize, setIsAddingSize] = useState(false);
  const { customSizes, allSizesWithType, loading, addCustomSize, removeCustomSize, error } = useCustomSizes(userId);

  // Combine saved custom sizes with current value for suggestions
  const allAvailableSizes = [...new Set([...customSizes, ...value])];
  const savedSizesNotInSelection = customSizes.filter(size => !value.includes(size));

  const handleAddSize = async () => {
    const trimmedValue = inputValue.trim().toUpperCase();

    if (!trimmedValue) {
      toast.error('Digite um tamanho');
      return;
    }

    if (value.length >= maxSizes) {
      toast.error(`Máximo de ${maxSizes} tamanhos atingido`);
      return;
    }

    if (value.includes(trimmedValue)) {
      toast.info('Este tamanho já foi adicionado');
      setInputValue('');
      return;
    }

    setIsAddingSize(true);

    // Add to current selection
    const newSizes = [...value, trimmedValue];
    onChange(newSizes);

    // Save to database for future use
    if (userId) {
      const success = await addCustomSize(trimmedValue, 'custom');
      if (!success) {
        toast.error('Erro ao salvar tamanho no banco de dados');
        onChange(newSizes.filter(s => s !== trimmedValue));
      } else {
        toast.success('Tamanho adicionado com sucesso');
      }
    } else {
      toast.success('Tamanho adicionado');
    }

    setInputValue('');
    setIsAddingSize(false);
  };

  const handleRemoveSize = (sizeToRemove: string) => {
    const newSizes = value.filter(size => size !== sizeToRemove);
    onChange(newSizes);
    toast.success('Tamanho removido');
  };

  const handleDeleteSavedSize = async (sizeToDelete: string) => {
    if (value.includes(sizeToDelete)) {
      toast.error('Remova o tamanho da seleção antes de deletá-lo');
      return;
    }

    const success = await removeCustomSize(sizeToDelete);
    if (success) {
      toast.success('Tamanho deletado permanentemente');
    } else {
      toast.error('Erro ao deletar tamanho');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSize();
    }
  };

  const handleSuggestionClick = (size: string) => {
    if (value.includes(size) || value.length >= maxSizes) return;

    const newSizes = [...value, size];
    onChange(newSizes);
  };

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Input para adicionar novos tamanhos */}
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1"
          disabled={isAddingSize || loading}
        />
        <Button
          type="button"
          onClick={handleAddSize}
          disabled={!inputValue.trim() || value.length >= maxSizes || isAddingSize || loading}
          size="sm"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Tamanhos selecionados */}
      {value.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground/80">Tamanhos Adicionados ao Produto:</div>
          <div className="flex flex-wrap gap-2">
            {value.map((size) => (
              <Badge
                key={size}
                variant="default"
                className="flex items-center gap-2 px-3 py-1.5 text-foreground bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
              >
                <span>{size}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-white"
                  onClick={() => handleRemoveSize(size)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Saved Sizes for Future Use */}
      {savedSizesNotInSelection.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground/80">Tamanhos Salvos (para reutilizar):</div>
          <div className="flex flex-wrap gap-2">
            {savedSizesNotInSelection.map((size) => (
              <div key={size} className="flex items-center gap-1 group">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick(size)}
                  disabled={value.length >= maxSizes || loading}
                  className="h-8 text-xs"
                  title={`Adicionar ${size} aos tamanhos do produto`}
                >
                  {size}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-white"
                  onClick={() => handleDeleteSavedSize(size)}
                  title={`Deletar tamanho ${size} permanentemente`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded text-sm text-muted-foreground">
          <div className="h-2 w-2 bg-current rounded-full animate-pulse" />
          Carregando tamanhos salvos...
        </div>
      )}

      {/* Contador e limite */}
      <div className="text-xs text-muted-foreground">
        {value.length}/{maxSizes} tamanhos adicionados
        {customSizes.length > 0 && ` • ${customSizes.length} tamanho${customSizes.length !== 1 ? 's' : ''} salvo${customSizes.length !== 1 ? 's' : ''}`}
      </div>
    </div>
  );
}