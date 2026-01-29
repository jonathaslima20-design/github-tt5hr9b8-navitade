# Guia Rápido: Tamanhos Personalizados

## Para Usuários Finais

### Como Usar Tamanhos Personalizados ao Criar um Produto

1. **Acesse:** Dashboard → Criar Produto
2. **Na seção "Tamanhos e Cores":**
   - Expanda "Tamanhos Personalizados"
   - Digite um tamanho (ex: "XS", "4XL", "Único")
   - Clique em "+" ou pressione Enter
3. **Resultado:**
   - Tamanho aparece em "Tamanhos Adicionados ao Produto"
   - Tamanho é salvo automaticamente para uso futuro

### Como Reutilizar Tamanhos Salvos

1. **Ao criar novo produto:**
   - Vá para "Tamanhos Personalizados"
   - Você verá "Tamanhos Salvos (para reutilizar)"
   - Clique em um tamanho para adicioná-lo rapidamente
   - Ou adicione novos tamanhos

### Como Gerenciar Tamanhos Salvos

1. **Acesse:** Dashboard → Configurações
2. **Expanda:** "Tamanhos Personalizados"
3. **Você pode:**
   - Ver todos os tamanhos que já criou
   - Adicionar novos tamanhos
   - Deletar tamanhos que não usa mais (clique no ícone de lixeira)

---

## Para Desenvolvedores

### Usando o Hook `useCustomSizes`

```typescript
import { useCustomSizes } from '@/hooks/useCustomSizes';

function MyComponent() {
  const {
    customSizes,           // string[] - nomes dos tamanhos
    allSizesWithType,      // CustomSize[] - dados completos
    loading,               // boolean - carregando?
    error,                 // string | null - erros
    addCustomSize,         // func - adicionar tamanho
    removeCustomSize,      // func - remover tamanho
    getSizesByType,        // func - filtrar por tipo
  } = useCustomSizes(userId);

  // Exemplo de adição
  const handleAdd = async () => {
    const success = await addCustomSize('XS', 'custom');
    if (success) {
      console.log('Tamanho adicionado!');
    }
  };
}
```

### Usando o Componente `CustomSizeInput`

```typescript
import { CustomSizeInput } from '@/components/ui/custom-size-input';

function ProductForm() {
  const [sizes, setSizes] = useState<string[]>([]);
  const { user } = useAuth();

  return (
    <CustomSizeInput
      value={sizes}
      onChange={setSizes}
      userId={user?.id}
      maxSizes={10}
      placeholder="Digite um tamanho personalizado..."
    />
  );
}
```

### Integrando `CustomSizesManagement`

```typescript
import { CustomSizesManagement } from '@/components/Profile/CustomSizesManagement';

function SettingsPage() {
  const { user } = useAuth();

  return (
    <CustomSizesManagement userId={user?.id} />
  );
}
```

---

## Fluxo de Dados

```
User Input (input)
    ↓
Validação (trim, uppercase)
    ↓
CustomSizeInput Component
    ↓
useCustomSizes Hook
    ↓
Supabase API
    ↓
user_custom_sizes Table (RLS)
    ↓
PostgreSQL
    ↓
Cache Local (5 minutos)
    ↓
UI Atualiza
```

---

## Estados e Tipos

```typescript
interface CustomSize {
  id: string;
  size_name: string;
  size_type: 'apparel' | 'shoe' | 'custom';
  created_at: string;
}

interface UseCustomSizesReturn {
  customSizes: string[];
  allSizesWithType: CustomSize[];
  loading: boolean;
  addCustomSize: (sizeName: string, sizeType?: string) => Promise<boolean>;
  removeCustomSize: (sizeName: string) => Promise<boolean>;
  refreshCustomSizes: () => Promise<void>;
  getSizesByType: (sizeType: string) => string[];
  error: string | null;
}
```

---

## Segurança

✅ **Row Level Security (RLS)** - Cada usuário só vê seus dados
✅ **Validação de Input** - Sem espaços extras ou caracteres inválidos
✅ **Constraint UNIQUE** - Sem duplicatas por usuário
✅ **TypeScript** - Type safety em todo o código
✅ **Autenticação Required** - Só usuários autenticados podem acessar

---

## Performance

⚡ **Cache de 5 minutos** - Reduz carga no banco
⚡ **Índices Otimizados** - Buscas rápidas
⚡ **useCallback** - Evita re-renders desnecessários
⚡ **Lazy Loading** - UI não fica bloqueada

---

## Troubleshooting

### Tamanho não está sendo salvo
1. Verifica autenticação do usuário
2. Verifica console para erros
3. Tenta recarregar a página

### Tamanho não aparece nas sugestões
1. Espera 5 segundos (tempo de cache)
2. Clica em "Recarregar" se existir
3. Verifica se userId está sendo passado corretamente

### Erro ao deletar tamanho
1. Verifica se tamanho está em uso (em outro produto)
2. Remove de todos os produtos antes de deletar
3. Verifica conexão com internet

---

## Dados no Supabase

**Tabela:** `user_custom_sizes`

```sql
SELECT * FROM user_custom_sizes
WHERE user_id = 'seu_user_id'
ORDER BY created_at DESC;
```

**Inserir tamanho (direto no SQL):**
```sql
INSERT INTO user_custom_sizes (user_id, size_name, size_type)
VALUES ('user_id', 'XS', 'custom');
```

**Deletar tamanho (direto no SQL):**
```sql
DELETE FROM user_custom_sizes
WHERE user_id = 'user_id' AND size_name = 'XS';
```

---

## Limites

| Limite | Valor |
|--------|-------|
| Tamanhos por produto | 10 |
| Tamanhos salvos totais | Ilimitado |
| Comprimento do nome | Até 255 caracteres |
| Tipos permitidos | apparel, shoe, custom |

---

## Próximas Melhorias

- [ ] Importação em lote (CSV)
- [ ] Análise de tamanhos mais usados
- [ ] Sugestões automáticas baseadas em histórico
- [ ] Sincronização em tempo real
- [ ] Categorização de tamanhos

---

**Última atualização:** 08 de Novembro de 2025
**Status:** ✅ Pronto para Produção
