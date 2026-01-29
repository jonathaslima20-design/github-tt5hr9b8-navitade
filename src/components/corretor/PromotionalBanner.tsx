import type { User } from '@/types';

interface PromotionalBannerProps {
  corretor: User;
}

export default function PromotionalBanner({ corretor }: PromotionalBannerProps) {
  if (!corretor.promotional_banner_url_desktop && !corretor.promotional_banner_url_mobile) {
    return null;
  }

  return (
    <div className="container mx-auto px-5 mb-8">
      <div className="w-full overflow-hidden rounded-lg">
        <picture>
          {/* Mobile banner */}
          {corretor.promotional_banner_url_mobile && (
            <source
              media="(max-width: 767px)"
              srcSet={corretor.promotional_banner_url_mobile}
            />
          )}
          {/* Desktop banner */}
          <img 
            src={corretor.promotional_banner_url_desktop || corretor.promotional_banner_url_mobile || ''} 
            alt="Banner promocional"
            className="w-full h-auto object-contain"
          />
        </picture>
      </div>
    </div>
  );
}