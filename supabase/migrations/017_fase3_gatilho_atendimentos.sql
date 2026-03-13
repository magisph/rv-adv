-- Function to automatically set 'atendimentos' to 'Resolvido' when a document is uploaded
CREATE OR REPLACE FUNCTION handle_document_upload_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the document belongs to a client
  IF NEW.parent_type = 'client' THEN
    UPDATE public.atendimentos
    SET 
      status = 'Resolvido',
      detalhes = COALESCE(detalhes, '') || ' [Resolvido automaticamente via anexo de documento]'
    WHERE 
      client_id = NEW.parent_id 
      AND status = 'Pendente';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the function after an insert on documents
DROP TRIGGER IF EXISTS tr_document_upload_resolve_atendimento ON public.documents;
CREATE TRIGGER tr_document_upload_resolve_atendimento
  AFTER INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION handle_document_upload_trigger();
