-- =====================================================================
-- Migration 046: Correção de visibilidade de clientes
--
-- Problema identificado (2026-04-05):
--   O usuário rafaelavasconcelos.adv@gmail.com não possuía o claim
--   'user_role' em app_metadata. Com as políticas RLS das migrations
--   039 e 044 exigindo (auth.uid() = created_by OR user_role = 'admin'),
--   esse usuário só conseguia ver clientes criados por ele mesmo.
--   Como todos os clientes foram cadastrados por outros usuários
--   (suzana@rvadv.local e rafaela@rvadv.local), o resultado era
--   uma lista vazia — aparentando exclusão dos cadastros.
--
-- Causa raiz:
--   O usuário foi criado via OAuth Google (provider=email, mas sem
--   o fluxo de onboarding que define user_role em app_metadata).
--   As migrations 028/029 definem o hook de JWT mas não retroagem
--   para usuários já existentes sem o campo.
--
-- Correção aplicada (fora desta migration, via Auth Admin API):
--   app_metadata.user_role = 'admin' definido para
--   rafaelavasconcelos.adv@gmail.com (id: 2670d9fb-...).
--
-- Salvaguarda adicionada nesta migration:
--   Função + trigger que garante que todo novo usuário receba
--   user_role = 'advogado' por padrão se não tiver role definida,
--   evitando que o problema se repita.
-- =====================================================================

-- 1. Função de salvaguarda: garante user_role em app_metadata
--    para novos usuários sem role definida no onboarding
CREATE OR REPLACE FUNCTION public.ensure_user_role_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o novo usuário não tem user_role em app_metadata, define 'advogado' como padrão
  IF NEW.raw_app_meta_data IS NULL 
     OR (NEW.raw_app_meta_data->>'user_role') IS NULL 
     OR (NEW.raw_app_meta_data->>'user_role') = '' THEN
    
    NEW.raw_app_meta_data = COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) 
                            || jsonb_build_object('user_role', 'advogado');
  END IF;
  
  -- Sincroniza user_metadata.role com app_metadata.user_role para consistência
  IF NEW.raw_user_meta_data IS NULL 
     OR (NEW.raw_user_meta_data->>'role') IS NULL THEN
    NEW.raw_user_meta_data = COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)
                             || jsonb_build_object('role', NEW.raw_app_meta_data->>'user_role');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.ensure_user_role_on_signup() IS
  'Garante que todo novo usuário tenha user_role em app_metadata. '
  'Evita invisibilidade de registros por RLS quando o claim JWT está ausente.';

-- 2. Trigger no auth.users (apenas INSERT — não afeta updates)
DROP TRIGGER IF EXISTS tr_ensure_user_role ON auth.users;
CREATE TRIGGER tr_ensure_user_role
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_user_role_on_signup();

-- 3. Retroage para usuários existentes sem user_role
--    (idempotente: só atualiza quem não tem o campo)
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('user_role', 'advogado')
WHERE (raw_app_meta_data->>'user_role') IS NULL
   OR (raw_app_meta_data->>'user_role') = '';

-- 4. Documenta o incidente na tabela de auditoria (se existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'audit_log'
  ) THEN
    INSERT INTO public.audit_log (action, table_name, details, created_at)
    VALUES (
      'INCIDENT_FIX',
      'auth.users',
      jsonb_build_object(
        'incident', 'missing_user_role_claim',
        'affected_user', 'rafaelavasconcelos.adv@gmail.com',
        'fix', 'user_role=admin set via Auth Admin API',
        'migration', '046_fix_missing_user_role_claim',
        'timestamp', NOW()
      ),
      NOW()
    );
  END IF;
END $$;
