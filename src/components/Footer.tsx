import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Logo from '@/components/Logo';

export default function Footer() {
  const { slug } = useParams();
  const [storefrontTheme, setStorefrontTheme] = useState<'light' | 'dark'>('light');
  
  useEffect(() => {
    const fetchStorefrontTheme = async () => {
      if (slug) {
        try {
          const { data: corretorData } = await supabase
            .from('users')
            .select('theme')
            .eq('slug', slug)
            .maybeSingle();
          
          if (corretorData?.theme) {
            setStorefrontTheme(corretorData.theme);
          }
        } catch (error) {
          console.error('Error fetching storefront theme:', error);
        }
      }
    };

    fetchStorefrontTheme();
  }, [slug]);
  
  return (
    <footer className="mt-auto py-4 bg-muted/30">
      <div className="container mx-auto px-4 flex flex-col items-center space-y-0.5">
        <Link to="/login" className="mb-0.5">
          <Logo size="md" showText={false} />
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/login" className="text-muted-foreground hover:text-primary transition-colors">
            Crie sua Vitrine Digital
          </Link>
        </div>
      </div>
    </footer>
  );
}