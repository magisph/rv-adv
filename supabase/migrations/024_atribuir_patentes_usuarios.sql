-- Migration: Atribuir patentes aos usuários via e-mail corporativo
-- Descrição: Define a coluna role de acordo com os níveis de acesso RLS

UPDATE public.users 
SET role = 'admin' 
WHERE email = 'rafaela@rvadv.local';

UPDATE public.users 
SET role = 'secretaria' 
WHERE email = 'sec@rvadv.local';

UPDATE public.users 
SET role = 'assistente' 
WHERE email = 'assist@rvadv.local';
