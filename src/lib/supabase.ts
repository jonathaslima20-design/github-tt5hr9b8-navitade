import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallbacks and validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

// Enhanced validation for environment variables
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'undefined' || supabaseAnonKey === 'undefined') {
  console.error('❌ SUPABASE CONFIGURATION ERROR:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlValue: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'undefined',
    keyValue: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'undefined',
    environment: import.meta.env.MODE,
    allEnvVars: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'))
  });
  
  throw new Error(
    `❌ ERRO DE CONFIGURAÇÃO: Variáveis de ambiente do Supabase não encontradas ou inválidas.
    
    Verifique se as seguintes variáveis estão configuradas corretamente:
    - VITE_SUPABASE_URL: ${supabaseUrl ? 'Configurada' : 'NÃO ENCONTRADA'}
    - VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'Configurada' : 'NÃO ENCONTRADA'}
    
    Ambiente atual: ${import.meta.env.MODE}
    
    Para resolver:
    1. Verifique se as variáveis estão no arquivo .env correto
    2. Certifique-se de que começam com VITE_
    3. Reinicie o servidor de desenvolvimento
    4. Em produção, configure as variáveis no painel de hospedagem`
  );
}

// Log successful configuration (only in development)
if (import.meta.env.DEV) {
  console.log('✅ SUPABASE CONFIGURED:', {
    url: `${supabaseUrl.substring(0, 30)}...`,
    keyLength: supabaseAnonKey.length,
    environment: import.meta.env.MODE
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'vitrineturbo-web'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  // Add retry configuration for network issues
  retries: 3,
  // Add timeout configuration
  fetch: (url, options = {}) => {
    return fetch(url, {
      ...options,
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });
  }
});

// Add session change listener for debugging
supabase.auth.onAuthStateChange((event, session) => {
  console.log('🔐 AUTH STATE CHANGE:', {
    event,
    userEmail: session?.user?.email,
    hasSession: !!session,
    timestamp: new Date().toISOString()
  });
  
  if (event === 'TOKEN_REFRESHED') {
    console.log('🔄 Token refreshed successfully');
  }
  
  if (event === 'SIGNED_OUT') {
    console.log('🚪 User signed out');
    localStorage.clear(); // Clear all stored data on sign out
  }
  
  if (event === 'SIGNED_IN') {
    console.log('✅ User signed in successfully');
  }
  
  if (event === 'USER_UPDATED') {
    console.log('👤 User profile updated');
  }
});

export default supabase;