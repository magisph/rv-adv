-- =====================================================================
-- Migration 005: Criptografia do campo senha_inss
-- Usa pgp_sym_encrypt/pgp_sym_decrypt com chave simétrica
-- =====================================================================

-- 1. Garantir extensão pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Adicionar coluna criptografada (bytea) ao lado da coluna text existente
ALTER TABLE pericias ADD COLUMN IF NOT EXISTS senha_inss_encrypted bytea;

-- 3. Migrar dados existentes: criptografar senhas em texto puro
-- A chave simétrica DEVE ser definida como variável de ambiente no Supabase Vault
-- Substitua 'CHANGE_ME_USE_VAULT' pela chave real via Supabase Vault secrets
DO $$
DECLARE
  encryption_key text;
BEGIN
  -- Tentar obter a chave do Vault; se não existir, usar placeholder
  -- Em produção: INSERT INTO vault.secrets (name, secret) VALUES ('senha_inss_key', 'sua-chave-segura-aqui');
  SELECT coalesce(
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'senha_inss_key' LIMIT 1),
    'CHANGE_ME_USE_VAULT'
  ) INTO encryption_key;

  -- Migrar senhas existentes de text para encrypted
  UPDATE pericias
  SET senha_inss_encrypted = pgp_sym_encrypt(senha_inss, encryption_key)
  WHERE senha_inss IS NOT NULL
    AND senha_inss != ''
    AND senha_inss_encrypted IS NULL;
END $$;

-- 4. Criar funções helper para encrypt/decrypt
CREATE OR REPLACE FUNCTION encrypt_senha_inss(plain_text text)
RETURNS bytea AS $$
DECLARE
  encryption_key text;
BEGIN
  SELECT coalesce(
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'senha_inss_key' LIMIT 1),
    'CHANGE_ME_USE_VAULT'
  ) INTO encryption_key;
  
  RETURN pgp_sym_encrypt(plain_text, encryption_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_senha_inss(encrypted bytea)
RETURNS text AS $$
DECLARE
  encryption_key text;
BEGIN
  IF encrypted IS NULL THEN RETURN NULL; END IF;
  
  SELECT coalesce(
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'senha_inss_key' LIMIT 1),
    'CHANGE_ME_USE_VAULT'
  ) INTO encryption_key;
  
  RETURN pgp_sym_decrypt(encrypted, encryption_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger para criptografar automaticamente na inserção/atualização
CREATE OR REPLACE FUNCTION encrypt_senha_inss_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.senha_inss IS NOT NULL AND NEW.senha_inss != '' THEN
    NEW.senha_inss_encrypted = encrypt_senha_inss(NEW.senha_inss);
    NEW.senha_inss = '***ENCRYPTED***'; -- Remove texto puro, mantém indicador
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER pericias_encrypt_senha
  BEFORE INSERT OR UPDATE OF senha_inss ON pericias
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_senha_inss_trigger();
