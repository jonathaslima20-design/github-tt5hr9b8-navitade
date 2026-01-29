import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import {
  Share2,
  ArrowLeft,
  Loader,
  Package,
  ShoppingCart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, getColorValue } from '@/lib/utils';
import { loadTrackingSettings, injectMetaPixel, injectGoogleAnalytics, trackView } from '@/lib/tracking';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';
import { useTranslation, getPageTitle, formatCurrencyI18n, type SupportedLanguage, type SupportedCurrency } from '@/lib/i18n';
import { updateMetaTags, updateFavicon, getProductMetaTags, resetMetaTags } from '@/utils/metaTags';
import ImageGallery from '@/components/details/ImageGallery';
import ItemDescription from '@/components/details/ItemDescription';
import ContactSidebar from '@/components/details/ContactSidebar';
import TieredPricingTable from '@/components/details/TieredPricingTable';
import TieredPricingSkeleton from '@/components/details/TieredPricingSkeleton';
import { useTieredPricing } from '@/hooks/useTieredPricing';
import { useCart } from '@/contexts/CartContext';
import ProductVariantModal from '@/components/product/ProductVariantModal';

export default function ProductDetailsPage() {
  const { slug, productId } = useParams();
  const [product, setProduct] = useState<any | null>(null);
  const [corretor, setCorretor] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareSupported, setShareSupported] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const { theme } = useTheme();
  const [language, setLanguage] = useState<SupportedLanguage>('pt-BR');
  const [currency, setCurrency] = useState<SupportedCurrency>('BRL');
  const { t } = useTranslation(language);
  const { addToCart, getItemQuantity } = useCart();

  const { tiers: priceTiers, loading: loadingTiers } = useTieredPricing(
    product?.id,
    product?.price || 0,
    product?.discounted_price,
    product?.has_tiered_pricing
  );

  useEffect(() => {
    setShareSupported(!!navigator.share && window.isSecureContext);

    const fetchProductDetails = async () => {
      try {
        if (!productId) {
          setError("ID do produto não encontrado");
          return;
        }

        // Fetch product details with images ordered by is_featured (featured first)
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select(`
            *,
            product_images (
              id,
              url,
              is_featured,
              media_type,
              display_order
            )
          `)
          .eq('id', productId)
          .order('is_featured', { referencedTable: 'product_images', ascending: false })
          .order('display_order', { referencedTable: 'product_images', ascending: true })
          .single();

        if (productError) throw productError;
        if (!productData) {
          setError("Produto não encontrado");
          return;
        }

        // Debug: Log the raw product data from database
        console.log('🔍 RAW PRODUCT DATA FROM DATABASE:', {
          id: productData.id,
          title: productData.title,
          colors: productData.colors,
          sizes: productData.sizes,
          colorsType: typeof productData.colors,
          sizesType: typeof productData.sizes,
          allKeys: Object.keys(productData)
        });
        setProduct(productData);

        // Fetch corretor details
        const { data: corretorData, error: corretorError } = await supabase
          .from('users')
          .select('*')
          .eq('id', productData.user_id)
          .single();

        if (corretorError) throw corretorError;
        setCorretor(corretorData);

        // Update meta tags for social media previews
        const currentLanguage = corretorData.language || 'pt-BR';
        const metaConfig = getProductMetaTags(productData, corretorData, currentLanguage);
        updateMetaTags(metaConfig);
        
        // Update favicon to product image or user's avatar
        const faviconUrl = productData.featured_image_url || corretorData.avatar_url || 'https://ikvwygqmlqhsyqmpgaoz.supabase.co/storage/v1/object/public/public/logos/flat-icon-vitrine.png.png';
        updateFavicon(faviconUrl);
        
        // Set language and currency from corretor settings
        setLanguage(currentLanguage);
        setCurrency(corretorData.currency || 'BRL');

        // Apply corretor's theme settings
        if (corretorData) {
          // Set theme based on broker's preference
          if (corretorData.theme) {
            document.documentElement.className = corretorData.theme;
          }

          // Load tracking settings
          const trackingSettings = await loadTrackingSettings(corretorData.id);
          
          if (trackingSettings?.meta_pixel_id) {
            injectMetaPixel(trackingSettings.meta_pixel_id);
          }
          
          if (trackingSettings?.ga_measurement_id) {
            injectGoogleAnalytics(trackingSettings.ga_measurement_id);
          }
        }

        // Track product view - this is crucial for the stats
        console.log('Tracking view for product:', productId);
        const viewTracked = await trackView(productId, 'product');
        if (!viewTracked) {
          console.error('Failed to track product view');
        }

      } catch (err) {
        console.error('Error fetching product details:', err);
        setError("Erro ao carregar os dados do produto");
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();

    // Cleanup function
    return () => {
      try {
        // Reset meta tags to default when leaving the product details page
        resetMetaTags();
        // Clean up theme classes when leaving the product details page
        document.documentElement.classList.remove('light', 'dark');
      } catch (e) {
        console.error('Error cleaning up styles:', e);
      }
    };
  }, [productId]);

  const handleShareClick = async () => {
    const shareUrl = window.location.href;
    const shareTitle = product?.title || 'Produto';
    const shareText = `Confira este produto: ${product?.title}`;

    try {
      if (shareSupported) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        toast.success('Compartilhado com sucesso!');
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success(t('messages.link_copied'));
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast.success(t('messages.link_copied'));
        } catch (err) {
          toast.error(t('messages.share_failed'));
        }
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'vendido':
        return <Badge variant="destructive" className="bg-destructive/90 backdrop-blur-sm">{t('status.sold')}</Badge>;
      case 'reservado':
        return <Badge variant="destructive" className="bg-destructive/90 backdrop-blur-sm">{t('status.reserved')}</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !product || !corretor) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-lg text-muted-foreground">
          {error || "Erro ao carregar os dados do produto"}
        </p>
        <Button asChild>
         <Link to={slug ? `/${slug}` : "/"}>{t('header.back_to_storefront')}</Link>
        </Button>
      </div>
    );
  }

  // Create array of images, ensuring no duplicates
  const galleryMedia = [];

  // Add all images from product_images table
  if (product.product_images?.length) {
    product.product_images.forEach((img: any) => {
      galleryMedia.push({
        id: img.id,
        url: img.url,
        is_featured: img.is_featured, // <--- Alterado de 'false' para 'img.is_featured'
        media_type: img.media_type || 'image'
      });
    });
  }

  // Fallback to default image if no images at all
  if (galleryMedia.length === 0) {
    galleryMedia.push({
      id: 'default',
      url: "https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg",
      is_featured: true,
      media_type: 'image' as const
    });
  }

  // Determinar preços e desconto
  const hasDiscount = product.discounted_price && product.discounted_price < product.price;

  // Check if we should use tiered pricing minimum price
  const minimumTieredPrice = priceTiers.length > 0 && product.has_tiered_pricing
    ? Math.min(...priceTiers.map(tier => tier.discounted_unit_price || tier.unit_price))
    : null;

  const isTieredPricing = product.has_tiered_pricing && minimumTieredPrice && minimumTieredPrice > 0;
  const displayPrice = isTieredPricing ? minimumTieredPrice : (hasDiscount ? product.discounted_price : product.price);
  const originalPrice = hasDiscount ? product.price : null;
  const discountPercentage = hasDiscount
    ? Math.round(((product.price - product.discounted_price) / product.price) * 100)
    : null;

  const isAvailable = product.status === 'disponivel';
  const hasPrice = (product.price && product.price > 0) || (product.has_tiered_pricing && priceTiers.length > 0);

  // Check if product has color or size options
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

  const handleAddToCart = () => {
    if (!isAvailable || !hasPrice) return;

    // If product has options (colors/sizes) OR tiered pricing, show variant modal
    if (hasOptions || product.has_tiered_pricing) {
      setShowVariantModal(true);
      return;
    }

    // For simple products without options or tiered pricing, add directly to cart
    addToCart(product);
  };

  return (
    <div className="flex-1">
      {/* Back button */}
      <div className="container mx-auto px-4 py-4">
        <Button
          variant="ghost"
          asChild
          className="pl-0 hover:pl-1 transition-all"
          onClick={() => console.log('🔙 Back button clicked - returning to storefront')}
        >
          <Link to={`/${slug}`} state={{ from: 'product-detail' }} className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('header.back_to_storefront')}
          </Link>
        </Button>
      </div>

      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-start gap-8">
            <motion.div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex gap-2 mb-3">
                    {product.category && product.category.length > 0 && (
                      <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm border-primary/20">
                        {product.category[0]}
                      </Badge>
                    )}
                    {hasDiscount && discountPercentage && (
                      <Badge className="bg-green-600 hover:bg-green-700 text-white border-transparent">
                        -{discountPercentage}% OFF
                      </Badge>
                    )}
                    {product.status !== 'disponivel' && getStatusBadge(product.status)}
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold">{product.title}</h1>
                </div>

                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleShareClick}
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Price information */}
              <div className="mt-6 mb-8">
                {loadingTiers && product.has_tiered_pricing ? (
                  <div className="text-lg font-bold text-muted-foreground animate-pulse">
                    Carregando preços...
                  </div>
                ) : isTieredPricing ? (
                  <div className="space-y-2">
                    {hasDiscount && originalPrice && originalPrice > 0 && (
                      <div className="text-lg text-muted-foreground line-through">
                        {formatCurrencyI18n(originalPrice, currency, language)}
                      </div>
                    )}
                    <div className="text-3xl font-bold text-primary">
                      {t('product.starting_from')} {formatCurrencyI18n(minimumTieredPrice!, currency, language)}
                    </div>
                    {product.short_description && (
                      <div className="text-sm text-green-600 font-medium">
                        {product.short_description}
                      </div>
                    )}
                  </div>
                ) : hasDiscount ? (
                  <div className="space-y-2">
                    {/* Original price with strikethrough */}
                    <div className="text-lg text-muted-foreground line-through">
                      {product.is_starting_price ? t('product.starting_from') + ' ' : ''}
                      {formatCurrencyI18n(originalPrice!, currency, language)}
                    </div>
                    {/* Discounted price */}
                    <div className="text-3xl font-bold text-primary">
                      {product.is_starting_price ? t('product.starting_from') + ' ' : ''}
                      {formatCurrencyI18n(displayPrice!, currency, language)}
                    </div>
                    {/* Promotional message instead of savings */}
                    {product.short_description && (
                      <div className="text-sm text-green-600 font-medium">
                        {product.short_description}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-3xl font-bold text-primary">
                      {product.is_starting_price ? t('product.starting_from') + ' ' : ''}
                      {formatCurrencyI18n(displayPrice!, currency, language)}
                    </div>
                    {/* Promotional message for non-discounted products */}
                    {product.short_description && (
                      <div className="text-sm text-green-600 font-medium">
                        {product.short_description}
                      </div>
                    )}
                  </div>
                )}

                {/* Featured Offer */}
                {product.featured_offer_price && product.featured_offer_installment && (
                  <div className="mt-4 p-4 bg-primary/10 rounded-lg">
                    <h3 className="text-lg font-semibold text-primary mb-2">
                      {t('product.special_offer')}
                    </h3>
                    <div className="space-y-2">
                      <p className="text-lg">
                        {t('product.down_payment')} {formatCurrencyI18n(product.featured_offer_price, currency, language)}
                      </p>
                      <p className="text-lg">
                        {t('product.installments')} {formatCurrencyI18n(product.featured_offer_installment, currency, language)}
                      </p>
                      {product.featured_offer_description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {product.featured_offer_description}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Photo Gallery */}
              <ImageGallery
                media={galleryMedia}
                title={product.title}
              />

              {/* Tiered Pricing Table - Moved right after gallery */}
              {product.has_tiered_pricing && (
                <div className="mt-8">
                  {loadingTiers ? (
                    <TieredPricingSkeleton />
                  ) : priceTiers.length > 0 && (
                    <TieredPricingTable
                      tiers={priceTiers}
                      basePrice={product.price || 0}
                      baseDiscountedPrice={product.discounted_price}
                      currency={currency}
                      language={language}
                    />
                  )}
                </div>
              )}

              {/* Product Variants Display */}
              {hasOptions && (
                <div className="mt-8 space-y-6">
                  {/* Available Colors */}
                  {hasColors && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold">Cores Disponíveis</h3>
                      <div className="flex flex-wrap gap-3">
                        {product.colors.map((color: string) => {
                          const colorValue = getColorValue(color);
                          const isLightColor = ['branco', 'amarelo', 'bege', 'off-white', 'creme'].includes(color.toLowerCase());

                          return (
                            <div
                              key={color}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-background"
                            >
                              <div
                                className={`w-4 h-4 rounded-full border ${isLightColor ? 'border-gray-400' : 'border-gray-300'} shadow-sm`}
                                style={{ backgroundColor: colorValue }}
                              />
                              <span className="text-sm capitalize">{color}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Available Sizes */}
                  {hasSizes && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold">Tamanhos Disponíveis</h3>

                      {(() => {
                        // Separate apparel sizes from shoe sizes
                        const apparelSizes: string[] = [];
                        const shoeSizes: string[] = [];

                        product.sizes.forEach((size: string) => {
                          const numericSize = parseInt(size);
                          if (!isNaN(numericSize) && numericSize >= 17 && numericSize <= 43) {
                            shoeSizes.push(size);
                          } else {
                            apparelSizes.push(size);
                          }
                        });

                        // Sort sizes appropriately
                        const sortedApparelSizes = apparelSizes.sort((a, b) => {
                          const sizeOrder = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'];
                          const indexA = sizeOrder.indexOf(a);
                          const indexB = sizeOrder.indexOf(b);
                          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                          if (indexA !== -1) return -1;
                          if (indexB !== -1) return 1;
                          return a.localeCompare(b);
                        });

                        const sortedShoeSizes = shoeSizes.sort((a, b) => parseInt(a) - parseInt(b));

                        return (
                          <div className="space-y-4">
                            {/* Apparel Sizes */}
                            {sortedApparelSizes.length > 0 && (
                              <div className="flex flex-wrap gap-3">
                                  {sortedApparelSizes.map((size: string) => (
                                    <div
                                      key={size}
                                      className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-primary/20 bg-background shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary/40"
                                    >
                                      <span className="text-sm font-semibold text-foreground">
                                        {size}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                            )}

                            {/* Shoe Sizes */}
                            {sortedShoeSizes.length > 0 && (
                              <div className="flex flex-wrap gap-3">
                                  {sortedShoeSizes.map((size: string) => (
                                    <div
                                      key={size}
                                      className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-primary/20 bg-background shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary/40"
                                    >
                                      <span className="text-sm font-semibold text-foreground">
                                        {size}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                </div>
              )}


              {/* External Checkout Button - Always show if configured */}
              {isAvailable && product.external_checkout_url && (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
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


              {/* Send Button */}
              {isAvailable && hasPrice && (
                <div className="mt-8">
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handleAddToCart}
                  >
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    {totalInCart > 0 ? `No Carrinho (${totalInCart})` : 'Adicionar ao carrinho'}
                  </Button>
                </div>
              )}

              {/* Description */}
              <div className="mt-8">
                <ItemDescription description={product.description} isRichText={true} />
              </div>
            </motion.div>
            
            {/* Seller Information Sidebar */}
            <motion.div 
              className="w-full md:w-80 lg:w-96"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <ContactSidebar
                corretor={corretor}
                itemId={product.id}
                itemTitle={product.title}
                itemType="produto"
                createdAt={product.created_at}
                itemImageUrl={product.featured_image_url}
                language={language}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Variant Selection Modal */}
      <ProductVariantModal
        open={showVariantModal}
        onOpenChange={setShowVariantModal}
        product={product}
        currency={currency}
        language={language}
      />
    </div>
  );
}
