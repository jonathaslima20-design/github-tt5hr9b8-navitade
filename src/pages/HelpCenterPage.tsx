import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ArrowRight, TrendingUp, Clock, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { HelpCategoryCard } from '@/components/help/HelpCategoryCard';
import { HelpArticleCard } from '@/components/help/HelpArticleCard';
import { HelpSearchResults } from '@/components/help/HelpSearchResults';

interface HelpCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  slug: string;
  display_order: number;
  article_count?: number;
}

interface HelpArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category_id: string;
  category?: {
    name: string;
    slug: string;
  };
  view_count: number;
  helpful_count: number;
  is_featured: boolean;
  created_at: string;
}

export default function HelpCenterPage() {
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [featuredArticles, setFeaturedArticles] = useState<HelpArticle[]>([]);
  const [popularArticles, setPopularArticles] = useState<HelpArticle[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [searchResults, setSearchResults] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadHelpData();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadHelpData = async () => {
    try {
      // Load categories with article counts
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('help_categories')
        .select(`
          *,
          help_articles!inner(id)
        `)
        .eq('is_active', true)
        .order('display_order');

      if (categoriesError) throw categoriesError;

      // Process categories with article counts
      const processedCategories = categoriesData?.map(cat => ({
        ...cat,
        article_count: cat.help_articles?.length || 0
      })) || [];

      setCategories(processedCategories);

      // Load featured articles
      const { data: featuredData, error: featuredError } = await supabase
        .from('help_articles')
        .select(`
          *,
          category:help_categories(name, slug)
        `)
        .eq('is_published', true)
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (featuredError) throw featuredError;
      setFeaturedArticles(featuredData || []);

      // Load popular articles
      const { data: popularData, error: popularError } = await supabase
        .from('help_articles')
        .select(`
          *,
          category:help_categories(name, slug)
        `)
        .eq('is_published', true)
        .order('view_count', { ascending: false })
        .limit(6);

      if (popularError) throw popularError;
      setPopularArticles(popularData || []);

    } catch (error) {
      console.error('Error loading help data:', error);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);

      const { data, error } = await supabase
        .from('help_articles')
        .select(`
          *,
          category:help_categories(name, slug)
        `)
        .eq('is_published', true)
        .textSearch('title', searchQuery, {
          type: 'websearch',
          config: 'portuguese'
        })
        .order('view_count', { ascending: false })
        .limit(20);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching articles:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 via-blue-50 to-purple-50 dark:from-primary/5 dark:via-blue-950/20 dark:to-purple-950/20">
        <div className="container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Central de Ajuda
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Encontre respostas para suas dúvidas sobre o VitrineTurbo
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar artigos de ajuda..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg rounded-xl border-2 focus:border-primary"
              />
              {searching && (
                <div className="absolute right-4 top-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                </div>
              )}
            </form>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {searchQuery.trim() && searchResults.length > 0 ? (
          /* Search Results */
          <HelpSearchResults 
            results={searchResults}
            query={searchQuery}
            onClearSearch={() => setSearchQuery('')}
          />
        ) : searchQuery.trim() && searchResults.length === 0 ? (
          /* No Results */
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-4">Nenhum resultado encontrado</h2>
            <p className="text-muted-foreground mb-6">
              Tente usar termos diferentes ou navegue pelas categorias abaixo
            </p>
            <Button variant="outline" onClick={() => setSearchQuery('')}>
              Ver todas as categorias
            </Button>
          </div>
        ) : (
          /* Main Content */
          <div className="space-y-16">
            {/* Categories Grid */}
            <section>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="text-3xl font-bold text-center mb-4">
                  Navegue por categoria
                </h2>
                <p className="text-muted-foreground text-center mb-12">
                  Encontre ajuda organizada por tópicos
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categories.map((category, index) => (
                    <motion.div
                      key={category.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + index * 0.1 }}
                    >
                      <HelpCategoryCard category={category} />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </section>

            {/* Featured Articles */}
            {featuredArticles.length > 0 && (
              <section>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center gap-2 mb-8">
                    <TrendingUp className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">Artigos em destaque</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {featuredArticles.map((article, index) => (
                      <motion.div
                        key={article.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                      >
                        <HelpArticleCard article={article} />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </section>
            )}

            {/* Popular Articles */}
            {popularArticles.length > 0 && (
              <section>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="flex items-center gap-2 mb-8">
                    <Users className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">Mais acessados</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {popularArticles.map((article, index) => (
                      <motion.div
                        key={article.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                      >
                        <HelpArticleCard article={article} />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}