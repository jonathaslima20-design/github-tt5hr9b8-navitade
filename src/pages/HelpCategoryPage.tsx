import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Search, FileText, Clock, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { HelpArticleCard } from '@/components/help/HelpArticleCard';
import { HelpBreadcrumb } from '@/components/help/HelpBreadcrumb';

interface HelpCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  slug: string;
}

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

export default function HelpCategoryPage() {
  const { categorySlug } = useParams();
  const [category, setCategory] = useState<HelpCategory | null>(null);
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<HelpArticle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'helpful'>('newest');

  useEffect(() => {
    if (categorySlug) {
      loadCategoryData();
    }
  }, [categorySlug]);

  useEffect(() => {
    filterAndSortArticles();
  }, [articles, searchQuery, sortBy]);

  const loadCategoryData = async () => {
    try {
      // Load category
      const { data: categoryData, error: categoryError } = await supabase
        .from('help_categories')
        .select('*')
        .eq('slug', categorySlug)
        .eq('is_active', true)
        .single();

      if (categoryError) throw categoryError;
      setCategory(categoryData);

      // Load articles for this category
      const { data: articlesData, error: articlesError } = await supabase
        .from('help_articles')
        .select(`
          *,
          category:help_categories(name, slug)
        `)
        .eq('category_id', categoryData.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (articlesError) throw articlesError;
      setArticles(articlesData || []);

    } catch (error) {
      console.error('Error loading category data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortArticles = () => {
    let filtered = [...articles];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(query) ||
        article.excerpt.toLowerCase().includes(query)
      );
    }

    // Sort articles
    switch (sortBy) {
      case 'popular':
        filtered.sort((a, b) => b.view_count - a.view_count);
        break;
      case 'helpful':
        filtered.sort((a, b) => b.helpful_count - a.helpful_count);
        break;
      case 'newest':
      default:
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    setFilteredArticles(filtered);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Categoria não encontrada</h1>
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
            { label: category.name, href: `/help/category/${category.slug}` }
          ]}
        />

        {/* Category Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
              {/* Dynamic icon rendering would go here */}
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">{category.name}</h1>
              <p className="text-muted-foreground text-lg mt-2">{category.description}</p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar nesta categoria..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant={sortBy === 'newest' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('newest')}
              >
                <Clock className="h-4 w-4 mr-2" />
                Mais recentes
              </Button>
              <Button
                variant={sortBy === 'popular' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('popular')}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Mais vistos
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Articles Grid */}
        {filteredArticles.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {searchQuery.trim() ? 'Nenhum artigo encontrado' : 'Nenhum artigo nesta categoria'}
            </h2>
            <p className="text-muted-foreground">
              {searchQuery.trim() 
                ? 'Tente usar termos diferentes na busca'
                : 'Esta categoria ainda não possui artigos publicados'
              }
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredArticles.map((article, index) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <HelpArticleCard article={article} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}