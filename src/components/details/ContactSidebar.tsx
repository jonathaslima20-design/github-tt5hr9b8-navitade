import { useState } from 'react';
import { Phone, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatPhone, generateWhatsAppUrl, getInitials, formatWhatsAppForDisplay } from '@/lib/utils';
import { toast } from 'sonner';
import type { User } from '@/types';
import { trackWhatsAppClick } from '@/lib/tracking';
import { useTranslation, generateWhatsAppMessage, type SupportedLanguage } from '@/lib/i18n';

interface ContactSidebarProps {
  corretor: User;
  itemId: string;
  itemTitle: string;
  itemType: 'imóvel' | 'veículo' | 'produto';
  createdAt: string;
  itemImageUrl?: string;
  language?: SupportedLanguage;
}

export default function ContactSidebar({ 
  corretor, 
  itemId, 
  itemTitle, 
  itemType, 
  createdAt,
  itemImageUrl,
  language = 'pt-BR'
}: ContactSidebarProps) {
  const { t } = useTranslation(language);
  
  const whatsappMessage = generateWhatsAppMessage(
    language,
    corretor.name,
    itemTitle,
    itemId
  ) + (itemImageUrl ? `\n\nImagem do produto: ${itemImageUrl}` : '');

  const countryCode = corretor.country_code || '55';
  const whatsappUrl = corretor.whatsapp ? generateWhatsAppUrl(corretor.whatsapp, whatsappMessage, countryCode) : '';

  console.log('ContactSidebar - corretor.whatsapp:', corretor.whatsapp);
  console.log('ContactSidebar - generated URL:', whatsappUrl);
  console.log('ContactSidebar - language:', language);
  console.log('ContactSidebar - whatsapp message:', whatsappMessage);

  const handleWhatsAppClick = async () => {
    // Track the WhatsApp click as a lead
    await trackWhatsAppClick(itemId, 'product', 'contact_sidebar');
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('messages.link_copied'));
    } catch (err) {
      toast.error(t('messages.share_failed'));
      console.error('Error copying to clipboard:', err);
    }
  };

  const getRoleLabel = () => {
    switch (itemType) {
      case 'imóvel':
        return language === 'en-US' ? 'Realtor' : language === 'es-ES' ? 'Corredor' : 'Corretor';
      case 'veículo':
        return t('contact.seller');
      case 'produto':
        return t('contact.seller');
      default:
        return t('contact.seller');
    }
  };

  const getIconComponent = () => {
    switch (itemType) {
      case 'imóvel':
        return <svg className="h-4 w-4 mr-2 text-primary" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
        </svg>;
      case 'veículo':
        return <svg className="h-4 w-4 mr-2 text-primary" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>;
      case 'produto':
        return <svg className="h-4 w-4 mr-2 text-primary" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 4V2C7 1.45 7.45 1 8 1h8c.55 0 1 .45 1 1v2h5v2h-2v13c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V6H2V4h5zM9 3v1h6V3H9zm1 5v9h1V8H10zm3 0v9h1V8h-1z"/>
        </svg>;
      default:
        return null;
    }
  };

  return (
    <div className="sticky top-4">
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">{t('contact.talk_now')}</h3>
        
        <div className="flex items-center mb-6">
          <Avatar className="h-12 w-12 mr-4">
            <AvatarImage src={corretor.avatar_url} alt={corretor.name} />
            <AvatarFallback>{getInitials(corretor.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{corretor.name}</p>
            <p className="text-sm text-muted-foreground">
              {getRoleLabel()}
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
          {corretor.phone && (
            <Button
              className="w-full"
              variant="outline"
              asChild
            >
              <a href={`tel:${corretor.phone}`}>
                <Phone className="mr-2 h-4 w-4" />
                {formatPhone(corretor.phone, countryCode)}
              </a>
            </Button>
          )}

          {corretor.whatsapp && whatsappUrl !== '#' && (
            <Button 
              className="w-full" 
              variant="outline"
              asChild
            >
              <a 
                href={whatsappUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={handleWhatsAppClick}
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Falar no WhatsApp
              </a>
            </Button>
          )}
        </div>
        
        <Separator className="my-6" />
        
        <div className="text-sm space-y-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full mt-3"
            onClick={() => copyToClipboard(window.location.href)}
          >
            <Copy className="mr-2 h-4 w-4" />
            {t('product.copy_link')}
          </Button>
        </div>
      </div>
    </div>
  );
}