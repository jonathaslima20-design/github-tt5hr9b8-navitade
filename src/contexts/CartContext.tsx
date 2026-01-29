import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { toast } from 'sonner';
import type { CartItem, CartState, Product, PriceTier, VariantDistribution, DistributionItem, CartDistribution } from '@/types';
import { fetchProductPriceTiers, calculateApplicablePrice } from '@/lib/tieredPricingUtils';
import { createDistribution, updateDistribution, deleteDistribution, fetchUserDistributions } from '@/lib/distributionUtils';
import { supabase } from '@/lib/supabase';

interface CartContextType {
  cart: CartState;
  addToCart: (product: Product, selectedColor?: string, selectedSize?: string, quantity?: number, appliedTierPrice?: number) => void;
  removeFromCart: (productId: string) => void;
  removeCartVariant: (variantId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateVariantQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  isInCart: (productId: string) => boolean;
  hasVariant: (productId: string, color?: string, size?: string) => boolean;
  getItemQuantity: (productId: string) => number;
  getVariantQuantity: (productId: string, color?: string, size?: string) => number;
  updateItemNotes: (productId: string, notes: string) => void;
  updateVariantNotes: (variantId: string, notes: string) => void;
  updateVariantOptions: (variantId: string, color?: string, size?: string) => void;
  recalculateTieredPrices: () => Promise<void>;
  addDistribution: (product: Product, totalQuantity: number, items: Array<{ color?: string; size?: string; quantity: number }>) => Promise<boolean>;
  removeDistribution: (distributionId: string) => Promise<boolean>;
  updateDistributionItems: (distributionId: string, items: Array<{ color?: string; size?: string; quantity: number }>) => Promise<boolean>;
  loadDistributions: () => Promise<void>;
  getDistributions: () => CartDistribution[];
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = 'vitrineturbo_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartState>({
    items: [],
    distributions: [],
    total: 0,
    itemCount: 0,
  });
  const [tiersCache, setTiersCache] = useState<Map<string, PriceTier[]>>(new Map());
  const [productsCache, setProductsCache] = useState<Map<string, Product>>(new Map());

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(STORAGE_KEY);
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        // Ensure cart has required fields with defaults
        setCart({
          items: parsedCart.items || [],
          distributions: parsedCart.distributions || [],
          total: parsedCart.total || 0,
          itemCount: parsedCart.itemCount || 0,
        });
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [cart]);

  // Calculate totals whenever items or distributions change
  useEffect(() => {
    const calculateTotals = async () => {
      const itemCount = (cart.items || []).reduce((sum, item) => sum + item.quantity, 0);
      const distributionCount = (cart.distributions || []).reduce((sum, dist) => sum + dist.distribution.total_quantity, 0);
      const totalCount = itemCount + distributionCount;

      let total = 0;

      for (const item of (cart.items || [])) {
        const effectivePrice = item.applied_tier_price || item.discounted_price || item.price;
        total += effectivePrice * item.quantity;
      }

      for (const dist of (cart.distributions || [])) {
        total += dist.distribution.applied_tier_price * dist.distribution.total_quantity;
      }

      if (cart.total !== total || cart.itemCount !== totalCount) {
        setCart(prev => ({
          ...prev,
          total,
          itemCount: totalCount,
        }));
      }
    };

    calculateTotals();
  }, [cart.items, cart.distributions]);

  const generateVariantId = (productId: string, color?: string, size?: string) => {
    return `${productId}-${color || 'no-color'}-${size || 'no-size'}`;
  };

  const addToCart = (product: Product, selectedColor?: string, selectedSize?: string, quantity: number = 1, appliedTierPrice?: number) => {
    // Check if product has a price (either base price or tiered price)
    const hasValidPrice = (product.price && product.price > 0) || (product.has_tiered_pricing && appliedTierPrice && appliedTierPrice > 0);

    if (!hasValidPrice) {
      toast.error('Este produto não pode ser adicionado ao carrinho pois não possui preço definido.');
      return;
    }

    const variantId = generateVariantId(product.id, selectedColor, selectedSize);

    setCart(prev => {
      const existingItem = prev.items.find(item => item.variantId === variantId);

      if (existingItem) {
        // Update quantity if item already exists
        const updatedItems = prev.items.map(item =>
          item.variantId === variantId
            ? {
                ...item,
                quantity: item.quantity + quantity,
                applied_tier_price: appliedTierPrice || item.applied_tier_price,
                has_tiered_pricing: product.has_tiered_pricing || item.has_tiered_pricing
              }
            : item
        );

        const variantText = [selectedColor, selectedSize].filter(Boolean).join(', ');
        toast.success(`Quantidade atualizada: ${product.title}${variantText ? ` (${variantText})` : ''}`);
        return { ...prev, items: updatedItems };
      } else {
        // Add new item to cart
        // For tiered pricing products without base price, use applied tier price as base price
        const effectivePrice = product.has_tiered_pricing && appliedTierPrice && (!product.price || product.price === 0)
          ? appliedTierPrice
          : product.price;

        const newItem: CartItem = {
          id: product.id,
          variantId,
          title: product.title,
          price: effectivePrice,
          discounted_price: product.discounted_price,
          quantity: quantity,
          featured_image_url: product.featured_image_url,
          short_description: product.short_description,
          is_starting_price: product.is_starting_price,
          notes: '',
          selectedColor,
          selectedSize,
          availableColors: product.colors,
          availableSizes: product.sizes,
          has_tiered_pricing: product.has_tiered_pricing,
          applied_tier_price: appliedTierPrice,
        };

        const variantText = [selectedColor, selectedSize].filter(Boolean).join(', ');
        toast.success(`Adicionado ao carrinho: ${product.title}${variantText ? ` (${variantText})` : ''}`);
        return { ...prev, items: [...prev.items, newItem] };
      }
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const item = prev.items.find(item => item.id === productId);
      if (item) {
        toast.success(`Removido do carrinho: ${item.title}`);
      }
      
      return {
        ...prev,
        items: prev.items.filter(item => item.id !== productId)
      };
    });
  };

  const removeCartVariant = (variantId: string) => {
    setCart(prev => {
      const item = prev.items.find(item => item.variantId === variantId);
      if (item) {
        const variantText = [item.selectedColor, item.selectedSize].filter(Boolean).join(', ');
        toast.success(`Removido do carrinho: ${item.title}${variantText ? ` (${variantText})` : ''}`);
      }
      
      return {
        ...prev,
        items: prev.items.filter(item => item.variantId !== variantId)
      };
    });
  };
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === productId
          ? { ...item, quantity }
          : item
      )
    }));
  };

  const updateVariantQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeCartVariant(variantId);
      return;
    }

    setCart(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.variantId === variantId
          ? { ...item, quantity }
          : item
      )
    }));
  };
  const clearCart = () => {
    setCart({
      items: [],
      distributions: [],
      total: 0,
      itemCount: 0,
    });
    toast.success('Carrinho limpo');
  };

  const isInCart = (productId: string): boolean => {
    return cart.items.some(item => item.id === productId);
  };

  const hasVariant = (productId: string, color?: string, size?: string): boolean => {
    const variantId = generateVariantId(productId, color, size);
    return cart.items.some(item => item.variantId === variantId);
  };
  const getItemQuantity = (productId: string): number => {
    // Return total quantity for all variants of this product
    return cart.items
      .filter(item => item.id === productId)
      .reduce((total, item) => total + item.quantity, 0);
  };

  const getVariantQuantity = (productId: string, color?: string, size?: string): number => {
    const variantId = generateVariantId(productId, color, size);
    const item = cart.items.find(item => item.variantId === variantId);
    return item?.quantity || 0;
  };

  const updateItemNotes = (productId: string, notes: string) => {
    setCart(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === productId
          ? { ...item, notes }
          : item
      )
    }));
  };

  const updateVariantNotes = (variantId: string, notes: string) => {
    setCart(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.variantId === variantId
          ? { ...item, notes }
          : item
      )
    }));
  };

  const updateVariantOptions = (variantId: string, color?: string, size?: string) => {
    setCart(prev => {
      const item = prev.items.find(item => item.variantId === variantId);
      if (!item) return prev;

      const newVariantId = generateVariantId(item.id, color, size);
      
      // Check if this new variant already exists
      const existingVariant = prev.items.find(item => item.variantId === newVariantId);
      
      if (existingVariant && newVariantId !== variantId) {
        // Merge quantities if variant already exists
        const updatedItems = prev.items
          .filter(item => item.variantId !== variantId) // Remove old variant
          .map(item => 
            item.variantId === newVariantId
              ? { ...item, quantity: item.quantity + item.quantity }
              : item
          );
        
        toast.success('Variações combinadas no carrinho');
        return { ...prev, items: updatedItems };
      } else {
        // Update the variant options
        const updatedItems = prev.items.map(item =>
          item.variantId === variantId
            ? { 
                ...item, 
                variantId: newVariantId,
                selectedColor: color,
                selectedSize: size
              }
            : item
        );
        
        return { ...prev, items: updatedItems };
      }
    });
  };

  const recalculateTieredPrices = async () => {
    // Recalculate prices for products with tiered pricing
    const updatedItems = await Promise.all(
      cart.items.map(async (item) => {
        if (!item.has_tiered_pricing) return item;

        try {
          const tiers = await fetchProductPriceTiers(item.id);
          if (tiers.length === 0) return item;

          const result = calculateApplicablePrice(
            item.quantity,
            tiers,
            item.price,
            item.discounted_price
          );

          return {
            ...item,
            applied_tier_price: result.unitPrice,
          };
        } catch (error) {
          console.error('Error recalculating tiered price:', error);
          return item;
        }
      })
    );

    setCart(prev => ({
      ...prev,
      items: updatedItems,
    }));
  };

  // Recalculate tiered prices whenever quantities change
  useEffect(() => {
    const hasTieredProducts = cart.items.some(item => item.has_tiered_pricing);
    if (hasTieredProducts) {
      recalculateTieredPrices();
    }
  }, [cart.items.map(item => `${item.id}-${item.quantity}`).join(',')]);

  const addDistribution = async (
    product: Product,
    totalQuantity: number,
    items: Array<{ color?: string; size?: string; quantity: number }>
  ): Promise<boolean> => {
    try {
      const tiers = await fetchProductPriceTiers(product.id);
      const basePrice = product.price || 0;
      const discountedPrice = product.discounted_price;

      const distribution = await createDistribution(
        {
          product_id: product.id,
          total_quantity: totalQuantity,
          items,
        },
        tiers,
        basePrice,
        discountedPrice
      );

      if (!distribution) {
        toast.error('Erro ao criar distribuição');
        return false;
      }

      await loadDistributions();
      toast.success('Distribuição adicionada ao carrinho');
      return true;
    } catch (error) {
      console.error('Error adding distribution:', error);
      toast.error('Erro ao adicionar distribuição');
      return false;
    }
  };

  const removeDistribution = async (distributionId: string): Promise<boolean> => {
    try {
      const success = await deleteDistribution(distributionId);
      if (success) {
        await loadDistributions();
        toast.success('Distribuição removida do carrinho');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error removing distribution:', error);
      toast.error('Erro ao remover distribuição');
      return false;
    }
  };

  const updateDistributionItems = async (
    distributionId: string,
    items: Array<{ color?: string; size?: string; quantity: number }>
  ): Promise<boolean> => {
    try {
      const dist = cart.distributions.find(d => d.distribution.id === distributionId);
      if (!dist) return false;

      const tiers = await fetchProductPriceTiers(dist.product.id);
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

      const success = await updateDistribution(
        distributionId,
        {
          total_quantity: totalQuantity,
          items,
        },
        tiers,
        dist.product.price || 0,
        dist.product.discounted_price
      );

      if (success) {
        await loadDistributions();
        toast.success('Distribuição atualizada');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating distribution:', error);
      toast.error('Erro ao atualizar distribuição');
      return false;
    }
  };

  const loadDistributions = async () => {
    try {
      const distributions = await fetchUserDistributions();

      const cartDistributions: CartDistribution[] = await Promise.all(
        distributions.map(async (dist) => {
          let product = productsCache.get(dist.product_id);

          if (!product) {
            const { data } = await supabase
              .from('products')
              .select('*, product_images(*), price_tiers(*)')
              .eq('id', dist.product_id)
              .single();

            if (data) {
              product = data;
              setProductsCache(prev => new Map(prev).set(dist.product_id, data));
            }
          }

          return {
            distribution: dist,
            product: product!,
            items: dist.items || [],
          };
        })
      );

      setCart(prev => ({
        ...prev,
        distributions: cartDistributions.filter(d => d.product),
      }));
    } catch (error) {
      // Don't log error for missing tables - this is expected before migrations
      if (error && typeof error === 'object' && 'code' in error && error.code === '42P01') {
        // Silently handle missing table - distributions will just be empty
        setCart(prev => ({
          ...prev,
          distributions: [],
        }));
      } else {
        console.error('Error loading distributions:', error);
      }
    }
  };

  const getDistributions = (): CartDistribution[] => {
    return cart.distributions;
  };

  useEffect(() => {
    loadDistributions();
  }, []);

  const value = {
    cart,
    addToCart,
    removeFromCart,
    removeCartVariant,
    updateQuantity,
    updateVariantQuantity,
    clearCart,
    isInCart,
    hasVariant,
    getItemQuantity,
    getVariantQuantity,
    updateItemNotes,
    updateVariantNotes,
    updateVariantOptions,
    recalculateTieredPrices,
    addDistribution,
    removeDistribution,
    updateDistributionItems,
    loadDistributions,
    getDistributions,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart deve ser usado dentro de um CartProvider');
  }
  return context;
};