-- Migration: 013_limpeza_jurisprudencia
-- Description: Drop courts and jurisprudences tables and FTS functions

DROP TABLE IF EXISTS public.jurisprudences CASCADE;
DROP TABLE IF EXISTS public.courts CASCADE;
DROP FUNCTION IF EXISTS public.update_jurisprudence_fts CASCADE;
