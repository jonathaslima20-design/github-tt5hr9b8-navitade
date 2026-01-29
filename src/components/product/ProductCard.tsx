import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyI18n, useTranslation, type SupportedLanguage, type SupportedCurrency } from '@/lib/i18n';
import { useCart } from '@/contexts/CartContext';
import ProductVariantModal from './ProductVariantModal';
import type { Product } from '@/types';
import { useState, useEffect } from 'react';
import { fetchProductPriceTiers, getMinimumPriceFromTiers, getFirstTierPrices } from '@/lib/tieredPricingUtils';
import { supabase } from '@/lib/supabase';

interface ProductCardProps {
  product: Product;
  corretorSlug: string;
  currency?: SupportedCurrency;
  language?: SupportedLanguage;
  onNavigate?: () => void;
}

export function ProductCard({
  product,
  corretorSlug,
  currency = 'BRL',
  language = 'pt-BR',
  onNavigate
}: ProductCardProps) {
  const { t } = useTranslation(language);
  const { addToCart, isInCart, getItemQuantity } = useCart();
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [minimumTieredPrice, setMinimumTieredPrice] = useState<number | null>(null);
  const [firstTierPrices, setFirstTierPrices] = useState<any>(null);
  const [loadingTiers, setLoadingTiers] = useState(false);
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(product.featured_image_url || null);

  useEffect(() => {
    if (product.has_tiered_pricing) {
      setLoadingTiers(true);
      fetchProductPriceTiers(product.id)
        .then(tiers => {
          const minPrice = getMinimumPriceFromTiers(tiers);
          const firstTierData = getFirstTierPrices(tiers);
          setMinimumTieredPrice(minPrice);
          setFirstTierPrices(firstTierData);
        })
        .catch(err => console.error('Error loading price tiers:', err))
        .finally(() => setLoadingTiers(false));
    }
  }, [product.id, product.has_tiered_pricing]);

  useEffect(() => {
    const ensureFeaturedImage = async () => {
      if (!displayImageUrl) {
        const { data, error } = await supabase
          .from('product_images')
          .select('url')
          .eq('product_id', product.id)
          .order('display_order', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (data && !error) {
          setDisplayImageUrl(data.url);
        }
      }
    };

    ensureFeaturedImage();
  }, [product.id, displayImageUrl]);

  // Calculate discount information
  const effectiveMinPrice = product.has_tiered_pricing && minimumTieredPrice && minimumTieredPrice > 0 ? minimumTieredPrice : null;
  const hasDiscount = product.discounted_price && product.discounted_price < product.price;
  const baseDisplayPrice = hasDiscount ? product.discounted_price : product.price;
  const displayPrice = effectiveMinPrice !== null ? effectiveMinPrice : baseDisplayPrice;
  const originalPrice = hasDiscount ? product.price : null;
  const discountPercentage = hasDiscount && product.price > 0
    ? Math.round(((product.price - product.discounted_price!) / product.price) * 100)
    : null;
  const isTieredPricing = product.has_tiered_pricing && effectiveMinPrice !== null && effectiveMinPrice > 0;

  const isAvailable = product.status === 'disponivel';
  const hasPrice = (displayPrice && displayPrice > 0) || (product.has_tiered_pricing && minimumTieredPrice && minimumTieredPrice > 0);
  
  // More robust checking for colors and sizes with debug logging
  const hasColors = product.colors && 
                   Array.isArray(product.colors) && 
                   product.colors.length > 0 &&
                   product.colors.some(color => color && color.trim().length > 0);
                   
  const hasSizes = product.sizes && 
                  Array.isArray(product.sizes) && 
                  product.sizes.length > 0 &&
                  product.sizes.some(size => size && size.trim().length > 0);
                  
  const hasOptions = hasColors || hasSizes;
  
  const totalInCart = getItemQuantity(product.id);

  // Debug logging for troubleshooting
  if (process.env.NODE_ENV === 'development') {
    console.log('🛒 ProductCard - Product data:', {
      id: product.id,
      title: product.title,
      colors: product.colors,
      sizes: product.sizes,
      hasColors,
      hasSizes,
      hasOptions
    });
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If product has options (colors/sizes) OR tiered pricing, show variant modal
    if (isAvailable && hasPrice && (hasOptions || product.has_tiered_pricing)) {
      setShowVariantModal(true);
      return;
    }

    // For simple products without options or tiered pricing, add directly to cart
    if (isAvailable && hasPrice && !hasOptions && !product.has_tiered_pricing) {
      addToCart(product);
      return;
    }

    // Don't do anything for products without price or not available
    if (!hasPrice) {
      return;
    }

    if (!isAvailable) {
      return;
    }
  };

  const handleProductClick = (e: React.MouseEvent) => {
    const currentScrollPosition = window.scrollY || document.documentElement.scrollTop;
    console.log('📌 ProductCard clicked - saving scroll position:', currentScrollPosition);
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Link
        to={`/${corretorSlug}/produtos/${product.id}`}
        state={{ from: 'product-detail' }}
        onClick={handleProductClick}
        className="block h-full"
      >
        <div className="rounded-xl border bg-card text-card-foreground shadow overflow-hidden h-full flex flex-col hover:shadow-lg transition-all duration-300 cursor-pointer">
          {/* Image Container */}
          <div className="relative aspect-square overflow-hidden p-2 md:p-3">
            <div className="w-full h-full bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
              <img
                src={displayImageUrl || 'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg'}
                alt={product.title}
                className="w-full h-full object-cover"
                loading="lazy"
                style={{
                  backgroundColor: '#ffffff',
                  backgroundImage: 'none'
                }}
              />
            </div>
            
            {/* Badges - Top Right */}
            <div className="absolute top-3 right-3 md:top-5 md:right-5 flex flex-col gap-1.5">
              {(hasDiscount && discountPercentage || (isTieredPricing && firstTierPrices?.discountPercentage)) && (
                <Badge className="bg-green-600 hover:bg-green-700 text-white border-transparent text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1">
                  -{firstTierPrices?.discountPercentage || discountPercentage}%
                </Badge>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="p-2 md:p-4 flex-1 flex flex-col">
            <h3 className="font-semibold text-xs md:text-sm leading-tight mb-2 md:mb-3 line-clamp-2 min-h-[32px] md:h-[35px]">
              {product.title}
            </h3>
            
            <div className="mt-auto">
              {/* Price Display */}
              {loadingTiers && product.has_tiered_pricing ? (
                <div className="text-sm md:text-lg font-bold text-muted-foreground animate-pulse">
                  Carregando preços...
                </div>
              ) : isTieredPricing && firstTierPrices && firstTierPrices.hasPromotionalPricing ? (
                <div className="space-y-0.5 md:space-y-1">
                  <div className="text-[10px] md:text-xs text-muted-foreground line-through">
                    De {formatCurrencyI18n(firstTierPrices.unitPrice, currency, language)}
                  </div>
                  <div className="text-sm md:text-lg font-bold text-primary">
                    por {formatCurrencyI18n(firstTierPrices.discountedPrice, currency, language)}
                  </div>
                </div>
              ) : isTieredPricing ? (
                <div className="space-y-0.5 md:space-y-1">
                  {firstTierPrices && firstTierPrices.hasPromotionalPricing ? (
                    <div className="text-[10px] md:text-xs text-muted-foreground line-through">
                      De {formatCurrencyI18n(firstTierPrices.unitPrice, currency, language)}
                    </div>
                  ) : hasDiscount && originalPrice && originalPrice > 0 ? (
                    <div className="text-[10px] md:text-xs text-muted-foreground line-through">
                      {formatCurrencyI18n(originalPrice, currency, language)}
                    </div>
                  ) : null}
                  <div className="text-sm md:text-lg font-bold text-primary">
                    a partir de {formatCurrencyI18n(minimumTieredPrice!, currency, language)}
                  </div>
                </div>
              ) : hasDiscount && displayPrice && displayPrice > 0 ? (
                <div className="space-y-0.5 md:space-y-1">
                  <div className="text-[10px] md:text-xs text-muted-foreground line-through">
                    {formatCurrencyI18n(originalPrice!, currency, language)}
                  </div>
                  <div className="text-sm md:text-lg font-bold text-primary">
                    {product.is_starting_price ? t('product.starting_from') + ' ' : ''}
                    {formatCurrencyI18n(displayPrice!, currency, language)}
                  </div>
                </div>
              ) : displayPrice && displayPrice > 0 ? (
                <div className="text-sm md:text-lg font-bold text-primary">
                  {product.is_starting_price ? t('product.starting_from') + ' ' : ''}
                  {formatCurrencyI18n(displayPrice!, currency, language)}
                </div>
              ) : null}

              {/* Short Description */}
              {product.short_description && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-1 md:line-clamp-2">
                  {product.short_description}
                </p>
              )}


              {/* Add to Cart Button */}
              {isAvailable && hasPrice && (
                <div className="mt-2 md:mt-3 pt-1.5 md:pt-2 border-t">
                  <Button
                    size="sm"
                    className="w-full text-[10px] md:text-xs h-7 md:h-8"
                    onClick={handleAddToCart}
                  >
                    <ShoppingCart className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                    {totalInCart > 0 ? `No Carrinho (${totalInCart})` : 'Adicionar'}
                  </Button>
                </div>
              )}

              {/* External Checkout Button */}
              {isAvailable && product.external_checkout_url && (
                <div className="mt-2 md:mt-3 pt-1.5 md:pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-[10px] md:text-xs h-7 md:h-8"
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a 
                      href={product.external_checkout_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      Comprar
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
      
      {/* Variant Selection Modal */}
      <ProductVariantModal
        open={showVariantModal}
        onOpenChange={setShowVariantModal}
        product={product}
        currency={currency}
        language={language}
      />
    </motion.div>
  );
}