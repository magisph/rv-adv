-- Migration: 036_cleanup_ghost_atendimentos
-- Description: Deletes "ghost" records from the atendimentos table created during initial tests.
-- Logic: Removes records where nome_contato is NULL or empty/blank.

DELETE FROM public.atendimentos 
WHERE nome_contato IS NULL 
OR trim(nome_contato) = '';
