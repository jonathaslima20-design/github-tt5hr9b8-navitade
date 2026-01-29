import { motion } from 'framer-motion';
import { Phone, MapPin, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, generateWhatsAppUrl, formatWhatsAppForDisplay } from '@/lib/utils';
import type { User } from '@/types';
import { trackWhatsAppClick, STOREFRONT_UUID } from '@/lib/tracking';
import { useTranslation, generateWhatsAppMessage, type SupportedLanguage } from '@/lib/i18n';
import { useCart } from '@/contexts/CartContext';
import { useState } from 'react';
import CartModal from './CartModal';
import type { SupportedCurrency } from '@/types';
import { useResponsiveAspectRatio } from '@/hooks/useResponsiveAspectRatio';

interface CorretorHeaderProps {
  corretor: User;
  language?: SupportedLanguage;
  currency?: SupportedCurrency;
}

export default function CorretorHeader({ corretor, language = 'pt-BR', currency = 'BRL' }: CorretorHeaderProps) {
  const { t } = useTranslation(language);
  const { cart } = useCart();
  const [showCart, setShowCart] = useState(false);

  const aspectRatio = useResponsiveAspectRatio({
    mobile: 960 / 860,
    desktop: 1530 / 465,
  });

  const aspectRatioClass = aspectRatio === 960 / 860 ? 'aspect-[960/860]' : 'aspect-[1530/465]';

  // Generate WhatsApp URL using the centralized function
  const whatsappMessage = generateWhatsAppMessage(language, corretor.name);
  const countryCode = corretor.country_code || '55';
  const whatsappUrl = corretor.whatsapp ? generateWhatsAppUrl(corretor.whatsapp, whatsappMessage, countryCode) : '';

  console.log('CorretorHeader - corretor.whatsapp:', corretor.whatsapp);
  console.log('CorretorHeader - generated URL:', whatsappUrl);
  console.log('CorretorHeader - language:', language);
  console.log('CorretorHeader - whatsapp message:', whatsappMessage);

  const handleWhatsAppClick = async () => {
    // Track the WhatsApp click as a lead for the general storefront
    await trackWhatsAppClick(STOREFRONT_UUID, 'product', 'header_social');
  };

  const getRoleLabel = () => {
    return t('contact.seller');
  };

  return (
    <div className="px-4 pt-4 pb-0">
      <div className="container mx-auto">
        <div className={`w-full overflow-hidden rounded-[52px] bg-muted ${aspectRatioClass} will-change-auto`}>
          <img
            key={`cover-${aspectRatio}`}
            src={aspectRatio === 960 / 860 ? (corretor.cover_url_mobile || "https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg") : (corretor.cover_url_desktop || "https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg")}
            alt={`Capa do perfil de ${corretor.name}`}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      
      <div className="container mx-auto px-5">
        <motion.div 
          className="relative -mt-20 mb-4 flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Avatar className="w-48 h-48 md:w-52 md:h-52 border-4 border-background bg-muted shadow-lg">
            <AvatarImage 
              src={corretor.avatar_url} 
              alt={corretor.name}
              className="object-cover"
            />
            <AvatarFallback className="text-4xl">{getInitials(corretor.name)}</AvatarFallback>
          </Avatar>
          
          <h1 className="mt-4 text-2xl md:text-3xl font-bold text-center">{corretor.name}</h1>
          
          {corretor.creci && (
            <div className="mt-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
              CRECI: {corretor.creci}
            </div>
          )}

          {corretor.bio && (
            <p className="mt-4 text-center text-muted-foreground max-w-2xl">
              {corretor.bio}
            </p>
          )}
          
          {/* Social buttons */}
          <div className="mt-6 flex items-center gap-4">
            {/* Cart Button - Only show if there are items */}
            <Button 
              size="icon" 
              variant="outline" 
              className="h-14 w-14 md:h-12 md:w-12 rounded-full relative"
              onClick={() => setShowCart(true)}
            >
              <ShoppingCart className="h-6 w-6 md:h-5 md:w-5" />
              {cart.itemCount > 0 && (
                <Badge 
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs bg-primary"
                >
                  {cart.itemCount}
                </Badge>
              )}
            </Button>

            {corretor.phone && (
              <Button 
                size="icon" 
                variant="outline" 
                className="h-14 w-14 md:h-12 md:w-12 rounded-full"
                asChild
              >
                <a href={`tel:${corretor.phone}`}>
                  <Phone className="h-6 w-6 md:h-5 md:w-5" />
                </a>
              </Button>
            )}
            
            {corretor.whatsapp && whatsappUrl !== '#' && (
              <Button 
                size="icon" 
                variant="outline"
                className="h-14 w-14 md:h-12 md:w-12 rounded-full"
                asChild
              >
                <a 
                  href={whatsappUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label={`Conversar no WhatsApp com ${corretor.name}`}
                  onClick={handleWhatsAppClick}
                >
                  <svg className="h-6 w-6 md:h-5 md:w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </a>
              </Button>
            )}
            
            {corretor.instagram && (
              <Button 
                size="icon" 
                variant="outline"
                className="h-14 w-14 md:h-12 md:w-12 rounded-full"
                asChild
              >
                <a 
                  href={`https://instagram.com/${corretor.instagram}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label={`Seguir ${corretor.name} no Instagram`}
                >
                  <svg className="h-6 w-6 md:h-5 md:w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
                  </svg>
                </a>
              </Button>
            )}

            {corretor.location_url && (
              <Button 
                size="icon" 
                variant="outline"
                className="h-14 w-14 md:h-12 md:w-12 rounded-full"
                asChild
              >
                <a 
                  href={corretor.location_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label={`Ver localização de ${corretor.name}`}
                >
                  <MapPin className="h-6 w-6 md:h-5 md:w-5" />
                </a>
              </Button>
            )}
          </div>
        </motion.div>
      </div>

      {/* Cart Modal */}
      <CartModal
        open={showCart}
        onOpenChange={setShowCart}
        corretor={corretor}
        currency={currency}
        language={language}
      />
    </div>
  );
}