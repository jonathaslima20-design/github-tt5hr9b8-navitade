import { PostgrestError } from '@supabase/supabase-js';

// Error types
export type ErrorType = 
  | 'AUTH_ERROR'
  | 'NETWORK_ERROR'
  | 'DATABASE_ERROR'
  | 'VALIDATION_ERROR'
  | 'PERMISSION_ERROR'
  | 'NOT_FOUND'
  | 'BLOCKED_USER'
  | 'UNKNOWN_ERROR';

// Error messages mapping
export const errorMessages: Record<ErrorType, string> = {
  AUTH_ERROR: 'E-mail ou senha incorretos!',
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet.',
  DATABASE_ERROR: 'Erro ao acessar o banco de dados.',
  VALIDATION_ERROR: 'Dados inválidos. Verifique as informações.',
  PERMISSION_ERROR: 'Você não tem permissão para realizar esta ação.',
  NOT_FOUND: 'O recurso solicitado não foi encontrado.',
  BLOCKED_USER: 'Usuário desabilitado por pendência financeira, entre em contato com o suporte.',
  UNKNOWN_ERROR: 'Ocorreu um erro inesperado. Tente novamente.',
};

// Supabase error codes mapping
const supabaseErrorCodes: Record<string, ErrorType> = {
  'PGRST301': 'DATABASE_ERROR',
  'PGRST302': 'PERMISSION_ERROR',
  'PGRST404': 'NOT_FOUND',
  'auth/invalid-email': 'VALIDATION_ERROR',
  'auth/wrong-password': 'AUTH_ERROR',
  'auth/user-not-found': 'AUTH_ERROR',
  'auth/email-already-in-use': 'VALIDATION_ERROR',
  'invalid_credentials': 'AUTH_ERROR',
  'email_not_confirmed': 'AUTH_ERROR',
  'signup_disabled': 'VALIDATION_ERROR',
  'too_many_requests': 'AUTH_ERROR',
};

// Custom error messages for specific cases
const customErrorMessages: Record<string, string> = {
  // Supabase Auth errors
  'Invalid login credentials': 'E-mail ou senha incorretos!',
  'Email not confirmed': 'Email não confirmado. Verifique sua caixa de entrada.',
  'Invalid API key': 'Erro de configuração: Chave de API inválida.',
  'Invalid JWT': 'Sessão expirada. Faça login novamente.',
  'JWT expired': 'Sessão expirada. Faça login novamente.',
  'User not found': 'E-mail ou senha incorretos!',
  'Wrong password': 'E-mail ou senha incorretos!',
  'Email already registered': 'Este e-mail já está cadastrado no sistema.',
  'Email already in use': 'Este e-mail já está cadastrado no sistema.',
  'Email already exists': 'Este e-mail já está cadastrado no sistema.',
  'Weak password': 'A senha deve ter pelo menos 6 caracteres.',
  'Too many requests': 'Muitas tentativas. Tente novamente em alguns minutos.',
  'Signup disabled': 'Cadastro desabilitado no momento.',

  // Custom application errors - duplicate email
  'EMAIL_ALREADY_EXISTS': 'Este e-mail já está cadastrado no sistema. Por favor, utilize outro e-mail ou entre em contato com o suporte.',
  'DUPLICATE_EMAIL': 'Este e-mail já está cadastrado no sistema. Por favor, utilize outro e-mail ou entre em contato com o suporte.',

  // Custom application errors - blocked user
  'BLOCKED_USER': 'Usuário desabilitado por pendência financeira, entre em contato com o suporte.',
  'USER_BLOCKED': 'Usuário desabilitado por pendência financeira, entre em contato com o suporte.',
  'Usuário bloqueado': 'Usuário desabilitado por pendência financeira, entre em contato com o suporte.',

  // Database errors
  '23505': 'Este registro já existe.',
  '23503': 'Não é possível excluir este registro pois está sendo usado.',
  '42P01': 'Erro interno do banco de dados.',

  // Validation errors
  'email_address_invalid': 'Formato de email inválido.',
  'email_address_not_authorized': 'Este email não está autorizado.',
  'password_too_short': 'A senha deve ter pelo menos 6 caracteres.',
  'invalid_email_format': 'Formato de email inválido.',
};

// Helper function to parse Edge Function error details
function parseEdgeFunctionError(error: any): string | null {
  // Check if it's a FunctionsHttpError with details
  if (error && typeof error === 'object' && 'details' in error) {
    try {
      // Try to parse details as JSON
      const details = typeof error.details === 'string' 
        ? JSON.parse(error.details) 
        : error.details;
      
      // Return the error message from details
      if (details && typeof details === 'object' && 'error' in details) {
        return details.error;
      }
      
      // If details is a string, return it directly
      if (typeof details === 'string') {
        return details;
      }
    } catch (parseError) {
      // If JSON parsing fails, return details as string if it exists
      if (typeof error.details === 'string') {
        return error.details;
      }
    }
  }
  
  return null;
}

// Function to get error message
export function getErrorMessage(error: unknown): string {
  console.log('🔍 ERROR ANALYSIS:', {
    error,
    type: typeof error,
    isError: error instanceof Error,
    hasMessage: error && typeof error === 'object' && 'message' in error,
    hasCode: error && typeof error === 'object' && 'code' in error
  });

  // Handle null/undefined
  if (!error) {
    return errorMessages.UNKNOWN_ERROR;
  }

  // Handle string errors directly
  if (typeof error === 'string') {
    // Check for exact matches first
    if (customErrorMessages[error]) {
      return customErrorMessages[error];
    }
    
    // Check for partial matches
    if (error.toLowerCase().includes('bloqueado') || error.toLowerCase().includes('blocked')) {
      return errorMessages.BLOCKED_USER;
    }
    
    if (error.toLowerCase().includes('credentials') || error.toLowerCase().includes('credenciais')) {
      return errorMessages.AUTH_ERROR;
    }
    
    return error;
  }

  // Handle network errors
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return errorMessages.NETWORK_ERROR;
  }

  // Handle Edge Function errors first
  const edgeFunctionError = parseEdgeFunctionError(error);
  if (edgeFunctionError) {
    // Check if the edge function error has a custom message
    if (customErrorMessages[edgeFunctionError]) {
      return customErrorMessages[edgeFunctionError];
    }
    return edgeFunctionError;
  }

  // Handle Supabase AuthError objects
  if (error && typeof error === 'object' && 'message' in error) {
    const authError = error as { code?: string; message?: string; status?: number };
    
    console.log('🔍 AUTH ERROR DETAILS:', {
      code: authError.code,
      message: authError.message,
      status: authError.status
    });
    
    // Check for blocked user first
    if (authError.message?.toLowerCase().includes('bloqueado') || 
        authError.message?.toLowerCase().includes('blocked') ||
        authError.code === 'USER_BLOCKED') {
      return errorMessages.BLOCKED_USER;
    }
    
    // Check for exact message matches
    if (authError.message && customErrorMessages[authError.message]) {
      return customErrorMessages[authError.message];
    }
    
    // Check for code matches
    if (authError.code && customErrorMessages[authError.code]) {
      return customErrorMessages[authError.code];
    }
    
    // Check for mapped error types by code
    if (authError.code && supabaseErrorCodes[authError.code]) {
      return errorMessages[supabaseErrorCodes[authError.code]];
    }
    
    // Handle common Supabase auth error patterns
    if (authError.message) {
      const message = authError.message.toLowerCase();
      
      if (message.includes('invalid login credentials') || 
          message.includes('invalid credentials') ||
          message.includes('wrong password') ||
          message.includes('user not found')) {
        return errorMessages.AUTH_ERROR;
      }
      
      if (message.includes('email not confirmed')) {
        return 'Email não confirmado. Verifique sua caixa de entrada.';
      }
      
      if (message.includes('too many requests')) {
        return 'Muitas tentativas. Tente novamente em alguns minutos.';
      }
      
      if (message.includes('signup disabled')) {
        return 'Cadastro desabilitado no momento.';
      }
    }
    
    // Return the original message if no mapping found
    return authError.message || errorMessages.UNKNOWN_ERROR;
  }

  // Handle Supabase PostgrestError
  if (isPostgrestError(error)) {
    console.log('🔍 POSTGREST ERROR:', {
      code: error.code,
      message: error.message
    });
    
    // Check for custom message first
    if (error.code && customErrorMessages[error.code]) {
      return customErrorMessages[error.code];
    }

    // Then check for mapped error type
    if (error.code && supabaseErrorCodes[error.code]) {
      return errorMessages[supabaseErrorCodes[error.code]];
    }
    
    return error.message || errorMessages.DATABASE_ERROR;
  }

  // Handle Error objects
  if (error instanceof Error) {
    console.log('🔍 GENERIC ERROR:', {
      message: error.message,
      name: error.name
    });
    
    // Check for blocked user in message
    if (error.message.toLowerCase().includes('bloqueado') || 
        error.message.toLowerCase().includes('blocked')) {
      return errorMessages.BLOCKED_USER;
    }
    
    // Check for exact message match
    if (customErrorMessages[error.message]) {
      return customErrorMessages[error.message];
    }
    
    // Extract error code from message
    const errorCode = extractErrorCode(error.message);
    if (errorCode && customErrorMessages[errorCode]) {
      return customErrorMessages[errorCode];
    }

    // Check for mapped error type
    if (errorCode && supabaseErrorCodes[errorCode]) {
      return errorMessages[supabaseErrorCodes[errorCode]];
    }

    // Return cleaned up error message
    return cleanErrorMessage(error.message);
  }

  console.log('🔍 UNHANDLED ERROR TYPE:', error);
  return errorMessages.UNKNOWN_ERROR;
}

// Helper function to check if error is PostgrestError
function isPostgrestError(error: any): error is PostgrestError {
  return error && typeof error === 'object' && 'code' in error && 'message' in error;
}

// Helper function to extract error code from message
function extractErrorCode(message: string): string | null {
  const codeMatch = message.match(/\[(.*?)\]/);
  return codeMatch ? codeMatch[1] : null;
}

// Helper function to clean up error message
function cleanErrorMessage(message: string): string {
  // Remove technical details and codes
  message = message.replace(/\[.*?\]/g, '').trim();
  message = message.replace(/Error:/i, '').trim();
  
  // Capitalize first letter
  return message.charAt(0).toUpperCase() + message.slice(1);
}

// Function to handle form validation errors
export function getValidationErrorMessage(fieldName: string): string {
  const fieldMessages: Record<string, string> = {
    email: 'Email inválido',
    password: 'Senha inválida',
    name: 'Nome inválido',
    phone: 'Telefone inválido',
    title: 'Título inválido',
    description: 'Descrição inválida',
    price: 'Preço inválido',
    area: 'Área inválida',
    address: 'Endereço inválido',
    city: 'Cidade inválida',
    state: 'Estado inválido',
  };

  return fieldMessages[fieldName] || 'Campo inválido';
}