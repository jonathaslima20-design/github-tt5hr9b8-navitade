# GUIA DE TROUBLESHOOTING - CATEGORIA NIKE

## 🚨 PROBLEMA IDENTIFICADO
**Produtos da categoria Nike não estão sendo exibidos corretamente na vitrine externa**

## 📋 CHECKLIST DE VERIFICAÇÃO RÁPIDA

### 1. **Verificação Básica (2 minutos)**
```bash
# Acesse a vitrine: /spcalcados
# Abra o console do navegador (F12)
# Procure por logs com "NIKE_DIAGNOSTIC" ou "NIKE_PRODUCT_ANALYSIS"
```

**O que verificar:**
- [ ] Quantos produtos Nike estão cadastrados vs. quantos aparecem
- [ ] Se existem variações do nome "Nike" (nike, NIKE, Nike )
- [ ] Se os produtos estão marcados como visíveis (`is_visible_on_storefront: true`)

### 2. **Verificação de Configurações (3 minutos)**
```bash
# Acesse: /dashboard/settings → Vitrine → Organização
# Procure pela categoria "Nike"
```

**O que verificar:**
- [ ] Categoria Nike está habilitada (switch ligado)
- [ ] Limite de itens não está muito baixo (recomendado: 12+)
- [ ] Ordem da categoria está correta

### 3. **Verificação de Dados (5 minutos)**
```bash
# No console do navegador, execute:
# diagnoseNikeCategory('USER_ID_DO_CORRETOR')
```

## 🔧 SOLUÇÕES POR ORDEM DE PRIORIDADE

### **SOLUÇÃO 1: Correção Automática (Mais Provável)**
```javascript
// Execute no console do navegador:
// 1. Primeiro, identifique o USER_ID do corretor (spcalcados)
// USER_ID: Obtenha em /dashboard/settings ou use o diagnóstico

// 2. Importe e execute o diagnóstico
import { diagnoseNikeIssues, fixNikeIssues, enableAllNikeProducts } from '/src/utils/nikeFixUtility.ts';

// 3. Execute o diagnóstico completo
await diagnoseNikeIssues('USER_ID_AQUI')

// 4. Execute a correção automática
await fixNikeIssues('USER_ID_AQUI')

// 5. Habilite todos os produtos Nike
await enableAllNikeProducts('USER_ID_AQUI')

// 6. Force recarregamento da página
window.location.reload()
```

**Esta solução:**
- Normaliza todas as variações de "Nike" para "Nike"
- Força sincronização das configurações
- Verifica se a categoria está habilitada

### **SOLUÇÃO 2: Verificação Manual de Produtos**
1. Acesse `/dashboard/listings`
2. Filtre por categoria "Nike"
3. Verifique se todos os produtos estão:
   - ✅ Visíveis na vitrine (switch ligado)
   - ✅ Status "Disponível"
   - ✅ Categoria escrita exatamente como "Nike"

### **SOLUÇÃO 3: Reconfiguração da Categoria**
1. Acesse `/dashboard/settings` → Vitrine → Organização
2. Localize a categoria Nike
3. Verifique/ajuste:
   - ✅ Habilitada: SIM
   - ✅ Limite de itens: 12 ou mais
   - ✅ Ordem: posição desejada

### **SOLUÇÃO 4: Limpeza de Cache**
1. Abra o navegador em modo incógnito
2. Acesse a vitrine novamente
3. Se funcionar, limpe o cache do navegador normal

## 🐛 DIAGNÓSTICO AVANÇADO

### **Comandos de Debug**
```javascript
// Habilitar logs detalhados
localStorage.setItem('debug_categories', 'true');
localStorage.setItem('debug_nike', 'true');

// Verificar estado das categorias
console.log('Categories State:', JSON.parse(localStorage.getItem('categories_state') || '{}'));

// Verificar produtos Nike especificamente
console.log('Nike Products Check:', 
  document.querySelectorAll('[data-category*="nike" i], [data-category*="Nike"]').length
);

// Forçar recarregamento
window.location.reload();
```

### **Verificação de Banco de Dados**
```sql
-- Verificar produtos Nike
SELECT id, title, category, is_visible_on_storefront, status 
FROM products 
WHERE user_id = 'USER_ID' 
AND category @> '["Nike"]';

-- Verificar configurações da vitrine
SELECT settings 
FROM user_storefront_settings 
WHERE user_id = 'USER_ID';
```

## ⚡ SOLUÇÕES RÁPIDAS MAIS COMUNS

### **Problema: Categoria com espaços**
```javascript
// Produtos com " Nike " ou "nike" em vez de "Nike"
// Solução: Execute fixNikeCategory()
```

### **Problema: Categoria desabilitada**
```bash
# Acesse: /dashboard/settings → Vitrine → Organização
# Habilite a categoria Nike
```

### **Problema: Limite muito baixo**
```bash
# Nas configurações de categoria, aumente o limite para 12+
```

### **Problema: Produtos ocultos**
```bash
# Em /dashboard/listings, ative a visibilidade dos produtos Nike
```

## 📊 MONITORAMENTO CONTÍNUO

### **Métricas a Acompanhar:**
- Número de produtos Nike visíveis vs. cadastrados
- Tempo de carregamento da categoria Nike
- Taxa de conversão dos produtos Nike

### **Alertas Recomendados:**
- Produtos Nike não aparecendo (> 10% dos casos)
- Discrepância entre produtos cadastrados e visíveis
- Erros de sincronização de categoria

## 🎯 RESULTADO ESPERADO

Após aplicar as soluções:
- ✅ Todos os produtos Nike cadastrados devem aparecer na vitrine
- ✅ Categoria Nike deve estar organizada corretamente
- ✅ Não deve haver duplicatas ou inconsistências
- ✅ Performance de carregamento deve ser adequada

## 📞 SUPORTE ADICIONAL

Se o problema persistir após todas as verificações:
1. Documente os logs do console
2. Anote quantos produtos Nike estão cadastrados vs. visíveis
3. Verifique se outras categorias têm o mesmo problema
4. Execute o diagnóstico completo e compartilhe os resultados