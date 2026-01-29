import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCorretorData } from '@/hooks/useCorretorData';
import { useProductData } from '@/hooks/useProductData';
import { useProductSearch } from '@/hooks/useProductSearch';
import { useCorretorPageState } from '@/hooks/useCorretorPageState';
import { useProductFilterMetadata } from '@/hooks/useProductFilterMetadata';
import { useServerSideProductSearch } from '@/hooks/useServerSideProductSearch';
import CorretorHeader from '@/components/corretor/CorretorHeader';
import PromotionalBanner from '@/components/corretor/PromotionalBanner';
import ProductSearch from '@/components/product/ProductSearch';
import { ProductCard } from '@/components/product/ProductCard';
import { groupProductsByCategory } from '@/utils/productDisplayUtils';
import ShareCategoryButton from '@/components/corretor/ShareCategoryButton';
import PaginationControls from '@/components/corretor/PaginationControls';
import { logCategoryOperation } from '@/lib/categoryUtils';
import { useTranslation, type SupportedLanguage, type SupportedCurrency } from '@/lib/i18n';
import { updateMetaTags, getCorretorMetaTags } from '@/utils/metaTags';
import { scrollCoordinator } from '@/lib/scrollCoordinator';

export default function CorretorPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchResultsPage, setSearchResultsPage] = useState(1);
  const [hasRestoredState, setHasRestoredState] = useState(false);
  const [isReturningFromProduct, setIsReturningFromProduct] = useState(false);
  const [serverSearchResults, setServerSearchResults] = useState<any[]>([]);
  const [allServerSearchResults, setAllServerSearchResults] = useState<any[]>([]);
  const [isRestoringState, setIsRestoringState] = useState(false);
  const productsContainerRef = useRef<HTMLDivElement>(null);
  const userInitiatedSearchRef = useRef(false);
  const scrollRestoredRef = useRef(false);
  const previousFiltersRef = useRef<any>(null);
  const isRestoringStateRef = useRef(false);
  const pageSize = 250;

  // Load corretor data and apply theme/tracking
  const { corretor, loading: corretorLoading, error: corretorError } = useCorretorData({ slug });

  // Set language and currency from corretor settings
  const language: SupportedLanguage = corretor?.language || 'pt-BR';
  const currency: SupportedCurrency = corretor?.currency || 'BRL';

  const { t } = useTranslation(language);

  // Load product data with pagination
  const {
    allProducts,
    categorySettings,
    settings,
    loading: productsLoading,
    error: productsError,
    sizeTypeMapping,
    totalProducts,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    paginationEnabled,
  } = useProductData({
    userId: corretor?.id || '',
    language,
    page: currentPage,
    pageSize: 250
  });

  // Load filter metadata from all products
  const { metadata: filterMetadata, loading: filterMetadataLoading } = useProductFilterMetadata({
    userId: corretor?.id || '',
    enabled: true
  });

  // Server-side search hook
  const { searchProducts, loading: serverSearchLoading } = useServerSideProductSearch();

  // Handle product search and filtering
  const {
    filteredProducts,
    isSearchActive,
    filters,
    handleSearch,
    searchQuery = '',
  } = useProductSearch({
    allProducts,
    settings
  });

  // When search is active, fetch results from server
  useEffect(() => {
    if (isSearchActive && corretor?.id && filters) {
      const performServerSearch = async () => {
        const results = await searchProducts(corretor.id, filters);
        setAllServerSearchResults(results);
        setSearchResultsPage(1);
      };
      performServerSearch();
    } else {
      setAllServerSearchResults([]);
      setServerSearchResults([]);
      setSearchResultsPage(1);
    }
  }, [isSearchActive, filters, corretor?.id, searchProducts]);


  // Apply pagination to server search results
  useEffect(() => {
    if (allServerSearchResults.length > 0) {
      const offset = (searchResultsPage - 1) * pageSize;
      const paginated = allServerSearchResults.slice(offset, offset + pageSize);
      setServerSearchResults(paginated);
    }
  }, [allServerSearchResults, searchResultsPage, pageSize]);

  // Initialize state management hook
  const pageStateHook = useCorretorPageState({
    slug: slug || '',
    currentPage,
    isSearchActive,
    filters,
    searchQuery,
  });

  // Initialize previousFiltersRef on first load
  useEffect(() => {
    if (previousFiltersRef.current === null) {
      previousFiltersRef.current = filters;
    }
  }, []);

  // Detect if user is returning from product page
  useEffect(() => {
    // Primary indicator: location.state?.from === 'product-detail'
    const isFromProductDetail = location.state?.from === 'product-detail';

    if (isFromProductDetail) {
      const savedState = pageStateHook.restoreCurrentState();
      if (savedState && savedState.slug === slug) {
        setIsReturningFromProduct(true);
        // Signal PublicLayout that we're restoring scroll
        scrollCoordinator.startScrollRestoration();
        console.log('🔄 Detected return from product page - state will be restored');
      } else {
        setIsReturningFromProduct(false);
        scrollRestoredRef.current = false;
      }
    } else {
      setIsReturningFromProduct(false);
      scrollRestoredRef.current = false;
    }
  }, [location.state?.from, slug, pageStateHook]);

  // Restore state when user returns from product detail page
  useEffect(() => {
    if (isReturningFromProduct && !hasRestoredState && slug && !corretorLoading && !productsLoading) {
      setIsRestoringState(true);
      isRestoringStateRef.current = true;

      const savedState = pageStateHook.restoreCurrentState();

      if (savedState && savedState.slug === slug) {
        // Restore filters if search was active
        if (savedState.isSearchActive && savedState.filters) {
          handleSearch(savedState.filters);
          previousFiltersRef.current = savedState.filters;
          if (savedState.currentPage > 1) {
            setSearchResultsPage(savedState.currentPage);
          }
          console.log('✅ Restored search state with filters');
        } else if (savedState.currentPage > 1) {
          setCurrentPage(savedState.currentPage);
          console.log('✅ Restored pagination state:', savedState.currentPage);
        }
        userInitiatedSearchRef.current = false;
      }

      setHasRestoredState(true);
      setIsRestoringState(false);
      isRestoringStateRef.current = false;
    }
  }, [isReturningFromProduct, hasRestoredState, slug, corretorLoading, productsLoading, pageStateHook, handleSearch]);

  // Detect filter changes and scroll to top
  const filtersHaveChanged = (newFilters: any, oldFilters: any) => {
    if (!oldFilters) return true;
    return JSON.stringify(newFilters) !== JSON.stringify(oldFilters);
  };

  useEffect(() => {
    // Don't scroll during state restoration - only when user initiates search
    if (!isRestoringStateRef.current && userInitiatedSearchRef.current && filtersHaveChanged(filters, previousFiltersRef.current)) {
      console.log('📍 User changed filters, scrolling to products');
      setTimeout(() => {
        requestAnimationFrame(() => {
          if (productsContainerRef.current) {
            productsContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        });
      }, 100);

      previousFiltersRef.current = filters;
    }
  }, [filters]);

  // Only reset to page 1 if user explicitly initiates search
  useEffect(() => {
    if (userInitiatedSearchRef.current && isSearchActive && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [isSearchActive, currentPage]);

  // Use server search results when search is active, otherwise use paginated products
  const productsToDisplay = isSearchActive ? serverSearchResults : allProducts;

  // Organize products by category
  const organizedProducts = groupProductsByCategory(
    productsToDisplay,
    categorySettings,
    language
  );

  // CRITICAL: Force meta tags update when component renders
  // This ensures WhatsApp preview shows the correct user info
  useEffect(() => {
    if (corretor) {
      const metaConfig = getCorretorMetaTags(corretor, language);
      updateMetaTags(metaConfig);
    }
  }, [corretor, language]);

  // Restore scroll position after products load and state is restored
  useEffect(() => {
    if (hasRestoredState && !productsLoading && isReturningFromProduct && !scrollRestoredRef.current) {
      // For search/filter context, wait for server search to complete and results to load
      const isWaitingForServerSearch = isSearchActive && (serverSearchLoading || allServerSearchResults.length === 0);

      if (!isWaitingForServerSearch) {
        scrollRestoredRef.current = true;
        const savedState = pageStateHook.restoreCurrentState();

        if (savedState && savedState.scrollPosition > 0) {
          console.log('📜 Restoring scroll to position:', savedState.scrollPosition, 'Context:', isSearchActive ? 'search' : 'normal');

          // Signal that scroll restoration is in progress BEFORE any restore attempt
          scrollCoordinator.startScrollRestoration();

          // Multiple attempts to restore scroll with increasing delays
          // This ensures scroll restoration works across different browser states and rendering speeds
          const attempts = [10, 50, 100, 200, 500];
          let completedAttempts = 0;

          attempts.forEach((delay, index) => {
            setTimeout(() => {
              requestAnimationFrame(() => {
                window.scrollTo(0, savedState.scrollPosition);
                completedAttempts++;
                // Clear the flag only after all attempts are done
                if (completedAttempts === attempts.length) {
                  console.log('✅ Scroll restoration completed');
                  scrollCoordinator.endScrollRestoration();
                }
              });
            }, delay);
          });
        } else {
          // No scroll position to restore, end restoration flag immediately
          console.log('ℹ️ No scroll position to restore');
          scrollCoordinator.endScrollRestoration();
        }
      }
    }
  }, [hasRestoredState, productsLoading, serverSearchLoading, isSearchActive, allServerSearchResults.length, isReturningFromProduct, pageStateHook]);

  // Loading state
  if (corretorLoading || productsLoading || filterMetadataLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t('messages.loading_storefront')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (corretorError || !corretor) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h1 className="text-2xl font-bold">{t('messages.user_not_found')}</h1>
        <p className="text-muted-foreground text-center max-w-md">
          {t('messages.user_not_exists')}
        </p>
        <Button asChild>
          <a href="/">{t('messages.back_to_home')}</a>
        </Button>
      </div>
    );
  }

  const handlePageChange = (newPage: number) => {
    const currentScrollPosition = window.scrollY || document.documentElement.scrollTop;
    pageStateHook.saveCurrentState(currentScrollPosition);

    if (isSearchActive) {
      setSearchResultsPage(newPage);
    } else {
      setCurrentPage(newPage);
    }

    // Scroll to products section when changing pages
    setTimeout(() => {
      requestAnimationFrame(() => {
        if (productsContainerRef.current) {
          productsContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }, 50);
  };

  logCategoryOperation('CORRETOR_PAGE_RENDER', {
    corretorId: corretor.id,
    corretorName: corretor.name,
    totalProducts,
    currentPageProducts: allProducts.length,
    productsDisplayed: productsToDisplay.length,
    organizedCategories: Object.keys(organizedProducts).length,
    paginationEnabled,
    currentPage,
    isSearchActive,
    usingServerSearch: isSearchActive,
    filterMetadataCount: {
      categories: filterMetadata.categories.length,
      brands: filterMetadata.brands.length,
      genders: filterMetadata.genders.length,
      sizes: filterMetadata.sizes.length
    },
    language,
    currency
  });

  return (
    <div className="flex-1">
      {/* Corretor Header with profile info */}
      <CorretorHeader 
        corretor={corretor} 
        language={language}
        currency={currency}
      />

      {/* Promotional Banner */}
      {/* Product Search */}
      <div className="container mx-auto px-4 py-1">
        <ProductSearch
          onFiltersChange={(newFilters) => {
            userInitiatedSearchRef.current = true;
            handleSearch(newFilters);
          }}
          products={allProducts}
          filterMetadata={filterMetadata}
          currency={currency}
          language={language}
          settings={settings}
          sizeTypeMapping={sizeTypeMapping}
          initialFilters={filters}
        />
      </div>

      {/* Promotional Banner */}
      <div className="mt-6 mb-8">
        <PromotionalBanner corretor={corretor} />
      </div>

      {/* Products Section */}
      <section className="py-2" ref={productsContainerRef}>
        <div className="container mx-auto px-4">
          {productsError ? (
            <Card className="text-center py-12">
              <CardContent>
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">{t('messages.error_loading')}</h2>
                <p className="text-muted-foreground">{productsError}</p>
              </CardContent>
            </Card>
          ) : Object.keys(organizedProducts).length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <h2 className="text-xl font-semibold mb-2">
                  {isSearchActive ? t('messages.no_results') : t('messages.no_products')}
                </h2>
                <p className="text-muted-foreground">
                  {isSearchActive
                    ? 'Tente ajustar os filtros de busca'
                    : 'Este vendedor ainda não possui produtos cadastrados'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-12">
                {Object.entries(organizedProducts).map(([categoryName, products]) => (
                  <motion.div
                    key={categoryName}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    {/* Category Header */}
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl md:text-2xl font-bold text-foreground">{categoryName}</h2>
                      <div className="flex items-center gap-2">
                        {categoryName !== t('categories.others') && (
                          <ShareCategoryButton
                            corretorSlug={corretor.slug || ''}
                            categoryName={categoryName}
                            language={language}
                            className="opacity-60 hover:opacity-100 transition-opacity"
                          />
                        )}
                      </div>
                    </div>

                    {/* Products Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                      {products.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          corretorSlug={corretor.slug || ''}
                          currency={currency}
                          language={language}
                          onNavigate={() => {
                            const currentScrollPosition = window.scrollY || document.documentElement.scrollTop;
                            pageStateHook.saveCurrentState(currentScrollPosition);
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Bottom pagination controls - show for regular products or search results */}
              {paginationEnabled && !isSearchActive && (
                <div className="mt-12">
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    hasNextPage={hasNextPage}
                    hasPreviousPage={hasPreviousPage}
                    onPageChange={handlePageChange}
                    totalProducts={totalProducts}
                    pageSize={pageSize}
                    isLoading={productsLoading}
                  />
                </div>
              )}

              {/* Search results pagination */}
              {isSearchActive && allServerSearchResults.length > 0 && !serverSearchLoading && (
                <div className="mt-12">
                  <PaginationControls
                    currentPage={searchResultsPage}
                    totalPages={Math.ceil(allServerSearchResults.length / pageSize)}
                    hasNextPage={searchResultsPage < Math.ceil(allServerSearchResults.length / pageSize)}
                    hasPreviousPage={searchResultsPage > 1}
                    onPageChange={handlePageChange}
                    totalProducts={allServerSearchResults.length}
                    pageSize={pageSize}
                    isLoading={serverSearchLoading}
                  />
                </div>
              )}

              {/* Loading indicator for server search - show first */}
              {isSearchActive && serverSearchLoading && (
                <div className="mt-8 flex items-center justify-center">
                  <Loader className="h-5 w-5 animate-spin text-primary mr-2" />
                  <p className="text-sm text-muted-foreground">{t('messages.loading_search_results')}</p>
                </div>
              )}

              {/* Search results count - only show when not loading and results exist */}
              {isSearchActive && allServerSearchResults.length > 0 && !serverSearchLoading && (
                <div className="mt-8 p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    {allServerSearchResults.length} {allServerSearchResults.length === 1 ? t('messages.product') : t('messages.products')} {t('messages.found')}
                  </p>
                  {filters.category && filters.category !== 'todos' && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('messages.showing_active_products_only')}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}