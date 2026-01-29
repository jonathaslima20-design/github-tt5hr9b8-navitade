import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Eye, ThumbsUp, ThumbsDown, Share2, Copy } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { HelpBreadcrumb } from '@/components/help/HelpBreadcrumb';
import { HelpArticleFeedback } from '@/components/help/HelpArticleFeedback';
import { HelpRelatedArticles } from '@/components/help/HelpRelatedArticles';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HelpArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  tags: string[];
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function HelpArticlePage() {
  const { categorySlug, articleSlug } = useParams();
  const [article, setArticle] = useState<HelpArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareSupported, setShareSupported] = useState(false);

  useEffect(() => {
    setShareSupported(!!navigator.share && window.isSecureContext);
    
    if (articleSlug) {
      loadArticle();
    }
  }, [articleSlug]);

  const loadArticle = async () => {
    try {
      const { data, error } = await supabase
        .from('help_articles')
        .select(`
          *,
          category:help_categories(id, name, slug)
        `)
        .eq('slug', articleSlug)
        .eq('is_published', true)
        .single();

      if (error) throw error;
      setArticle(data);

      // Track view
      await trackArticleView(data.id);

    } catch (error) {
      console.error('Error loading article:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackArticleView = async (articleId: string) => {
    try {
      // Get or generate viewer ID
      let viewerId = localStorage.getItem('help_viewer_id');
      if (!viewerId) {
        viewerId = crypto.randomUUID();
        localStorage.setItem('help_viewer_id', viewerId);
      }

      await supabase
        .from('help_article_views')
        .insert({
          article_id: articleId,
          ip_address: null, // Will be handled by server if needed
          user_agent: navigator.userAgent,
        });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = article?.title || 'Artigo de Ajuda';
    const shareText = article?.excerpt || 'Confira este artigo de ajuda do VitrineTurbo';

    try {
      if (shareSupported) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        toast.success('Compartilhado com sucesso!');
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copiado para a área de transferência');
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast.success('Link copiado para a área de transferência');
        } catch (err) {
          toast.error('Não foi possível copiar o link');
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Artigo não encontrado</h1>
          <Link to="/help">
            <Button>Voltar para Central de Ajuda</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <HelpBreadcrumb
          items={[
            { label: 'Central de Ajuda', href: '/help' },
            { label: article.category?.name || 'Categoria', href: `/help/category/${article.category?.slug}` },
            { label: article.title, href: `/help/category/${categorySlug}/${articleSlug}` }
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Article Header */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  {article.category && (
                    <Link to={`/help/category/${article.category.slug}`}>
                      <Badge variant="secondary" className="hover:bg-primary/10">
                        {article.category.name}
                      </Badge>
                    </Link>
                  )}
                </div>

                <h1 className="text-3xl md:text-4xl font-bold mb-4">
                  {article.title}
                </h1>

                <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {format(new Date(article.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    {article.view_count} visualizações
                  </div>
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="h-4 w-4" />
                    {article.helpful_count} acharam útil
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleShare}>
                    {shareSupported ? (
                      <Share2 className="h-4 w-4 mr-2" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    Compartilhar
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Article Content */}
              <div 
                className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-muted-foreground prose-strong:text-foreground prose-code:bg-muted prose-code:px-2 prose-code:py-1 prose-code:rounded prose-pre:bg-muted prose-pre:border"
                dangerouslySetInnerHTML={{ __html: article.content.replace(/\n/g, '<br>').replace(/## /g, '<h2>').replace(/### /g, '<h3>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`(.*?)`/g, '<code>$1</code>') }}
              />

              {/* Tags */}
              {article.tags && article.tags.length > 0 && (
                <div className="pt-8">
                  <h3 className="text-lg font-semibold mb-4">Tags relacionadas</h3>
                  <div className="flex flex-wrap gap-2">
                    {article.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback Section */}
              <div className="pt-8">
                <HelpArticleFeedback articleId={article.id} />
              </div>
            </motion.article>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Article Stats */}
              <Card>
                <CardHeader>
                  <h3 className="font-semibold">Estatísticas</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Visualizações</span>
                    <span className="font-medium">{article.view_count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Útil</span>
                    <span className="font-medium text-green-600">{article.helpful_count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Não útil</span>
                    <span className="font-medium text-red-600">{article.not_helpful_count}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Related Articles */}
              <HelpRelatedArticles 
                currentArticleId={article.id}
                categoryId={article.category?.id}
                tags={article.tags}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}