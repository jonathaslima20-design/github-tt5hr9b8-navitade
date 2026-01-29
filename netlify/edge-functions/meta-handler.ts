import type { Context } from "https://edge.netlify.com";

interface UserProfile {
  name: string;
  slug: string;
  bio?: string;
  avatar_url?: string;
  cover_url_desktop?: string;
  cover_url_mobile?: string;
}

interface ProductProfile {
  id: string;
  title: string;
  description?: string;
  short_description?: string;
  featured_image_url?: string;
  price?: number;
  discounted_price?: number;
  is_starting_price?: boolean;
  user_id: string;
}

/**
 * Detects if the request is from a social media crawler/bot
 */
function isCrawlerUserAgent(userAgent: string): boolean {
  const crawlerPatterns = [
    'facebookexternalhit',
    'Facebot',
    'Twitterbot',
    'WhatsApp',
    'LinkedInBot',
    'Slackbot',
    'TelegramBot',
    'Discordbot',
    'SkypeUriPreview',
    'MetaInspector',
    'BingPreview',
    'GoogleBot',
    'bingbot',
    'Google-InspectionTool'
  ];

  const ua = userAgent.toLowerCase();
  return crawlerPatterns.some(pattern => ua.includes(pattern.toLowerCase()));
}

/**
 * Generates HTML with dynamic Open Graph meta tags for user profiles
 */
function generateMetaTagsHTML(profile: UserProfile, requestUrl: string): string {
  const title = `${profile.name} - VitrineTurbo`;
  const description = profile.bio || `Confira os produtos de ${profile.name} na VitrineTurbo`;

  // Prioritize avatar (logo) for storefront preview
  const imageUrl = profile.avatar_url ||
                   profile.cover_url_desktop ||
                   profile.cover_url_mobile ||
                   'https://ikvwygqmlqhsyqmpgaoz.supabase.co/storage/v1/object/public/public/logos/flat-icon-vitrine.png.png';

  const canonicalUrl = requestUrl;

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- Favicon -->
    <link rel="icon" type="image/png" href="${imageUrl}" />
    <link rel="apple-touch-icon" href="${imageUrl}" />

    <!-- Primary Meta Tags -->
    <title>${title}</title>
    <meta name="title" content="${title}" />
    <meta name="description" content="${description}" />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="profile" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:site_name" content="VitrineTurbo" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${canonicalUrl}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />

    <!-- WhatsApp specific -->
    <meta property="og:image:alt" content="${profile.name}" />

    <!-- Redirect to main app for browsers -->
    <meta http-equiv="refresh" content="0;url=${canonicalUrl}" />
    <script>
      // Only redirect actual browsers, not crawlers
      if (!/bot|crawler|spider|crawling/i.test(navigator.userAgent)) {
        window.location.href = "${canonicalUrl}";
      }
    </script>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div style="font-family: Inter, system-ui, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; text-align: center;">
      <img src="${imageUrl}" alt="${profile.name}" style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover; margin-bottom: 20px;" />
      <h1 style="font-size: 32px; margin-bottom: 10px;">${profile.name}</h1>
      <p style="font-size: 18px; color: #666; margin-bottom: 20px;">${description}</p>
      <p style="color: #999;">Redirecionando...</p>
    </div>
  </body>
</html>`;
}

/**
 * Generates HTML with dynamic Open Graph meta tags for products
 */
function generateProductMetaTagsHTML(product: ProductProfile, profile: UserProfile, requestUrl: string): string {
  const title = `${product.title} - ${profile.name} | VitrineTurbo`;
  
  // Create description from product info
  let description = product.short_description || '';
  if (!description && product.description) {
    // Extract first 160 characters from description, removing HTML tags
    description = product.description.replace(/<[^>]*>/g, '').substring(0, 160);
  }
  if (!description) {
    description = `${product.title} - Confira este produto na vitrine de ${profile.name}`;
  }
  
  // Add price information to description if available
  if (product.price) {
    const price = product.discounted_price || product.price;
    const priceText = product.is_starting_price ? `A partir de R$ ${price.toFixed(2)}` : `R$ ${price.toFixed(2)}`;
    description = `${description} - ${priceText}`;
  }

  // Prioritize product image, fallback to user avatar
  const imageUrl = product.featured_image_url ||
                   profile.avatar_url ||
                   profile.cover_url_desktop ||
                   profile.cover_url_mobile ||
                   'https://ikvwygqmlqhsyqmpgaoz.supabase.co/storage/v1/object/public/public/logos/flat-icon-vitrine.png.png';

  const canonicalUrl = requestUrl;

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- Favicon -->
    <link rel="icon" type="image/png" href="${imageUrl}" />
    <link rel="apple-touch-icon" href="${imageUrl}" />

    <!-- Primary Meta Tags -->
    <title>${title}</title>
    <meta name="title" content="${title}" />
    <meta name="description" content="${description}" />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="product" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:site_name" content="VitrineTurbo" />

    <!-- Product specific Open Graph -->
    <meta property="product:brand" content="${profile.name}" />
    ${product.price ? `<meta property="product:price:amount" content="${(product.discounted_price || product.price).toFixed(2)}" />` : ''}
    <meta property="product:price:currency" content="BRL" />
    <meta property="product:availability" content="in stock" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${canonicalUrl}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />

    <!-- WhatsApp specific -->
    <meta property="og:image:alt" content="${product.title}" />

    <!-- Redirect to main app for browsers -->
    <meta http-equiv="refresh" content="0;url=${canonicalUrl}" />
    <script>
      // Only redirect actual browsers, not crawlers
      if (!/bot|crawler|spider|crawling/i.test(navigator.userAgent)) {
        window.location.href = "${canonicalUrl}";
      }
    </script>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div style="font-family: Inter, system-ui, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; text-align: center;">
      <img src="${imageUrl}" alt="${product.title}" style="width: 300px; height: 300px; border-radius: 12px; object-fit: cover; margin-bottom: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);" />
      <h1 style="font-size: 28px; margin-bottom: 10px; color: #333;">${product.title}</h1>
      <p style="font-size: 16px; color: #666; margin-bottom: 15px;">${description}</p>
      <div style="font-size: 14px; color: #999; margin-bottom: 20px;">
        Vendido por <strong>${profile.name}</strong>
      </div>
      <p style="color: #999;">Redirecionando...</p>
    </div>
  </body>
</html>`;
}

/**
 * Default meta tags HTML for non-specific pages
 */
function generateDefaultMetaTagsHTML(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VitrineTurbo - Sua Vitrine Digital</title>
    <meta name="description" content="VitrineTurbo - Plataforma completa para criar sua vitrine digital profissional" />
    <meta property="og:title" content="VitrineTurbo - Sua Vitrine Digital" />
    <meta property="og:description" content="Plataforma completa para criar sua vitrine digital profissional" />
    <meta property="og:image" content="https://ikvwygqmlqhsyqmpgaoz.supabase.co/storage/v1/object/public/public/logos/flat-icon-vitrine.png.png" />
    <meta property="og:type" content="website" />
  </head>
  <body>
    <h1>VitrineTurbo</h1>
    <p>Sua Vitrine Digital</p>
  </body>
</html>`;
}

export default async (request: Request, context: Context) => {
  const userAgent = request.headers.get('user-agent') || '';
  const url = new URL(request.url);

  console.log('🔍 Edge Function - Netlify Meta Handler Started:', {
    path: url.pathname,
    userAgent: userAgent.substring(0, 100),
    isCrawler: isCrawlerUserAgent(userAgent),
    timestamp: new Date().toISOString()
  });

  // Only process for crawlers
  if (!isCrawlerUserAgent(userAgent)) {
    console.log('⏩ Not a crawler, passing through to SPA');
    return context.next();
  }

  console.log('✅ Crawler detected - processing for meta tags');

  try {
    // Parse the URL to extract the slug
    const pathSegments = url.pathname.split('/').filter(Boolean);

    // Skip special paths
    if (pathSegments.length === 0 ||
        pathSegments[0] === 'login' ||
        pathSegments[0] === 'register' ||
        pathSegments[0] === 'dashboard' ||
        pathSegments[0] === 'admin' ||
        pathSegments[0] === 'help' ||
        pathSegments[0] === 'assets') {
      console.log('📄 Special path, returning default');
      return new Response(generateDefaultMetaTagsHTML(), {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    const slug = pathSegments[0];
    
    // Check if this is a product page: /:slug/produtos/:productId
    const isProductPage = pathSegments.length === 3 && pathSegments[1] === 'produtos';
    const productId = isProductPage ? pathSegments[2] : null;
    
    console.log('🔎 Analyzing URL:', {
      slug,
      isProductPage,
      productId: productId ? productId.substring(0, 8) + '...' : null,
      pathSegments
    });

    // Get Supabase credentials from environment - try multiple sources
    let supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    let supabaseKey = Deno.env.get('VITE_SUPABASE_ANON_KEY');

    // Try context if env vars not found
    if (!supabaseUrl) {
      supabaseUrl = context.site.env.get('VITE_SUPABASE_URL');
    }
    if (!supabaseKey) {
      supabaseKey = context.site.env.get('VITE_SUPABASE_ANON_KEY');
    }

    // Fallback attempt - show helpful error if still missing
    if (!supabaseUrl) {
      console.error('❌ VITE_SUPABASE_URL is not configured in Netlify environment');
      supabaseUrl = 'MISSING';
    }
    if (!supabaseKey) {
      console.error('❌ VITE_SUPABASE_ANON_KEY is not configured in Netlify environment');
      supabaseKey = 'MISSING';
    }

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials - no sources available');
      return context.next();
    }

    console.log('✅ Supabase credentials found:', {
      url: supabaseUrl.substring(0, 30) + '...',
      hasKey: !!supabaseKey
    });

    if (isProductPage && productId) {
      // Handle product page
      console.log('🛍️ Processing product page');
      
      // First, get the product details
      const productResponse = await fetch(
        `${supabaseUrl}/rest/v1/products?id=eq.${productId}&select=id,title,description,short_description,featured_image_url,price,discounted_price,is_starting_price,user_id&limit=1`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!productResponse.ok) {
        console.error('❌ Product query failed:', productResponse.status);
        return context.next();
      }

      const products = await productResponse.json() as ProductProfile[];

      if (products.length === 0) {
        console.log('⚠️ Product not found:', productId);
        return context.next();
      }

      const product = products[0];
      console.log('✅ Product found:', product.title);

      // Now get the user profile for this product
      const profileResponse = await fetch(
        `${supabaseUrl}/rest/v1/users?id=eq.${product.user_id}&select=name,slug,bio,avatar_url,cover_url_desktop,cover_url_mobile&limit=1`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!profileResponse.ok) {
        console.error('❌ User profile query failed:', profileResponse.status);
        return context.next();
      }

      const profiles = await profileResponse.json() as UserProfile[];

      if (profiles.length === 0) {
        console.log('⚠️ User profile not found for product');
        return context.next();
      }

      const profile = profiles[0];
      console.log('✅ User profile found:', profile.name);

      // Verify that the slug matches the user's slug
      if (profile.slug !== slug) {
        console.log('⚠️ Slug mismatch - product belongs to different user');
        return context.next();
      }

      // Generate HTML with product-specific meta tags
      const html = generateProductMetaTagsHTML(product, profile, request.url);

      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=300, s-maxage=600',
        },
      });

    } else {
      // Handle user profile page
      console.log('👤 Processing user profile page');
      
      // Fetch user profile from database
      const profileResponse = await fetch(
        `${supabaseUrl}/rest/v1/users?slug=eq.${slug}&select=name,slug,bio,avatar_url,cover_url_desktop,cover_url_mobile&limit=1`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!profileResponse.ok) {
        console.error('❌ Database query failed:', profileResponse.status);
        return context.next();
      }

      const profiles = await profileResponse.json() as UserProfile[];

      if (profiles.length === 0) {
        console.log('⚠️ Profile not found for slug:', slug);
        return context.next();
      }

      const profile = profiles[0];
      console.log('✅ Profile found:', profile.name);

      // Generate HTML with user profile meta tags
      const html = generateMetaTagsHTML(profile, request.url);

      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=300, s-maxage=600',
        },
      });
    }

  } catch (error) {
    console.error('❌ Error processing request:', error);
    console.error('📍 Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack'
    });
    // Unable to process - pass to SPA
    return context.next();
  }
};

export const config = {
  path: "/*",
  excludedPath: ["/assets/*", "/api/*"],
};
