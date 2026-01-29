import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

interface RelatedArticle {
  id: string;
  title: string;
  slug: string;
  view_count: number;
  category?: {
    name: string;
    slug: string;
  };
}

interface HelpRelatedArticlesProps {
  currentArticleId: string;
  categoryId?: string;
  tags?: string[];
}

export function HelpRelatedArticles({ currentArticleId, categoryId, tags = [] }: HelpRelatedArticlesProps) {
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRelatedArticles();
  }, [currentArticleId, categoryId, tags]);

  const loadRelatedArticles = async () => {
    try {
      let query = supabase
        .from('help_articles')
        .select(`
          id,
          title,
          slug,
          view_count,
          category:help_categories(name, slug)
        `)
        .eq('is_published', true)
        .neq('id', currentArticleId);

      // Prefer articles from the same category
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query
        .order('view_count', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRelatedArticles(data || []);
    } catch (error) {
      console.error('Error loading related articles:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Artigos relacionados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (relatedArticles.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Artigos relacionados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {relatedArticles.map((article) => {
            const articleUrl = article.category 
              ? `/help/category/${article.category.slug}/${article.slug}`
              : `/help/article/${article.slug}`;

            return (
              <Link
                key={article.id}
                to={articleUrl}
                className="block p-3 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                      {article.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {article.view_count} visualizações
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}