#!/bin/bash

# Script de Diagnóstico Completo - Meta Tags VitrineTurbo
# Este script identifica EXATAMENTE qual é o problema com as meta tags

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════════════"
echo "      DIAGNÓSTICO COMPLETO - META TAGS VITRINETURBO"
echo -e "═══════════════════════════════════════════════════════════════════${NC}"
echo ""

# Verificar se as variáveis de ambiente estão configuradas
echo -e "${YELLOW}[1/6]${NC} Verificando variáveis de ambiente..."
echo "────────────────────────────────────────────────────"

if [ -f .env ]; then
    source .env
    echo -e "${GREEN}✓${NC} Arquivo .env encontrado"

    if [ -n "$VITE_SUPABASE_URL" ]; then
        echo -e "${GREEN}✓${NC} VITE_SUPABASE_URL configurado: ${VITE_SUPABASE_URL:0:30}..."
    else
        echo -e "${RED}✗${NC} VITE_SUPABASE_URL NÃO configurado"
        echo -e "${RED}   PROBLEMA: Falta variável de ambiente VITE_SUPABASE_URL${NC}"
        exit 1
    fi

    if [ -n "$VITE_SUPABASE_ANON_KEY" ]; then
        echo -e "${GREEN}✓${NC} VITE_SUPABASE_ANON_KEY configurado"
    else
        echo -e "${RED}✗${NC} VITE_SUPABASE_ANON_KEY NÃO configurado"
        echo -e "${RED}   PROBLEMA: Falta variável de ambiente VITE_SUPABASE_ANON_KEY${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗${NC} Arquivo .env não encontrado"
    echo -e "${RED}   PROBLEMA: Arquivo .env não existe${NC}"
    exit 1
fi
echo ""

# Verificar se tabelas existem
echo -e "${YELLOW}[2/6]${NC} Verificando se tabelas do banco existem..."
echo "────────────────────────────────────────────────────"

TABLES_CHECK=$(curl -s "${VITE_SUPABASE_URL}/rest/v1/" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}")

# Tentar consultar tabela users
USERS_CHECK=$(curl -s "${VITE_SUPABASE_URL}/rest/v1/users?limit=1" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}" 2>&1)

if echo "$USERS_CHECK" | grep -q "relation.*does not exist"; then
    echo -e "${RED}✗${NC} Tabela 'users' NÃO EXISTE"
    echo -e "${RED}   PROBLEMA: Migrações não foram aplicadas${NC}"
    echo ""
    echo -e "${YELLOW}SOLUÇÃO:${NC}"
    echo "   1. Execute: supabase db push"
    echo "   2. Ou aplique manualmente via Supabase Dashboard → SQL Editor"
    echo ""
    exit 1
elif echo "$USERS_CHECK" | grep -q "error"; then
    echo -e "${RED}✗${NC} Erro ao acessar tabela users"
    echo -e "${RED}   PROBLEMA: ${USERS_CHECK}${NC}"
    exit 1
else
    echo -e "${GREEN}✓${NC} Tabela 'users' existe"
fi
echo ""

# Verificar se existem usuários com slug
echo -e "${YELLOW}[3/6]${NC} Verificando usuários cadastrados..."
echo "────────────────────────────────────────────────────"

USERS_WITH_SLUG=$(curl -s "${VITE_SUPABASE_URL}/rest/v1/users?select=id,name,slug&slug=not.is.null" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}")

USER_COUNT=$(echo "$USERS_WITH_SLUG" | grep -o '"id"' | wc -l)

if [ "$USER_COUNT" -eq 0 ]; then
    echo -e "${RED}✗${NC} Nenhum usuário com slug encontrado"
    echo -e "${RED}   PROBLEMA: Banco sem usuários cadastrados${NC}"
    echo ""
    echo -e "${YELLOW}SOLUÇÃO:${NC}"
    echo "   Execute no SQL Editor:"
    echo ""
    echo "   INSERT INTO users (email, name, slug, bio, avatar_url, role)"
    echo "   VALUES ("
    echo "     'teste@exemplo.com',"
    echo "     'Minha Loja',"
    echo "     'minhaloja',"
    echo "     'Descrição da loja',"
    echo "     'https://exemplo.com/avatar.png',"
    echo "     'corretor'"
    echo "   );"
    echo ""
    exit 1
else
    echo -e "${GREEN}✓${NC} Encontrados ${USER_COUNT} usuários com slug"
    echo ""
    echo "   Usuários encontrados:"
    echo "$USERS_WITH_SLUG" | grep -oP '"name":"[^"]*"' | sed 's/"name":"//;s/"$//' | while read name; do
        slug=$(echo "$USERS_WITH_SLUG" | grep -oP "\"name\":\"$name\".*?\"slug\":\"[^\"]*\"" | grep -oP '"slug":"[^"]*"' | sed 's/"slug":"//;s/"$//')
        echo "   - $name ($slug)"
    done
fi
echo ""

# Verificar se usuários têm avatar_url
echo -e "${YELLOW}[4/6]${NC} Verificando avatares dos usuários..."
echo "────────────────────────────────────────────────────"

USERS_WITH_AVATAR=$(curl -s "${VITE_SUPABASE_URL}/rest/v1/users?select=name,slug,avatar_url,cover_url_desktop,cover_url_mobile&slug=not.is.null&avatar_url=not.is.null" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}")

AVATAR_COUNT=$(echo "$USERS_WITH_AVATAR" | grep -o '"avatar_url"' | wc -l)

if [ "$AVATAR_COUNT" -eq 0 ]; then
    echo -e "${RED}✗${NC} Nenhum usuário tem avatar_url configurado"
    echo -e "${RED}   PROBLEMA: Campo avatar_url vazio${NC}"
    echo ""
    echo -e "${YELLOW}SOLUÇÃO:${NC}"
    echo "   Execute no SQL Editor:"
    echo ""
    echo "   UPDATE users"
    echo "   SET avatar_url = 'https://[URL_DA_SUA_IMAGEM].png'"
    echo "   WHERE slug = '[seu-slug]';"
    echo ""
    exit 1
else
    echo -e "${GREEN}✓${NC} ${AVATAR_COUNT} usuários têm avatar configurado"
fi
echo ""

# Pegar primeiro usuário com avatar para testar
FIRST_SLUG=$(echo "$USERS_WITH_AVATAR" | grep -oP '"slug":"[^"]*"' | head -1 | sed 's/"slug":"//;s/"$//')
FIRST_AVATAR=$(echo "$USERS_WITH_AVATAR" | grep -oP '"avatar_url":"[^"]*"' | head -1 | sed 's/"avatar_url":"//;s/"$//')

if [ -n "$FIRST_SLUG" ]; then
    echo -e "${BLUE}   Usuário de teste: ${FIRST_SLUG}${NC}"
    echo -e "${BLUE}   Avatar URL: ${FIRST_AVATAR:0:60}...${NC}"
fi
echo ""

# Testar se avatar_url é acessível
echo -e "${YELLOW}[5/6]${NC} Testando acessibilidade da imagem do avatar..."
echo "────────────────────────────────────────────────────"

if [ -n "$FIRST_AVATAR" ]; then
    AVATAR_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FIRST_AVATAR")

    if [ "$AVATAR_STATUS" -eq 200 ]; then
        echo -e "${GREEN}✓${NC} Avatar acessível (HTTP $AVATAR_STATUS)"
    else
        echo -e "${RED}✗${NC} Avatar não acessível (HTTP $AVATAR_STATUS)"
        echo -e "${RED}   PROBLEMA: URL do avatar retorna erro${NC}"
        echo ""
        echo -e "${YELLOW}SOLUÇÃO:${NC}"
        echo "   Verifique se a URL está correta:"
        echo "   curl -I \"$FIRST_AVATAR\""
        echo ""
    fi
else
    echo -e "${YELLOW}⚠${NC} Nenhum avatar para testar"
fi
echo ""

# Testar edge function com crawler
echo -e "${YELLOW}[6/6]${NC} Testando edge function com simulação de crawler..."
echo "────────────────────────────────────────────────────"

if [ -n "$FIRST_SLUG" ]; then
    TEST_URL="https://vitrineturbo.com/${FIRST_SLUG}"

    echo "   Testando URL: $TEST_URL"
    echo "   User-Agent: WhatsApp/2.0"
    echo ""

    RESPONSE=$(curl -s -A "WhatsApp/2.0" "$TEST_URL")

    # Verificar se retornou HTML
    if echo "$RESPONSE" | grep -q "<!DOCTYPE html>"; then
        echo -e "${GREEN}✓${NC} Edge function retornou HTML"

        # Verificar meta tags
        OG_TITLE=$(echo "$RESPONSE" | grep -oP '(?<=<meta property="og:title" content=")[^"]*')
        OG_IMAGE=$(echo "$RESPONSE" | grep -oP '(?<=<meta property="og:image" content=")[^"]*')

        if [ -n "$OG_TITLE" ]; then
            echo -e "${GREEN}✓${NC} Meta tag og:title encontrada: $OG_TITLE"
        else
            echo -e "${RED}✗${NC} Meta tag og:title NÃO encontrada"
        fi

        if [ -n "$OG_IMAGE" ]; then
            echo -e "${GREEN}✓${NC} Meta tag og:image encontrada"
            echo "   Imagem: ${OG_IMAGE:0:60}..."

            # Verificar se é o avatar correto
            if [ "$OG_IMAGE" = "$FIRST_AVATAR" ]; then
                echo -e "${GREEN}✓${NC} Imagem é o avatar do usuário (CORRETO!)"
            elif echo "$OG_IMAGE" | grep -q "flat-icon-vitrine"; then
                echo -e "${YELLOW}⚠${NC} Imagem é o fallback padrão do VitrineTurbo"
                echo -e "${YELLOW}   PROBLEMA: Edge function não está usando o avatar do usuário${NC}"
            else
                echo -e "${BLUE}ℹ${NC} Imagem é diferente do avatar esperado"
            fi
        else
            echo -e "${RED}✗${NC} Meta tag og:image NÃO encontrada"
        fi
    else
        echo -e "${RED}✗${NC} Edge function não retornou HTML válido"
        echo -e "${RED}   PROBLEMA: Edge function pode não estar deployada${NC}"
        echo ""
        echo -e "${YELLOW}SOLUÇÃO:${NC}"
        echo "   Deploy da edge function:"
        echo "   git add ."
        echo "   git commit -m 'fix: deploy edge function'"
        echo "   git push origin main"
    fi
else
    echo -e "${YELLOW}⚠${NC} Nenhum usuário para testar"
fi
echo ""

# Relatório final
echo -e "${BLUE}════════════════════════════════════════════════════════════════"
echo "                      RELATÓRIO FINAL"
echo -e "═══════════════════════════════════════════════════════════════════${NC}"
echo ""

if [ "$AVATAR_COUNT" -gt 0 ] && [ -n "$OG_IMAGE" ] && [ "$OG_IMAGE" = "$FIRST_AVATAR" ]; then
    echo -e "${GREEN}✓ DIAGNÓSTICO: Tudo funcionando corretamente!${NC}"
    echo ""
    echo "   As meta tags estão configuradas e funcionando."
    echo "   Próximo passo: Testar no WhatsApp real"
    echo ""
    echo "   1. Envie esta URL no WhatsApp:"
    echo "      $TEST_URL"
    echo ""
    echo "   2. Valide no Facebook Debugger:"
    echo "      https://developers.facebook.com/tools/debug/"
else
    echo -e "${YELLOW}⚠ DIAGNÓSTICO: Problemas identificados${NC}"
    echo ""
    echo "   Revise os erros acima e siga as soluções sugeridas."
    echo ""
    echo "   Principais verificações:"
    echo "   - [ ] Tabelas criadas no banco"
    echo "   - [ ] Usuários com slug cadastrados"
    echo "   - [ ] Avatar_url preenchido e acessível"
    echo "   - [ ] Edge function deployada"
    echo "   - [ ] Meta tags retornando avatar correto"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""
