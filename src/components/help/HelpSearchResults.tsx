import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HelpArticleCard } from './HelpArticleCard';

interface HelpArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  view_count: number;
  helpful_count: number;
  created_at: string;
  category?: {
    name: string;
    slug: string;
  };
}

interface HelpSearchResultsProps {
  results: HelpArticle[];
  query: string;
  onClearSearch: () => void;
}

export function HelpSearchResults({ results, query, onClearSearch }: HelpSearchResultsProps) {
  return (
    <div className="space-y-8">
      {/* Search Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">Resultados da busca</h2>
          </div>
          <Badge variant="secondary">
            {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
          </Badge>
        </div>
        <Button variant="outline" onClick={onClearSearch}>
          <X className="h-4 w-4 mr-2" />
          Limpar busca
        </Button>
      </div>

      {/* Search Query */}
      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          Buscando por: <span className="font-medium text-foreground">"{query}"</span>
        </p>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((article) => (
          <HelpArticleCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}