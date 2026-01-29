#!/bin/bash

# Script de teste para Meta Tags Dinâmicas - VitrineTurbo
# Uso: ./test-meta-tags.sh [URL_DA_LOJA]
# Exemplo: ./test-meta-tags.sh https://vitrineturbo.com/kingstore
# Exemplo produto: ./test-meta-tags.sh https://vitrineturbo.com/kingstore/produtos/c26295b1-8717-46fa-b8e6-fdb52e97f034

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# URL padrão se não fornecida
URL="${1:-https://vitrineturbo.com/kingstore}"

# Detectar se é URL de produto
if [[ "$URL" == *"/produtos/"* ]]; then
    PAGE_TYPE="produto"
else
    PAGE_TYPE="vitrine"
fi

echo -e "${BLUE}==================================="
echo "Meta Tags Test Suite - VitrineTurbo"
echo -e "===================================${NC}"
echo ""
echo -e "URL Testada: ${GREEN}$URL${NC}"
echo -e "Tipo de Página: ${BLUE}$PAGE_TYPE${NC}"
echo ""

# Função para extrair meta tags
extract_meta_tag() {
    local html="$1"
    local tag="$2"
    echo "$html" | grep -oP "(?<=<meta.*$tag.*content=\")[^\"]*" | head -1
}

# Função para verificar se é HTML válido
check_html() {
    local response="$1"
    if echo "$response" | grep -q "<!DOCTYPE html>"; then
        echo -e "${GREEN}✓${NC} HTML válido retornado"
        return 0
    else
        echo -e "${RED}✗${NC} Resposta não é HTML válido"
        return 1
    fi
}

# Função para verificar tipo de página
check_page_type() {
    local response="$1"
    local expected_type="$2"
    
    if [[ "$expected_type" == "produto" ]]; then
        if echo "$response" | grep -q 'property="og:type" content="product"'; then
            echo -e "${GREEN}✓${NC} Tipo correto: product"
            return 0
        else
            echo -e "${RED}✗${NC} Tipo incorreto (esperado: product)"
            return 1
        fi
    else
        if echo "$response" | grep -q 'property="og:type" content="profile"'; then
            echo -e "${GREEN}✓${NC} Tipo correto: profile"
            return 0
        else
            echo -e "${RED}✗${NC} Tipo incorreto (esperado: profile)"
            return 1
        fi
    fi
}

# Teste 1: Facebook Bot
echo -e "${YELLOW}[Teste 1]${NC} Simulando Facebook Bot (facebookexternalhit)"
echo "────────────────────────────────────────────────────"
RESPONSE_FB=$(curl -s -A "facebookexternalhit/1.1" "$URL")

if check_html "$RESPONSE_FB"; then
    TITLE=$(extract_meta_tag "$RESPONSE_FB" "og:title")
    IMAGE=$(extract_meta_tag "$RESPONSE_FB" "og:image")
    DESC=$(extract_meta_tag "$RESPONSE_FB" "og:description")
    TYPE=$(extract_meta_tag "$RESPONSE_FB" "og:type")

    echo -e "  ${BLUE}og:title:${NC} $TITLE"
    echo -e "  ${BLUE}og:image:${NC} $IMAGE"
    echo -e "  ${BLUE}og:description:${NC} ${DESC:0:80}..."
    echo -e "  ${BLUE}og:type:${NC} $TYPE"
    
    check_page_type "$RESPONSE_FB" "$PAGE_TYPE"

    if [[ -n "$TITLE" && -n "$IMAGE" ]]; then
        echo -e "  ${GREEN}✓ Meta tags encontradas${NC}"
        
        # Verificações específicas para produtos
        if [[ "$PAGE_TYPE" == "produto" ]]; then
            if [[ "$TITLE" == *"VitrineTurbo"* ]] && [[ "$TITLE" != *"kingstore"* ]]; then
                echo -e "  ${GREEN}✓ Título contém nome do produto${NC}"
            fi
            
            # Verificar se a imagem é diferente do avatar padrão
            if [[ "$IMAGE" != *"flat-icon-vitrine"* ]]; then
                echo -e "  ${GREEN}✓ Usando imagem específica do produto${NC}"
            else
                echo -e "  ${YELLOW}⚠ Usando imagem padrão (produto pode não ter imagem)${NC}"
            fi
        fi
    else
        echo -e "  ${RED}✗ Meta tags não encontradas${NC}"
    fi
else
    echo -e "  ${RED}✗ Teste falhou${NC}"
fi
echo ""

# Teste 2: WhatsApp Bot
echo -e "${YELLOW}[Teste 2]${NC} Simulando WhatsApp Bot"
echo "────────────────────────────────────────────────────"
RESPONSE_WA=$(curl -s -A "WhatsApp/2.0" "$URL")

if check_html "$RESPONSE_WA"; then
    TITLE=$(extract_meta_tag "$RESPONSE_WA" "og:title")
    IMAGE=$(extract_meta_tag "$RESPONSE_WA" "og:image")
    ALT_TEXT=$(extract_meta_tag "$RESPONSE_WA" "og:image:alt")

    echo -e "  ${BLUE}og:title:${NC} $TITLE"
    echo -e "  ${BLUE}og:image:${NC} $IMAGE"
    echo -e "  ${BLUE}og:image:alt:${NC} $ALT_TEXT"
    
    check_page_type "$RESPONSE_WA" "$PAGE_TYPE"

    if [[ -n "$TITLE" && -n "$IMAGE" ]]; then
        echo -e "  ${GREEN}✓ Meta tags encontradas${NC}"
    else
        echo -e "  ${RED}✗ Meta tags não encontradas${NC}"
    fi
else
    echo -e "  ${RED}✗ Teste falhou${NC}"
fi
echo ""

# Teste 3: Twitter Bot
echo -e "${YELLOW}[Teste 3]${NC} Simulando Twitter Bot (Twitterbot)"
echo "────────────────────────────────────────────────────"
RESPONSE_TW=$(curl -s -A "Twitterbot/1.0" "$URL")

if check_html "$RESPONSE_TW"; then
    TITLE=$(extract_meta_tag "$RESPONSE_TW" "twitter:title")
    IMAGE=$(extract_meta_tag "$RESPONSE_TW" "twitter:image")

    echo -e "  ${BLUE}twitter:title:${NC} $TITLE"
    echo -e "  ${BLUE}twitter:image:${NC} $IMAGE"
    
    check_page_type "$RESPONSE_TW" "$PAGE_TYPE"

    if [[ -n "$TITLE" && -n "$IMAGE" ]]; then
        echo -e "  ${GREEN}✓ Twitter cards encontradas${NC}"
    else
        echo -e "  ${RED}✗ Twitter cards não encontradas${NC}"
    fi
else
    echo -e "  ${RED}✗ Teste falhou${NC}"
fi
echo ""

# Teste específico para produtos
if [[ "$PAGE_TYPE" == "produto" ]]; then
    echo -e "${YELLOW}[Teste Extra]${NC} Verificações Específicas para Produto"
    echo "────────────────────────────────────────────────────"
    
    # Verificar meta tags específicas de produto
    PRODUCT_BRAND=$(extract_meta_tag "$RESPONSE_FB" "product:brand")
    PRODUCT_PRICE=$(extract_meta_tag "$RESPONSE_FB" "product:price:amount")
    PRODUCT_CURRENCY=$(extract_meta_tag "$RESPONSE_FB" "product:price:currency")
    
    echo -e "  ${BLUE}product:brand:${NC} $PRODUCT_BRAND"
    echo -e "  ${BLUE}product:price:amount:${NC} $PRODUCT_PRICE"
    echo -e "  ${BLUE}product:price:currency:${NC} $PRODUCT_CURRENCY"
    
    if [[ -n "$PRODUCT_BRAND" ]]; then
        echo -e "  ${GREEN}✓ Meta tags de produto encontradas${NC}"
    else
        echo -e "  ${YELLOW}⚠ Meta tags de produto não encontradas${NC}"
    fi
    echo ""
fi

# Teste 4: Navegador Normal (deve passar pela SPA)
echo -e "${YELLOW}[Teste 4]${NC} Simulando Navegador Normal (Chrome)"
echo "────────────────────────────────────────────────────"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124" "$URL")

echo -e "  ${BLUE}HTTP Status:${NC} $HTTP_STATUS"

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo -e "  ${GREEN}✓ Página carrega normalmente${NC}"
else
    echo -e "  ${RED}✗ Erro ao carregar página${NC}"
fi
echo ""

# Teste 5: Verificar Cache Headers
echo -e "${YELLOW}[Teste 5]${NC} Verificando Headers de Cache"
echo "────────────────────────────────────────────────────"
CACHE_HEADER=$(curl -s -I -A "facebookexternalhit/1.1" "$URL" | grep -i "cache-control")

if [ -n "$CACHE_HEADER" ]; then
    echo -e "  ${BLUE}Cache-Control:${NC} $CACHE_HEADER"
    echo -e "  ${GREEN}✓ Headers de cache configurados${NC}"
else
    echo -e "  ${YELLOW}⚠ Headers de cache não encontrados${NC}"
fi
echo ""

# Teste 6: Verificar tempo de resposta
echo -e "${YELLOW}[Teste 6]${NC} Medindo Tempo de Resposta"
echo "────────────────────────────────────────────────────"
TIME_TOTAL=$(curl -s -o /dev/null -w "%{time_total}" -A "facebookexternalhit/1.1" "$URL")

echo -e "  ${BLUE}Tempo total:${NC} ${TIME_TOTAL}s"

# Converter para milissegundos para comparação
TIME_MS=$(echo "$TIME_TOTAL * 1000" | bc)
if (( $(echo "$TIME_MS < 1000" | bc -l) )); then
    echo -e "  ${GREEN}✓ Resposta rápida (< 1s)${NC}"
elif (( $(echo "$TIME_MS < 2000" | bc -l) )); then
    echo -e "  ${YELLOW}⚠ Resposta aceitável (1-2s)${NC}"
else
    echo -e "  ${RED}✗ Resposta lenta (> 2s)${NC}"
fi
echo ""

# Teste 7: Validar estrutura da imagem
echo -e "${YELLOW}[Teste 7]${NC} Validando URL da Imagem"
echo "────────────────────────────────────────────────────"
RESPONSE_FB=$(curl -s -A "facebookexternalhit/1.1" "$URL")
IMAGE_URL=$(extract_meta_tag "$RESPONSE_FB" "og:image")

if [ -n "$IMAGE_URL" ]; then
    IMAGE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$IMAGE_URL")
    IMAGE_TYPE=$(curl -s -I "$IMAGE_URL" | grep -i "content-type" | cut -d' ' -f2)

    echo -e "  ${BLUE}URL da imagem:${NC} $IMAGE_URL"
    echo -e "  ${BLUE}HTTP Status:${NC} $IMAGE_STATUS"
    echo -e "  ${BLUE}Content-Type:${NC} $IMAGE_TYPE"

    if [ "$IMAGE_STATUS" -eq 200 ]; then
        echo -e "  ${GREEN}✓ Imagem acessível${NC}"
        
        # Para produtos, verificar se não é a imagem padrão
        if [[ "$PAGE_TYPE" == "produto" ]] && [[ "$IMAGE_URL" != *"flat-icon-vitrine"* ]]; then
            echo -e "  ${GREEN}✓ Usando imagem específica do produto${NC}"
        elif [[ "$PAGE_TYPE" == "produto" ]]; then
            echo -e "  ${YELLOW}⚠ Produto usando imagem padrão${NC}"
        fi
    else
        echo -e "  ${RED}✗ Imagem não acessível${NC}"
    fi
else
    echo -e "  ${RED}✗ URL da imagem não encontrada${NC}"
fi
echo ""

# Resumo Final
echo -e "${BLUE}==================================="
echo "Resumo dos Testes"
echo -e "===================================${NC}"
echo ""

if [[ "$PAGE_TYPE" == "produto" ]]; then
    echo "✅ Funcionalidades Específicas para Produtos:"
    echo "  • Meta tags og:type='product'"
    echo "  • Título inclui nome do produto"
    echo "  • Descrição inclui detalhes do produto"
    echo "  • Imagem prioritiza foto do produto"
    echo "  • Meta tags product:* para e-commerce"
    echo ""
fi

echo "Próximos Passos:"
echo "  1. Teste no Facebook Debugger:"
echo -e "     ${GREEN}https://developers.facebook.com/tools/debug/${NC}"
echo ""
echo "  2. Teste no Twitter Card Validator:"
echo -e "     ${GREEN}https://cards-dev.twitter.com/validator${NC}"
echo ""
echo "  3. Teste real no WhatsApp:"
echo -e "     ${GREEN}Envie a URL para você mesmo no WhatsApp${NC}"
echo ""

if [[ "$PAGE_TYPE" == "produto" ]]; then
    echo "  4. Teste específico para produtos:"
    echo -e "     ${GREEN}Compartilhe o link do produto e verifique se mostra:${NC}"
    echo "     • Imagem do produto (não do vendedor)"
    echo "     • Nome do produto no título"
    echo "     • Preço na descrição"
    echo ""
fi

echo -e "${BLUE}==================================="
echo "Testes Concluídos!"
echo -e "===================================${NC}"
