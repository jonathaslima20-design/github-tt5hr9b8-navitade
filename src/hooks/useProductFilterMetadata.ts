import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { sanitizeCategoryName, logCategoryOperation } from '@/lib/categoryUtils';

export interface ProductFilterMetadata {
  categories: string[];
  brands: string[];
  genders: string[];
  sizes: string[];
}

interface UseProductFilterMetadataProps {
  userId: string;
  enabled?: boolean;
}

interface UseProductFilterMetadataReturn {
  metadata: ProductFilterMetadata;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProductFilterMetadata({
  userId,
  enabled = true
}: UseProductFilterMetadataProps): UseProductFilterMetadataReturn {
  const [metadata, setMetadata] = useState<ProductFilterMetadata>({
    categories: [],
    brands: [],
    genders: [],
    sizes: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFilterMetadata = async () => {
    if (!enabled || !userId) return;

    try {
      setLoading(true);
      setError(null);

      logCategoryOperation('FETCHING_FILTER_METADATA', { userId });

      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('category, brand, gender, sizes, price, discounted_price, has_tiered_pricing, min_tiered_price, max_tiered_price')
        .eq('user_id', userId)
        .eq('is_visible_on_storefront', true);

      if (productsError) {
        throw productsError;
      }

      const productList = products || [];

      const categoriesSet = new Set<string>();
      const brandsSet = new Set<string>();
      const gendersSet = new Set<string>();
      const sizesSet = new Set<string>();

      productList.forEach(product => {
        if (product.category && Array.isArray(product.category)) {
          product.category.forEach((cat: string) => {
            const sanitized = sanitizeCategoryName(cat);
            if (sanitized) {
              categoriesSet.add(sanitized);
            }
          });
        }
        if (product.brand) {
          brandsSet.add(product.brand);
        }
        if (product.gender) {
          gendersSet.add(product.gender);
        }
        if (product.sizes && Array.isArray(product.sizes)) {
          product.sizes.forEach((size: string) => {
            if (size) {
              sizesSet.add(size);
            }
          });
        }
      });

      const newMetadata: ProductFilterMetadata = {
        categories: Array.from(categoriesSet).sort(),
        brands: Array.from(brandsSet).sort(),
        genders: Array.from(gendersSet).sort(),
        sizes: Array.from(sizesSet).sort()
      };

      setMetadata(newMetadata);

      logCategoryOperation('FILTER_METADATA_FETCHED', {
        categories: newMetadata.categories.length,
        brands: newMetadata.brands.length,
        genders: newMetadata.genders.length,
        sizes: newMetadata.sizes.length
      });

    } catch (err: any) {
      logCategoryOperation('FILTER_METADATA_ERROR', err);
      setError(err.message || 'Error fetching filter metadata');
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    await fetchFilterMetadata();
  };

  useEffect(() => {
    if (enabled && userId) {
      fetchFilterMetadata();
    }
  }, [userId, enabled]);

  return {
    metadata,
    loading,
    error,
    refetch
  };
}
