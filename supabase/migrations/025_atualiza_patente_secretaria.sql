-- Migration: Atualiza patente da secretaria
-- Descrição: Define a role para a nova conta da secretaria (suzana) para manter o bloqueio RLS

UPDATE public.users 
SET role = 'secretaria' 
WHERE email = 'suzana@rvadv.local';
