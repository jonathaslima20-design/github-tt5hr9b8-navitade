# Diagnóstico: Meta Tags Não Mostram Avatar/Cover

## Problema Identificado

As meta tags dinâmicas não estão mostrando o avatar, cover desktop ou cover mobile dos corretores nas prévias de redes sociais.

## Causa Raiz Descoberta

Após investigação, identifiquei que **o banco de dados Supabase pode não ter tabelas criadas ou dados necessários**. Isso significa:

1. ❌ A tabela `users` pode não existir
2. ❌ As migrações SQL podem não ter sido aplicadas
3. ❌ As edge functions não conseguem consultar dados
4. ❌ Meta tags retornam fallback (imagem padrão)

## Como Verificar o Problema

### 1. Verificar se as Tabelas Existem

Acesse o **Supabase Dashboard** → **Table Editor** e verifique se você vê estas tabelas:
- `users`
- `products`
- `product_images`
- `user_product_categories`

**Se não vir tabelas:** Suas migrações não foram aplicadas.

### 2. Verificar Dados de Usuários

Se as tabelas existirem, execute esta query no **SQL Editor**:

```sql
SELECT id, name, slug, avatar_url, cover_url_desktop, cover_url_mobile
FROM users
WHERE slug IS NOT NULL
LIMIT 10;
```

**Resultado esperado:**
- Deve mostrar usuários com slugs
- Pelo menos alguns devem ter `avatar_url` preenchido

**Se retornar vazio:** Você não tem usuários cadastrados ou os campos de imagem estão vazios.

### 3. Testar a Edge Function Manualmente

Execute este comando substituindo os valores:

```bash
curl -X GET \
  "https://[SEU_PROJETO].supabase.co/functions/v1/meta-tags-handler?url=https://vitrineturbo.com/[SEU_SLUG]" \
  -H "Authorization: Bearer [SUA_ANON_KEY]" \
  -A "WhatsApp/2.0" \
  -v
```

**Resposta esperada:** HTML com meta tags personalizadas

**Se retornar erro 404/500:** A edge function não está deployada ou há erro na consulta.

## Solução Passo a Passo

### PASSO 1: Aplicar Migrações ao Banco

Você tem duas opções:

#### Opção A: Usar o Supabase CLI (Recomendado)

```bash
# 1. Instalar Supabase CLI (se não tiver)
npm install -g supabase

# 2. Login no Supabase
supabase login

# 3. Linkar seu projeto
supabase link --project-ref [SEU_PROJECT_REF]

# 4. Aplicar todas as migrações
supabase db push
```

#### Opção B: Aplicar Manualmente via Dashboard

1. Acesse **Supabase Dashboard** → **SQL Editor**
2. Abra o arquivo `/supabase/migrations/20250609164838_autumn_recipe.sql`
3. Copie todo o conteúdo
4. Cole no SQL Editor
5. Clique em **RUN**
6. Repita para as outras migrações em ordem cronológica

### PASSO 2: Criar Usuários de Teste

Depois das tabelas criadas, insira dados de teste:

```sql
-- Inserir usuário de teste
INSERT INTO users (
  email,
  name,
  slug,
  bio,
  avatar_url,
  role
) VALUES (
  'teste@exemplo.com',
  'King Store',
  'kingstore',
  'Confira os melhores produtos esportivos e casual da King Store. Nike, Adidas, Puma e muito mais!',
  'https://exemplo.supabase.co/storage/v1/object/public/avatars/kingstore.png',
  'corretor'
);
```

**IMPORTANTE:** Substitua o `avatar_url` por uma URL real de imagem acessível.

### PASSO 3: Deploy da Edge Function

A edge function já está criada no código. Você precisa fazer o deploy:

#### Para Supabase Edge Function:

```bash
# Deploy usando CLI
supabase functions deploy meta-tags-handler
```

#### Para Netlify Edge Function:

A function já está em `netlify/edge-functions/meta-handler.ts`.
Basta fazer o deploy do projeto:

```bash
git add .
git commit -m "fix: ensure meta tags edge function is deployed"
git push origin main
```

O Netlify irá detectar e deployar automaticamente.

### PASSO 4: Configurar Variáveis de Ambiente

#### No Netlify Dashboard:

1. Vá em **Site Settings** → **Environment Variables**
2. Confirme que estas variáveis existem:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Se faltarem, adicione-as com os valores do Supabase

#### No Supabase:

As variáveis `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` já estão configuradas automaticamente nas edge functions.

### PASSO 5: Testar a Solução

Use o script de diagnóstico que criei:

```bash
./test-meta-tags.sh https://vitrineturbo.com/kingstore
```

Ou teste manualmente:

```bash
# Simular WhatsApp
curl -A "WhatsApp/2.0" https://vitrineturbo.com/kingstore | grep "og:image"

# Deve retornar algo como:
# <meta property="og:image" content="https://[avatar-url]" />
```

## Checklist de Validação

Use este checklist para garantir que tudo está funcionando:

- [ ] **Banco de dados:**
  - [ ] Tabelas criadas (visíveis no Table Editor)
  - [ ] Usuários com slug cadastrados
  - [ ] Pelo menos um usuário tem `avatar_url` preenchido

- [ ] **Edge Functions:**
  - [ ] Supabase edge function deployada (ou)
  - [ ] Netlify edge function configurada
  - [ ] Variáveis de ambiente configuradas

- [ ] **Dados de Teste:**
  - [ ] Existe usuário com slug "kingstore" (ou outro)
  - [ ] Avatar URL é válida e acessível
  - [ ] Bio está preenchida

- [ ] **Testes:**
  - [ ] `curl` com WhatsApp retorna meta tags personalizadas
  - [ ] Facebook Debugger mostra preview correto
  - [ ] WhatsApp real mostra preview com avatar

## Comandos de Diagnóstico

### Verificar se tabelas existem:

```bash
# Via API REST do Supabase
curl "https://[SEU_PROJETO].supabase.co/rest/v1/" \
  -H "apikey: [SUA_ANON_KEY]"
```

### Verificar dados de um usuário específico:

```bash
curl "https://[SEU_PROJETO].supabase.co/rest/v1/users?slug=eq.kingstore&select=name,slug,avatar_url" \
  -H "apikey: [SUA_ANON_KEY]" \
  -H "Authorization: Bearer [SUA_ANON_KEY]"
```

### Testar edge function:

```bash
# Netlify
curl -A "WhatsApp/2.0" "https://vitrineturbo.com/kingstore" -I

# Supabase (direto)
curl -A "WhatsApp/2.0" \
  "https://[SEU_PROJETO].supabase.co/functions/v1/meta-tags-handler?url=https://vitrineturbo.com/kingstore" \
  -H "Authorization: Bearer [SUA_ANON_KEY]"
```

## Problemas Comuns e Soluções

### Problema 1: "Tabela users não existe"

**Causa:** Migrações não aplicadas

**Solução:**
```bash
supabase db push
```

Ou aplique manualmente via SQL Editor.

### Problema 2: Meta tags mostram imagem padrão

**Causa:** Campo `avatar_url` está vazio ou NULL

**Solução:**
```sql
-- Atualizar avatar de um usuário
UPDATE users
SET avatar_url = 'https://URL_DA_IMAGEM_AQUI.png'
WHERE slug = 'kingstore';
```

### Problema 3: Edge function retorna 404

**Causa:** Function não deployada

**Solução:**
```bash
# Para Supabase
supabase functions deploy meta-tags-handler

# Para Netlify
git push origin main  # Deploy automático
```

### Problema 4: Imagem não carrega na prévia

**Causa:** URL da imagem não é acessível ou não é HTTPS

**Solução:**
1. Verifique se a URL é HTTPS
2. Teste acesso direto: `curl -I [URL_DA_IMAGEM]`
3. Use imagens do Supabase Storage (já configurado no projeto)

### Problema 5: Funciona no curl mas não no WhatsApp

**Causa:** Cache do WhatsApp

**Solução:**
1. Adicione `?v=2` no final da URL
2. Aguarde 5-10 minutos
3. Teste em outro dispositivo

## Próximos Passos Imediatos

**Para resolver AGORA:**

1. **Primeiro:** Verifique se as tabelas existem
   ```
   Dashboard Supabase → Table Editor
   ```

2. **Se não existirem:** Aplique as migrações
   ```bash
   supabase db push
   ```

3. **Crie um usuário de teste:**
   ```sql
   INSERT INTO users (email, name, slug, bio, avatar_url, role)
   VALUES (
     'teste@exemplo.com',
     'Minha Loja Teste',
     'minhaloja',
     'Descrição da minha loja',
     'https://ikvwygqmlqhsyqmpgaoz.supabase.co/storage/v1/object/public/public/logos/flat-icon-vitrine.png.png',
     'corretor'
   );
   ```

4. **Teste:**
   ```bash
   curl -A "WhatsApp/2.0" https://vitrineturbo.com/minhaloja | grep "og:title"
   ```

5. **Se funcionar:** Você verá o nome "Minha Loja Teste" nas meta tags!

## Resumo

**O problema não é com as edge functions** (elas estão implementadas corretamente).

**O problema é:**
- ❌ Banco de dados sem tabelas
- ❌ Ou tabelas vazias (sem usuários)
- ❌ Ou usuários sem avatar_url preenchido

**A solução:**
1. Aplicar migrações
2. Inserir dados de teste
3. Testar novamente

Depois disso, as meta tags funcionarão perfeitamente! 🎉