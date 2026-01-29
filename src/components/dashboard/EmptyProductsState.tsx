import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyProductsStateProps {
  hasProducts: boolean;
  onClearFilters: () => void;
}

export function EmptyProductsState({ hasProducts, onClearFilters }: EmptyProductsStateProps) {
  return (
    <Card className="text-center py-12">
      <CardContent>
        {!hasProducts ? (
          <>
            <h2 className="text-xl font-semibold mb-2">Nenhum produto cadastrado</h2>
            <p className="text-muted-foreground mb-4">
              Comece adicionando seu primeiro produto
            </p>
            <Link to="/dashboard/products/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Produto
              </Button>
            </Link>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-2">Nenhum produto encontrado</h2>
            <p className="text-muted-foreground mb-4">
              Tente ajustar os filtros ou termo de busca
            </p>
            <Button variant="outline" onClick={onClearFilters}>
              Limpar Filtros
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}