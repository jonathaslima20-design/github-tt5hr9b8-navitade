import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { loadTrackingSettings, injectMetaPixel, injectGoogleAnalytics } from '@/lib/tracking';
import { logCategoryOperation, sanitizeCategoryName } from '@/lib/categoryUtils';
import { updateMetaTags, updateFavicon, getCorretorMetaTags, resetMetaTags } from '@/utils/metaTags';
import { validateSession } from '@/lib/auth/simpleAuth';
import type { User } from '@/types';

interface UseCorretorDataProps {
  slug: string | undefined;
}

interface UseCorretorDataReturn {
  corretor: User | null;
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook for loading corretor data and applying theme/tracking
 */
export function useCorretorData({ slug }: UseCorretorDataProps): UseCorretorDataReturn {
  const [corretor, setCorretor] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Validate session on component mount
    validateSession();
    
    if (slug) {
      fetchCorretorData();
    }

    return () => {
      try {
        // Reset meta tags to default when leaving the storefront
        resetMetaTags();
        // Clean up theme classes when leaving the storefront
        document.documentElement.classList.remove('light', 'dark');
      } catch (e) {
        console.error('Error cleaning up styles:', e);
      }
    };
  }, [slug]);

  const fetchCorretorData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!slug) {
        setError('Usuário não encontrado');
        return;
      }
      
      logCategoryOperation('LOADING_CORRETOR_DATA', { slug });

      // Load corretor data and tracking settings in parallel
      const [corretorResult, trackingResult] = await Promise.allSettled([
        supabase
          .from('users')
          .select(`
            id,
            name,
            email,
            role,
            phone,
            whatsapp,
            country_code,
            avatar_url,
            cover_url_desktop,
            cover_url_mobile,
            promotional_banner_url_desktop,
            promotional_banner_url_mobile,
            slug,
            is_blocked,
            bio,
            instagram,
            location_url,
            theme,
            currency,
            language
          `)
          .eq('slug', slug)
          .eq('role', 'corretor')
          .eq('is_blocked', false)
          .maybeSingle(),
        loadTrackingSettings(slug) // We'll get the user ID from the first query
      ]);
      
      // Handle corretor data result
      if (corretorResult.status === 'rejected' || !corretorResult.value.data) {
        const error = corretorResult.status === 'rejected' ? corretorResult.reason : corretorResult.value.error;
        logCategoryOperation('CORRETOR_NOT_FOUND', { slug, error });
        setError(`Usuário não encontrado: ${slug}`);
        return;
      }
      
      const corretorData = corretorResult.value.data;
      
      logCategoryOperation('CORRETOR_LOADED', { 
        name: corretorData.name, 
        id: corretorData.id,
        slug: corretorData.slug,
        theme: corretorData.theme,
        currency: corretorData.currency,
        language: corretorData.language
      });
      
      setCorretor(corretorData);
      
      // Define current language with fallback
      const currentLanguage = corretorData.language || 'pt-BR';
      
      // Update meta tags for social media previews with correct title
      const metaConfig = getCorretorMetaTags(corretorData, currentLanguage);
      updateMetaTags(metaConfig);
      
      // Update favicon to user's avatar if available
      if (corretorData.avatar_url) {
        updateFavicon(corretorData.avatar_url);
      }
      
      document.title = metaConfig.title;
      
      // Apply corretor's theme to the storefront
      if (corretorData.theme) {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(corretorData.theme);
      }

      // Load global Meta Pixel from site settings
      try {
        const { data: siteSettings, error: siteSettingsError } = await supabase
          .from('site_settings')
          .select('setting_value')
          .eq('setting_name', 'global_meta_pixel_id')
          .maybeSingle();

        if (!siteSettingsError && siteSettings?.setting_value) {
          console.log('Injecting global Meta Pixel:', siteSettings.setting_value);
          injectMetaPixel(siteSettings.setting_value);
        }
      } catch (globalPixelError) {
        console.warn('Error loading global Meta Pixel:', globalPixelError);
        // Don't fail the page load for global pixel errors
      }

      // Handle tracking settings result (non-blocking)
      if (trackingResult.status === 'fulfilled') {
        const trackingSettings = trackingResult.value;
        
        if (trackingSettings?.meta_pixel_id) {
          injectMetaPixel(trackingSettings.meta_pixel_id);
        }
        
        if (trackingSettings?.ga_measurement_id) {
          injectGoogleAnalytics(trackingSettings.ga_measurement_id);
        }
      } else {
        console.warn('Error loading tracking settings:', trackingResult.reason);
        // Don't fail the entire page load for tracking errors
      }

    } catch (err: any) {
      logCategoryOperation('FETCH_CORRETOR_ERROR', err);
      console.error('Error fetching corretor data:', err);
      setError(`Error loading seller data: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return {
    corretor,
    loading,
    error
  };
}