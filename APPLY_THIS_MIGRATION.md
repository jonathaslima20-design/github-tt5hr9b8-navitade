# Migration Necessária - Adicionar coluna billing_cycle

## Problema
A tabela `subscriptions` não possui a coluna `billing_cycle`, causando erro ao criar assinaturas.

## Solução
Execute o SQL abaixo no seu Supabase Dashboard:

1. Acesse: https://supabase.com/dashboard/project/ikvwygqmlqhsyqmpgaoz/editor
2. Vá para "SQL Editor"
3. Cole e execute o seguinte SQL:

```sql
-- Create billing_cycle_type enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_cycle_type') THEN
    CREATE TYPE billing_cycle_type AS ENUM ('monthly', 'quarterly', 'semiannually', 'annually');
  END IF;
END $$;

-- Add billing_cycle column to subscriptions table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'subscriptions'
    AND column_name = 'billing_cycle'
  ) THEN
    ALTER TABLE public.subscriptions
    ADD COLUMN billing_cycle billing_cycle_type NOT NULL DEFAULT 'monthly';
  END IF;
END $$;
```

## Verificar
Após executar, verifique se a coluna foi criada:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'subscriptions'
AND column_name = 'billing_cycle';
```

Isso resolverá o problema de criação de assinaturas imediatamente.
