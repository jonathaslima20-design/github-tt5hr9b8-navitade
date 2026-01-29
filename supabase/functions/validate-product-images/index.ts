import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ValidateProductImagesRequest {
  userId: string;
  productId?: string;
  imageCount: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const body: ValidateProductImagesRequest = await req.json();
    const { userId, productId, imageCount } = body;

    if (!userId || !imageCount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, imageCount' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // Initialize existingImageCount to prevent ReferenceError
    let existingImageCount = 0;

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('max_images_per_product')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      console.error('Error fetching user image limit:', userError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user data' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!userData) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const maxImagesPerProduct = userData.max_images_per_product || 10;

    if (productId) {
      // First verify that the product belongs to the user
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id')
        .eq('id', productId)
        .eq('user_id', userId)
        .maybeSingle();

      if (productError) {
        console.error('Error verifying product ownership:', productError);
        return new Response(
          JSON.stringify({ error: 'Failed to verify product ownership' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      if (!productData) {
        return new Response(
          JSON.stringify({ error: 'Product not found or access denied' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Now fetch existing images for this product
      const { data: existingImages, error: imagesError } = await supabase
        .from('product_images')
        .select('*', { count: 'exact' })
        .eq('product_id', productId);

      if (imagesError) {
        console.error('Error fetching existing images:', imagesError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch existing images' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      existingImageCount = existingImages?.length || 0;
      const totalImages = existingImageCount + imageCount;

      if (totalImages > maxImagesPerProduct) {
        return new Response(
          JSON.stringify({
            valid: false,
            error: `Total de imagens (${totalImages}) excede o limite de ${maxImagesPerProduct} imagens por produto`,
            limit: maxImagesPerProduct,
            currentCount: existingImageCount,
            requestedCount: imageCount,
            totalImages: totalImages
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    } else {
      if (imageCount > maxImagesPerProduct) {
        return new Response(
          JSON.stringify({
            valid: false,
            error: `Número de imagens (${imageCount}) excede o limite de ${maxImagesPerProduct} imagens por produto`,
            limit: maxImagesPerProduct,
            requestedCount: imageCount
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        valid: true,
        limit: maxImagesPerProduct,
        currentCount: productId ? existingImageCount : undefined,
        requestedCount: imageCount,
        message: 'Image count validation passed'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Validation error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});