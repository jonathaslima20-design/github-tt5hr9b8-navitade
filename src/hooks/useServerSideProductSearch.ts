import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { logCategoryOperation, sanitizeCategoryName, normalizeCategoryNameForComparison } from '@/lib/categoryUtils';
import type { Product } from '@/types';
import type { ProductFilters } from '@/components/product/ProductSearch';

interface UseServerSideProductSearchReturn {
  searchProducts: (userId: string, filters: ProductFilters) => Promise<Product[]>;
  loading: boolean;
  error: string | null;
}

export function useServerSideProductSearch(): UseServerSideProductSearchReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchProducts = useCallback(async (userId: string, filters: ProductFilters): Promise<Product[]> => {
    try {
      setLoading(true);
      setError(null);

      logCategoryOperation('SERVER_SIDE_SEARCH_START', {
        userId,
        filters: {
          query: filters.query,
          status: filters.status,
          category: filters.category,
          brand: filters.brand,
          gender: filters.gender,
          sizes: filters.sizes,
          condition: filters.condition,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice
        }
      });

      let query = supabase
        .from('products')
        .select(`
          id,
          title,
          price,
          discounted_price,
          is_starting_price,
          short_description,
          status,
          category,
          brand,
          gender,
          condition,
          featured_image_url,
          colors,
          sizes,
          display_order,
          external_checkout_url,
          has_tiered_pricing,
          min_tiered_price,
          max_tiered_price,
          is_visible_on_storefront
        `)
        .eq('user_id', userId)
        .eq('is_visible_on_storefront', true);

      // Apply status filter
      if (filters.status && filters.status !== 'todos') {
        query = query.eq('status', filters.status);
      }

      // Apply condition filter
      if (filters.condition && filters.condition !== 'todos') {
        query = query.eq('condition', filters.condition);
      }

      // Execute query
      const { data: products, error: queryError } = await query
        .order('display_order', { ascending: true, nullsLast: true })
        .order('id', { ascending: false })
        .limit(5000);

      if (queryError) {
        throw queryError;
      }

      let filteredProducts = products || [];
      console.log(`[Search] Produtos do servidor (visíveis): ${filteredProducts.length}`);

      // Apply price range filter with tiered pricing support
      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        const minPrice = filters.minPrice ?? 0;
        const maxPrice = filters.maxPrice ?? Infinity;

        const before = filteredProducts.length;
        filteredProducts = filteredProducts.filter(product => {
          if (product.has_tiered_pricing) {
            // For tiered pricing products, check if any tier price falls within range
            const tierMin = product.min_tiered_price ?? Infinity;
            const tierMax = product.max_tiered_price ?? 0;

            // Include if tier price range overlaps with filter range
            return tierMin <= maxPrice && tierMax >= minPrice;
          } else {
            // For regular products, check discounted_price or price
            const productPrice = product.discounted_price ?? product.price ?? 0;
            return productPrice >= minPrice && productPrice <= maxPrice;
          }
        });
        console.log(`[Search] Após filtro de preço: ${filteredProducts.length} (era ${before})`);
      }

      // Apply text search (title and short_description)
      if (filters.query && filters.query.trim()) {
        const searchQuery = filters.query.toLowerCase();
        const before = filteredProducts.length;
        filteredProducts = filteredProducts.filter(product =>
          (product.title?.toLowerCase().includes(searchQuery)) ||
          (product.short_description?.toLowerCase().includes(searchQuery)) ||
          (product.brand?.toLowerCase().includes(searchQuery))
        );
        console.log(`[Search] Após filtro de texto: ${filteredProducts.length} (era ${before})`);
      }

      // Apply category filter (client-side to handle array matching)
      if (filters.category && filters.category !== 'todos') {
        const targetNormalized = normalizeCategoryNameForComparison(filters.category);
        const before = filteredProducts.length;
        filteredProducts = filteredProducts.filter(product => {
          if (!product.category || !Array.isArray(product.category)) {
            return false;
          }
          return product.category.some(cat => {
            const sanitized = sanitizeCategoryName(cat);
            const normalized = normalizeCategoryNameForComparison(sanitized);
            return normalized === targetNormalized;
          });
        });
        console.log(`[Search] Após filtro de categoria "${filters.category}": ${filteredProducts.length} (era ${before})`);
        console.log(`[Search] Categoria normalizada buscada: "${targetNormalized}"`);
      }

      // Apply brand filter
      if (filters.brand && filters.brand !== 'todos') {
        const before = filteredProducts.length;
        filteredProducts = filteredProducts.filter(product =>
          product.brand?.toLowerCase() === filters.brand.toLowerCase()
        );
        console.log(`[Search] Após filtro de marca: ${filteredProducts.length} (era ${before})`);
      }

      // Apply gender filter
      if (filters.gender && filters.gender !== 'todos') {
        const before = filteredProducts.length;
        filteredProducts = filteredProducts.filter(product =>
          product.gender?.toLowerCase() === filters.gender.toLowerCase()
        );
        console.log(`[Search] Após filtro de gênero: ${filteredProducts.length} (era ${before})`);
      }

      // Apply size filter
      if (filters.sizes && filters.sizes !== 'todos') {
        const before = filteredProducts.length;
        filteredProducts = filteredProducts.filter(product =>
          product.sizes && Array.isArray(product.sizes) &&
          product.sizes.some(size => size === filters.sizes)
        );
        console.log(`[Search] Após filtro de tamanho: ${filteredProducts.length} (era ${before})`);
      }

      console.log(`[Search] Resultado final: ${filteredProducts.length} produtos`);
      logCategoryOperation('SERVER_SIDE_SEARCH_COMPLETE', {
        resultsCount: filteredProducts.length,
        appliedFilters: Object.entries(filters).filter(([_, v]) => v && v !== 'todos')
      });

      setLoading(false);
      return filteredProducts;

    } catch (err: any) {
      const errorMessage = err.message || 'Error searching products';
      logCategoryOperation('SERVER_SIDE_SEARCH_ERROR', err);
      setError(errorMessage);
      setLoading(false);
      return [];
    }
  }, []);

  return {
    searchProducts,
    loading,
    error
  };
}
