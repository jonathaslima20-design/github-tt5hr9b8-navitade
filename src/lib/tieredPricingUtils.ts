import { supabase } from './supabase';
import type { PriceTier } from '@/types';

export interface TieredPricingResult {
  unitPrice: number;
  totalPrice: number;
  appliedTier: PriceTier | null;
  savings: number;
  nextTier: PriceTier | null;
  nextTierSavings: number;
  unitsToNextTier: number;
}

export async function fetchProductPriceTiers(productId: string): Promise<PriceTier[]> {
  const { data, error } = await supabase
    .from('product_price_tiers')
    .select('*')
    .eq('product_id', productId)
    .order('min_quantity', { ascending: true });

  if (error) {
    console.error('Error fetching price tiers:', error);
    return [];
  }

  return data || [];
}

export function getMinimumPriceFromTiers(tiers: PriceTier[]): number | null {
  if (!tiers || tiers.length === 0) return null;

  const prices = tiers.map(tier => tier.discounted_unit_price || tier.unit_price);
  return Math.min(...prices);
}

export function calculateApplicablePrice(
  quantity: number,
  tiers: PriceTier[],
  basePrice: number,
  baseDiscountedPrice?: number
): TieredPricingResult {
  if (!tiers || tiers.length === 0) {
    const unitPrice = baseDiscountedPrice || basePrice;
    return {
      unitPrice,
      totalPrice: unitPrice * quantity,
      appliedTier: null,
      savings: 0,
      nextTier: null,
      nextTierSavings: 0,
      unitsToNextTier: 0,
    };
  }

  const sortedTiers = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);

  const applicableTier = sortedTiers
    .filter(tier => quantity >= tier.min_quantity && (!tier.max_quantity || quantity <= tier.max_quantity))
    .pop();

  const unitPrice = applicableTier
    ? (applicableTier.discounted_unit_price || applicableTier.unit_price)
    : (baseDiscountedPrice || basePrice);

  const totalPrice = unitPrice * quantity;

  const baseUnitPrice = baseDiscountedPrice || basePrice;
  const baseTotalPrice = baseUnitPrice * quantity;
  const savings = baseTotalPrice - totalPrice;

  const nextTier = sortedTiers.find(tier => tier.min_quantity > quantity) || null;

  let nextTierSavings = 0;
  let unitsToNextTier = 0;

  if (nextTier) {
    const nextTierUnitPrice = nextTier.discounted_unit_price || nextTier.unit_price;
    const nextTierTotalPrice = nextTierUnitPrice * nextTier.min_quantity;
    const baseTotalAtNextTier = baseUnitPrice * nextTier.min_quantity;
    nextTierSavings = baseTotalAtNextTier - nextTierTotalPrice;
    unitsToNextTier = nextTier.min_quantity - quantity;
  }

  return {
    unitPrice,
    totalPrice,
    appliedTier: applicableTier || null,
    savings,
    nextTier,
    nextTierSavings,
    unitsToNextTier,
  };
}

export function formatPriceTierRange(tier: PriceTier): string {
  if (tier.max_quantity) {
    return `${tier.min_quantity}-${tier.max_quantity} unidade${tier.max_quantity > 1 ? 's' : ''}`;
  }
  return `${tier.min_quantity}+ unidade${tier.min_quantity > 1 ? 's' : ''}`;
}

export function getBestValueTier(tiers: PriceTier[]): PriceTier | null {
  if (!tiers || tiers.length === 0) return null;

  return tiers.reduce((best, current) => {
    const bestPrice = best.discounted_unit_price || best.unit_price;
    const currentPrice = current.discounted_unit_price || current.unit_price;
    return currentPrice < bestPrice ? current : best;
  }, tiers[0]);
}

export interface FirstTierPricesResult {
  unitPrice: number;
  discountedPrice: number | null;
  hasPromotionalPricing: boolean;
  discountPercentage: number | null;
}

export function getFirstTierPrices(tiers: PriceTier[]): FirstTierPricesResult | null {
  if (!tiers || tiers.length === 0) return null;

  const firstTier = tiers[0];
  const unitPrice = firstTier.unit_price;
  const discountedPrice = firstTier.discounted_unit_price || null;

  // Check if both prices are configured and discounted price is valid
  const hasPromotionalPricing = discountedPrice && discountedPrice > 0 && discountedPrice < unitPrice;

  // Calculate discount percentage only if there's a valid discount
  const discountPercentage = hasPromotionalPricing
    ? Math.round(((unitPrice - discountedPrice) / unitPrice) * 100)
    : null;

  return {
    unitPrice,
    discountedPrice: hasPromotionalPricing ? discountedPrice : null,
    hasPromotionalPricing,
    discountPercentage
  };
}

export async function updatePriceTier(
  tierId: string,
  updates: Partial<Pick<PriceTier, 'min_quantity' | 'max_quantity' | 'unit_price' | 'discounted_unit_price'>>
): Promise<PriceTier | null> {
  const { data, error } = await supabase
    .from('product_price_tiers')
    .update(updates)
    .eq('id', tierId)
    .select()
    .single();

  if (error) {
    console.error('Error updating price tier:', error);
    throw new Error('Failed to update price tier');
  }

  return data;
}

export async function deletePriceTier(tierId: string): Promise<boolean> {
  const { error } = await supabase
    .from('product_price_tiers')
    .delete()
    .eq('id', tierId);

  if (error) {
    console.error('Error deleting price tier:', error);
    throw new Error('Failed to delete price tier');
  }

  return true;
}

export async function createPriceTier(
  productId: string,
  tier: Omit<PriceTier, 'id' | 'product_id' | 'created_at' | 'updated_at'>
): Promise<PriceTier | null> {
  const { data, error } = await supabase
    .from('product_price_tiers')
    .insert({
      product_id: productId,
      min_quantity: tier.min_quantity,
      max_quantity: tier.max_quantity,
      unit_price: tier.unit_price,
      discounted_unit_price: tier.discounted_unit_price
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating price tier:', error);
    throw new Error('Failed to create price tier');
  }

  return data;
}
