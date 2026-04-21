# Workflow: Nova Funcionalidade

## Gatilho
Requisito de nova funcionalidade ou melhoria significativa

## Passos

### Fase 1 — Planejamento (Agente: PM)
1. Analisar requisitos e escrever user stories
2. Identificar entidades afetadas (tabelas, componentes, serviços)
3. Definir contratos de API (se necessário nova edge function)
4. Criar plano de tarefas no formato:

```
Tarefa 1: [Banco] Nova tabela/migração + RLS
Tarefa 2: [Backend] Nova Edge Function (se necessário)
Tarefa 3: [Service] Novo serviço estendendo BaseService
Tarefa 4: [Schema] Schema Zod para validação
Tarefa 5: [Component] Novos componentes de UI
Tarefa 6: [Page] Nova página + registro em pages.config.js
Tarefa 7: [Teste] Testes de segurança
Tarefa 8: [Review] Code review e QA
```

### Fase 2 — Desenvolvimento (Agente: Dev)
1. Branch: `feature/<nome>`
2. Seguir ordem de tarefas (banco → backend → service → UI → page)
3. Seguir todas as Rules definidas acima
4. Commits frequentes com mensagens descritivas

### Fase 3 — Revisão (Agente: QA)
1. Executar `pnpm run lint && pnpm run security`
2. Testar todos os cenários (happy path + edge cases)
3. Verificar responsividade, dark mode, acessibilidade
4. Verificar RLS para cada role

### Fase 4 — Deploy (Agente: DevOps)
1. PR para `master` com descrição completa
2. Aprovação após QA
3. Merge → deploy automático
4. Monitorar logs pós-deploy

### Fase 5 — Documentação (Agente: Dev)
1. Atualizar `docs/llm-wiki.md` se arquitetura mudou
2. Atualizar entidades em `entities/` se novas tabelas
3. Atualizar AGENTS.md se nova padrão estabelecido
