/*
  # Criação da tabela users com suporte a WhatsApp

  1. Tabelas
    - `users` - Tabela de usuários com coluna whatsapp

  2. Segurança
    - RLS habilitado
    - Políticas de acesso baseadas em autenticação

  3. Índices
    - Índices para melhor performance
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create users table with whatsapp column
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  password_hash text,
  role text NOT NULL DEFAULT 'corretor' CHECK (role IN ('corretor', 'admin', 'parceiro')),
  niche_type text DEFAULT 'diversos' CHECK (niche_type = 'diversos'),
  phone text,
  avatar_url text,
  cover_url_desktop text,
  cover_url_mobile text,
  promotional_banner_url_desktop text,
  promotional_banner_url_mobile text,
  slug text UNIQUE,
  listing_limit integer DEFAULT 5,
  is_blocked boolean DEFAULT false,
  bio text,
  whatsapp text,
  instagram text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  primary_color text DEFAULT '#0f172a',
  primary_foreground text DEFAULT '#f8fafc',
  accent_color text DEFAULT '#6366f1',
  accent_foreground text DEFAULT '#ffffff',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_slug ON users(slug);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
CREATE POLICY "Users can read all user profiles"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "Admins can manage all users"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id::text = auth.uid()::text
      AND role = 'admin'
    )
  );
