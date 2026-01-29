import { useState } from 'react';
import { Share2, Copy, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslation, type SupportedLanguage } from '@/lib/i18n';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ShareCategoryButtonProps {
  corretorSlug: string;
  categoryName: string;
  language?: SupportedLanguage;
  className?: string;
}

export default function ShareCategoryButton({ 
  corretorSlug, 
  categoryName, 
  language = 'pt-BR',
  className 
}: ShareCategoryButtonProps) {
  const { t } = useTranslation(language);
  const [shareSupported, setShareSupported] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useState(() => {
    setShareSupported(!!navigator.share && window.isSecureContext);
    setIsMobile(window.innerWidth <= 768);
    
    // Listen for window resize to update mobile detection
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });

  const generateCategoryUrl = () => {
    // Use production domain in production, otherwise use current origin
    const isProduction = window.location.hostname === 'vitrineturbo.com' || 
                        window.location.hostname.includes('netlify.app');
    const baseUrl = isProduction ? 'https://vitrineturbo.com' : window.location.origin;
    const categoryParam = encodeURIComponent(categoryName);
    return `${baseUrl}/${corretorSlug}?category=${categoryParam}`;
  };

  const handleShareClick = async () => {
    const shareUrl = generateCategoryUrl();
    const shareTitle = `${categoryName} - ${corretorSlug}`;
    const shareText = `Confira os produtos da categoria ${categoryName}`;

    console.log('Tentando compartilhar URL:', shareUrl);

    // Try Clipboard API first (preferred for desktop)
    try {
      console.log('Usando clipboard.writeText');
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t('messages.link_copied'));
      return;
    } catch (clipboardError: any) {
      console.log('Erro no clipboard:', clipboardError.message);
    }

    // Try Web Share API only on mobile devices if clipboard fails
    if (shareSupported && isMobile) {
      try {
        console.log('Usando navigator.share');
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        toast.success(t('messages.shared_successfully'));
        return;
      } catch (shareError: any) {
        console.log('Erro no navigator.share:', shareError.message);
        
        // If user cancelled the share dialog, don't continue with fallbacks
        if (shareError.name === 'AbortError') {
          console.log('Usuário cancelou o compartilhamento');
          return;
        }
        
        // For permission denied or other errors, continue to manual fallback
        console.log('Tentando fallback manual devido ao erro:', shareError.message);
      }
    }

    // Final fallback: manual copy methods
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
      // On mobile, show a simple alert with the URL
      alert(`Link da categoria: ${shareUrl}`);
      toast.success(t('messages.link_copied'));
    } else {
      // On desktop, try to select text in a temporary element
      try {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success(t('messages.link_copied'));
      } catch (fallbackError) {
        console.error('Erro no método alternativo:', fallbackError);
        toast.error(t('messages.share_failed'));
      }
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShareClick}
            className={className}
          >
            {shareSupported && isMobile ? (
              <Share2 className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{shareSupported && isMobile ? t('categories.share_category') : t('categories.copy_category_link')} {categoryName}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}