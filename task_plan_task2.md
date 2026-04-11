# Plano de Tarefa: Feature Documentos Cível (Task 2)

## Objetivo
Adicionar a categoria "Diversos" à área de documentos e permitir o upload de arquivos `.docx`.

## Fases de Execução

### Fase 1: Database & Storage (Migrações)
- [x] Criar migração SQL `056_add_diversos_category.sql` para atualizar o `CHECK constraint` da tabela `documents`.
- [x] Configurar o bucket `client-documents` para aceitar o MIME type `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
- **Status:** `completo`

### Fase 2: Frontend (UI & Validação)
- [x] Atualizar `DOCUMENT_CATEGORIES` em `DocumentCategories.jsx` para incluir "Diversos".
- [x] Atualizar `DOCUMENT_TYPES` em `ClientDocumentsSection.jsx` para incluir "Diversos".
- [x] Atualizar `DocumentUpload.jsx` para aceitar `.docx` na interface e validação.
- [x] Verificar `CategoryUploadModal.jsx` (já suportava .docx, mas herdará a nova categoria).
- **Status:** `completo`

### Fase 3: Visualização & Testes
- [x] Validar se a nova categoria aparece nos filtros e modais.
- [x] Testar upload de um arquivo `.docx` (via análise de código e suporte de MIME).
- **Status:** `completo`

## Descobertas
- A migração `050` é o modelo para atualizar o `CHECK constraint`.
- O bucket `client-documents` foi criado na migração `009` sem restrições explícitas de MIME, mas é boa prática definir agora.
- `DocumentCategories.jsx` centraliza as configurações de cores e ícones das categorias.
