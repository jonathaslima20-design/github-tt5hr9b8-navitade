/**
 * Utility functions for managing dynamic meta tags for social media previews
 */
import { getPageTitle, type SupportedLanguage } from '@/lib/i18n';

export interface MetaTagsConfig {
  title: string;
  description: string;
  image: string;
  url: string;
  type?: string;
}

/**
 * Updates meta tags dynamically for social media previews
 */
export function updateMetaTags(config: MetaTagsConfig) {
  console.log('🏷️ UPDATING META TAGS:', {
    title: config.title,
    description: config.description.substring(0, 50) + '...',
    image: config.image,
    url: config.url,
    type: config.type
  });
  
  // Update page title
  document.title = config.title;
  
  // Update title element directly
  const titleElement = document.getElementById('dynamic-title');
  if (titleElement) {
    titleElement.textContent = config.title;
    console.log('✅ Updated title element:', config.title);
  }

  // Update meta tags using IDs for better targeting
  updateMetaTagById('meta-description', config.description);
  updateMetaTagById('meta-og-title', config.title);
  updateMetaTagById('meta-og-description', config.description);
  updateMetaTagById('meta-og-image', config.image);
  updateMetaTagById('meta-og-url', config.url);
  updateMetaTag('og:type', config.type || 'website', 'property');
  
  // Twitter Card tags for better compatibility
  updateMetaTagById('meta-twitter-title', config.title);
  updateMetaTagById('meta-twitter-description', config.description);
  updateMetaTagById('meta-twitter-image', config.image);
  
  // Force additional meta tag updates for better compatibility
  updateMetaTag('title', config.title, 'name');
  updateMetaTag('description', config.description, 'name');
  
  // Add Open Graph image dimensions for better preview
  updateMetaTag('og:image:width', '1200', 'property');
  updateMetaTag('og:image:height', '630', 'property');
  updateMetaTag('og:image:type', 'image/png', 'property');
  
  console.log('✅ META TAGS UPDATED SUCCESSFULLY');
}

/**
 * Helper function to update or create a meta tag
 */
function updateMetaTag(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  let element = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
  
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  
  element.setAttribute('content', content);
}

/**
 * Helper function to update meta tag by ID
 */
function updateMetaTagById(id: string, content: string) {
  const element = document.getElementById(id) as HTMLMetaElement;
  if (element) {
    element.setAttribute('content', content);
    console.log(`Updated meta tag ${id}:`, content);
  } else {
    console.warn(`Meta tag with ID ${id} not found`);
  }
}
/**
 * Updates favicon dynamically
 */
export function updateFavicon(iconUrl: string) {
  // Remove existing favicon links
  const existingIcons = document.querySelectorAll('link[rel*="icon"]');
  existingIcons.forEach(icon => icon.remove());

  // Add new favicon
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = iconUrl;
  document.head.appendChild(link);

  // Add apple touch icon
  const appleLink = document.createElement('link');
  appleLink.rel = 'apple-touch-icon';
  appleLink.href = iconUrl;
  document.head.appendChild(appleLink);
}

/**
 * Resets meta tags to default VitrineTurbo values
 */
export function resetMetaTags() {
  const defaultConfig: MetaTagsConfig = {
    title: 'VitrineTurbo - Sua Vitrine Digital',
    description: 'VitrineTurbo - Sua Vitrine Digital',
    image: 'https://ikvwygqmlqhsyqmpgaoz.supabase.co/storage/v1/object/public/public/logos/flat-icon-vitrine.png.png',
    url: window.location.origin,
    type: 'website'
  };

  updateMetaTags(defaultConfig);
  
  // Reset favicon to default
  updateFavicon('https://ikvwygqmlqhsyqmpgaoz.supabase.co/storage/v1/object/public/public/logos/flat-icon-vitrine.png.png');
}

/**
 * Generates meta tags config for corretor page
 */
export function getCorretorMetaTags(corretor: any, language: SupportedLanguage = 'pt-BR'): MetaTagsConfig {
  // Use getPageTitle for consistency with browser title bar
  const title = getPageTitle(language, corretor.name);
  const description = corretor.bio || `Confira os produtos de ${corretor.name} na VitrineTurbo`;
  // CRITICAL: Always prioritize the corretor's avatar/logo for storefront preview
  // This ensures the user's brand appears in WhatsApp/social media previews
  const image = corretor.avatar_url || 
                corretor.cover_url_desktop || 
                corretor.cover_url_mobile ||
                'https://ikvwygqmlqhsyqmpgaoz.supabase.co/storage/v1/object/public/public/logos/flat-icon-vitrine.png.png';
  const url = `${window.location.origin}/${corretor.slug}`;

  console.log('🖼️ CORRETOR META TAGS CONFIG:', {
    title,
    description: description.substring(0, 50) + '...',
    image,
    url,
    hasAvatar: !!corretor.avatar_url,
    hasCoverDesktop: !!corretor.cover_url_desktop,
    hasCoverMobile: !!corretor.cover_url_mobile
  });

  return {
    title,
    description,
    image,
    url,
    type: 'profile'
  };
}

/**
 * Generates meta tags config for product page
 */
export function getProductMetaTags(product: any, corretor: any, language: SupportedLanguage = 'pt-BR'): MetaTagsConfig {
  // Use getPageTitle for consistency with browser title bar
  const title = getPageTitle(language, corretor.name, product.title);
  
  // Create description from product info
  let description = product.short_description || '';
  if (!description && product.description) {
    // Extract first 160 characters from description, removing HTML tags
    description = product.description.replace(/<[^>]*>/g, '').substring(0, 160);
  }
  if (!description) {
    description = `${product.title} - Confira este produto na vitrine de ${corretor.name}`;
  }
  
  // Add price information to description if available
  if (product.price) {
    const price = product.discounted_price || product.price;
    const priceText = product.is_starting_price ? `A partir de R$ ${price.toFixed(2)}` : `R$ ${price.toFixed(2)}`;
    description = `${description} - ${priceText}`;
  }
  
  // For products, prioritize the product image, but fallback to corretor's avatar (logo)
  const image = product.featured_image_url || corretor.avatar_url || 'https://ikvwygqmlqhsyqmpgaoz.supabase.co/storage/v1/object/public/public/logos/flat-icon-vitrine.png.png';
  const url = `${window.location.origin}/${corretor.slug}/produtos/${product.id}`;

  return {
    title,
    description,
    image,
    url,
    type: 'product'
  };
}