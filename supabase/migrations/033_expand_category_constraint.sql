-- Recriar constraint de categoria expandida para cobrir todas as abas atuais da UI
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_category_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_category_check
  CHECK (category IN (
    'pessoais', 'inss', 'medicos', 'judicial', 'rurais', 'analises', 'outros'
  ));
