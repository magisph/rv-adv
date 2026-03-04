# 🔍 AUDITORIA GERAL — RV-Adv (LegalFlow)

> **Data:** 2026-03-03  
> **Auditor:** QA Agent Sênior  
> **Skills aplicadas:** `@react-best-practices`, `@frontend-design`, `@supabase-postgres-best-practices`  
> **Escopo:** Análise estática, arquitetural e de segurança de toda a base `src/`

---

## 🔴 BUGS CRÍTICOS

Problemas que causam quebra de tela, perda de dados ou falhas de segurança.

---

### CRIT-01 — Chaves de API expostas no client-side

| Campo | Detalhe |
|---|---|
| **Arquivo** | `src/services/aiService.js` |
| **Linhas** | 7-30 |
| **Causa raiz** | Todas as API keys (Groq, OpenRouter, Gemini, Cohere, NVIDIA) são carregadas via `import.meta.env.VITE_*` e enviadas diretamente nas requisições `fetch` do browser. Qualquer usuário pode abrir o DevTools → Network e copiar as chaves. |
| **Agravante** | A chave do Gemini é passada como **query parameter na URL** (L279: `?key=${apiKey}`), o que a expõe em logs de servidor, histórico do browser e referrers. |
| **Solução** | Mover todas as chamadas AI para **Supabase Edge Functions** como proxy. O frontend chama `supabase.functions.invoke('ai-proxy', { body })`, e a Edge Function guarda as keys como secrets. |

---

### CRIT-02 — Inserções multi-tabela sem Rollback (Race Condition + Perda de dados)

| Campo | Detalhe |
|---|---|
| **Arquivo** | `src/pages/ProcessDetail.jsx` |
| **Linhas** | 105-170 (`syncDatajud`) |
| **Causa raiz** | O loop `for...of` insere N movimentações sequenciais e depois N notificações. Se a inserção da 2ª movimentação falhar, as movimentações já inseridas ficam orphans e não são revertidas. Além disso, não há `try/catch` envolvendo o loop — qualquer erro propaga sem set `isSyncing(false)`, travando **permanentemente** o botão "Sincronizar DataJud". |
| **Solução** | Envolver todo o bloco em `try/catch/finally`. Usar `Promise.all` para batch insert quando possível. Se uma falha parcial ocorrer, reverter as inserções feitas com um bulk delete. Garantir `setIsSyncing(false)` no `finally`. |

| Campo | Detalhe |
|---|---|
| **Arquivo** | `src/modules/periciapro/services/periciaService.ts` |
| **Linhas** | 97-111 (`upsertPagamentos`) |
| **Causa raiz** | Faz **DELETE ALL** seguido de **INSERT** sem transação atômica. Se o DELETE funcionar mas o INSERT falhar, todos os pagamentos da perícia são **permanentemente perdidos**. Viola `@supabase-postgres-best-practices` Regra #1. |
| **Solução** | Usar uma `rpc()` Postgres function com `BEGIN/COMMIT/ROLLBACK` ou, no mínimo, verificar o resultado do INSERT antes de confirmar. |

---

### CRIT-03 — `user.email` acessado sem Optional Chaining em callbacks de mutação

| Campo | Detalhe |
|---|---|
| **Arquivo** | `src/pages/ProcessDetail.jsx` |
| **Linhas** | 148, 162 |
| **Causa raiz** | `const user = await authService.getCurrentUser()` pode retornar `null` se a sessão expirou. Na L162, `user.email` é acessado diretamente — crash: `Cannot read properties of null (reading 'email')`. Mesma lógica em `ClientDetail.jsx:193` e `NotificationService.jsx` (L78, 105, 141, 161, 196, 215). |
| **Violação** | `@supabase-postgres-best-practices` Regra #3: "Nunca acesse IDs de sessão sem Optional Chaining (`user?.id`)". |
| **Solução** | Sempre usar `user?.email`. Adicionar guard clause: `if (!user) return;` antes de criar notificações. |

---

### CRIT-04 — `NotificationBell` acessa `user.email` sem Optional Chaining dentro de queryFn

| Campo | Detalhe |
|---|---|
| **Arquivo** | `src/Layout.jsx` |
| **Linha** | 390 |
| **Causa raiz** | Dentro do `queryFn`, `user.email` é acessado diretamente: `user_email: user.email`. Embora `enabled: !!user?.email` esteja configurado, o React Query pode disparar a query em edge cases (hot reload, race condition de re-render) antes que a guard `enabled` seja reavaliada. |
| **Solução** | Usar `user?.email` dentro da `queryFn` como defesa em profundidade. |

---

### CRIT-05 — Senha do INSS exibida em texto puro na tabela de clientes

| Campo | Detalhe |
|---|---|
| **Arquivo** | `src/pages/Clients.jsx` |
| **Linhas** | 226-234 |
| **Causa raiz** | O campo `client.senha_meu_inss` é renderizado diretamente como texto visível na tabela (`<span className="font-mono">{client.senha_meu_inss}</span>`). Qualquer visitante da tela pode ler senhas de todos os clientes. Também ocorre em `ClientDetail.jsx:462`. |
| **Solução** | Mascarar com `••••••` e oferecer toggle de visibilidade (o componente `Eye`/`EyeOff` já está importado em `CadastroCliente.jsx`). Idealmente, a senha deve ser armazenada criptografada no banco. |

---

## 🟠 ALERTAS ALTOS

Erros de lógica, inconsistências de dados e problemas que degradam a confiabilidade.

---

### HIGH-01 — Nenhum `onError` em 26 mutações dos módulos principais

| Campo | Detalhe |
|---|---|
| **Arquivos** | `Clients.jsx`, `Processes.jsx`, `ProcessDetail.jsx`, `Financial.jsx`, `Tasks.jsx`, `Deadlines.jsx`, `Settings.jsx`, `ClientDetail.jsx` |
| **Causa raiz** | Todas as `useMutation` nestes arquivos definem `onSuccess` mas **nenhuma** define `onError`. Se o Supabase retornar erro (403 RLS, timeout, etc.), a falha é silenciosa — o usuário não recebe feedback visual e pode repetir a ação, potencialmente criando duplicatas. |
| **Violação** | `@react-best-practices` Regra #3: "Sempre implemente tratamentos visuais no `onError` do React Query." |
| **Solução** | Adicionar `onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" })` em todas as mutações. Referência: o `CadastroCliente.jsx` já implementa corretamente (L166). |

---

### HIGH-02 — `cacheTime` depreciado (14 ocorrências em 6 arquivos)

| Campo | Detalhe |
|---|---|
| **Arquivos** | `Layout.jsx:54`, `Home.jsx:23,32,39,47`, `Clients.jsx:70`, `ClientDetail.jsx:99,107,115,123,135`, `Processes.jsx:88`, `ClientDocumentsSection.jsx:839,848` |
| **Causa raiz** | No TanStack Query v5, `cacheTime` foi renomeado para `gcTime`. A opção antiga é ignorada silenciosamente, fazendo com que os dados não sejam mantidos em cache pelo tempo esperado — eles usam o default de 5 minutos em vez dos 10-30 minutos configurados. |
| **Solução** | Renomear `cacheTime` → `gcTime` em todos os 14 locais. |

---

### HIGH-03 — `keepPreviousData` depreciado (2 ocorrências)

| Campo | Detalhe |
|---|---|
| **Arquivos** | `Clients.jsx:71`, `Processes.jsx:89` |
| **Causa raiz** | No TanStack Query v5, `keepPreviousData` foi removido. Deve ser substituído por `placeholderData: keepPreviousData` usando a função importada `import { keepPreviousData } from "@tanstack/react-query"`. Sem isso, a transição entre dados antigos e novos fica abrupta. |
| **Solução** | `placeholderData: keepPreviousData` (importar da lib). |

---

### HIGH-04 — `handleAppointmentSave` sequencial sem tratamento de erro parcial

| Campo | Detalhe |
|---|---|
| **Arquivo** | `src/pages/ClientDetail.jsx` |
| **Linhas** | 170-199 |
| **Causa raiz** | Salva o appointment e depois insere N notificações em loop `for...of`. Se a criação de uma notificação falhar, as seguintes não são criadas, mas o appointment já foi salvo. O usuário não é informado de que os lembretes falharam. |
| **Solução** | Envolver o bloco de criação de notificações em `try/catch` e exibir um toast de aviso parcial: "Compromisso salvo, mas alguns alertas falharam". |

---

### HIGH-05 — `Settings.jsx` acessa `userData` sem null check

| Campo | Detalhe |
|---|---|
| **Arquivo** | `src/pages/Settings.jsx` |
| **Linhas** | 36-50 |
| **Causa raiz** | `await authService.getCurrentUser()` pode retornar `null`. Imediatamente após, `userData.full_name`, `userData.oab_number`, etc. são acessados sem verificação, causando crash: `Cannot read properties of null`. |
| **Solução** | Adicionar `if (!userData) return;` antes de `setFormData`. |

---

### HIGH-06 — `Deadlines.jsx` usa `useEffect` para buscar user em vez de `useQuery`

| Campo | Detalhe |
|---|---|
| **Arquivo** | `src/pages/Deadlines.jsx` |
| **Linhas** | 73-79 |
| **Causa raiz** | Usa `useEffect` + `setState` para carregar user, mas o dado já está cacheado no React Query via `["current-user"]`. Isso cria uma duplicação de fonte da verdade e um possível stale state. Além disso, o `useEffect` não tem cleanup (não crítico aqui, mas não segue o padrão). |
| **Solução** | Substituir por `const { data: user } = useQuery({ queryKey: ["current-user"], ... })` reutilizando o cache existente. |

---

### HIGH-07 — `TasksWidget.jsx` acessa `user.email` sem guard

| Campo | Detalhe |
|---|---|
| **Arquivo** | `src/components/dashboard/TasksWidget.jsx` |
| **Linhas** | 195, 275, 360, 594 |
| **Causa raiz** | Múltiplos acessos diretos a `user.email` sem verificar se `user` é `null`. Se o componente renderizar antes do fetch de auth completar, crash instantâneo. |
| **Solução** | Usar `user?.email` e adicionar guard clauses. |

---

## 🟡 AVISOS MÉDIOS

Problemas de UX, small memory leaks e inconsistências de design.

---

### MED-01 — `queryClient.invalidateQueries` usando array em vez de objeto

| Campo | Detalhe |
|---|---|
| **Arquivos** | Todos os pages (Clients, Processes, Tasks, Financial, Deadlines, etc.) |
| **Causa raiz** | No TanStack Query v5, `invalidateQueries` espera um objeto query filter: `invalidateQueries({ queryKey: ["clients"] })`. A sintaxe antiga `invalidateQueries(["clients"])` pode não funcionar corretamente em versões futuras e já gera warnings em strict mode. |
| **Solução** | Migrar todas as chamadas para o formato: `queryClient.invalidateQueries({ queryKey: ["clients"] })`. |

---

### MED-02 — `confirm()` nativo para exclusões em vez de modal customizado

| Campo | Detalhe |
|---|---|
| **Arquivos** | `Clients.jsx:110`, `Processes.jsx:130`, `Financial.jsx:114`, `Tasks.jsx:123`, `Deadlines.jsx:131`, `ClientDetail.jsx:209` |
| **Causa raiz** | Usa `window.confirm()` para confirmações de delete. Isso é inconsistente com o design system do projeto (que usa shadcn/ui Dialogs), não é estilizável, e pode ser bloqueado por browsers modernos. |
| **Violação** | `@frontend-design` Regra #3: "Priorize o reuso de componentes da pasta `@/components/ui/`". |
| **Solução** | Criar um componente `ConfirmDialog` reutilizável usando `AlertDialog` do shadcn/ui. |

---

### MED-03 — CSS Variables inline no JSX do Layout

| Campo | Detalhe |
|---|---|
| **Arquivo** | `src/Layout.jsx` |
| **Linhas** | 128-135 |
| **Causa raiz** | Variáveis CSS (`--legal-blue`, `--legal-gold`) são definidas via `<style>` tag inline no JSX em vez de no `index.css`. Isso recria a tag `<style>` a cada render e pode causar FOUC. |
| **Violação** | `@frontend-design` Regra #2: "Utilize o Tailwind CSS para manter a consistência de cores da paleta definida em `index.css`." |
| **Solução** | Mover as variáveis para `src/index.css` dentro do `:root`. |

---

### MED-04 — NotificationMonitor acessa `user.email` sem Optional Chaining

| Campo | Detalhe |
|---|---|
| **Arquivo** | `src/components/notifications/NotificationMonitor.jsx` |
| **Linhas** | 52, 83, 188, 218 |
| **Causa raiz** | Múltiplas referências a `user.email` diretamente. Um fallback como `deadline.responsible_email || user.email` mascara o problema — se `user` for `null` e `responsible_email` for falsy, crash. |
| **Solução** | Usar `user?.email` e adicionar early return se `!user`. |

---

### MED-05 — CalendarWidget e CalendarSettings acessam `user.email` diretamente

| Campo | Detalhe |
|---|---|
| **Arquivos** | `src/components/calendar/CalendarWidget.jsx:24`, `src/pages/CalendarSettings.jsx:103` |
| **Causa raiz** | `assigned_to: user.email` — sem verificação de nulidade. |
| **Solução** | Usar `user?.email` e/ou guard clause. |

---

### MED-06 — `NotificationService.jsx` tem 6 acessos diretos a `user.email`

| Campo | Detalhe |
|---|---|
| **Arquivo** | `src/components/notifications/NotificationService.jsx` |
| **Linhas** | 78, 105, 141, 161, 196, 215 |
| **Causa raiz** | Todas as funções de criação de notificação assumem que `user` nunca é `null`. |
| **Solução** | Usar `user?.email` e adicionar guard functions no início de cada método. |

---

### MED-07 — `NotificationBell` na `Layout.jsx` sem `refetchOnWindowFocus: false`

| Campo | Detalhe |
|---|---|
| **Arquivo** | `src/Layout.jsx` |
| **Linhas** | 386-395 |
| **Causa raiz** | A query de notificações usa `refetchInterval: 10000` (10s), mas não desabilita `refetchOnWindowFocus`. Isso causa double-fetch quando o usuário volta à aba — um pelo interval e outro pelo focus event simultâneo. |
| **Solução** | Adicionar `refetchOnWindowFocus: false`. |

---

## 🟢 MELHORIAS

Dicas de performance e refatoração de código limpo.

---

### IMP-01 — `baseService.js` não possui rate limiting/pagination

| Campo | Detalhe |
|---|---|
| **Arquivo** | `src/services/baseService.js` |
| **Linhas** | 8, 76 |
| **Causa raiz** | O `list()` padrão usa `limit = 100` e o `filter()` também `limit = 100`. Para tabelas que crescerão (financials, notifications), isso pode causar payloads lentos. Não há suporte a cursor-based pagination. |
| **Solução** | Implementar paginação com `range()` do Supabase e um hook `usePaginatedQuery`. |

---

### IMP-02 — Arquivo `createPageUrl` importado de dois caminhos diferentes

| Campo | Detalhe |
|---|---|
| **Arquivos** | `Layout.jsx:3` importa de `"./utils"`, `Clients.jsx:5` importa de `"@/utils"` |
| **Causa raiz** | Inconsistência de importações. Ambos resolvem para o mesmo arquivo, mas a inconsistência confunde IDEs e ferramentas de refactor. |
| **Solução** | Padronizar todas as importações para `@/utils`. |

---

### IMP-03 — `QueryClient` sem `onError` global

| Campo | Detalhe |
|---|---|
| **Arquivo** | `src/lib/query-client.js` |
| **Linhas** | 3-10 |
| **Causa raiz** | Não há handler global de erro no `QueryClient`. Um `onError` global serviria como rede de segurança para qualquer query/mutation sem handler explícito. |
| **Solução** | Configurar `defaultOptions.mutations.onError` com um toast global, e/ou usar `QueryCache({ onError })`. |

---

### IMP-04 — `Home.jsx` filtra `clients` e `processes` pelo status de forma redundante

| Campo | Detalhe |
|---|---|
| **Arquivo** | `src/pages/Home.jsx` |
| **Linhas** | 50-61 |
| **Causa raiz** | Dados já limitados a 10 itens são filtrados por status no client-side. O filtro de `status: "ativo"` deveria ser feito na query do Supabase com `.eq('status', 'ativo')` para reduzir payload. |
| **Solução** | Criar queries específicas para dashboard: `clientService.filter({ status: 'ativo' }, '-created_date', 10)`. |

---

### IMP-05 — `authService.updateMe` mescla metadata sem limpar campos removidos

| Campo | Detalhe |
|---|---|
| **Arquivo** | `src/services/authService.js` |
| **Linhas** | 29-42 |
| **Causa raiz** | O `updateUser({ data: metadata })` do Supabase faz um **merge** shallow. Se o usuário remover um campo (ex: `office_phone`), o campo antigo permanece no `user_metadata` para sempre. |
| **Solução** | Considerar enviar explicitamente `null` para campos vazios ou usar uma tabela `profiles` separada. |

---

### IMP-06 — Componente `motion.tr` no `Clients.jsx` e `Processes.jsx` pode causar hydration warnings

| Campo | Detalhe |
|---|---|
| **Arquivos** | `Clients.jsx:198-276`, `Processes.jsx:251-331` |
| **Causa raiz** | `<motion.tr>` do Framer Motion envolve `<TableCell>` do shadcn (que renderiza `<td>`). O `<motion.tr>` cria um componente intermediário que pode gerar warnings de DOM nesting em cenários de SSR. |
| **Solução** | Usar `motion(TableRow)` via `motion()` factory para manter a semântica correta. |

---

### IMP-07 — `periciaService.ts` não possui `updated_at` no create

| Campo | Detalhe |
|---|---|
| **Arquivo** | `src/modules/periciapro/services/periciaService.ts` |
| **Linhas** | 40-53 |
| **Causa raiz** | O `create()` não define `updated_at`, enquanto o `update()` define manualmente `updated_at: new Date().toISOString()`. Isso deve ser tratado pelo trigger `DEFAULT now()` do Postgres, mas se não existir, perícias recém-criadas terão `updated_at = null`. |
| **Solução** | Verificar se a coluna `updated_at` tem `DEFAULT now()` no banco. Se não, adicionar no `create()`. |

---

## 📊 RESUMO QUANTITATIVO

| Categoria | Quantidade |
|---|---|
| 🔴 Bugs Críticos | 5 |
| 🟠 Alertas Altos | 7 |
| 🟡 Avisos Médios | 7 |
| 🟢 Melhorias | 7 |
| **Total de Achados** | **26** |

### Arquivos mais problemáticos (Top 5)

| Arquivo | Achados |
|---|---|
| `src/services/aiService.js` | 1 CRIT |
| `src/pages/ProcessDetail.jsx` | 1 CRIT, 1 HIGH |
| `src/pages/ClientDetail.jsx` | 1 CRIT, 1 HIGH |
| `src/Layout.jsx` | 1 CRIT, 1 HIGH, 2 MED |
| `src/pages/Settings.jsx` | 1 HIGH |

### Violações por Skill

| Skill | Violações |
|---|---|
| `@react-best-practices` | 8 (mutations sem onError, useEffect sem cleanup, stale closures) |
| `@supabase-postgres-best-practices` | 5 (sem rollback, sem optional chaining, sem upsert atômico) |
| `@frontend-design` | 3 (confirm nativo, CSS inline, inconsistência de imports) |

---

> **Próximo Passo:** Priorizar CRIT-01 (segurança) e HIGH-01 (UX global) para a Sprint imediata.  
> As correções de `cacheTime → gcTime` (HIGH-02) e `keepPreviousData` (HIGH-03) podem ser feitas via find-and-replace automatizado.
