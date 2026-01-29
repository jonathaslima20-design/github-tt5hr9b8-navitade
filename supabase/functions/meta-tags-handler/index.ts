import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    <!-- Redirect to main app -->
    <meta http-equiv="refresh" content="0;url=${canonicalUrl}" />
    <script>
      window.location.href = "${canonicalUrl}";
    </script>
  </head>
  <body>
    <h1>${profile.name}</h1>
    <p>${description}</p>
    <p>Redirecionando...</p>
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

    <!-- Redirect to main app -->
    <meta http-equiv="refresh" content="0;url=${canonicalUrl}" />
    <script>
      window.location.href = "${canonicalUrl}";
    </script>
  </head>
  <body>
    <h1>${product.title}</h1>
    <p>${description}</p>
    <p>Vendido por ${profile.name}</p>
    <p>Redirecionando...</p>
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

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const userAgent = req.headers.get('user-agent') || '';

    console.log('🔍 Request received:', {
      url: url.pathname,
      userAgent: userAgent.substring(0, 100),
      isCrawler: isCrawlerUserAgent(userAgent)
    });

    // Only process for crawlers
    if (!isCrawlerUserAgent(userAgent)) {
      console.log('⏩ Not a crawler, passing through');
      return new Response(JSON.stringify({
        message: 'This endpoint is for social media crawlers only',
        userAgent
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    // Parse the URL to extract the slug
    // Expected format: /meta-tags-handler?url=https://vitrineturbo.com/kingstore
    const targetUrl = url.searchParams.get('url') || '';
    
    if (!targetUrl) {
      console.log('📄 No target URL provided, returning default');
      return new Response(generateDefaultMetaTagsHTML(), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }
    
    const urlParts = new URL(targetUrl).pathname.split('/').filter(Boolean);

    if (urlParts.length === 0) {
      console.log('📄 Root page, returning default meta tags');
      return new Response(generateDefaultMetaTagsHTML(), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }

    const slug = urlParts[0];
    
    // Check if this is a product page: /:slug/produtos/:productId
    const isProductPage = urlParts.length === 3 && urlParts[1] === 'produtos';
    const productId = isProductPage ? urlParts[2] : null;
    
    console.log('🔎 Analyzing URL:', {
      slug,
      isProductPage,
      productId: productId ? productId.substring(0, 8) + '...' : null,
      urlParts
    });

    // Connect to Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    if (isProductPage && productId) {
      // Handle product page
      console.log('🛍️ Processing product page');
      
      // First, get the product details
      const productResponse = await fetch(
        `${supabaseUrl}/rest/v1/products?id=eq.${productId}&select=id,title,description,short_description,featured_image_url,price,discounted_price,is_starting_price,user_id`,
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
        return new Response(generateDefaultMetaTagsHTML(), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html; charset=utf-8',
          },
        });
      }

      const products = await productResponse.json() as ProductProfile[];

      if (products.length === 0) {
        console.log('⚠️ Product not found:', productId);
        return new Response(generateDefaultMetaTagsHTML(), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html; charset=utf-8',
          },
        });
      }

      const product = products[0];
      console.log('✅ Product found:', product.title);

      // Now get the user profile for this product
      const profileResponse = await fetch(
        `${supabaseUrl}/rest/v1/users?id=eq.${product.user_id}&select=name,slug,bio,avatar_url,cover_url_desktop,cover_url_mobile`,
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
        return new Response(generateDefaultMetaTagsHTML(), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html; charset=utf-8',
          },
        });
      }

      const profiles = await profileResponse.json() as UserProfile[];

      if (profiles.length === 0) {
        console.log('⚠️ User profile not found for product');
        return new Response(generateDefaultMetaTagsHTML(), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html; charset=utf-8',
          },
        });
      }

      const profile = profiles[0];
      console.log('✅ User profile found:', profile.name);

      // Verify that the slug matches the user's slug
      if (profile.slug !== slug) {
        console.log('⚠️ Slug mismatch - product belongs to different user');
        return new Response(generateDefaultMetaTagsHTML(), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html; charset=utf-8',
          },
        });
      }

      // Generate HTML with product-specific meta tags
      const html = generateProductMetaTagsHTML(product, profile, targetUrl);

      return new Response(html, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=300, s-maxage=600',
        },
      });

    } else {
      // Handle user profile page
      console.log('👤 Processing user profile page');
      
      // Fetch user profile from database
      const profileResponse = await fetch(
        `${supabaseUrl}/rest/v1/users?slug=eq.${slug}&select=name,slug,bio,avatar_url,cover_url_desktop,cover_url_mobile`,
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
        return new Response(generateDefaultMetaTagsHTML(), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html; charset=utf-8',
          },
        });
      }

      const profiles = await profileResponse.json() as UserProfile[];

      if (profiles.length === 0) {
        console.log('⚠️ Profile not found for slug:', slug);
        return new Response(generateDefaultMetaTagsHTML(), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html; charset=utf-8',
          },
        });
      }

      const profile = profiles[0];
      console.log('✅ Profile found:', profile.name);

      // Generate HTML with user profile meta tags
      const html = generateMetaTagsHTML(profile, targetUrl);

      return new Response(html, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=300, s-maxage=600',
        },
      });
    }

  } catch (error) {
    console.error('❌ Error processing request:', error);

    return new Response(generateDefaultMetaTagsHTML(), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  }
});
