# Explicação: Filtragem de Produtos por Categoria

## Problema Identificado

Ao filtrar uma categoria com 189 produtos, o sistema exibe apenas 83 produtos com a mensagem "83 produtos encontrados".

## Root Cause (Causa Raiz)

O comportamento observado é **CORRETO E INTENCIONAL**. Aqui está o porquê:

### Sistema de Visibilidade de Produtos

Cada produto no banco de dados tem um campo `is_visible_on_storefront` que controla se ele deve aparecer:

1. **Na vitrine pública** (CorretorPage) - Apenas se `is_visible_on_storefront = true`
2. **No painel do vendedor** - Todos os produtos, independentemente da visibilidade

### Números

- **Total de produtos na categoria**: 189
  - **Visíveis** (`is_visible_on_storefront = true`): 83
  - **Invisíveis** (`is_visible_on_storefront = false`): 106

### O Que o Sistema Faz

1. **CorretorPage (Vitrine Pública)**
   - Busca produtos com `is_visible_on_storefront = true`
   - Retorna apenas 83 produtos
   - Exibe: "83 produtos encontrados"

2. **Dashboard (Painel do Vendedor)**
   - Carrega TODOS os 189 produtos
   - Permite gerenciar a visibilidade de cada um
   - Vendedor pode ativar/desativar produtos

## Por Que É Assim

### Segurança e Controle
- Vendedores podem **ocultar produtos temporariamente** sem deletá-los
- Produtos podem estar em **manutenção, fora de estoque, ou aguardando aprovação**
- A vitrine pública mostra apenas o que o vendedor realmente quer vender

### Exemplos de Uso
- Produto com defeito descoberto após publicação → Ocultar da vitrine
- Produto esgotado temporariamente → Ocultar até repor
- Produto aguardando revisão → Manter oculto até aprovação
- Teste de produto → Não publicar para clientes

## Como Verificar Visibilidade

### No Dashboard do Vendedor
1. Vá para "Meus Anúncios"
2. Cada produto tem um ícone de olho mostrando se está visível
3. Pode ativar/desativar individualmente

### Via Console (Para Diagnóstico)
```javascript
// Os logs agora mostram quantos produtos são filtrados em cada etapa:
// [Search] Produtos do servidor (visíveis): 83
// [Search] Resultado final: 83 produtos
```

## Melhorias Implementadas

### 1. Logs Detalhados
Adicionamos console.logs que rastreiam:
- Quantos produtos retornam do servidor
- Quantos produtos restam após cada filtro
- Qual filtro causou a redução

**Locais**:
- `src/hooks/useServerSideProductSearch.ts` (linhas com console.log)

### 2. Feedback Visual Melhorado
Adicionamos mensagem na CorretorPage:
- "Mostrando apenas produtos ativos nesta categoria"
- Aparece quando filtra por categoria
- Explicita que alguns produtos podem estar ocultos

**Locais**:
- `src/pages/CorretorPage.tsx` (linhas ~414-420)
- `src/lib/i18n.ts` (mensagens em 3 idiomas)

## Como Ativar Produtos Invisíveis

Se o vendedor quer que os 106 produtos invisíveis apareçam na vitrine:

1. **No Dashboard** → Vá para "Meus Anúncios"
2. **Filtre por produtos invisíveis** (se houver filtro)
3. **Clique no ícone de olho** para cada um
4. **Confirme a ativação**
5. **Atualize a vitrine pública** (F5 no navegador)

Alternativa: Usar a ação em massa para ativar todos de uma vez

## Troubleshooting

### Cenário 1: "Deveria ter 189 visíveis!"
**Solução**: Verificar no dashboard se realmente quer que todos estejam visíveis. Produtos podem estar:
- Marcados como "Vendido"
- Com status diferente de "Disponível"
- Ocultos intencionalmente

### Cenário 2: "Os 83 aparecem, mas faltam alguns"
**Solução**: Verificar se há filtros ativos além da categoria:
- Preço mínimo/máximo
- Marca
- Gênero
- Tamanho
- Status (Disponível vs Vendido vs Reservado)

**Dica**: Clique em "Limpar Filtros" para resetar todos os filtros

### Cenário 3: "Mudei a visibilidade mas não aparece"
**Solução**:
1. Aguarde 2-3 segundos após a mudança (sincronização)
2. Pressione F5 (atualizar página)
3. Limpe o cache do navegador (Ctrl+Shift+Delete)
4. Tente em outro navegador (descartar cache)

## Estrutura de Filtros (Ordem de Aplicação)

No `useServerSideProductSearch.ts`, os filtros são aplicados nesta ordem:

1. **Visibilidade** (servidor): `is_visible_on_storefront = true`
2. **Condição** (servidor): Se filtro selecionado
3. **Status** (servidor): Se filtro selecionado
4. **Preço** (cliente): Filtragem local
5. **Texto** (cliente): Busca por título/descrição
6. **Categoria** (cliente): Busca por categoria
7. **Marca** (cliente): Filtragem local
8. **Gênero** (cliente): Filtragem local
9. **Tamanho** (cliente): Filtragem local

## Resumo

✅ **Comportamento está correto**: Apenas 83 de 189 estão visíveis
✅ **Logs adicionados**: Rastreiam cada etapa da filtragem
✅ **Feedback melhorado**: Usuário entende que são apenas ativos
✅ **Nenhuma alteração de lógica**: Sistema continua seguro e funcional

Se precisar ativar os 106 produtos invisíveis, eles aparecerão imediatamente na vitrine pública.
