-- ============================================================================
-- 20260504162000_restrict_jurisprudence_rpc_execution
-- Restricts the canonical jurisprudence ingestion RPC to service_role only.
-- ============================================================================

BEGIN;

REVOKE EXECUTE ON FUNCTION public.verificar_inserir_jurisprudencia(
  text,
  text,
  date,
  date,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  halfvec,
  double precision
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.verificar_inserir_jurisprudencia(
  text,
  text,
  date,
  date,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  halfvec,
  double precision
) FROM anon;

REVOKE EXECUTE ON FUNCTION public.verificar_inserir_jurisprudencia(
  text,
  text,
  date,
  date,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  halfvec,
  double precision
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.verificar_inserir_jurisprudencia(
  text,
  text,
  date,
  date,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  halfvec,
  double precision
) TO service_role;

COMMIT;
