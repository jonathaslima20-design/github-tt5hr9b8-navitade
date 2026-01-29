import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { validateSession } from '@/lib/auth/simpleAuth';

// Environment validation before app initialization
const validateEnvironment = () => {
  const requiredEnvVars = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };

  const missing = Object.entries(requiredEnvVars)
    .filter(([key, value]) => !value || value === 'undefined')
    .map(([key]) => key);
  if (missing.length > 0) {
    console.error('❌ MISSING ENVIRONMENT VARIABLES:', missing);
    console.error('Available env vars:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));
    
    // Show error in DOM instead of throwing
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `
        <div style="
          min-height: 100vh; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          padding: 20px;
          font-family: system-ui, sans-serif;
          background: #f8fafc;
        ">
          <div style="
            max-width: 500px; 
            background: white; 
            padding: 30px; 
            border-radius: 8px; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
          ">
            <h1 style="color: #dc2626; margin-bottom: 20px;">⚠️ Erro de Configuração</h1>
            <p style="margin-bottom: 20px; color: #374151;">
              As variáveis de ambiente do Supabase não estão configuradas corretamente.
            </p>
            <p style="margin-bottom: 20px; color: #6b7280; font-size: 14px;">
              Variáveis faltando: ${missing.join(', ')}
            </p>
            <button 
              onclick="window.location.reload()" 
              style="
                background: #3b82f6; 
                color: white; 
                border: none; 
                padding: 10px 20px; 
                border-radius: 6px; 
                cursor: pointer;
              "
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      `;
    }
    return false;
  }
  
  console.log('✅ Environment validation passed');
  return true;
};
// Only initialize app if environment is valid
if (validateEnvironment()) {
  // Initialize session validation
  validateSession();
  
  createRoot(document.getElementById('root')!).render(
    <App />
  );
}