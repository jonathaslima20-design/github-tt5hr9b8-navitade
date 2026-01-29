import { supabase } from './supabase';

/**
 * Update user email using admin privileges
 */
export async function updateUserEmailAdmin(userId: string, newEmail: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Não autenticado');
  }

  const { data, error } = await supabase.functions.invoke('update-user-email', {
    body: { userId, newEmail },
  });

  if (error) {
    // Extract detailed error message from Edge Function response
    let errorMessage = 'Erro ao atualizar email';
    if (error.context?.body) {
      try {
        const errorBody = typeof error.context.body === 'string' 
          ? JSON.parse(error.context.body) 
          : error.context.body;
        errorMessage = errorBody.error?.message || errorBody.message || errorMessage;
      } catch (parseError) {
        // If parsing fails, use the original error message
        errorMessage = error.message || errorMessage;
      }
    } else {
      errorMessage = error.message || errorMessage;
    }
    throw new Error(errorMessage);
  }

  if (data?.error) {
    throw new Error(data.error.message || 'Erro ao atualizar email');
  }
}

/**
 * Change user password using admin privileges
 */
export async function changeUserPassword(userId: string, newPassword: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Não autenticado');
  }

  const { data, error } = await supabase.functions.invoke('change-user-password', {
    body: { userId, newPassword },
  });

  if (error) {
    // Extract detailed error message from Edge Function response
    let errorMessage = 'Erro ao alterar senha';
    if (error.context?.body) {
      try {
        const errorBody = typeof error.context.body === 'string' 
          ? JSON.parse(error.context.body) 
          : error.context.body;
        errorMessage = errorBody.error?.message || errorBody.message || errorMessage;
      } catch (parseError) {
        // If parsing fails, use the original error message
        errorMessage = error.message || errorMessage;
      }
    } else {
      errorMessage = error.message || errorMessage;
    }
    throw new Error(errorMessage);
  }

  if (data?.error) {
    throw new Error(data.error.message || 'Erro ao alterar senha');
  }
}

/**
 * Reset user password using admin privileges (alias for changeUserPassword)
 */
export async function resetUserPassword(userId: string, newPassword: string): Promise<void> {
  return changeUserPassword(userId, newPassword);
}

/**
 * Clones user profile and initiates async product cloning
 * Products are now cloned in background batches to avoid timeout
 * Returns jobId for tracking clone progress
 */
export async function cloneUserComplete(
  originalUserId: string,
  newUserData: {
    email: string;
    password: string;
    name: string;
    slug: string;
  }
): Promise<{ newUserId: string; jobId?: string; totalProducts: number }> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Não autenticado');
  }

  const { data, error } = await supabase.functions.invoke('clone-user', {
    body: { originalUserId, newUserData },
  });

  if (error) {
    // Extract detailed error message from Edge Function response
    let errorMessage = 'Erro ao clonar usuário';
    if (error.context?.body) {
      try {
        const errorBody = typeof error.context.body === 'string'
          ? JSON.parse(error.context.body)
          : error.context.body;
        errorMessage = errorBody.error?.message || errorBody.message || errorMessage;
      } catch (parseError) {
        // If parsing fails, use the original error message
        errorMessage = error.message || errorMessage;
      }
    } else {
      errorMessage = error.message || errorMessage;
    }
    throw new Error(errorMessage);
  }

  if (data?.error) {
    throw new Error(data.error.message || 'Erro ao clonar usuário');
  }

  return {
    newUserId: data.newUserId,
    jobId: data.jobId,
    totalProducts: data.totalProducts || 0
  };
}

/**
 * Create a new user with admin privileges
 */
export async function createUser(userData: {
  email: string;
  password: string;
  name: string;
  country_code?: string;
  whatsapp?: string;
  role: string;
}): Promise<{ userId: string }> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Não autenticado');
  }

  const { data, error } = await supabase.functions.invoke('create-user', {
    body: {
      ...userData,
      country_code: userData.country_code || '55'
    },
  });

  if (error) {
    let errorMessage = 'Erro ao criar usuário';
    if (error.context?.body) {
      try {
        const errorBody = typeof error.context.body === 'string'
          ? JSON.parse(error.context.body)
          : error.context.body;
        errorMessage = errorBody.error?.message || errorBody.error || errorBody.message || errorMessage;
      } catch (parseError) {
        errorMessage = error.message || errorMessage;
      }
    } else {
      errorMessage = error.message || errorMessage;
    }
    throw new Error(errorMessage);
  }

  if (data?.error) {
    throw new Error(data.error.message || data.error || 'Erro ao criar usuário');
  }

  return { userId: data.userId };
}

/**
 * Copy products and categories from one user to another using Edge Function
 * Uses SERVICE_ROLE_KEY to bypass RLS for admin operations
 */
export async function copyProductsBetweenUsers(sourceUserId: string, targetUserId: string): Promise<{
  success: boolean;
  message: string;
  stats: {
    copiedCategories: number;
    copiedProducts: number;
    copiedImages: number;
    copiedPriceTiers: number;
  };
}> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Não autenticado');
  }

  // Validate users exist first
  const [sourceUserData, targetUserData] = await Promise.all([
    supabase.from('users').select('id, name').eq('id', sourceUserId).maybeSingle(),
    supabase.from('users').select('id, name').eq('id', targetUserId).maybeSingle(),
  ]);

  if (sourceUserData.error) {
    throw new Error(`Erro ao validar usuário de origem: ${sourceUserData.error.message}`);
  }

  if (!sourceUserData.data) {
    throw new Error('Usuário de origem não encontrado');
  }

  if (targetUserData.error) {
    throw new Error(`Erro ao validar usuário de destino: ${targetUserData.error.message}`);
  }

  if (!targetUserData.data) {
    throw new Error('Usuário de destino não encontrado');
  }

  // Fetch all product IDs for the source user
  const { data: products, error: fetchError } = await supabase
    .from('products')
    .select('id')
    .eq('user_id', sourceUserId);

  if (fetchError) {
    throw new Error(`Erro ao buscar produtos: ${fetchError.message}`);
  }

  const productIds = products?.map(product => product.id) || [];

  if (productIds.length === 0) {
    throw new Error('Nenhum produto encontrado para copiar');
  }

  const { data, error } = await supabase.functions.invoke('copy-products-between-users', {
    body: { sourceUserId, targetUserId, productIds },
  });

  if (error) {
    let errorMessage = 'Erro ao copiar produtos';
    let details = '';

    console.error('Edge function error:', { error, context: error.context });

    if (error.context?.body) {
      try {
        const errorBody = typeof error.context.body === 'string'
          ? JSON.parse(error.context.body)
          : error.context.body;

        errorMessage = errorBody.error || errorBody.message || errorMessage;
        details = errorBody.details?.message || errorBody.details || '';

        // More specific error messages
        if (typeof errorMessage === 'string') {
          if (errorMessage.includes('Erro ao inserir')) {
            errorMessage = 'Erro ao inserir produtos: Verifique se há conflitos de nomes de produtos.';
          } else if (errorMessage.includes('No products found')) {
            errorMessage = 'O usuário de origem não possui produtos para copiar.';
          } else if (errorMessage.includes('Missing')) {
            errorMessage = 'Dados obrigatórios ausentes. Verifique se os usuários foram selecionados corretamente.';
          }
        }
      } catch (parseError) {
        console.error('Error parsing error body:', parseError);
        errorMessage = error.message || errorMessage;
      }
    } else {
      errorMessage = error.message || errorMessage;
    }

    const fullMessage = details ? `${errorMessage} (${details})` : errorMessage;
    throw new Error(fullMessage);
  }

  if (data?.error) {
    throw new Error(data.error.message || data.error || 'Erro ao copiar produtos');
  }

  if (!data?.success) {
    throw new Error(data?.message || 'Operação de cópia falhou');
  }

  return data;
}

export async function updateUserImageLimit(userId: string, maxImages: number): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Não autenticado');
  }

  const { error } = await supabase
    .from('users')
    .update({ max_images_per_product: maxImages })
    .eq('id', userId);

  if (error) {
    throw new Error(error.message || 'Erro ao atualizar limite de imagens');
  }
}

export async function updateUserImageLimitBulk(userIds: string[], maxImages: number): Promise<{
  success: boolean;
  affectedCount: number;
}> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Não autenticado');
  }

  if (userIds.length === 0) {
    throw new Error('Nenhum usuário selecionado');
  }

  if (maxImages < 1 || maxImages > 50) {
    throw new Error('O limite deve estar entre 1 e 50 imagens');
  }

  const { error } = await supabase
    .from('users')
    .update({ max_images_per_product: maxImages })
    .in('id', userIds);

  if (error) {
    throw new Error(error.message || 'Erro ao atualizar limite de imagens em massa');
  }

  return {
    success: true,
    affectedCount: userIds.length
  };
}