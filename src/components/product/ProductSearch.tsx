import { useState } from 'react';
import { useEffect } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/types';
import { sanitizeCategoryName, categoriesEqual, normalizeCategoryNameForComparison, logCategoryOperation } from '@/lib/categoryUtils';
import { useTranslation, type SupportedLanguage, type SupportedCurrency } from '@/lib/i18n';
import { formatSizeLabel, getSizeTypeWithFallback, type SizeTypeMapping } from '@/lib/sizeTypeUtils';
import type { ProductFilterMetadata } from '@/hooks/useProductFilterMetadata';

interface ProductSearchProps {
  onFiltersChange?: (filters: ProductFilters) => void;
  products?: Product[];
  filterMetadata?: ProductFilterMetadata;
  currency?: SupportedCurrency;
  language?: SupportedLanguage;
  settings?: {
    showSearch?: boolean;
    showPriceRange?: boolean;
    showCategories?: boolean;
    showBrands?: boolean;
    showGender?: boolean;
    showFilters?: boolean;
    showStatus?: boolean;
    showCondition?: boolean;
    priceRange?: {
      minPrice?: number;
      maxPrice?: number;
    };
  };
  sizeTypeMapping?: SizeTypeMapping;
  initialFilters?: ProductFilters;
}

export interface ProductFilters {
  query: string;
  status: string;
  minPrice: number;
  maxPrice: number;
  category: string;
  brand: string;
  gender: string;
  sizes: string;
  condition: string;
}

export default function ProductSearch({ onFiltersChange, products = [], filterMetadata, currency = 'BRL', language = 'pt-BR', settings = {}, sizeTypeMapping = {}, initialFilters: propInitialFilters }: ProductSearchProps) {
  const { t } = useTranslation(language);

  // Provide default function to prevent undefined errors
  const handleFiltersChange = onFiltersChange || (() => {});

  // Use configured price range or default values (minPrice now defaults to 0)
  const configuredMinPrice = settings.priceRange?.minPrice ?? 0;
  const configuredMaxPrice = settings.priceRange?.maxPrice ?? 5000;

  const defaultFilters: ProductFilters = {
    query: '',
    status: 'todos',
    minPrice: configuredMinPrice,
    maxPrice: configuredMaxPrice,
    category: 'todos',
    brand: 'todos',
    gender: 'todos',
    sizes: 'todos',
    condition: 'todos'
  };

  const initialFilters = propInitialFilters || defaultFilters;

  const [filters, setFilters] = useState<ProductFilters>(initialFilters);
  const [priceRange, setPriceRange] = useState<[number, number]>([initialFilters.minPrice, initialFilters.maxPrice]);
  const [isOpen, setIsOpen] = useState(false);
  const [actualMinPrice, setActualMinPrice] = useState(configuredMinPrice);
  const [actualMaxPrice, setActualMaxPrice] = useState(configuredMaxPrice);

  // Calculate actual price range from products (including tiered pricing)
  useEffect(() => {
    if (products.length > 0) {
      let minPrice = Infinity;
      let maxPrice = 0;

      products.forEach(product => {
        if (product.has_tiered_pricing && product.min_tiered_price !== undefined && product.max_tiered_price !== undefined) {
          // For tiered pricing products, use the cached min/max
          minPrice = Math.min(minPrice, product.min_tiered_price);
          maxPrice = Math.max(maxPrice, product.max_tiered_price);
        } else {
          // For regular products, use discounted_price or price
          const productPrice = product.discounted_price ?? product.price ?? 0;
          minPrice = Math.min(minPrice, productPrice);
          maxPrice = Math.max(maxPrice, productPrice);
        }
      });

      // Only update if we found prices
      if (minPrice !== Infinity && maxPrice > 0) {
        setActualMinPrice(Math.floor(minPrice));
        setActualMaxPrice(Math.ceil(maxPrice));
      }
    }
  }, [products]);

  // Default settings if not provided
  const {
    showSearch = true,
    showPriceRange = true,
    showCategories = true,
    showBrands = true,
    showGender = true,
    showFilters = true,
    showStatus = true,
    showCondition = true,
    showSizes = true
  } = settings;

  // Use filterMetadata if provided, otherwise extract from products
  let categories = filterMetadata?.categories || [];
  let brands = filterMetadata?.brands || [];
  let genders = filterMetadata?.genders || [];
  let sizes = filterMetadata?.sizes || [];

  // Fallback to extracting from products if metadata not available
  if (!filterMetadata && products.length > 0) {
    const categoriesMap = new Map<string, string>();
    products
      .map(product => product.category)
      .filter(Boolean)
      .flat()
      .forEach(cat => {
        const sanitized = sanitizeCategoryName(cat);
        if (sanitized) {
          const normalized = normalizeCategoryNameForComparison(sanitized);
          if (!categoriesMap.has(normalized)) {
            categoriesMap.set(normalized, sanitized);
          }
        }
      });

    categories = Array.from(categoriesMap.values()).sort();
    brands = [...new Set(products
      .map(product => product.brand)
      .filter(Boolean)
    )].sort();
    genders = [...new Set(products
      .map(product => product.gender)
      .filter(Boolean)
    )].sort();
    sizes = [...new Set(products
      .flatMap(product => product.sizes || [])
      .filter(Boolean)
    )].sort((a, b) => {
      const typeA = sizeTypeMapping[a];
      const typeB = sizeTypeMapping[b];

      if (typeA !== typeB) {
        const typeOrder = { apparel: 0, shoe: 1, custom: 2 };
        const orderA = typeOrder[typeA as keyof typeof typeOrder] ?? 2;
        const orderB = typeOrder[typeB as keyof typeof typeOrder] ?? 2;
        return orderA - orderB;
      }

      return a.localeCompare(b);
    });
  }

  const handleSearch = () => {
    const updatedFilters = {
      ...filters,
      minPrice: priceRange[0],
      maxPrice: priceRange[1]
    };
    handleFiltersChange(updatedFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    const resetFilters = {
      ...initialFilters,
      minPrice: configuredMinPrice,
      maxPrice: configuredMaxPrice
    };
    setFilters(resetFilters);
    setPriceRange([configuredMinPrice, configuredMaxPrice]);
    handleFiltersChange(resetFilters);
    setIsOpen(false);
  };

  const handlePriceRangeChange = (newRange: number[]) => {
    setPriceRange([newRange[0], newRange[1]]);
    
    // Update filters immediately for real-time search
    const updatedFilters = {
      ...filters,
      minPrice: newRange[0],
      maxPrice: newRange[1]
    };
    setFilters(updatedFilters);
    handleFiltersChange(updatedFilters);
  };

  // Helper function to handle search with proper filters
  const onSearch = (searchFilters: ProductFilters) => {
    handleFiltersChange(searchFilters);
  };

  // If filters are disabled, don't render the component
  if (!showFilters) return null;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <div className="flex gap-2">
        {showSearch && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('header.search_placeholder')}
              value={filters.query}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, query: e.target.value }));
                onSearch({ ...filters, query: e.target.value, minPrice: priceRange[0], maxPrice: priceRange[1] });
              }}
              className="pl-9"
            />
          </div>
        )}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              {t('header.filters')}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>{t('header.filters')}</SheetTitle>
              <SheetDescription>
                {t('filters.refine_search')}
              </SheetDescription>
            </SheetHeader>
            
            <div className="py-6 space-y-6">
              {showStatus && (
                <Tabs 
                  value={filters.status} 
                  onValueChange={(value) => {
                    setFilters(prev => ({ ...prev, status: value }));
                    handleFiltersChange({ ...filters, status: value, minPrice: priceRange[0], maxPrice: priceRange[1] });
                  }}
                  className="w-full"
                >
                  <TabsList className="w-full">
                    <TabsTrigger value="todos" className="flex-1">{t('filters.all_status')}</TabsTrigger>
                    <TabsTrigger value="disponivel" className="flex-1">{t('status.available')}</TabsTrigger>
                    <TabsTrigger value="vendido" className="flex-1">{t('status.sold')}</TabsTrigger>
                    <TabsTrigger value="reservado" className="flex-1">{t('status.reserved')}</TabsTrigger>
                  </TabsList>
                </Tabs>
              )}

              {showGender && genders.length > 0 && (
                <div className="space-y-2">
                  <Label>{t('filters.gender')}</Label>
                  <Select
                    value={filters.gender}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, gender: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('filters.gender')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">{t('filters.all_genders')}</SelectItem>
                      {genders.map(gender => (
                        <SelectItem key={gender} value={gender}>
                          {gender === 'masculino' ? t('gender.masculine') : 
                           gender === 'feminino' ? t('gender.feminine') : t('gender.unisex')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {showCategories && categories.length > 0 && (
                <div className="space-y-2">
                  <Label>{t('filters.category')}</Label>
                  <Select
                    value={filters.category}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('filters.category')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">{t('filters.all_categories')}</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {showBrands && brands.length > 0 && (
                <div className="space-y-2">
                  <Label>{t('filters.brand')}</Label>
                  <Select
                    value={filters.brand}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, brand: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('filters.brand')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">{t('filters.all_brands')}</SelectItem>
                      {brands.map(brand => (
                        <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {showSizes && sizes.length > 0 && (
                <div className="space-y-2">
                  <Label>{t('filters.sizes')}</Label>
                  <Select
                    value={filters.sizes}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, sizes: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('filters.sizes')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">{t('filters.all_sizes')}</SelectItem>
                      {(() => {
                        const groupedByType: Record<string, string[]> = {
                          apparel: [],
                          shoe: [],
                          custom: []
                        };

                        sizes.forEach(size => {
                          const sizeType = getSizeTypeWithFallback(size, sizeTypeMapping);
                          groupedByType[sizeType].push(size);
                        });

                        return (
                          <>
                            {groupedByType.apparel.length > 0 && (
                              <>
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                  {t('size_type.apparel')}
                                </div>
                                {groupedByType.apparel.map(size => {
                                  const displayLabel = formatSizeLabel(size, 'apparel', language);
                                  return (
                                    <SelectItem key={size} value={size}>{displayLabel}</SelectItem>
                                  );
                                })}
                              </>
                            )}
                            {groupedByType.shoe.length > 0 && (
                              <>
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                  {t('size_type.shoe')}
                                </div>
                                {groupedByType.shoe.map(size => {
                                  const displayLabel = formatSizeLabel(size, 'shoe', language);
                                  return (
                                    <SelectItem key={size} value={size}>{displayLabel}</SelectItem>
                                  );
                                })}
                              </>
                            )}
                            {groupedByType.custom.length > 0 && (
                              <>
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                  {t('size_type.custom')}
                                </div>
                                {groupedByType.custom.map(size => {
                                  const displayLabel = formatSizeLabel(size, 'custom', language);
                                  return (
                                    <SelectItem key={size} value={size}>{displayLabel}</SelectItem>
                                  );
                                })}
                              </>
                            )}
                          </>
                        );
                      })()}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {showCondition && (
                <div className="space-y-2">
                  <Label>{t('filters.condition')}</Label>
                  <Select
                    value={filters.condition}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, condition: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('filters.condition')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">{t('filters.all_conditions')}</SelectItem>
                      <SelectItem value="novo">{t('condition.new')}</SelectItem>
                      <SelectItem value="seminovo">{t('condition.semi_new')}</SelectItem>
                      <SelectItem value="usado">{t('condition.used')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Faixa de Preço - Movido para o final */}
              {showPriceRange && (
                <div className="space-y-4">
                  <Label>{t('filters.price_range')}</Label>
                  <div className="px-2">
                    <Slider
                      min={actualMinPrice}
                      max={actualMaxPrice}
                      step={10}
                      value={priceRange}
                      onValueChange={handlePriceRangeChange}
                    />
                    <div className="flex justify-between mt-3 text-sm">
                      <div className="text-center">
                        <div className="font-medium text-primary">
                          {formatCurrency(priceRange[0], currency, language)}
                        </div>
                        <div className="text-xs text-muted-foreground">{t('filters.minimum')}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-primary">
                          {formatCurrency(priceRange[1], currency, language)}
                        </div>
                        <div className="text-xs text-muted-foreground">{t('filters.maximum')}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <SheetFooter>
              <Button variant="outline" onClick={handleReset}>
                {t('filters.clear_filters')}
              </Button>
              <Button onClick={handleSearch}>
                {t('filters.apply_filters')}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}