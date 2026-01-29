import { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
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
import { toast } from 'sonner';
import { usePromotionalPhrases } from '@/hooks/usePromotionalPhrases';

interface PromotionalPhraseSelectorProps {
  value: string;
  onChange: (phrase: string) => void;
  userId?: string;
}

export function PromotionalPhraseSelector({
  value = '',
  onChange,
  userId,
}: PromotionalPhraseSelectorProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPhrase, setNewPhrase] = useState('');
  const { phrases, loading, addPhrase, removePhrase } = usePromotionalPhrases(userId);

  const handleAddPhrase = async () => {
    if (!newPhrase.trim()) {
      toast.error('Digite uma frase para adicionar');
      return;
    }

    const success = await addPhrase(newPhrase.trim());
    if (success) {
      toast.success('Frase adicionada com sucesso');
      setNewPhrase('');
      setShowAddDialog(false);
    } else {
      toast.error('Erro ao adicionar frase');
    }
  };

  const handleSelectPhrase = (phrase: string) => {
    onChange(phrase);
  };

  const handleRemovePhrase = async (id: string) => {
    const success = await removePhrase(id);
    if (success) {
      if (value === phrases.find(p => p.id === id)?.phrase) {
        onChange('');
      }
      toast.success('Frase removida');
    } else {
      toast.error('Erro ao remover frase');
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="promotional-phrase">Frase Promocional (opcional)</Label>
        <Input
          id="promotional-phrase"
          placeholder="Ex: Em até 4x nos cartões ou 10%OFF no Pix"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={200}
        />
        <div className="text-xs text-muted-foreground">
          Uma frase curta para destacar promoções ou condições especiais ({value.length}/200)
        </div>
      </div>

      {/* Selected Phrase Display */}
      {value && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Frase Selecionada</Label>
          <Badge variant="secondary" className="px-3 py-2">
            {value}
          </Badge>
        </div>
      )}

      {/* Available Phrases Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Frases Disponíveis</Label>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Frase
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Nova Frase Promocional</DialogTitle>
                <DialogDescription>
                  Crie uma frase promocional padrão para usar nos seus produtos
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Frase Promocional</Label>
                  <Input
                    value={newPhrase}
                    onChange={(e) => setNewPhrase(e.target.value)}
                    placeholder="Ex: Em até 4x nos cartões ou 10%OFF no Pix"
                    maxLength={200}
                  />
                  <div className="text-xs text-muted-foreground">
                    {newPhrase.length}/200 caracteres
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddDialog(false);
                      setNewPhrase('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleAddPhrase}>
                    Adicionar Frase
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando frases...</div>
        ) : phrases.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
            Nenhuma frase cadastrada. Clique em "Adicionar Frase" para criar sua primeira frase promocional.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
            {phrases.map((phrase) => {
              const isSelected = value === phrase.phrase;

              return (
                <div
                  key={phrase.id}
                  className={`relative group flex items-center justify-between gap-2 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-200 hover:border-primary/50'
                  }`}
                  onClick={() => handleSelectPhrase(phrase.phrase)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                    <span className="text-sm line-clamp-2">{phrase.phrase}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePhrase(phrase.id);
                    }}
                    className="ml-2 p-1 hover:bg-destructive/10 rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {phrases.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {phrases.length} frase(s) cadastrada(s)
        </div>
      )}
    </div>
  );
}
