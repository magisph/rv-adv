# Plano de Tarefa: Diário de Atendimentos (Task 3)

## Objetivo
Conceder CRUD integral a todos os utilizadores autenticados na tabela `atendimentos` e implementar visualização diária com Modal no Dashboard.

## Fases

### Fase 1: Análise das Políticas RLS Existentes
- [ ] Ler migrações 016 e 022 da tabela `atendimentos`.
- [ ] Identificar quais políticas existem e o que falta.
- **Status:** `pendente`

### Fase 2: Migração SQL 057
- [ ] Criar migração que remove políticas restritivas e adiciona CRUD total para `authenticated`.
- [ ] Adicionar índice em `data_atendimento` para performance de queries por data.
- **Status:** `pendente`

### Fase 3: Frontend — DiarioAtendimentosWidget.jsx
- [ ] Ler o componente atual para entender a estrutura.
- [ ] Implementar estado `selectedDay` e `isModalOpen`.
- [ ] Ao clicar num dia, filtrar atendimentos por data e abrir Modal.
- [ ] Modal exibe: Nome do Cliente + Detalhes/Observações.
- **Status:** `pendente`

### Fase 4: Commit e Push
- [ ] Commitar e enviar para GitHub.
- **Status:** `pendente`

## Descobertas
- A migração 016 criou a tabela `atendimentos` com RLS habilitado.
- A migração 022 corrigiu políticas mas pode ainda ser restritiva para não-admins.
- O widget atual usa `useQuery` com `atendimentoService`.
