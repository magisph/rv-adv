-- 1. Renomear a coluna name para full_name na tabela public.users
DO $$
BEGIN
  IF EXISTS(SELECT *
    FROM information_schema.columns
    WHERE table_name='users' and table_schema='public' and column_name='name')
  THEN
      ALTER TABLE public.users RENAME COLUMN name TO full_name;
  END IF;
END $$;

-- 2. Criar política de leitura (SELECT) na tabela public.users para todos os usuários logados
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_select_policy'
    ) THEN
        CREATE POLICY "users_select_policy" ON public.users FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- 3. Atualizar Suzana (Secretária)
UPDATE auth.users 
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"user_role": "secretaria"}'::jsonb, 
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"full_name": "Suzana", "role": "secretaria"}'::jsonb 
WHERE email = 'suzana@rvadv.local';

UPDATE public.users 
SET full_name = 'Suzana', role = 'secretaria' 
WHERE id IN (SELECT id FROM auth.users WHERE email = 'suzana@rvadv.local');

-- 4. Atualizar Assistente (Assistente)
UPDATE auth.users 
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"user_role": "assistente"}'::jsonb, 
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"full_name": "Assistente", "role": "assistente"}'::jsonb 
WHERE email = 'assist@rvadv.local';

UPDATE public.users 
SET full_name = 'Assistente', role = 'assistente' 
WHERE id IN (SELECT id FROM auth.users WHERE email = 'assist@rvadv.local');

-- 5. Atualizar Rafaela (Ajuste de nome, mantendo admin)
UPDATE auth.users 
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"full_name": "Rafaela"}'::jsonb 
WHERE email = 'rafaela@rvadv.local';

UPDATE public.users 
SET full_name = 'Rafaela'
WHERE id IN (SELECT id FROM auth.users WHERE email = 'rafaela@rvadv.local');
