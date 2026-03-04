-- =====================================================================
-- Migration 007: RPC rpc_upsert_pagamentos
-- Fix: CRIT-02 — Race Conditions e falta de Rollback
-- Operação atômica DELETE + INSERT dentro de uma transação segura.
-- =====================================================================

CREATE OR REPLACE FUNCTION rpc_upsert_pagamentos(
  p_pericia_id uuid,
  p_pagamentos jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Deletar pagamentos antigos desta perícia
  DELETE FROM pericia_pagamentos
  WHERE pericia_id = p_pericia_id;

  -- 2. Inserir novos pagamentos (se houver)
  IF jsonb_array_length(p_pagamentos) > 0 THEN
    INSERT INTO pericia_pagamentos (pericia_id, valor, data, status, observacao)
    SELECT
      p_pericia_id,
      (item->>'valor')::numeric(12,2),
      (item->>'data')::date,
      COALESCE(item->>'status', 'pendente'),
      item->>'observacao'
    FROM jsonb_array_elements(p_pagamentos) AS item;
  END IF;

  -- Se qualquer operação acima falhar, o PostgreSQL faz ROLLBACK automático
  -- pois cada chamada RPC via PostgREST roda dentro de uma transação implícita.
END;
$$;

-- Conceder permissão para usuários autenticados
GRANT EXECUTE ON FUNCTION rpc_upsert_pagamentos(uuid, jsonb) TO authenticated;
