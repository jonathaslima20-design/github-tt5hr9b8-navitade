/**
 * Utilitário de diagnóstico específico para problemas da categoria Nike
 * Execute no console do navegador para diagnosticar problemas
 */

export async function diagnoseNikeCategory(userId: string) {
  console.log('🔍 INICIANDO DIAGNÓSTICO DA CATEGORIA NIKE');
  
  try {
    // 1. Verificar produtos Nike no banco
    const { data: nikeProducts, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        title,
        category,
        is_visible_on_storefront,
        status,
        display_order,
        created_at
      `)
      .eq('user_id', userId)
      .contains('category', ['Nike']);

    if (productsError) {
      console.error('❌ Erro ao buscar produtos Nike:', productsError);
      return;
    }

    console.log('📦 PRODUTOS NIKE ENCONTRADOS:', nikeProducts?.length || 0);
    
    if (nikeProducts && nikeProducts.length > 0) {
      console.table(nikeProducts.map(p => ({
        id: p.id.substring(0, 8),
        title: p.title,
        visible: p.is_visible_on_storefront,
        status: p.status,
        order: p.display_order
      })));
    }

    // 2. Verificar variações da categoria Nike
    const { data: allProducts, error: allError } = await supabase
      .from('products')
      .select('category')
      .eq('user_id', userId);

    if (!allError && allProducts) {
      const nikeVariations = new Set();
      allProducts.forEach(product => {
        if (product.category && Array.isArray(product.category)) {
          product.category.forEach(cat => {
            if (cat.toLowerCase().includes('nike')) {
              nikeVariations.add(cat);
            }
          });
        }
      });
      
      console.log('🏷️ VARIAÇÕES DE CATEGORIA NIKE ENCONTRADAS:', Array.from(nikeVariations));
    }

    // 3. Verificar configurações da vitrine
    const { data: settings, error: settingsError } = await supabase
      .from('user_storefront_settings')
      .select('settings')
      .eq('user_id', userId)
      .single();

    if (!settingsError && settings?.settings?.categoryDisplaySettings) {
      const nikeConfig = settings.settings.categoryDisplaySettings.find(
        (cat: any) => cat.category.toLowerCase().includes('nike')
      );
      
      console.log('⚙️ CONFIGURAÇÃO DA CATEGORIA NIKE:', nikeConfig || 'Não encontrada');
    }

    // 4. Sugestões de correção
    console.log('\n💡 SUGESTÕES DE CORREÇÃO:');
    
    if (!nikeProducts || nikeProducts.length === 0) {
      console.log('1. ❌ Nenhum produto Nike encontrado - verificar se categoria está escrita corretamente');
    } else {
      const invisibleProducts = nikeProducts.filter(p => !p.is_visible_on_storefront);
      if (invisibleProducts.length > 0) {
        console.log(`2. 👁️ ${invisibleProducts.length} produtos Nike estão ocultos da vitrine`);
      }
      
      const unavailableProducts = nikeProducts.filter(p => p.status !== 'disponivel');
      if (unavailableProducts.length > 0) {
        console.log(`3. 🚫 ${unavailableProducts.length} produtos Nike não estão disponíveis`);
      }
    }

  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
  }
}

// Função para corrigir automaticamente problemas comuns
export async function fixNikeCategory(userId: string) {
  console.log('🔧 INICIANDO CORREÇÃO AUTOMÁTICA DA CATEGORIA NIKE');
  
  try {
    // 1. Normalizar nomes de categoria Nike
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, category')
      .eq('user_id', userId);

    if (fetchError) throw fetchError;

    let correctedCount = 0;
    
    for (const product of products || []) {
      if (product.category && Array.isArray(product.category)) {
        const correctedCategories = product.category.map(cat => {
          if (cat.toLowerCase().includes('nike') && cat !== 'Nike') {
            correctedCount++;
            return 'Nike';
          }
          return cat;
        });
        
        if (JSON.stringify(correctedCategories) !== JSON.stringify(product.category)) {
          await supabase
            .from('products')
            .update({ category: correctedCategories })
            .eq('id', product.id);
        }
      }
    }
    
    console.log(`✅ ${correctedCount} categorias Nike corrigidas`);
    
    // 2. Forçar sincronização das configurações
    await syncUserCategoriesWithStorefrontSettings(userId);
    console.log('✅ Sincronização de categorias executada');
    
    // 3. Verificar se categoria Nike está habilitada
    const { data: settings } = await supabase
      .from('user_storefront_settings')
      .select('settings')
      .eq('user_id', userId)
      .single();
    
    if (settings?.settings?.categoryDisplaySettings) {
      const nikeConfig = settings.settings.categoryDisplaySettings.find(
        (cat: any) => cat.category === 'Nike'
      );
      
      if (!nikeConfig || !nikeConfig.enabled) {
        console.log('⚠️ Categoria Nike não está habilitada nas configurações da vitrine');
        console.log('👉 Acesse /dashboard/settings → Vitrine → Organização para habilitar');
      }
    }
    
    console.log('🎉 CORREÇÃO CONCLUÍDA - Recarregue a vitrine para ver as mudanças');
    
  } catch (error) {
    console.error('❌ Erro na correção:', error);
  }
}

// Para usar no console do navegador:
// diagnoseNikeCategory('USER_ID_AQUI')
// fixNikeCategory('USER_ID_AQUI')