import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { filterProducts, parseUrlFilters, type ProductFilters } from '@/utils/productDisplayUtils';
import { logCategoryOperation, sanitizeCategoryName } from '@/lib/categoryUtils';
import type { Product } from '@/types';

interface UseProductSearchProps {
  allProducts: Product[];
  settings: any;
}

interface UseProductSearchReturn {
  filteredProducts: Product[];
  isSearchActive: boolean;
  filters: ProductFilters;
  handleSearch: (newFilters: ProductFilters) => void;
  setFilters: (filters: ProductFilters) => void;
}

/**
 * Custom hook for managing product search and filtering
 */
export function useProductSearch({
  allProducts,
  settings
}: UseProductSearchProps): UseProductSearchReturn {
  const [searchParams] = useSearchParams();
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [filters, setFilters] = useState<ProductFilters>({
    query: '',
    status: 'todos',
    minPrice: 0,
    maxPrice: 5000,
    category: 'todos',
    brand: 'todos',
    gender: 'todos',
    sizes: 'todos',
    condition: 'todos'
  });

  // Initialize filtered products
  useEffect(() => {
    setFilteredProducts(allProducts);
  }, [allProducts]);

  // Apply URL filters when products and settings are loaded
  useEffect(() => {
    if (allProducts.length > 0 && settings) {
      const urlCategory = searchParams.get('category');
      const urlQuery = searchParams.get('query');
      
      if (urlCategory || urlQuery) {
        logCategoryOperation('APPLYING_URL_FILTERS', { 
          urlCategory, 
          urlQuery,
          productsLoaded: allProducts.length,
          settingsLoaded: !!settings
        });
        
        const urlFilters = parseUrlFilters(searchParams, settings);
        
        handleSearch(urlFilters);
      }
    }
  }, [allProducts, settings, searchParams]);

  const handleSearch = (newFilters: ProductFilters) => {
    // Update filters state
    setFilters(newFilters);
    
    // Use the extracted filter function
    const result = filterProducts(allProducts, newFilters, settings);
    setFilteredProducts(result.filteredProducts);
    setIsSearchActive(result.isSearchActive);
  };

  return {
    filteredProducts,
    isSearchActive,
    filters,
    handleSearch,
    setFilters
  };
}