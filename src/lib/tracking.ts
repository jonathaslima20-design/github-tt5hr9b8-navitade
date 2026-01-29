import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// Dedicated UUID for storefront tracking to avoid UUID type mismatch
export const STOREFRONT_UUID = '00000000-0000-0000-0000-000000000001';

export const loadTrackingSettings = async (userIdOrSlug: string) => {
  // If it looks like a slug, get the user ID first
  let userId = userIdOrSlug;
  
  if (!userIdOrSlug.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    // It's a slug, get the user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('slug', userIdOrSlug)
      .eq('role', 'corretor')
      .eq('is_blocked', false)
      .maybeSingle();
    
    if (userError || !userData) {
      console.warn('Could not find user for tracking settings:', userIdOrSlug);
      return null;
    }
    
    userId = userData.id;
  }
  
  const { data, error } = await supabase
    .from('tracking_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('Error loading tracking settings:', error);
    return null;
  }

  return data;
};

export const injectMetaPixel = (pixelId: string) => {
  if (!pixelId) return;

  // Add Meta Pixel base code
  const script = document.createElement('script');
  script.innerHTML = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}');
    fbq('track', 'PageView');
  `;
  document.head.appendChild(script);

  // Add Meta Pixel noscript fallback
  const noscript = document.createElement('noscript');
  noscript.innerHTML = `
    <img height="1" width="1" style="display:none"
    src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>
  `;
  document.body.appendChild(noscript);
};

export const injectGoogleAnalytics = (measurementId: string) => {
  if (!measurementId) return;

  // Add Google Analytics base code
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // Add Google Analytics configuration
  const configScript = document.createElement('script');
  configScript.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}');
  `;
  document.head.appendChild(configScript);
};

export const trackMetaEvent = (event: string, data?: any) => {
  if (typeof window.fbq !== 'function') return;
  window.fbq('track', event, data);
};

export const trackGoogleEvent = (event: string, data?: any) => {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', event, data);
};

export const trackView = async (itemId: string, type: 'product' = 'product') => {
  try {
    // Generate or get viewer ID
    const viewerId = localStorage.getItem('viewer_id') || uuidv4();
    localStorage.setItem('viewer_id', viewerId);

    // Get current date for unique daily views
    const viewDate = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD

    console.log('Tracking view for:', { itemId, type, viewerId, viewDate });

    const { data, error } = await supabase
      .from('property_views')
      .upsert(
        {
          property_id: itemId,
          viewer_id: viewerId,
          listing_type: type,
          source: document.referrer || 'direct',
          view_date: viewDate,
          viewed_at: new Date().toISOString(),
          is_unique: true
        },
        {
          onConflict: 'property_id,viewer_id,view_date,listing_type',
          ignoreDuplicates: true
        }
      )
      .select();

    if (error) {
      console.error('Error tracking view:', error);
      return false;
    }

    console.log('View tracked successfully:', data);
    return true;
  } catch (err) {
    console.error('Error tracking view:', err);
    return false;
  }
};

export const trackLead = async (data: {
  itemId: string;
  itemType: 'product';
  name: string;
  email: string;
  phone?: string;
  message?: string;
  source?: string;
}) => {
  try {
    console.log('Tracking lead for:', data);

    const { data: result, error } = await supabase
      .from('leads')
      .insert({
        property_id: data.itemId,
        listing_type: data.itemType,
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: data.message,
        source: data.source || 'form',
        status: 'new'
      })
      .select();

    if (error) {
      console.error('Error tracking lead:', error);
      return false;
    }

    console.log('Lead tracked successfully:', result);
    return true;
  } catch (err) {
    console.error('Error tracking lead:', err);
    return false;
  }
};

export const trackWhatsAppClick = async (itemId: string, itemType: 'product' = 'product', source: string = 'whatsapp') => {
  try {
    // Generate or get viewer ID
    const viewerId = localStorage.getItem('viewer_id') || uuidv4();
    localStorage.setItem('viewer_id', viewerId);

    // Use STOREFRONT_UUID for general storefront tracking
    const propertyId = itemId === 'storefront' ? STOREFRONT_UUID : itemId;

    console.log('Tracking WhatsApp click for:', { itemId, propertyId, itemType, source, viewerId });

    const { data, error } = await supabase
      .from('leads')
      .insert({
        property_id: propertyId,
        listing_type: itemType,
        name: 'WhatsApp Contact',
        email: 'whatsapp@contact.com',
        phone: '',
        message: `WhatsApp click from ${source}`,
        source: source,
        status: 'new'
      })
      .select();

    if (error) {
      console.error('Error tracking WhatsApp click:', error);
      return false;
    }

    console.log('WhatsApp click tracked successfully:', data);
    return true;
  } catch (err) {
    console.error('Error tracking WhatsApp click:', err);
    return false;
  }
};

export const getStats = async (itemId: string, type: 'product' = 'product') => {
  try {
    const [viewsResponse, leadsResponse] = await Promise.all([
      supabase
        .from('property_views')
        .select('*', { count: 'exact' })
        .eq('property_id', itemId)
        .eq('listing_type', type),
      supabase
        .from('leads')
        .select('*', { count: 'exact' })
        .eq('property_id', itemId)
        .eq('listing_type', type)
    ]);

    const views = viewsResponse.count || 0;
    const leads = leadsResponse.count || 0;
    const conversionRate = views > 0 ? (leads / views) * 100 : 0;

    return {
      views,
      leads,
      conversionRate
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    return { views: 0, leads: 0, conversionRate: 0 };
  }
};