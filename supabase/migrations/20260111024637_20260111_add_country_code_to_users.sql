/*
  # Add International DDI Support to Users Table
  
  Adiciona suporte a DDIs internacionais separando o código do país do número local.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'country_code'
  ) THEN
    ALTER TABLE users ADD COLUMN country_code text DEFAULT '55';
  END IF;
END $$;
