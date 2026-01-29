import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CopyProductsRequest {
  sourceUserId: string
  targetUserId: string
  productIds: string[]
}

interface CopyStats {
  copiedProducts: number
  copiedImages: number
  copiedPriceTiers: number
  copiedCategories: number
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      })
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error: Missing required environment variables' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Parse request body
    let requestData: CopyProductsRequest
    try {
      requestData = await req.json()
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { sourceUserId, targetUserId, productIds } = requestData

    // Validate required fields
    if (!sourceUserId || !targetUserId || !productIds || !Array.isArray(productIds)) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: sourceUserId, targetUserId, and productIds array' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (productIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No products specified for copying' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Copying ${productIds.length} products from user ${sourceUserId} to user ${targetUserId}`)

    const stats: CopyStats = {
      copiedProducts: 0,
      copiedImages: 0,
      copiedPriceTiers: 0,
      copiedCategories: 0
    }

    // Fetch products to copy
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', sourceUserId)
      .in('id', productIds)

    if (fetchError) {
      console.error('Error fetching products:', fetchError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch products to copy',
          details: fetchError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No products found to copy' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Copy categories first
    const uniqueCategories = new Set<string>()
    products.forEach(product => {
      // Handle category as either array or string
      if (product.category) {
        if (Array.isArray(product.category)) {
          product.category.forEach((cat: string) => {
            if (cat && typeof cat === 'string') {
              uniqueCategories.add(cat.trim())
            }
          })
        } else if (typeof product.category === 'string') {
          const trimmedCat = product.category.trim()
          if (trimmedCat) {
            uniqueCategories.add(trimmedCat)
          }
        }
      }
    })

    if (uniqueCategories.size > 0) {
      // Get existing categories for target user
      const { data: existingCategories, error: fetchCategoriesError } = await supabase
        .from('user_product_categories')
        .select('name')
        .eq('user_id', targetUserId)

      if (fetchCategoriesError) {
        console.error('Error fetching existing categories:', fetchCategoriesError)
      }

      const existingCategoryNames = new Set(
        existingCategories?.map(cat => cat.name) || []
      )

      // Filter out categories that already exist
      const categoriesToCreate = Array.from(uniqueCategories)
        .filter(cat => !existingCategoryNames.has(cat))
        .map(name => ({
          user_id: targetUserId,
          name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))

      if (categoriesToCreate.length > 0) {
        const { error: categoryError } = await supabase
          .from('user_product_categories')
          .insert(categoriesToCreate)

        if (categoryError) {
          console.error('Error copying categories:', categoryError)
          // Don't fail the entire operation for category errors
        } else {
          stats.copiedCategories = categoriesToCreate.length
        }
      }
    }

    // Get existing slugs for the target user to avoid conflicts
    const { data: existingSlugs } = await supabase
      .from('products')
      .select('slug')
      .eq('user_id', targetUserId)

    const existingSlugSet = new Set(existingSlugs?.map(p => p.slug) || [])

    // Function to generate unique slug
    const generateUniqueSlug = (baseSlug: string, existingSet: Set<string>): string => {
      let uniqueSlug = baseSlug
      let counter = 1
      while (existingSet.has(uniqueSlug)) {
        uniqueSlug = `${baseSlug}-${counter}`
        counter++
      }
      existingSet.add(uniqueSlug)
      return uniqueSlug
    }

    // Prepare products for insertion with unique slugs
    const productsToInsert = products.map(product => {
      const { id, created_at, updated_at, ...productData } = product
      const uniqueSlug = generateUniqueSlug(product.slug, existingSlugSet)

      return {
        ...productData,
        slug: uniqueSlug,
        user_id: targetUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    })

    // Insert copied products
    const { data: insertedProducts, error: insertError } = await supabase
      .from('products')
      .insert(productsToInsert)
      .select()

    if (insertError) {
      console.error('Error inserting products:', insertError)
      return new Response(
        JSON.stringify({
          error: 'Erro ao inserir produtos copiados',
          details: insertError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!insertedProducts || insertedProducts.length === 0) {
      console.error('No products were inserted')
      return new Response(
        JSON.stringify({
          error: 'Nenhum produto foi inserido. Verifique se há conflitos de slug.'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    stats.copiedProducts = insertedProducts.length

    // Create mapping of old product IDs to new product IDs
    const productIdMapping = new Map<string, string>()
    products.forEach((originalProduct, index) => {
      if (insertedProducts && insertedProducts[index]) {
        productIdMapping.set(originalProduct.id, insertedProducts[index].id)
      }
    })

    // Copy product images
    const { data: productImages, error: imagesError } = await supabase
      .from('product_images')
      .select('*')
      .in('product_id', productIds)

    if (imagesError) {
      console.error('Error fetching product images:', imagesError)
    } else if (productImages && productImages.length > 0) {
      const imagesToInsert = productImages.map(image => {
        const { id, created_at, ...imageData } = image
        const newProductId = productIdMapping.get(image.product_id)
        
        if (!newProductId) {
          console.error(`No mapping found for product ID: ${image.product_id}`)
          return null
        }

        return {
          ...imageData,
          product_id: newProductId,
          created_at: new Date().toISOString()
        }
      }).filter(Boolean)

      if (imagesToInsert.length > 0) {
        const { error: insertImagesError } = await supabase
          .from('product_images')
          .insert(imagesToInsert)

        if (insertImagesError) {
          console.error('Error copying product images:', insertImagesError)
        } else {
          stats.copiedImages = imagesToInsert.length
        }
      }
    }

    // Copy price tiers
    const { data: priceTiers, error: tiersError } = await supabase
      .from('product_price_tiers')
      .select('*')
      .in('product_id', productIds)

    if (tiersError) {
      console.error('Error fetching price tiers:', tiersError)
      // Non-critical error - log but don't fail
    } else if (priceTiers && priceTiers.length > 0) {
      const tiersToInsert = priceTiers.map(tier => {
        const { id, created_at, updated_at, ...tierData } = tier
        const newProductId = productIdMapping.get(tier.product_id)
        
        if (!newProductId) {
          console.error(`No mapping found for product ID: ${tier.product_id}`)
          return null
        }

        return {
          ...tierData,
          product_id: newProductId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }).filter(Boolean)

      if (tiersToInsert.length > 0) {
        const { error: insertTiersError } = await supabase
          .from('product_price_tiers')
          .insert(tiersToInsert)

        if (insertTiersError) {
          console.error('Error copying price tiers:', insertTiersError)
          // Non-critical error - log but don't fail
        } else {
          stats.copiedPriceTiers = tiersToInsert.length
        }
      }
    }

    console.log('Copy operation completed:', stats)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully copied ${stats.copiedProducts} products with ${stats.copiedImages} images, ${stats.copiedPriceTiers} price tiers, and ${stats.copiedCategories} categories`,
        stats
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error in copy-products-between-users function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
