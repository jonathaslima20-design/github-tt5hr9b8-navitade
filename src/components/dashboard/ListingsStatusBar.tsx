import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface ListingsStatusBarProps {
  totalCount: number;
  filteredCount: number;
  selectedCount: number;
  allSelected?: boolean;
  onSelectAll?: (checked: boolean) => void;
}

export function ListingsStatusBar({
  totalCount,
  filteredCount,
  selectedCount,
  allSelected = false,
  onSelectAll
}: ListingsStatusBarProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="text-sm text-muted-foreground flex items-center gap-4">
        {onSelectAll && filteredCount > 0 && (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={onSelectAll}
              className="border-2"
            />
            <span className="text-xs font-medium">
              {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
            </span>
          </div>
        )}

        <span>
          {filteredCount === totalCount
            ? `${totalCount} produto${totalCount !== 1 ? 's' : ''}`
            : `${filteredCount} de ${totalCount} produtos`}
        </span>

        {selectedCount > 0 && (
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {selectedCount} selecionado{selectedCount > 1 ? 's' : ''}
          </Badge>
        )}
      </div>
    </div>
  );
}