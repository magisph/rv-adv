-- =====================================================================
-- Migration 043: Criptografia dos campos senha_meu_inss e senha_gov
--                na tabela public.clients
--
-- Reutiliza a mesma infraestrutura de criptografia da migration 005
-- (pgcrypto + Vault + funções encrypt_senha_inss / decrypt_senha_inss).
--
-- Após esta migration:
--   - clients.senha_meu_inss_encrypted (bytea) armazena o valor cifrado
--   - clients.senha_gov_encrypted (bytea) armazena o valor cifrado
--   - O trigger garante criptografia automática em INSERT/UPDATE
--   - Os campos de texto puro são substituídos por '***ENCRYPTED***'
-- =====================================================================

-- 1. Garantir extensão pgcrypto (já deve existir, mas é idempotente)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Adicionar colunas criptografadas (bytea) — idempotente
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS senha_meu_inss_encrypted bytea;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS senha_gov_encrypted      bytea;

-- 3. Migrar dados existentes em texto puro para criptografado
DO $$
DECLARE
  encryption_key text;
BEGIN
  -- Obtém a chave do Vault (mesma usada pela tabela pericias)
  SELECT coalesce(
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'senha_inss_key' LIMIT 1),
    'CHANGE_ME_USE_VAULT'
  ) INTO encryption_key;

  -- Criptografar senha_meu_inss
  UPDATE public.clients
  SET senha_meu_inss_encrypted = pgp_sym_encrypt(senha_meu_inss, encryption_key)
  WHERE senha_meu_inss IS NOT NULL
    AND senha_meu_inss != ''
    AND senha_meu_inss != '***ENCRYPTED***'
    AND senha_meu_inss_encrypted IS NULL;

  -- Substituir texto puro por indicador
  UPDATE public.clients
  SET senha_meu_inss = '***ENCRYPTED***'
  WHERE senha_meu_inss IS NOT NULL
    AND senha_meu_inss != ''
    AND senha_meu_inss != '***ENCRYPTED***'
    AND senha_meu_inss_encrypted IS NOT NULL;

  -- Criptografar senha_gov
  UPDATE public.clients
  SET senha_gov_encrypted = pgp_sym_encrypt(senha_gov, encryption_key)
  WHERE senha_gov IS NOT NULL
    AND senha_gov != ''
    AND senha_gov != '***ENCRYPTED***'
    AND senha_gov_encrypted IS NULL;

  -- Substituir texto puro por indicador
  UPDATE public.clients
  SET senha_gov = '***ENCRYPTED***'
  WHERE senha_gov IS NOT NULL
    AND senha_gov != ''
    AND senha_gov != '***ENCRYPTED***'
    AND senha_gov_encrypted IS NOT NULL;
END $$;

-- 4. Função trigger para criptografar automaticamente em INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.encrypt_clients_senhas_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Criptografar senha_meu_inss se fornecida em texto puro
  IF NEW.senha_meu_inss IS NOT NULL
     AND NEW.senha_meu_inss != ''
     AND NEW.senha_meu_inss != '***ENCRYPTED***' THEN
    NEW.senha_meu_inss_encrypted = encrypt_senha_inss(NEW.senha_meu_inss);
    NEW.senha_meu_inss = '***ENCRYPTED***';
  END IF;

  -- Criptografar senha_gov se fornecida em texto puro
  IF NEW.senha_gov IS NOT NULL
     AND NEW.senha_gov != ''
     AND NEW.senha_gov != '***ENCRYPTED***' THEN
    NEW.senha_gov_encrypted = encrypt_senha_inss(NEW.senha_gov);
    NEW.senha_gov = '***ENCRYPTED***';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Criar trigger (idempotente)
DROP TRIGGER IF EXISTS clients_encrypt_senhas ON public.clients;
CREATE TRIGGER clients_encrypt_senhas
  BEFORE INSERT OR UPDATE OF senha_meu_inss, senha_gov ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_clients_senhas_trigger();

-- 6. Comentários de documentação
COMMENT ON COLUMN public.clients.senha_meu_inss IS
  'Indicador de presença (***ENCRYPTED***). Valor real em senha_meu_inss_encrypted.';
COMMENT ON COLUMN public.clients.senha_meu_inss_encrypted IS
  'Senha do Meu INSS criptografada com pgp_sym_encrypt (chave no Vault: senha_inss_key).';
COMMENT ON COLUMN public.clients.senha_gov IS
  'Indicador de presença (***ENCRYPTED***). Valor real em senha_gov_encrypted.';
COMMENT ON COLUMN public.clients.senha_gov_encrypted IS
  'Senha do Gov.br criptografada com pgp_sym_encrypt (chave no Vault: senha_inss_key).';
