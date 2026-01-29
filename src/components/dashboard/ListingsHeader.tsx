import { Link } from 'react-router-dom';
import { Plus, ArrowUpDown, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface ListingsHeaderProps {
  canReorder: boolean;
  isReorderModeActive: boolean;
  reordering: boolean;
  allSelected: boolean;
  filteredProductsLength: number;
  onToggleReorderMode: () => void;
  onSelectAll: (checked: boolean) => void;
}

export function ListingsHeader({
  canReorder,
  isReorderModeActive,
  reordering,
  allSelected,
  filteredProductsLength,
  onToggleReorderMode,
  onSelectAll,
}: ListingsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
      <h1 className="text-3xl font-bold">Meus Produtos</h1>
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        {/* Reorder Mode Toggle Button - Only show when reordering is possible */}
        {canReorder && (
          <Button
            variant={isReorderModeActive ? "default" : "outline"}
            onClick={onToggleReorderMode}
            disabled={reordering}
            className={`w-full sm:w-auto text-sm px-4 transition-all duration-300 ${
              isReorderModeActive 
                ? 'bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-xl' 
                : 'hover:bg-primary/5 hover:border-primary/50'
            }`}
          >
            <ArrowUpDown className="w-4 h-4 mr-2" />
            {isReorderModeActive ? (
              <>
                <span className="hidden sm:inline">Sair da Reordenação</span>
                <span className="sm:hidden">Sair</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Reordenação</span>
                <span className="sm:hidden">Reordenar</span>
              </>
            )}
          </Button>
        )}
        
        <Link to="/dashboard/products/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
        </Link>
      </div>
    </div>
  );
}