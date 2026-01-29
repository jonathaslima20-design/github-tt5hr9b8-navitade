import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ListingsFiltersProps {
  searchQuery: string;
  statusFilter: string;
  categoryFilter: string;
  availableCategories: string[];
  onSearchChange: (query: string) => void;
  onStatusFilterChange: (status: string) => void;
  onCategoryFilterChange: (category: string) => void;
}

export function ListingsFilters({
  searchQuery,
  statusFilter,
  categoryFilter,
  availableCategories,
  onSearchChange,
  onStatusFilterChange,
  onCategoryFilterChange,
}: ListingsFiltersProps) {
  return (
    <div className="mb-6 space-y-4">
      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar produtos..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Status Filter Tabs */}
        <Tabs value={statusFilter} onValueChange={onStatusFilterChange}>
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="visiveis">Visíveis</TabsTrigger>
            <TabsTrigger value="ocultos">Ocultos</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Category Filter */}
        {availableCategories.length > 0 && (
          <div className="max-w-xs">
            <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as categorias</SelectItem>
                {availableCategories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}