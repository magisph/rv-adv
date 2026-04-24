-- 059_fix_diversos_constraint.sql
-- Corrige o CHECK constraint que não persistiu corretamente na migração 056.
-- A versão 056 foi registrada em supabase_migrations.schema_migrations
-- mas o DDL ALTER TABLE não foi efetivado — o pg_get_constraintdef mostra
-- que 'diversos' ainda estava ausente da lista de valores permitidos,
-- causando violação silenciosa (code 23514) em todo INSERT com category='diversos'.

ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_category_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_category_check
  CHECK (category = ANY (ARRAY[
    'pessoais'::text,
    'inss'::text,
    'medicos'::text,
    'judicial'::text,
    'rurais'::text,
    'analises'::text,
    'outros'::text,
    'comprovacao'::text,
    'diversos'::text
  ]));
