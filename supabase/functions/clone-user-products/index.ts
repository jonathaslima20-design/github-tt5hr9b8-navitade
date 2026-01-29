import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CloneProductsRequest {
  jobId: string;
  sourceUserId: string;
  targetUserId: string;
  offset: number;
  limit: number;
}

const CONCURRENT_IMAGE_LIMIT = 5;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processBatch(
  supabaseAdmin: any,
  products: any[],
  sourceUserId: string,
  targetUserId: string,
  jobId: string
): Promise<{ successCount: number; errorCount: number }> {
  let successCount = 0;
  let errorCount = 0;

  for (const product of products) {
    try {
      console.log(`Processing product: ${product.title}`);

      const { data: newProduct, error: productError } = await supabaseAdmin
        .from('products')
        .insert({
          user_id: targetUserId,
          title: product.title,
          description: product.description,
          price: product.price,
          discounted_price: product.discounted_price,
          status: product.status,
          category: product.category,
          brand: product.brand,
          model: product.model,
          gender: product.gender,
          condition: product.condition,
          video_url: product.video_url,
          featured_offer_price: product.featured_offer_price,
          featured_offer_installment: product.featured_offer_installment,
          featured_offer_description: product.featured_offer_description,
          is_starting_price: product.is_starting_price,
          short_description: product.short_description,
          is_visible_on_storefront: product.is_visible_on_storefront,
          external_checkout_url: product.external_checkout_url,
          colors: product.colors,
          sizes: product.sizes,
          display_order: product.display_order
        })
        .select()
        .single();

      if (productError) {
        console.error(`Error creating product ${product.title}:`, productError);
        errorCount++;
        continue;
      }

      const { data: productImages } = await supabaseAdmin
        .from('product_images')
        .select('*')
        .eq('product_id', product.id);

      if (productImages && productImages.length > 0) {
        let newFeaturedImageUrl = null;

        const imagePromises = productImages.map(async (image: any) => {
          try {
            const imageResponse = await fetch(image.url, { signal: AbortSignal.timeout(30000) });
            if (!imageResponse.ok) {
              console.warn(`Failed to fetch image: ${image.url}`);
              return null;
            }

            const imageBlob = await imageResponse.blob();
            const originalFileName = image.url.split('/').pop() || 'image.jpg';
            const fileExtension = originalFileName.split('.').pop() || 'jpg';
            const newFileName = `${newProduct.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
            const newFilePath = `products/${newFileName}`;

            const { error: uploadError } = await supabaseAdmin.storage
              .from('public')
              .upload(newFilePath, imageBlob);

            if (uploadError) {
              console.warn(`Failed to upload image ${newFileName}:`, uploadError);
              return null;
            }

            const { data: { publicUrl } } = supabaseAdmin.storage
              .from('public')
              .getPublicUrl(newFilePath);

            await supabaseAdmin
              .from('product_images')
              .insert({
                product_id: newProduct.id,
                url: publicUrl,
                is_featured: image.is_featured
              });

            return image.is_featured ? publicUrl : null;
          } catch (error) {
            console.warn(`Failed to copy product image:`, error);
            return null;
          }
        });

        const imageLimiter = async () => {
          const results: (string | null)[] = [];
          for (let i = 0; i < imagePromises.length; i += CONCURRENT_IMAGE_LIMIT) {
            const batch = imagePromises.slice(i, i + CONCURRENT_IMAGE_LIMIT);
            const batchResults = await Promise.all(batch);
            results.push(...batchResults);
          }
          return results;
        };

        const imageFeaturedUrls = await imageLimiter();
        newFeaturedImageUrl = imageFeaturedUrls.find(url => url !== null) || null;

        if (newFeaturedImageUrl) {
          await supabaseAdmin
            .from('products')
            .update({ featured_image_url: newFeaturedImageUrl })
            .eq('id', newProduct.id);
        }
      }

      successCount++;
      console.log(`Product processed successfully: ${product.title}`);
    } catch (error) {
      console.error(`Error processing product:`, error);
      errorCount++;
    }
  }

  return { successCount, errorCount };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { jobId, sourceUserId, targetUserId, offset, limit }: CloneProductsRequest = await req.json();

    if (!jobId || !sourceUserId || !targetUserId || offset === undefined || !limit) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Processing products batch: offset=${offset}, limit=${limit}`);

    const { data: products, error: fetchError } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('user_id', sourceUserId)
      .range(offset, offset + limit - 1);

    if (fetchError) {
      throw new Error(`Error fetching products: ${fetchError.message}`);
    }

    if (!products || products.length === 0) {
      console.log('No more products to process. Marking job as completed.');
      await supabaseAdmin
        .from('clone_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Cloning completed',
          processed: 0,
          hasMore: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabaseAdmin
      .from('clone_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId);

    const { successCount, errorCount } = await processBatch(
      supabaseAdmin,
      products,
      sourceUserId,
      targetUserId,
      jobId
    );

    const { data: jobData } = await supabaseAdmin
      .from('clone_jobs')
      .select('processed_count, total_products')
      .eq('id', jobId)
      .single();

    const newProcessedCount = (jobData?.processed_count || 0) + successCount;

    await supabaseAdmin
      .from('clone_jobs')
      .update({ processed_count: newProcessedCount })
      .eq('id', jobId);

    const hasMore = products.length === limit;
    console.log(`Batch processed. Success: ${successCount}, Errors: ${errorCount}, Has more: ${hasMore}`);

    if (hasMore) {
      console.log('Scheduling next batch...');
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

      try {
        const invokeUrl = `${supabaseUrl}/functions/v1/clone-user-products`;
        await fetch(invokeUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jobId,
            sourceUserId,
            targetUserId,
            offset: offset + limit,
            limit
          })
        });
      } catch (error) {
        console.warn('Warning: Failed to schedule next batch:', error);
      }
    } else {
      console.log('All products processed. Marking job as completed.');
      await supabaseAdmin
        .from('clone_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: successCount,
        errors: errorCount,
        hasMore,
        message: `Processed ${successCount} products successfully`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in clone-user-products:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to process products batch',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
