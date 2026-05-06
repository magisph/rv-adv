-- ============================================================================
-- 20260506120000_harden_jurisprudence_trf5_access
-- Fecha escritas diretas que poderiam contornar normalizacao, embeddings e
-- deduplicacao do pipeline canonico TRF5/CE.
-- ============================================================================

BEGIN;

-- A Base Interna continua legivel pelos papeis operacionais, mas escrita direta
-- fica restrita a administracao. Ingestao operacional usa Edge Function com
-- service_role e RPC canonica, preservando normalizacao/deduplicacao.
DROP POLICY IF EXISTS "jurisprudences_insert_roles" ON public.jurisprudences;
DROP POLICY IF EXISTS "jurisprudences_update_roles" ON public.jurisprudences;

CREATE POLICY "jurisprudences_insert_admin_roles"
  ON public.jurisprudences
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() = ANY (ARRAY['admin', 'dono'])
  );

CREATE POLICY "jurisprudences_update_admin_roles"
  ON public.jurisprudences
  FOR UPDATE TO authenticated
  USING (
    public.get_user_role() = ANY (ARRAY['admin', 'dono'])
  )
  WITH CHECK (
    public.get_user_role() = ANY (ARRAY['admin', 'dono'])
  );

-- Tabela TRF5 legada: manter leitura para compatibilidade, negar escrita e
-- revogar a RPC legada para evitar fluxo paralelo.
DO $$
BEGIN
  IF to_regclass('public.jurisprudencia_trf5') IS NOT NULL THEN
    DROP POLICY IF EXISTS "authenticated_select_jurisprudencia_trf5" ON public.jurisprudencia_trf5;
    DROP POLICY IF EXISTS "authenticated_insert_jurisprudencia_trf5" ON public.jurisprudencia_trf5;
    DROP POLICY IF EXISTS "authenticated_update_jurisprudencia_trf5" ON public.jurisprudencia_trf5;
    DROP POLICY IF EXISTS "authenticated_delete_jurisprudencia_trf5" ON public.jurisprudencia_trf5;
    DROP POLICY IF EXISTS "jurisprudencia_trf5_select_roles" ON public.jurisprudencia_trf5;

    CREATE POLICY "jurisprudencia_trf5_select_roles"
      ON public.jurisprudencia_trf5
      FOR SELECT TO authenticated
      USING (
        public.get_user_role() = ANY (
          ARRAY['admin', 'dono', 'advogado', 'user', 'secretaria', 'assistente']
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF to_regprocedure('public.verificar_inserir_jurisprudencia_trf5(text,date,text,text,text,vector,double precision)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.verificar_inserir_jurisprudencia_trf5(
      text,
      date,
      text,
      text,
      text,
      vector,
      double precision
    ) FROM PUBLIC;

    REVOKE EXECUTE ON FUNCTION public.verificar_inserir_jurisprudencia_trf5(
      text,
      date,
      text,
      text,
      text,
      vector,
      double precision
    ) FROM anon;

    REVOKE EXECUTE ON FUNCTION public.verificar_inserir_jurisprudencia_trf5(
      text,
      date,
      text,
      text,
      text,
      vector,
      double precision
    ) FROM authenticated;

    GRANT EXECUTE ON FUNCTION public.verificar_inserir_jurisprudencia_trf5(
      text,
      date,
      text,
      text,
      text,
      vector,
      double precision
    ) TO service_role;
  END IF;
END $$;

-- Busca semantica passa a devolver metadados de fonte para UI multi-fonte.
DROP FUNCTION IF EXISTS public.buscar_jurisprudencia(halfvec(3072), int, float);

CREATE FUNCTION public.buscar_jurisprudencia(
  query_embedding      halfvec(3072),
  match_count          int   DEFAULT 10,
  similarity_threshold float DEFAULT 0.4
)
RETURNS TABLE (
  id               uuid,
  process_number   text,
  court_id         uuid,
  relator          text,
  tema             text,
  trial_date       date,
  publication_date date,
  excerpt          text,
  full_text        text,
  pdf_path         text,
  source           text,
  jurisdicao       text,
  orgao_julgador   text,
  similarity_score double precision,
  is_unique_teor   boolean,
  similarity       double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    j.id,
    j.process_number,
    j.court_id,
    j.relator,
    j.tema,
    j.trial_date,
    j.publication_date,
    j.excerpt,
    j.full_text,
    j.pdf_path,
    j.source,
    j.jurisdicao,
    j.orgao_julgador,
    j.similarity_score,
    j.is_unique_teor,
    1 - (j.embedding <=> query_embedding) AS similarity
  FROM public.jurisprudences j
  WHERE
    j.embedding IS NOT NULL
    AND 1 - (j.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY j.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.buscar_jurisprudencia(halfvec(3072), int, float)
  TO authenticated;

COMMIT;
