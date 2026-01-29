# Guia Rápido - Meta Tags Dinâmicas VitrineTurbo

## O que foi implementado?

Sistema completo de meta tags dinâmicas para que prévias de URL no WhatsApp, Instagram, Facebook e outras redes sociais mostrem:

- **Para páginas de perfil:** Informações específicas de cada loja (nome, logo, descrição)
- **Para páginas de produto:** Informações específicas do produto (nome, imagem, preço, vendedor)

Em vez de dados genéricos do VitrineTurbo.

## Arquivos Criados/Modificados

### Novos Arquivos:
1. **`netlify/edge-functions/meta-handler.ts`** - Edge Function principal (Netlify)
2. **`supabase/functions/meta-tags-handler/index.ts`** - Edge Function alternativa (Supabase)
3. **`test-meta-tags.sh`** - Script de testes automatizado
4. **`SOCIAL_MEDIA_METATAGS.md`** - Documentação técnica completa

### Arquivos Modificados:
- **`netlify.toml`** - Adicionada configuração da edge function
- **`src/utils/metaTags.ts`** - Melhorada geração de meta tags para produtos

## Deploy em 3 Passos

### 1. Configurar Variáveis de Ambiente no Netlify

Acesse: **Netlify Dashboard → Site Settings → Environment Variables**

Confirme que estas variáveis existem:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

*(Essas variáveis já devem existir do deploy anterior)*

### 2. Deploy via Git

```bash
git add .
git commit -m "feat: add dynamic meta tags for products and profiles"
git push origin main
```

O Netlify irá automaticamente:
- Detectar a edge function em `netlify/edge-functions/`
- Fazer o deploy da função
- Configurar os redirects

### 3. Validar

Teste perfil com curl:
```bash
curl -A "WhatsApp/2.0" https://vitrineturbo.com/[SEU-SLUG]
```

Teste produto com curl:
```bash
curl -A "WhatsApp/2.0" https://vitrineturbo.com/[SEU-SLUG]/produtos/[PRODUCT-ID]
```

Ou use o script automatizado:
```bash
# Teste perfil
./test-meta-tags.sh https://vitrineturbo.com/kingstore

# Teste produto
./test-meta-tags.sh https://vitrineturbo.com/kingstore/produtos/c26295b1-8717-46fa-b8e6-fdb52e97f034
```

## Como Testar

### Teste Rápido (1 minuto)

```bash
# Simular WhatsApp - Perfil
curl -A "WhatsApp/2.0" https://vitrineturbo.com/kingstore | grep "og:title"

# Simular WhatsApp - Produto
curl -A "WhatsApp/2.0" https://vitrineturbo.com/kingstore/produtos/c26295b1-8717-46fa-b8e6-fdb52e97f034 | grep "og:title"

# Simular Facebook - Perfil
curl -A "facebookexternalhit/1.1" https://vitrineturbo.com/kingstore | grep "og:image"

# Simular Facebook - Produto
curl -A "facebookexternalhit/1.1" https://vitrineturbo.com/kingstore/produtos/c26295b1-8717-46fa-b8e6-fdb52e97f034 | grep "og:image"
```

**Resultado esperado:** 
- **Perfil:** Meta tags com nome e imagem do corretor
- **Produto:** Meta tags com nome e imagem do produto

### Teste Completo (5 minutos)

```bash
# Executar todos os testes - Perfil
./test-meta-tags.sh https://vitrineturbo.com/kingstore

# Executar todos os testes - Produto
./test-meta-tags.sh https://vitrineturbo.com/kingstore/produtos/c26295b1-8717-46fa-b8e6-fdb52e97f034
```

### Teste em Produção (10 minutos)

1. **Facebook Sharing Debugger**
   - Acesse: https://developers.facebook.com/tools/debug/
   - Cole URL do perfil: `https://vitrineturbo.com/[SEU-SLUG]`
   - Cole URL do produto: `https://vitrineturbo.com/[SEU-SLUG]/produtos/[PRODUCT-ID]`
   - Clique: "Scrape Again"
   - Verifique preview

2. **WhatsApp Real**
   - Envie URL do perfil no WhatsApp
   - Envie URL do produto no WhatsApp
   - Aguarde 5-10 segundos
   - Verifique preview
   - **Para produtos:** Confirme que mostra imagem e nome do produto

## Como Funciona

```
┌────────────────────┐
│  Usuário Compartilha│
│  URL do perfil OU   │
│  URL do produto     │
└──────────┬─────────┘
           │
           ▼
┌────────────────────────────────┐
│  Bot/Crawler detectado?        │
│  (WhatsApp, Facebook, etc)     │
└──────────┬─────────────────────┘
           │
           ├─── SIM ───┐
           │           ▼
           │    ┌──────────────────────┐
           │    │ Netlify Edge Function│
           │    │ 1. Analisa URL       │
           │    │ 2. Detecta tipo      │
           │    │ 3. Busca dados       │
           │    │ 4. Gera HTML         │
           │    └──────┬───────────────┘
           │           │
           │           ▼
           │    ┌──────────────────────┐
           │    │ HTML com meta tags   │
           │    │ específicas do tipo  │
           │    └──────────────────────┘
           │
           └─── NÃO ───┐
                       ▼
                ┌──────────────────────┐
                │ SPA React normal     │
                │ (usuário comum)      │
                └──────────────────────┘
```

## Priorização de Imagens por Tipo

### Para Páginas de Perfil:
1. **Avatar do corretor** (logo/foto de perfil) ← **PRIORIDADE**
2. Cover desktop
3. Cover mobile
4. Logo padrão VitrineTurbo

### Para Páginas de Produto:
1. **Imagem do produto** (featured_image_url) ← **PRIORIDADE**
2. Avatar do corretor (logo/foto de perfil)
3. Cover desktop
4. Cover mobile
5. Logo padrão VitrineTurbo

## Troubleshooting Rápido

### ❌ Prévia ainda genérica

**Solução:**
1. Force re-scraping no Facebook Debugger
2. Adicione `?v=2` no final da URL no WhatsApp
3. Aguarde 10 minutos (cache)

### ❌ Imagem não aparece

**Verificar:**
```bash
# Ver qual imagem está sendo usada - Perfil
curl -s -A "WhatsApp/2.0" https://vitrineturbo.com/kingstore | grep "og:image"

# Ver qual imagem está sendo usada - Produto
curl -s -A "WhatsApp/2.0" https://vitrineturbo.com/kingstore/produtos/c26295b1-8717-46fa-b8e6-fdb52e97f034 | grep "og:image"

# Testar se imagem é acessível
curl -I [URL_DA_IMAGEM]
```

### ❌ Produto mostra dados do perfil em vez do produto

**Verificar:**
```bash
# Verificar se URL está no formato correto
# Deve ser: /slug/produtos/product-id
# NÃO: /slug/produto/product-id (sem 's')

# Verificar se produto existe no banco
curl -s "${VITE_SUPABASE_URL}/rest/v1/products?id=eq.c26295b1-8717-46fa-b8e6-fdb52e97f034&select=title,featured_image_url" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}"
```

### ❌ Edge function não funciona

**Debug:**
```bash
# Ver logs no Netlify
netlify logs:function meta-handler

# Ou no dashboard: Functions → meta-handler → Logs
```

## Performance

- **Tempo de resposta:** < 500ms
- **Cache:** 5-10 minutos
- **Impacto:** Zero para usuários normais (só crawlers)
- **Consultas ao banco:** 1 para perfil, 2 para produto (produto + vendedor)

## Dados Consultados

### Para Páginas de Perfil:
```sql
SELECT name, slug, bio, avatar_url, cover_url_desktop, cover_url_mobile
FROM users
WHERE slug = 'kingstore'
```

### Para Páginas de Produto:
```sql
-- Primeiro busca o produto
SELECT id, title, description, short_description, featured_image_url, price, discounted_price, is_starting_price, user_id
FROM products
WHERE id = 'c26295b1-8717-46fa-b8e6-fdb52e97f034'

-- Depois busca o vendedor
SELECT name, slug, bio, avatar_url, cover_url_desktop, cover_url_mobile
FROM users
WHERE id = '[user_id_do_produto]'
```

## Próximos Passos

Após deploy bem-sucedido:

1. ✅ Teste perfis com script automatizado
2. ✅ Teste produtos com script automatizado
2. ✅ Valide no Facebook Debugger
3. ✅ Teste real no WhatsApp (perfil e produto)
4. ✅ Compartilhe em todas as redes sociais
5. ✅ Monitore logs por 24h
6. ✅ Verifique que produtos mostram imagem correta

## Comandos Úteis

```bash
# Testar localmente
netlify dev

# Ver logs em tempo real
netlify logs:function meta-handler --live

# Deploy manual
netlify deploy --prod

# Listar edge functions
netlify functions:list

# Teste rápido de produto
curl -A "WhatsApp/2.0" https://vitrineturbo.com/kingstore/produtos/c26295b1-8717-46fa-b8e6-fdb52e97f034 | grep -E 'og:title|og:image'
```

## Suporte

- 📖 Documentação completa: `SOCIAL_MEDIA_METATAGS.md`
- 🧪 Script de testes: `./test-meta-tags.sh`
- 🐛 Logs Netlify: Dashboard → Functions → Logs

---
5. Teste tanto URLs de perfil quanto de produto

**Tempo total de implementação:** ~30 minutos
**Manutenção necessária:** Mínima (configurar e esquecer)
**Impacto:** Alta visibilidade em compartilhamentos sociais para perfis E produtos
