# Rule: Documentos e Geração de PDF

## Tipos de Documento Suportados
- Petição Inicial, Recurso, Contestação, Manifestação
- Laudos periciais, Relatórios, Certidões
- Procurações, Substabelecimentos

## Ferramentas
- DOCX: `docxtemplater` + `pizzip` (templates com variáveis)
- PDF: `jsPDF` (geração direta) + `html2canvas` (captura de HTML)
- Batch: `JSZip` + `file-saver` (download em lote)

## Templates
- Armazenados na tabela `templates` (categorias + variáveis + conteúdo HTML)
- Variáveis: `{cliente.nome}`, `{processo.numero}`, `{data.hoje}`, etc.
- NUNCA renderizar templates sem sanitização (XSS prevention)

## OCR
- Edge Function: `ocr-classify-document`
- Provedores: Gemini 2.5 Flash (primário), Qwen2.5 VL (fallback)
- Classificação: Groq Llama 3.1 8B (rápida), Cohere Command R+ (fallback)

## Regras
- SEMPRE preservar documento original (versionamento)
- SEMPRE registrar metadata (tipo, categoria, data de upload)
- Versionamento: tabela `document_versions` com diff
- Permissões: RLS por role (admin/advogado: total, user: leitura própria)
