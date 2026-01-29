import type { CartItem, CartDistribution } from '@/types';
import { formatCurrencyI18n, generateWhatsAppMessage, type SupportedLanguage, type SupportedCurrency } from '@/lib/i18n';

/**
 * Generate a formatted WhatsApp message for a cart order
 */
export function generateCartOrderMessage(
  cartItems: CartItem[],
  total: number,
  sellerName: string,
  corretorSlug: string,
  currency: SupportedCurrency = 'BRL',
  language: SupportedLanguage = 'pt-BR',
  distributions: CartDistribution[] = []
): string {
  if (cartItems.length === 0 && distributions.length === 0) return '';

  // Simplified greeting for cart orders
  const greeting = `Olá ${sellerName}, gostaria de realizar um pedido com os itens abaixo.`;
  
  let orderMessage = `${greeting}\n\n`;
  
  // Order header
  const orderTitles = {
    'pt-BR': 'PEDIDO DE COMPRA',
    'en-US': 'PURCHASE ORDER', 
    'es-ES': 'ORDEN DE COMPRA',
  };
  
  orderMessage += `*${orderTitles[language] || orderTitles['pt-BR']}*\n`;
  orderMessage += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  let itemNumber = 1;

  // Add distribution groups first
  distributions.forEach((dist) => {
    const price = dist.distribution.applied_tier_price;
    const totalPrice = price * dist.distribution.total_quantity;

    orderMessage += `${itemNumber}. *${dist.product.title.trim()}*\n`;
    orderMessage += `   📦 Distribuição de Variações\n`;

    // Add product link
    if (corretorSlug) {
      try {
        const isProduction = typeof window !== 'undefined' &&
          (window.location.hostname === 'vitrineturbo.com' ||
           window.location.hostname.includes('netlify.app') ||
           window.location.hostname.includes('vercel.app'));
        const baseUrl = isProduction ? 'https://vitrineturbo.com' :
          (typeof window !== 'undefined' ? window.location.origin : 'https://vitrineturbo.com');
        const productUrl = `${baseUrl}/${corretorSlug}/produtos/${dist.product.id}`;
        orderMessage += `${productUrl}\n`;
      } catch {
        orderMessage += `Ver produto\n`;
      }
    }

    const quantityLabels = {
      'pt-BR': 'Quantidade Total',
      'en-US': 'Total Quantity',
      'es-ES': 'Cantidad Total',
    };

    const unitPriceLabels = {
      'pt-BR': 'Preço unitário',
      'en-US': 'Unit price',
      'es-ES': 'Precio unitario',
    };

    const subtotalLabels = {
      'pt-BR': 'Subtotal',
      'en-US': 'Subtotal',
      'es-ES': 'Subtotal',
    };

    const distributionLabels = {
      'pt-BR': 'Distribuição',
      'en-US': 'Distribution',
      'es-ES': 'Distribución',
    };

    orderMessage += `   ${quantityLabels[language] || quantityLabels['pt-BR']}: ${dist.distribution.total_quantity}\n`;
    orderMessage += `   ${unitPriceLabels[language] || unitPriceLabels['pt-BR']}: ${formatCurrencyI18n(price, currency, language)}\n`;
    orderMessage += `   ${subtotalLabels[language] || subtotalLabels['pt-BR']}: ${formatCurrencyI18n(totalPrice, currency, language)}\n`;

    if (dist.items.length > 0) {
      orderMessage += `\n   ${distributionLabels[language] || distributionLabels['pt-BR']}:\n`;
      dist.items.forEach((item) => {
        const variantInfo = [item.color, item.size].filter(Boolean).join(' • ');
        orderMessage += `   • ${item.quantity}x ${variantInfo || 'Padrão'}\n`;
      });
    }

    orderMessage += `\n`;
    itemNumber++;
  });

  // Add regular cart items
  cartItems.forEach((item) => {
    const price = item.applied_tier_price || item.discounted_price || item.price;
    const itemTotal = price * item.quantity;

    orderMessage += `${itemNumber}. *${item.title.trim()}*\n`;

    // Add variant information if available - show color and size separately for clarity
    if (item.selectedColor || item.selectedSize) {
      if (item.selectedColor) {
        const colorLabels = {
          'pt-BR': 'Cor',
          'en-US': 'Color',
          'es-ES': 'Color',
        };
        orderMessage += `   ${colorLabels[language] || colorLabels['pt-BR']}: ${item.selectedColor}\n`;
      }
      if (item.selectedSize) {
        const sizeLabels = {
          'pt-BR': 'Tamanho',
          'en-US': 'Size',
          'es-ES': 'Tamaño',
        };
        orderMessage += `   ${sizeLabels[language] || sizeLabels['pt-BR']}: ${item.selectedSize}\n`;
      }
    }

    // Add product link for easy access to full details
    if (corretorSlug) {
      try {
        // Use production domain in production, otherwise use current origin
        const isProduction = typeof window !== 'undefined' &&
          (window.location.hostname === 'vitrineturbo.com' ||
           window.location.hostname.includes('netlify.app') ||
           window.location.hostname.includes('vercel.app'));
        const baseUrl = isProduction ? 'https://vitrineturbo.com' :
          (typeof window !== 'undefined' ? window.location.origin : 'https://vitrineturbo.com');
        const productUrl = `${baseUrl}/${corretorSlug}/produtos/${item.id}`;
        orderMessage += `${productUrl}\n`;
      } catch {
        // Fallback if URL generation fails
        orderMessage += `Ver produto\n`;
      }
    }

    const quantityLabels = {
      'pt-BR': 'Quantidade',
      'en-US': 'Quantity',
      'es-ES': 'Cantidad',
    };

    const unitPriceLabels = {
      'pt-BR': 'Preço unitário',
      'en-US': 'Unit price',
      'es-ES': 'Precio unitario',
    };

    const subtotalLabels = {
      'pt-BR': 'Subtotal',
      'en-US': 'Subtotal',
      'es-ES': 'Subtotal',
    };

    orderMessage += `   ${quantityLabels[language] || quantityLabels['pt-BR']}: ${item.quantity}\n`;
    orderMessage += `   ${unitPriceLabels[language] || unitPriceLabels['pt-BR']}: ${formatCurrencyI18n(price, currency, language)}\n`;
    orderMessage += `   ${subtotalLabels[language] || subtotalLabels['pt-BR']}: ${formatCurrencyI18n(itemTotal, currency, language)}\n`;

    // Add notes if they exist
    if (item.notes && item.notes.trim()) {
      const notesLabels = {
        'pt-BR': 'Observação',
        'en-US': 'Notes',
        'es-ES': 'Observación',
      };
      orderMessage += `   ${notesLabels[language] || notesLabels['pt-BR']}: ${item.notes}\n`;
    }

    orderMessage += `\n`;
    itemNumber++;
  });

  // Order footer
  orderMessage += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  
  const totalLabels = {
    'pt-BR': 'TOTAL',
    'en-US': 'TOTAL',
    'es-ES': 'TOTAL',
  };
  
  orderMessage += `*${totalLabels[language] || totalLabels['pt-BR']}: ${formatCurrencyI18n(total, currency, language)}*\n\n`;
  
  const footerMessages = {
    'pt-BR': 'Aguardo retorno com informações sobre pagamento e entrega.',
    'en-US': 'I await your response with payment and delivery information.',
    'es-ES': 'Espero su respuesta con información de pago y entrega.',
  };
  
  orderMessage += footerMessages[language] || footerMessages['pt-BR'];

  return orderMessage;
}

/**
 * Calculate cart statistics
 */
export function calculateCartStats(cartItems: CartItem[]) {
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const total = cartItems.reduce((sum, item) => {
    const price = item.applied_tier_price || item.discounted_price || item.price;
    return sum + (price * item.quantity);
  }, 0);

  return { itemCount, total };
}

/**
 * Validate cart item before adding
 */
export function validateCartItem(item: CartItem): boolean {
  const hasValidPrice = (item.price && item.price > 0) || (item.has_tiered_pricing && item.applied_tier_price && item.applied_tier_price > 0);
  return !!(
    item.id &&
    item.title &&
    hasValidPrice &&
    item.quantity > 0
  );
}