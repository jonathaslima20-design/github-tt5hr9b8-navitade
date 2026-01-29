import type { Product, CategoryDisplaySetting } from '@/types';
import { sanitizeCategoryName } from '@/lib/categoryUtils';
import { useTranslation, type SupportedLanguage } from '@/lib/i18n';

export interface ProductFilters {
  query?: string;
  status?: string;
  category?: string;
  brand?: string;
  gender?: string;
  condition?: string;
  sizes?: string;
  minPrice?: number;
  maxPrice?: number;
}

/**
 * Utility functions for product display and organization
 */

export interface ProductsByCategory {
  [categoryName: string]: Product[];
}

export interface CategoryInfo {
  name: string;
  count: number;
  enabled: boolean;
  order: number;
}

/**
 * Groups products by their categories
 */
export function groupProductsByCategory(
  products: Product[],
  categorySettings: CategoryDisplaySetting[] = [],
  language: SupportedLanguage = 'pt-BR'
): ProductsByCategory {
  const grouped: ProductsByCategory = {};

  const disabledCategoriesSet = new Set(
    categorySettings
      .filter(setting => !setting.enabled)
      .map(setting => setting.category)
  );

  const categoryOrderMap = new Map(
    categorySettings.map(setting => [setting.category, setting.order])
  );

  const sortedCategorySettings = categorySettings
    .filter(setting => setting.enabled)
    .sort((a, b) => a.order - b.order);

  products.forEach(product => {
    if (product.category && Array.isArray(product.category)) {
      product.category.forEach(cat => {
        const sanitized = sanitizeCategoryName(cat);
        if (sanitized && !disabledCategoriesSet.has(sanitized)) {
          if (!grouped[sanitized]) {
            grouped[sanitized] = [];
          }
          grouped[sanitized].push(product);
        }
      });
    } else {
      const othersLabel = language === 'en-US' ? 'Others' :
                         language === 'es-ES' ? 'Otros' : 'Outros';
      if (!grouped[othersLabel]) {
        grouped[othersLabel] = [];
      }
      grouped[othersLabel].push(product);
    }
  });

  const orderedGrouped: ProductsByCategory = {};

  if (categorySettings.length === 0) {
    const sortedCategories = Object.keys(grouped).sort((a, b) => {
      const othersLabel = language === 'en-US' ? 'Others' :
                         language === 'es-ES' ? 'Otros' : 'Outros';

      if (a === othersLabel) return 1;
      if (b === othersLabel) return -1;

      return a.localeCompare(b);
    });

    sortedCategories.forEach(categoryName => {
      orderedGrouped[categoryName] = grouped[categoryName];
    });

    return orderedGrouped;
  }

  sortedCategorySettings.forEach(setting => {
    if (grouped[setting.category]) {
      orderedGrouped[setting.category] = grouped[setting.category];
    }
  });

  const configuredCategories = new Set(categorySettings.map(s => s.category));
  Object.keys(grouped).forEach(categoryName => {
    if (!configuredCategories.has(categoryName)) {
      const othersLabel = language === 'en-US' ? 'Others' :
                         language === 'es-ES' ? 'Otros' : 'Outros';
      if (categoryName !== othersLabel) {
        orderedGrouped[categoryName] = grouped[categoryName];
      }
    }
  });

  const othersLabel = language === 'en-US' ? 'Others' :
                     language === 'es-ES' ? 'Otros' : 'Outros';
  if (grouped[othersLabel]) {
    orderedGrouped[othersLabel] = grouped[othersLabel];
  }

  return orderedGrouped;
}

/**
 * Gets category information with counts and settings
 */
export function getCategoryInfo(
  products: Product[], 
  categorySettings: CategoryDisplaySetting[]
): CategoryInfo[] {
  const grouped = groupProductsByCategory(products);
  const categories: CategoryInfo[] = [];
  
  // Create a map of category settings for quick lookup
  const settingsMap = new Map(
    categorySettings.map(setting => [setting.category, setting])
  );
  
  Object.entries(grouped).forEach(([categoryName, categoryProducts]) => {
    const setting = settingsMap.get(categoryName);
    
    categories.push({
      name: categoryName,
      count: categoryProducts.length,
      enabled: setting?.enabled ?? true,
      order: setting?.order ?? 999
    });
  });
  
  // Sort by order, then by name
  return categories.sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Enhanced filterProducts function that returns both filtered products and search state
 */
export function filterProducts(
  products: Product[],
  filters: ProductFilters,
  settings: any
): { filteredProducts: Product[]; isSearchActive: boolean } {
  // Default values for price range
  const defaultMinPrice = settings?.priceRange?.minPrice ?? 0;
  const defaultMaxPrice = settings?.priceRange?.maxPrice ?? 5000;

  // Check if any filters are active (excluding defaults)
  const isSearchActive = !!(
    filters.query ||
    (filters.status && filters.status !== 'todos') ||
    (filters.category && filters.category !== 'todos') ||
    (filters.brand && filters.brand !== 'todos') ||
    (filters.gender && filters.gender !== 'todos') ||
    (filters.sizes && filters.sizes !== 'todos') ||
    (filters.condition && filters.condition !== 'todos') ||
    (filters.minPrice !== undefined && filters.minPrice !== defaultMinPrice) ||
    (filters.maxPrice !== undefined && filters.maxPrice !== defaultMaxPrice)
  );

  const filteredProducts = products.filter(product => {
    // Search filter
    if (filters.query) {
      const searchTerm = filters.query.toLowerCase();
      const searchableText = [
        product.title,
        product.short_description,
        product.brand,
        product.model,
        ...(product.category || [])
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(searchTerm)) {
        return false;
      }
    }
    
    // Category filter
    if (filters.category && filters.category !== 'todos') {
      if (!product.category || !Array.isArray(product.category)) {
        return filters.category === 'Outros';
      }
      
      const hasCategory = product.category.some(cat => 
        sanitizeCategoryName(cat) === filters.category
      );
      
      if (!hasCategory) {
        return false;
      }
    }
    
    // Price range filter - only apply when user explicitly changed the filter
    const productPrice = product.discounted_price || product.price;
    if (productPrice !== undefined && productPrice !== null) {
      // Only apply price filter if it's not the default value OR if search is active
      const shouldApplyMinPrice = filters.minPrice !== undefined && filters.minPrice !== defaultMinPrice;
      const shouldApplyMaxPrice = filters.maxPrice !== undefined && filters.maxPrice !== defaultMaxPrice;

      if (shouldApplyMinPrice && productPrice < filters.minPrice) {
        return false;
      }
      if (shouldApplyMaxPrice && productPrice > filters.maxPrice) {
        return false;
      }
    }
    // Products with price = 0 are always included when filters are at default values
    
    // Brand filter
    if (filters.brand && filters.brand !== 'todos') {
      if (product.brand !== filters.brand) {
        return false;
      }
    }
    
    // Gender filter
    if (filters.gender && filters.gender !== 'todos') {
      if (product.gender !== filters.gender) {
        return false;
      }
    }
    
    // Status filter
    if (filters.status && filters.status !== 'todos') {
      if (product.status !== filters.status) {
        return false;
      }
    }
    
    // Condition filter
    if (filters.condition && filters.condition !== 'todos') {
      if (product.condition !== filters.condition) {
        return false;
      }
    }

    // Sizes filter
    if (filters.sizes && filters.sizes !== 'todos') {
      if (!product.sizes || !Array.isArray(product.sizes) || !product.sizes.includes(filters.sizes)) {
        return false;
      }
    }

    return true;
  });

  return { filteredProducts, isSearchActive };
}

/**
 * Sorts products based on specified criteria
 */
export function sortProducts(
  products: Product[],
  sortBy: 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'newest' | 'oldest' | 'display-order'
): Product[] {
  const sorted = [...products];
  
  switch (sortBy) {
    case 'price-asc':
      return sorted.sort((a, b) => {
        const priceA = a.discounted_price || a.price || 0;
        const priceB = b.discounted_price || b.price || 0;
        if (priceA === 0 && priceB === 0) return 0;
        if (priceA === 0) return 1;
        if (priceB === 0) return -1;
        return priceA - priceB;
      });

    case 'price-desc':
      return sorted.sort((a, b) => {
        const priceA = a.discounted_price || a.price || 0;
        const priceB = b.discounted_price || b.price || 0;
        if (priceA === 0 && priceB === 0) return 0;
        if (priceA === 0) return 1;
        if (priceB === 0) return -1;
        return priceB - priceA;
      });
      
    case 'name-asc':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
      
    case 'name-desc':
      return sorted.sort((a, b) => b.title.localeCompare(a.title));
      
    case 'newest':
      return sorted.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
    case 'oldest':
      return sorted.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
    case 'display-order':
      return sorted.sort((a, b) => {
        // Products with display_order come first, sorted by order
        if (a.display_order !== null && b.display_order !== null) {
          return a.display_order - b.display_order;
        }
        if (a.display_order !== null) return -1;
        if (b.display_order !== null) return 1;
        
        // Then by creation date (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
    default:
      return sorted;
  }
}

/**
 * Gets unique values for filter options
 */
export function getFilterOptions(products: Product[]) {
  const brands = new Set<string>();
  const genders = new Set<string>();
  const conditions = new Set<string>();
  const statuses = new Set<string>();
  
  products.forEach(product => {
    if (product.brand) brands.add(product.brand);
    if (product.gender) genders.add(product.gender);
    if (product.condition) conditions.add(product.condition);
    if (product.status) statuses.add(product.status);
  });
  
  return {
    brands: Array.from(brands).sort(),
    genders: Array.from(genders).sort(),
    conditions: Array.from(conditions).sort(),
    statuses: Array.from(statuses).sort()
  };
}

/**
 * Calculates price statistics for products
 */
export function getPriceStats(products: Product[]) {
  if (products.length === 0) {
    return { min: 0, max: 1000, avg: 0 };
  }

  const prices = products
    .map(p => p.discounted_price || p.price)
    .filter(price => price !== undefined && price !== null);

  if (prices.length === 0) {
    return { min: 0, max: 1000, avg: 0 };
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;

  return { min, max, avg };
}

/**
 * Parses URL search parameters into ProductFilters
 */
export function parseUrlFilters(searchParams: URLSearchParams, settings: any): ProductFilters {
  const filters: ProductFilters = {
    query: searchParams.get('query') || '',
    status: searchParams.get('status') || 'todos',
    category: searchParams.get('category') || 'todos',
    brand: searchParams.get('brand') || 'todos',
    gender: searchParams.get('gender') || 'todos',
    sizes: searchParams.get('sizes') || 'todos',
    condition: searchParams.get('condition') || 'todos'
  };

  // Parse price range with defaults from settings (now defaults to 0 for minPrice)
  const minPriceParam = searchParams.get('minPrice');
  const maxPriceParam = searchParams.get('maxPrice');

  filters.minPrice = minPriceParam ?
    parseInt(minPriceParam, 10) :
    (settings?.priceRange?.minPrice ?? 0);

  filters.maxPrice = maxPriceParam ?
    parseInt(maxPriceParam, 10) :
    (settings?.priceRange?.maxPrice ?? 5000);

  return filters;
}