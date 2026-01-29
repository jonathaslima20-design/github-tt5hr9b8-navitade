# Sistema de Preços Escalonados - Documentação

## Visão Geral

O sistema de preços escalonados permite que vendedores ofereçam descontos baseados em quantidade, incentivando compras em maior volume.

## Implementação - ETAPA 4

### 4.1 Atualização do ProductCard ✅

**Arquivo:** `src/components/product/ProductCard.tsx`

**Funcionalidades implementadas:**
- Detecção automática de produtos com preços escalonados via `has_tiered_pricing`
- Busca do menor preço disponível nas faixas de preço
- Exibição de "A partir de R$ [menor_preço]" para produtos com preços escalonados
- Badge visual com ícone `TrendingDown` indicando "Preço por Qtd"
- Tooltip informativo: "Quanto mais você compra, menos paga!"
- Loading skeleton durante carregamento dos preços

**Tecnologias:**
- Hook `useEffect` para carregar preços ao montar componente
- `fetchProductPriceTiers` e `getMinimumPriceFromTiers` para cálculos
- Componente `Tooltip` do shadcn/ui para melhor UX

---

### 4.2 Atualização do ProductDetailsPage ✅

**Arquivo:** `src/pages/ProductDetailsPage.tsx`

**Componentes criados:**
1. **TieredPricingTable** (`src/components/details/TieredPricingTable.tsx`)
   - Tabela completa de faixas de preço
   - Colunas: Quantidade, Preço Unit., Total, Economia
   - Destaque visual para a faixa com melhor valor
   - Badge "Melhor Valor" na faixa mais vantajosa
   - Cálculo de economia percentual por faixa

2. **Calculadora Interativa**
   - Input numérico para quantidade desejada
   - Cálculo em tempo real do preço aplicável
   - Exibição de preço unitário e total
   - Indicador de economia atual
   - Mensagem motivacional mostrando próxima faixa de desconto

3. **TieredPricingSkeleton** (`src/components/details/TieredPricingSkeleton.tsx`)
   - Loading placeholder durante carregamento de dados
   - Animação pulse para feedback visual

**Custom Hook:**
- `useTieredPricing` (`src/hooks/useTieredPricing.ts`)
  - Encapsula lógica de carregamento de preços
  - Gerencia estados de loading e erro
  - Fornece função `calculatePrice` para cálculos dinâmicos
  - Retorna `minimumPrice` para exibição rápida
  - Função `refresh` para recarregar dados

---

### 4.3 Integração com CartContext ✅

**Arquivo:** `src/contexts/CartContext.tsx`

**Funcionalidades implementadas:**
- Importação de tipos `PriceTier` e funções de cálculo
- Cache de preços escalonados (`tiersCache`)
- Função `recalculateTieredPrices` para recalcular preços dinamicamente
- Cálculo de totais considerando quantidade e faixa aplicável
- Interface `CartContextType` estendida com `recalculateTieredPrices`

**Arquivo:** `src/components/corretor/CartModal.tsx`

**Funcionalidades implementadas:**
- Carregamento automático de preços escalonados para produtos no carrinho
- Cálculo dinâmico de preço baseado na quantidade
- Badge "Preço Escalonado" com ícone `TrendingDown`
- Exibição de economia atual
- Indicador motivacional: "+X unidades para economizar Y"
- Componente `TieredPricingIndicator` para feedback visual
- Recálculo automático ao alterar quantidade

**Componente:** `TieredPricingIndicator` (`src/components/product/TieredPricingIndicator.tsx`)
- Animações suaves com `framer-motion`
- Exibição de economia atual
- Mensagem motivacional para próxima faixa
- Tooltips informativos
- Estados animados com `AnimatePresence`

---

### 4.4 Otimizações de Performance e UX ✅

**Utilitários:** `src/lib/tieredPricingUtils.ts`

**Funções implementadas:**

1. `fetchProductPriceTiers(productId: string): Promise<PriceTier[]>`
   - Busca faixas de preço do Supabase
   - Ordenação automática por `min_quantity`
   - Tratamento de erros

2. `getMinimumPriceFromTiers(tiers: PriceTier[]): number | null`
   - Retorna menor preço disponível
   - Considera preços promocionais

3. `calculateApplicablePrice(quantity, tiers, basePrice, baseDiscountedPrice): TieredPricingResult`
   - Calcula preço aplicável para quantidade específica
   - Retorna economia atual
   - Calcula próxima faixa e unidades necessárias
   - Retorna economia potencial da próxima faixa

4. `formatPriceTierRange(tier: PriceTier): string`
   - Formata range de quantidade (ex: "10 - 50 unidades")
   - Trata faixas abertas (ex: "100+ unidades")

5. `getBestValueTier(tiers: PriceTier[]): PriceTier | null`
   - Identifica faixa com melhor custo-benefício
   - Compara preços promocionais e regulares

**Cache e Performance:**
- Hook `useTieredPricing` implementa cache automático
- Evita consultas duplicadas ao banco de dados
- `useEffect` com dependências otimizadas
- Loading states para feedback imediato

**Componentes UI:**
- `Skeleton` (`src/components/ui/skeleton.tsx`) para loading states
- `Tooltip` para informações contextuais
- `Badge` para indicadores visuais
- Animações suaves com `framer-motion`

---

## Fluxo de Funcionamento

### 1. Vitrine (ProductCard)
```
Produto carrega → Verifica has_tiered_pricing →
Busca preços no Supabase → Calcula menor preço →
Exibe "A partir de R$ X" + Badge "Preço por Qtd"
```

### 2. Página de Detalhes
```
Produto carrega → Hook useTieredPricing inicializa →
Exibe skeleton enquanto carrega →
Renderiza TieredPricingTable + Calculadora →
Usuário digita quantidade → Calcula preço em tempo real
```

### 3. Carrinho
```
Item adicionado → Verifica has_tiered_pricing →
Carrega faixas de preço → Calcula preço para quantidade →
Exibe economia + indicador de próxima faixa →
Quantidade alterada → Recalcula automaticamente
```

---

## Estrutura de Dados

### PriceTier Interface
```typescript
interface PriceTier {
  id?: string;
  product_id?: string;
  min_quantity: number;
  max_quantity: number | null;
  unit_price: number;
  discounted_unit_price?: number | null;
  created_at?: string;
  updated_at?: string;
}
```

### TieredPricingResult Interface
```typescript
interface TieredPricingResult {
  unitPrice: number;
  totalPrice: number;
  appliedTier: PriceTier | null;
  savings: number;
  nextTier: PriceTier | null;
  nextTierSavings: number;
  unitsToNextTier: number;
}
```

---

## Exemplos de Uso

### Exemplo 1: Produto com 3 faixas
```
1-9 unidades: R$ 100,00
10-49 unidades: R$ 90,00 (-10%)
50+ unidades: R$ 80,00 (-20%)

Cliente compra 8 unidades:
- Preço: R$ 100,00/un (R$ 800,00 total)
- Indicador: "+2 unidades para economizar R$ 20,00"

Cliente compra 10 unidades:
- Preço: R$ 90,00/un (R$ 900,00 total)
- Economia: R$ 100,00
- Indicador: "+40 unidades para economizar R$ 200,00"
```

### Exemplo 2: Produto com preço promocional
```
Preço base: R$ 100,00
Preço promocional: R$ 90,00

Faixas:
10+ unidades: R$ 85,00/un (calculado sobre R$ 90,00)
50+ unidades: R$ 75,00/un (calculado sobre R$ 90,00)
```

---

## Testes Recomendados

1. **Vitrine:**
   - Verificar badge "Preço por Qtd" em produtos com preços escalonados
   - Confirmar exibição "A partir de R$ X"
   - Testar loading skeleton

2. **Página de Detalhes:**
   - Verificar tabela completa de preços
   - Testar calculadora com diferentes quantidades
   - Confirmar mensagens motivacionais

3. **Carrinho:**
   - Adicionar produto e verificar cálculo correto
   - Alterar quantidade e confirmar recálculo
   - Verificar indicadores de economia
   - Testar mensagens de próxima faixa

4. **Performance:**
   - Verificar cache funcionando (sem requests duplicados)
   - Confirmar loading states aparecem adequadamente
   - Testar com múltiplos produtos no carrinho

---

## Melhorias Futuras

1. **Analytics:**
   - Rastrear quantas vezes usuários chegam perto da próxima faixa
   - Medir conversão de mensagens motivacionais

2. **A/B Testing:**
   - Testar diferentes formatos de exibição
   - Experimentar mensagens motivacionais variadas

3. **Personalização:**
   - Permitir vendedor customizar mensagens
   - Opção de exibir gráfico visual dos descontos

4. **Notificações:**
   - Alertar usuário quando atingir nova faixa
   - Notificar sobre promoções de volume

---

## Arquivos Criados/Modificados

### Novos Arquivos:
- `src/lib/tieredPricingUtils.ts`
- `src/hooks/useTieredPricing.ts`
- `src/components/details/TieredPricingTable.tsx`
- `src/components/details/TieredPricingSkeleton.tsx`
- `src/components/product/TieredPricingIndicator.tsx`
- `src/components/ui/skeleton.tsx`

### Arquivos Modificados:
- `src/components/product/ProductCard.tsx`
- `src/pages/ProductDetailsPage.tsx`
- `src/contexts/CartContext.tsx`
- `src/components/corretor/CartModal.tsx`
- `src/types/index.ts`

---

## Conclusão

A ETAPA 4 foi implementada com sucesso, oferecendo uma experiência completa de preços escalonados desde a vitrine até o checkout. O sistema é performático, intuitivo e fornece feedback visual claro para incentivar compras em maior volume.
