# Relatório de Auditoria e Plano de Execução - RV-Adv

Este documento apresenta o diagnóstico técnico e o plano de ação para as correções e melhorias solicitadas no sistema **RV-Adv**.

---

## 1. Bug Anexo de Tarefas (TaskForm)

### [DIAGNÓSTICO_HIPOTÉTICO]
A causa-raiz é a **ausência completa da infraestrutura de anexos** no módulo de tarefas. Embora a UI permita selecionar arquivos (provavelmente via input genérico ou dropzone), não existe a coluna `attachments` (JSONB/Text Array) na tabela `tasks`, nem lógica de upload no `TaskForm.jsx` para persistir esses arquivos no Supabase Storage antes de salvar o registro.

### [FICHEIROS-ALVO]
- **Migração SQL:** `supabase/migrations/XXX_add_attachments_to_tasks.sql` (Nova)
- **Frontend:** `src/components/tasks/TaskForm.jsx`
- **Serviços:** `src/services/taskService.js`

### [PLANO_DE_AÇÃO]
1. Criar migração para adicionar coluna `attachments` (JSONB) à tabela `tasks`.
2. Atualizar políticas de Storage para permitir acesso à pasta `task-attachments`.
3. No `TaskForm.jsx`, implementar estado local para arquivos selecionados.
4. Integrar o `aiService.uploadFile` ou `storageService` no `handleSubmit` para realizar o upload antes de salvar a tarefa.
5. Persistir as URLs retornadas no campo `attachments` da tabela `tasks`.
6. Adicionar visualização dos anexos no card de tarefa (`TaskCard` em `Tasks.jsx`).

### [RISCOS_E_SEGURANÇA]
- **Storage RLS:** Garantir que apenas usuários autenticados possam fazer upload/download.
- **Payload Size:** Validar o tamanho máximo de arquivos no frontend para evitar falhas de timeout.

---

## 2. Feature Documentos (Área Cível)

### [DIAGNÓSTICO_HIPOTÉTICO]
A arquitetura atual utiliza constantes estáticas para definir categorias. A categoria "Diversos" está ausente no mapeamento `DOCUMENT_TYPES` e o filtro de exibição para a área "Cível" em `ClientDocumentsSection.jsx` é restritivo. Além disso, o componente de upload não inclui o MIME type de documentos Word (`.docx`).

### [FICHEIROS-ALVO]
- **Frontend:** `src/components/documents/DocumentCategories.jsx`
- **Frontend:** `src/components/documents/ClientDocumentsSection.jsx`
- **Frontend:** `src/components/documents/CategoryUploadModal.jsx`

### [PLANO_DE_AÇÃO]
1. Adicionar a categoria `diversos` ao objeto `DOCUMENT_TYPES` em `DocumentCategories.jsx`.
2. Atualizar o `useMemo` em `ClientDocumentsSection.jsx` para incluir `diversos` na lista `allowed` quando `areaAtuacao === 'Cível'`.
3. Modificar o `accept` do componente de upload (Dropzone/Input) em `CategoryUploadModal.jsx` para incluir `.docx` (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`).
4. Verificar se existe validação de extensão no `documentService.js` ou em Edge Functions e atualizar se necessário.

### [RISCOS_E_SEGURANÇA]
- **Tipagem:** Garantir que a nova categoria seja tratada corretamente em todas as visualizações (ex: ícones padrão).
- **MIME Sniffing:** Garantir que o Supabase Storage aceite o novo MIME type sem corromper o arquivo.

---

## 3. Feature Diário de Atendimentos (Dashboard)

### [DIAGNÓSTICO_HIPOTÉTICO]
As políticas RLS atuais (`022_fix_atendimentos_rls.sql`) restringem o `UPDATE` e `DELETE` apenas para `admin` e `dono`. Para permitir o uso pleno por todos, as políticas precisam ser simplificadas. Além disso, o widget atual não possui um gatilho para visualização diária agrupada.

### [FICHEIROS-ALVO]
- **Migração SQL:** `supabase/migrations/XXX_update_atendimentos_rls.sql` (Nova)
- **Frontend:** `src/components/dashboard/DiarioAtendimentosWidget.jsx`
- **Frontend:** `src/components/dashboard/DailyAtendimentosModal.jsx` (Novo)

### [PLANO_DE_AÇÃO]
1. Criar migração SQL para alterar as políticas de `UPDATE` e `DELETE` da tabela `atendimentos` para `TO authenticated USING (true)`.
2. Desenvolver o componente `DailyAtendimentosModal.jsx` que recebe uma lista de atendimentos e os exibe em formato de lista detalhada.
3. No `DiarioAtendimentosWidget.jsx`, adicionar um calendário compacto ou seletor de data.
4. Implementar lógica para abrir o novo modal ao clicar em um dia ou em um botão "Ver Diário".
5. Ajustar a query do `atendimentoService` para permitir filtragem por data específica.

### [RISCOS_E_SEGURANÇA]
- **Privacidade:** A abertura do RLS permite que qualquer usuário autenticado modifique qualquer atendimento. Confirmar se não é necessário rastrear o `owner_id`.
- **Performance:** O agrupamento diário deve ser feito via query (`WHERE created_at::date = ...`) para evitar carregar todos os dados no cliente.

---

## 4. Bug Delegação de Tarefas (Admin)

### [DIAGNÓSTICO_HIPOTÉTICO]
O sistema sofre de "visão de túnel" devido ao filtro `task.assigned_to === user?.email` aplicado em `Tasks.jsx` e `TasksWidget.jsx`. Não existe o conceito de `assigner_id` (quem criou/delegou) no schema atual, impossibilitando que a admin Rafaela acompanhe tarefas que ela delegou para outros usuários.

### [FICHEIROS-ALVO]
- **Migração SQL:** `supabase/migrations/XXX_add_assigner_id_to_tasks.sql` (Nova)
- **Frontend:** `src/pages/Tasks.jsx`
- **Frontend:** `src/components/dashboard/TasksWidget.jsx`
- **Serviços:** `src/components/tasks/TaskForm.jsx` (para capturar o criador)

### [PLANO_DE_AÇÃO]
1. Adicionar coluna `assigner_id` (UUID, FK para users) e `assigner_name` à tabela `tasks`.
2. No `TaskForm.jsx`, incluir automaticamente o ID do usuário logado como `assigner_id` na criação de novas tarefas.
3. Atualizar o filtro de visibilidade no `useMemo` de `Tasks.jsx` e `TasksWidget.jsx` para: 
   `task.assigned_to === user?.email || task.assigner_id === user?.id`.
4. Adicionar um indicador visual no card da tarefa (ex: "Delegada por: [Nome]") para facilitar o rastreio.
5. Ajustar as notificações para alertar o `assigner_id` quando o status da tarefa mudar para `done`.

### [RISCOS_E_SEGURANÇA]
- **RLS:** As políticas de `SELECT` na tabela `tasks` devem ser revisadas para garantir que o delegador tenha permissão de leitura, mesmo que não seja o `assigned_to`.
- **Consistência de Dados:** Realizar um backfill opcional para tarefas existentes (marcar admin como assigner padrão).
