# Sistema de Preços Escalonados Flexível

## 🎯 Funcionalidade Implementada

O sistema de preços escalonados agora suporta **faixas de quantidade flexíveis**, permitindo que você configure preços para qualquer intervalo de quantidades, não mais exigindo que a primeira faixa comece em 1.

### Exemplos de Uso

#### ✅ Antes (Limitado)
- Apenas: **1-10, 11-50, 51+**

#### ✅ Agora (Flexível)
- **10-30 unidades**: R$ 100 cada
- **50-100 unidades**: R$ 90 cada
- **100+ unidades**: R$ 80 cada

Ou até faixas descontínuas:
- **5-10 unidades**: R$ 150 cada
- **50-100 unidades**: R$ 120 cada
- **200+ unidades**: R$ 100 cada

## 📋 Mudanças Implementadas

### 1. Nova Migração de Banco de Dados

**Arquivo**: `supabase/migrations/20251024000000_allow_flexible_tier_start.sql`

#### Validações Removidas
- ❌ Primeira faixa deve começar em quantidade 1
- ❌ Não pode haver lacunas (gaps) entre faixas

#### Validações Mantidas
- ✅ Pelo menos uma faixa de preço é obrigatória
- ✅ Não pode haver sobreposição de quantidades
- ✅ Apenas a última faixa pode ter quantidade ilimitada (NULL)
- ✅ Quantidade mínima deve ser menor que máxima
- ✅ Todos os preços devem ser maiores que zero
- ✅ Preço promocional deve ser menor que preço normal

### 2. Componente TieredPricingManager

**Arquivo**: `src/components/ui/tiered-pricing-manager.tsx`

#### Mudanças na Validação
```typescript
// REMOVIDO: Validação que forçava começar em 1
if (sortedTiers[0].min_quantity !== 1) {
  errors.push({
    type: 'invalid_min',
    message: 'A primeira faixa deve começar na quantidade 1',
    tierIndex: 0
  });
}

// REMOVIDO: Validação de gaps entre faixas
if (nextTier.min_quantity !== tier.max_quantity + 1) {
  errors.push({
    type: 'gap',
    message: `Gap detectado entre faixa...`,
    tierIndex: i
  });
}
```

#### Mudanças na Interface
**Antes:**
```
- As faixas devem começar em quantidade 1
- Não pode haver lacunas entre as faixas
- Não pode haver sobreposição de quantidades
- Apenas a última faixa pode ter quantidade ilimitada
```

**Depois:**
```
- As faixas podem começar em qualquer quantidade (ex: 10-30, 50-100)
- Não pode haver sobreposição de quantidades
- Apenas a última faixa pode ter quantidade ilimitada
- Você pode ter faixas descontínuas (ex: 1-10, 50-100)
```

#### Mudanças no Comportamento de Adicionar Faixa
```typescript
// ANTES: Forçava ajustar para 1
let minQuantity = newTier.min_quantity;
if (tiers.length === 0 && minQuantity !== 1) {
  minQuantity = 1;
  toast.info('A primeira faixa foi ajustada para começar na quantidade 1');
}

// DEPOIS: Aceita qualquer quantidade > 0
if (!newTier.min_quantity || newTier.min_quantity <= 0) {
  toast.error('A quantidade mínima deve ser maior que zero');
  return;
}
const minQuantity = newTier.min_quantity;
```

### 3. Páginas de Criação e Edição de Produtos

**Arquivos**:
- `src/pages/dashboard/CreateProductPage.tsx`
- `src/pages/dashboard/EditProductPage.tsx`

#### Mudança
```typescript
// REMOVIDO: Ajuste automático para começar em 1
if (sortedTiers.length > 0 && sortedTiers[0].min_quantity !== 1) {
  sortedTiers[0].min_quantity = 1;
  toast.warning('A primeira faixa foi ajustada para começar na quantidade 1');
}
```

### 4. Lógica de Cálculo de Preços

**Arquivo**: `src/lib/tieredPricingUtils.ts`

✅ **Nenhuma mudança necessária!** A lógica já estava preparada para faixas flexíveis:
- Se a quantidade não se encaixa em nenhuma faixa, usa o `basePrice` ou `baseDiscountedPrice`
- Calcula corretamente a próxima faixa disponível
- Calcula economia e diferenças de preço corretamente

## 🔍 Como Funciona o Sistema Agora

### Cenário 1: Quantidade dentro de uma faixa
**Faixas:** 10-30 (R$ 100), 50-100 (R$ 90), 100+ (R$ 80)
**Quantidade comprada:** 25 unidades
**Resultado:** R$ 100 por unidade (faixa 10-30 aplicada)

### Cenário 2: Quantidade entre faixas (gap)
**Faixas:** 10-30 (R$ 100), 50-100 (R$ 90), 100+ (R$ 80)
**Quantidade comprada:** 40 unidades
**Resultado:** Usa o preço base do produto (não se encaixa em nenhuma faixa)

### Cenário 3: Quantidade antes da primeira faixa
**Faixas:** 10-30 (R$ 100), 50-100 (R$ 90), 100+ (R$ 80)
**Quantidade comprada:** 5 unidades
**Resultado:** Usa o preço base do produto

### Cenário 4: Quantidade na última faixa ilimitada
**Faixas:** 10-30 (R$ 100), 50-100 (R$ 90), 100+ (R$ 80)
**Quantidade comprada:** 500 unidades
**Resultado:** R$ 80 por unidade (faixa 100+ aplicada)

## 🎨 Interface do Usuário

### Adicionar Faixa de Preço

**Campos:**
- **Quantidade Mínima*** (obrigatório, > 0)
- **Quantidade Máxima** (opcional, deixe vazio para ilimitado)
- **Preço Unitário*** (obrigatório, > 0)
- **Preço Promocional Unitário** (opcional, deve ser < preço normal)

**Exemplo de uso:**
1. Adicione: Min=10, Max=30, Preço=R$ 100
2. Adicione: Min=50, Max=100, Preço=R$ 90
3. Adicione: Min=100, Max=(vazio), Preço=R$ 80

### Mensagens de Validação

#### ✅ Sucesso
- "Faixa de preço adicionada. Clique em 'Salvar Alterações'..."
- "Produto atualizado com sucesso!"

#### ⚠️ Avisos (ainda permitido salvar localmente)
- Sobreposição detectada entre faixas
- Apenas a última faixa pode ter quantidade ilimitada

#### ❌ Erros (impede salvamento)
- "Quantidade mínima deve ser maior que zero"
- "Preço unitário deve ser maior que zero"
- "Preço promocional deve ser menor que o preço normal"
- "Pelo menos uma faixa de preço é obrigatória"

## 🛡️ Segurança e Integridade

### Validações no Banco de Dados (RPC Function)

A função `update_product_price_tiers` garante:

1. **Atomicidade**: Todas as operações são executadas juntas ou nenhuma é executada
2. **Sem sobreposições**: Valida que não há ranges conflitantes
3. **Preços válidos**: Todos os preços devem ser > 0
4. **Relacionamento min/max**: Max deve ser maior que min quando definido
5. **Única faixa ilimitada**: Apenas uma faixa pode ter max_quantity = NULL

### Exemplo de Validação de Sobreposição

```sql
-- ❌ INVÁLIDO (sobreposição)
Faixa 1: 10-50
Faixa 2: 30-80  -- Sobrepõe com Faixa 1 (30-50)

-- ✅ VÁLIDO (sem sobreposição)
Faixa 1: 10-30
Faixa 2: 50-80  -- OK, há um gap entre 31-49

-- ✅ VÁLIDO (sequencial, sem gap)
Faixa 1: 10-30
Faixa 2: 31-80  -- OK, não há gap nem sobreposição
```

## 📊 Impacto nos Produtos Existentes

### Produtos com Faixas Antigas (começando em 1)
✅ **Continuam funcionando normalmente**
- Nenhuma mudança necessária
- Sistema totalmente retrocompatível

### Novos Produtos
✅ **Podem usar faixas flexíveis**
- Começar em qualquer quantidade
- Ter gaps entre faixas
- Máxima flexibilidade

## 🧪 Testes Recomendados

### Teste 1: Faixas Flexíveis Básicas
1. Criar produto com faixas: 10-30, 50-100, 100+
2. Salvar produto
3. Verificar se salva corretamente
4. Visualizar na vitrine
5. Testar cálculo de preço para quantidades: 5, 15, 40, 75, 150

### Teste 2: Faixas Descontínuas
1. Criar produto com faixas: 5-10, 50-100, 200+
2. Salvar produto
3. Testar quantidade 25 (no gap) → deve usar preço base
4. Testar quantidade 7 (na faixa) → deve usar preço da faixa

### Teste 3: Validação de Sobreposição
1. Tentar criar faixas: 10-50, 30-80
2. Sistema deve impedir e mostrar erro
3. Ajustar para: 10-30, 50-80
4. Deve permitir salvar

### Teste 4: Múltiplas Faixas Ilimitadas
1. Tentar criar: 10-30, 50+ (ilimitada), 100+ (ilimitada)
2. Sistema deve impedir
3. Ajustar para apenas uma ilimitada
4. Deve permitir salvar

### Teste 5: Edição de Produto Existente
1. Editar produto com faixas antigas (1-10, 11-50, 51+)
2. Modificar para faixas flexíveis (20-50, 100-200, 200+)
3. Salvar
4. Verificar se as faixas antigas foram removidas
5. Verificar se as novas faixas funcionam

## 📝 Migração de Dados

### Para Produtos Existentes

Não é necessária nenhuma ação! Os produtos existentes com faixas começando em 1 continuarão funcionando normalmente.

Se você quiser atualizar produtos existentes para usar faixas flexíveis:
1. Entre na edição do produto
2. Exclua as faixas antigas
3. Adicione as novas faixas com quantidades desejadas
4. Salve o produto

## 🔧 Solução de Problemas

### Problema: "Sobreposição detectada nas quantidades"
**Solução**: Verifique se há ranges que se sobrepõem. Ajuste as quantidades para eliminar a sobreposição.

Exemplo:
```
❌ 10-50 e 40-80 (sobrepõe em 40-50)
✅ 10-50 e 51-80 (sem sobreposição)
```

### Problema: "Apenas a última faixa pode ter quantidade ilimitada"
**Solução**: Remova o max_quantity vazio das faixas intermediárias. Apenas a última faixa pode ter quantidade ilimitada.

Exemplo:
```
❌ Faixa 1: 10-∞, Faixa 2: 50-∞
✅ Faixa 1: 10-49, Faixa 2: 50-∞
```

### Problema: Quantidade comprada não está usando a faixa esperada
**Solução**: Verifique se:
1. A quantidade está dentro do range da faixa (min_quantity ≤ quantidade ≤ max_quantity)
2. Não há sobreposições que possam estar causando comportamento inesperado
3. Se a quantidade está em um gap, o sistema usará o preço base do produto

## ✨ Benefícios da Mudança

### Para o Negócio
- ✅ Maior flexibilidade na precificação
- ✅ Pode atender modelos de negócio específicos (ex: atacado começa em 10 unidades)
- ✅ Permite promoções em faixas específicas

### Para o Desenvolvedor
- ✅ Código mais simples (menos validações desnecessárias)
- ✅ Menos ajustes automáticos que confundem o usuário
- ✅ Sistema mais intuitivo e previsível

### Para o Usuário
- ✅ Configuração mais intuitiva
- ✅ Não há surpresas com ajustes automáticos
- ✅ Liberdade para criar estruturas de preço personalizadas

## 🔄 Compatibilidade

### Versão Anterior
- ✅ Produtos existentes continuam funcionando
- ✅ Não há necessidade de migração de dados
- ✅ Sistema 100% retrocompatível

### Nova Funcionalidade
- ✅ Novos produtos podem usar faixas flexíveis
- ✅ Produtos antigos podem ser atualizados se desejado
- ✅ Ambos os modelos coexistem perfeitamente
