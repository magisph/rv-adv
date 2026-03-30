-- ==========================================
-- 040_fix_atendimentos_trigger.sql
-- Goal: Fix blind closing trigger
-- Description: Refactor document upload trigger to only close atendimentos when document
-- type is a significant legal/proving document rather than just any upload.
-- ==========================================

CREATE OR REPLACE FUNCTION handle_document_upload_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Validates the document type before triggering "Resolvido" status
  -- The acceptable categories/types to automatically close are 'peticao', 'prova' or 'laudo'
  -- Excludes random personal docs to avoid blindly closing the service
  IF NEW.parent_type = 'client' AND NEW.document_type IN ('peticao', 'prova', 'laudo') THEN
    UPDATE public.atendimentos
    SET 
      status = 'Resolvido',
      detalhes = COALESCE(detalhes, '') || ' [Resolvido automaticamente via anexo de novo documento oficial]'
    WHERE 
      client_id = NEW.parent_id 
      AND status = 'Pendente';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
