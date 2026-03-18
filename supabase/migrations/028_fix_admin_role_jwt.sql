-- Define a role para o admin no auth.users (necessário para o JWT RLS e React interface)
UPDATE auth.users
SET 
  raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"user_role": "admin"}'::jsonb,
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE email = 'rafaela@rvadv.local';

-- Define a role para o admin na tabela public.users, garantindo o espelhamento perfeito
UPDATE public.users
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'rafaela@rvadv.local'
);
