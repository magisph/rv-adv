-- =====================================================================
-- Migration: AUDIT_VAULT_STRICT (defense-in-depth)
-- Override nas funções de criptografia pgp_sym_encrypt/pgp_sym_decrypt
-- Objetivo: Impedir falha aberta (fallback hardcoded de senha em código).
-- =====================================================================

-- Função para Encrypt SEM fallback
CREATE OR REPLACE FUNCTION encrypt_senha_inss(plain_text text)
RETURNS bytea AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Obter a chave diretamente do vault
  SELECT decrypted_secret INTO encryption_key
  FROM vault.decrypted_secrets 
  WHERE name = 'senha_inss_key' 
  LIMIT 1;
  
  -- Defense-in-Depth: RAISE EXCEPTION invés de Coalesce inseguro
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'FATAL: Chave de criptografia "senha_inss_key" obrigatoria nao encontrada no Vault';
  END IF;
  
  RETURN pgp_sym_encrypt(plain_text, encryption_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Função para Decrypt SEM fallback
CREATE OR REPLACE FUNCTION decrypt_senha_inss(encrypted bytea)
RETURNS text AS $$
DECLARE
  encryption_key text;
BEGIN
  IF encrypted IS NULL THEN RETURN NULL; END IF;
  
  -- Obter a chave diretamente do vault
  SELECT decrypted_secret INTO encryption_key
  FROM vault.decrypted_secrets 
  WHERE name = 'senha_inss_key' 
  LIMIT 1;
  
  -- Defense-in-Depth: RAISE EXCEPTION invés de Coalesce inseguro
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'FATAL: Chave de decriptografia "senha_inss_key" obrigatoria nao encontrada no Vault';
  END IF;
  
  RETURN pgp_sym_decrypt(encrypted, encryption_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
