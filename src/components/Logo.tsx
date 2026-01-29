import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export default function Logo({ className, size = 'md', showText = true }: LogoProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check if dark theme is active by looking at the document class
    const checkTheme = () => {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setIsDark(isDarkMode);
    };

    // Initial check
    checkTheme();

    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);
  
  // Logo URL based on theme
  const logoUrl = isDark
    ? '/logos/vitrinelogo-white.png'
    : '/logos/vitrinelogo-black.png';

  // Increased sizes by 20%
  const logoSizes = {
    sm: 'h-10', // Was h-8
    md: 'h-12', // Was h-10
    lg: 'h-14', // Was h-12
  };

  return (
    <Link to="/" className={cn('flex items-center', className)}>
      <img 
        src={logoUrl} 
        alt="VitrineTurbo" 
        className={cn(logoSizes[size], 'w-auto')}
        onError={(e) => {
          // Fallback to Supabase URLs if local files are not available
          const fallbackUrl = isDark
            ? 'https://ikvwygqmlqhsyqmpgaoz.supabase.co/storage/v1/object/public/public/logos/vitrinelogo-white.png.png'
            : 'https://ikvwygqmlqhsyqmpgaoz.supabase.co/storage/v1/object/public/public/logos/vitrinelogo-black.png.png';
          e.currentTarget.src = fallbackUrl;
        }}
      />
    </Link>
  );
}