import { Link } from 'react-router-dom';
import { Clock, Eye, ThumbsUp, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

interface HelpArticleCardProps {
  article: HelpArticle;
}

export function HelpArticleCard({ article }: HelpArticleCardProps) {
  const articleUrl = article.category 
    ? `/help/category/${article.category.slug}/${article.slug}`
    : `/help/article/${article.slug}`;

  return (
    <Link to={articleUrl}>
      <Card className="h-full hover:shadow-lg transition-all duration-300 group cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between mb-2">
            {article.category && (
              <Badge variant="secondary" className="text-xs">
                {article.category.name}
              </Badge>
            )}
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
          <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
            {article.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm line-clamp-3">
            {article.excerpt}
          </p>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {article.view_count}
              </div>
              <div className="flex items-center gap-1">
                <ThumbsUp className="h-3 w-3" />
                {article.helpful_count}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(article.created_at), 'dd/MM/yyyy', { locale: ptBR })}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}