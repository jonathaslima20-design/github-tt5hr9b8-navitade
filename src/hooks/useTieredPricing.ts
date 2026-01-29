import { useState, useEffect, useCallback } from 'react';
import { fetchProductPriceTiers, calculateApplicablePrice } from '@/lib/tieredPricingUtils';
import type { PriceTier } from '@/types';

interface UseTieredPricingResult {
  tiers: PriceTier[];
  loading: boolean;
  error: Error | null;
  calculatePrice: (quantity: number) => {
    unitPrice: number;
    totalPrice: number;
    savings: number;
    nextTierSavings: number;
    unitsToNextTier: number;
  };
  minimumPrice: number | null;
  refresh: () => Promise<void>;
}

export function useTieredPricing(
  productId: string | undefined,
  basePrice: number,
  baseDiscountedPrice?: number,
  hasTieredPricing?: boolean
): UseTieredPricingResult {
  const [tiers, setTiers] = useState<PriceTier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadTiers = useCallback(async () => {
    if (!hasTieredPricing || !productId) {
      setTiers([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fetchedTiers = await fetchProductPriceTiers(productId);
      setTiers(fetchedTiers);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load price tiers'));
      console.error('Error loading price tiers:', err);
    } finally {
      setLoading(false);
    }
  }, [productId, hasTieredPricing]);

  useEffect(() => {
    loadTiers();
  }, [loadTiers]);

  const calculatePrice = useCallback(
    (quantity: number) => {
      const result = calculateApplicablePrice(
        quantity,
        tiers,
        basePrice,
        baseDiscountedPrice
      );

      return {
        unitPrice: result.unitPrice,
        totalPrice: result.totalPrice,
        savings: result.savings,
        nextTierSavings: result.nextTierSavings,
        unitsToNextTier: result.unitsToNextTier,
      };
    },
    [tiers, basePrice, baseDiscountedPrice]
  );

  const minimumPrice = tiers.length > 0
    ? Math.min(...tiers.map(tier => tier.discounted_unit_price || tier.unit_price))
    : null;

  return {
    tiers,
    loading,
    error,
    calculatePrice,
    minimumPrice,
    refresh: loadTiers,
  };
}
