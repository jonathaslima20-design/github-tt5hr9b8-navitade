/**
 * Utilitário para diagnosticar e corrigir problemas da categoria Nike
 * Execute no console do navegador para resolver problemas de exibição
 */

import { supabase } from '@/lib/supabase';
import { syncUserCategoriesWithStorefrontSettings } from '@/lib/utils';

export async function diagnoseNikeIssues(userId: string) {
  console.log('🔍 INICIANDO DIAGNÓSTICO COMPLETO DA CATEGORIA NIKE');
  
  try {
    // 1. Verificar todos os produtos Nike
    const { data: allNikeProducts, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        title,
        category,
        status,
        is_visible_on_storefront,
        display_order,
        created_at
      `)
      .eq('user_id', userId)
      .or('category.cs.["Nike"],category.cs.["nike"],category.cs.["NIKE"]');

    if (productsError) {
      console.error('❌ Erro ao buscar produtos Nike:', productsError);
      return;
    }

    console.log('📦 PRODUTOS NIKE ENCONTRADOS:', allNikeProducts?.length || 0);
    
    // 2. Análise detalhada dos produtos
    const analysis = {
      total: allNikeProducts?.length || 0,
      visible: 0,
      hidden: 0,
      available: 0,
      sold: 0,
      reserved: 0,
      variations: new Set()
    };

    allNikeProducts?.forEach(product => {
      // Status de visibilidade
      if (product.is_visible_on_storefront) {
        analysis.visible++;
      } else {
        analysis.hidden++;
      }

      // Status do produto
      switch (product.status) {
        case 'disponivel':
          analysis.available++;
          break;
        case 'vendido':
          analysis.sold++;
          break;
        case 'reservado':
          analysis.reserved++;
          break;
      }

      // Variações da categoria
      if (product.category && Array.isArray(product.category)) {
        product.category.forEach(cat => {
          if (cat.toLowerCase().includes('nike')) {
            analysis.variations.add(cat);
          }
        });
      }
    });

    console.log('📊 ANÁLISE DETALHADA:', {
      ...analysis,
      variations: Array.from(analysis.variations)
    });

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

    // 4. Produtos que deveriam aparecer na vitrine
    const shouldBeVisible = allNikeProducts?.filter(p => 
      p.is_visible_on_storefront && p.status === 'disponivel'
    ) || [];

    console.log('✅ PRODUTOS QUE DEVERIAM APARECER:', shouldBeVisible.length);
    console.log('📋 LISTA DOS PRODUTOS VISÍVEIS:', 
      shouldBeVisible.map(p => ({ id: p.id.substring(0, 8), title: p.title }))
    );

    // 5. Identificar problemas
    const issues = [];
    
    if (analysis.hidden > 0) {
      issues.push(`${analysis.hidden} produtos estão ocultos da vitrine`);
    }
    
    if (analysis.sold > 0) {
      issues.push(`${analysis.sold} produtos estão marcados como vendidos`);
    }
    
    if (analysis.reserved > 0) {
      issues.push(`${analysis.reserved} produtos estão reservados`);
    }
    
    if (analysis.variations.size > 1) {
      issues.push(`Múltiplas variações de categoria: ${Array.from(analysis.variations).join(', ')}`);
    }

    console.log('⚠️ PROBLEMAS IDENTIFICADOS:', issues);

    return {
      analysis,
      shouldBeVisible: shouldBeVisible.length,
      issues,
      products: allNikeProducts
    };

  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
  }
}

export async function fixNikeIssues(userId: string) {
  console.log('🔧 INICIANDO CORREÇÃO AUTOMÁTICA DOS PROBLEMAS NIKE');
  
  try {
    let fixedCount = 0;

    // 1. Normalizar nomes de categoria Nike
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, category')
      .eq('user_id', userId);

    if (fetchError) throw fetchError;

    for (const product of products || []) {
      if (product.category && Array.isArray(product.category)) {
        const correctedCategories = product.category.map(cat => {
          if (cat.toLowerCase().includes('nike') && cat !== 'Nike') {
            fixedCount++;
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
    
    console.log(`✅ ${fixedCount} categorias Nike normalizadas`);
    
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
      
      if (!nikeConfig) {
        console.log('⚠️ Categoria Nike não encontrada nas configurações');
      } else if (!nikeConfig.enabled) {
        console.log('⚠️ Categoria Nike está desabilitada');
        console.log('👉 Acesse /dashboard/settings → Vitrine → Organização para habilitar');
      } else if (nikeConfig.itemLimit && nikeConfig.itemLimit < 27) {
        console.log(`⚠️ Categoria Nike tem limite de ${nikeConfig.itemLimit} itens`);
        console.log('👉 Acesse /dashboard/settings → Vitrine → Organização para ajustar');
      }
    }
    
    console.log('🎉 CORREÇÃO CONCLUÍDA');
    
  } catch (error) {
    console.error('❌ Erro na correção:', error);
  }
}

export async function enableAllNikeProducts(userId: string) {
  console.log('👁️ HABILITANDO TODOS OS PRODUTOS NIKE NA VITRINE');
  
  try {
    // Buscar produtos Nike ocultos
    const { data: hiddenNikeProducts } = await supabase
      .from('products')
      .select('id, title')
      .eq('user_id', userId)
      .eq('is_visible_on_storefront', false)
      .or('category.cs.["Nike"],category.cs.["nike"],category.cs.["NIKE"]');

    if (hiddenNikeProducts && hiddenNikeProducts.length > 0) {
      // Habilitar todos os produtos Nike
      const { error } = await supabase
        .from('products')
        .update({ is_visible_on_storefront: true })
        .eq('user_id', userId)
        .eq('is_visible_on_storefront', false)
        .or('category.cs.["Nike"],category.cs.["nike"],category.cs.["NIKE"]');

      if (error) throw error;

      console.log(`✅ ${hiddenNikeProducts.length} produtos Nike habilitados na vitrine`);
      console.log('📋 Produtos habilitados:', 
        hiddenNikeProducts.map(p => ({ id: p.id.substring(0, 8), title: p.title }))
      );
    } else {
      console.log('ℹ️ Todos os produtos Nike já estão visíveis na vitrine');
    }

  } catch (error) {
    console.error('❌ Erro ao habilitar produtos:', error);
  }
}

// Para usar no console do navegador:
// 1. diagnoseNikeIssues('USER_ID_AQUI')
// 2. fixNikeIssues('USER_ID_AQUI') 
// 3. enableAllNikeProducts('USER_ID_AQUI')