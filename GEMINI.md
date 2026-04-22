# GEMINI.md — RV-Adv

## Projeto
Plataforma LegalTech SaaS para escritório de advocacia brasileiro (Previdenciário, Cível, Trabalhista). Produção: https://rafaelavasconcelos.adv.br/

## Stack
- **Frontend:** React 18 + Vite 6 + Tailwind CSS 3.4 + shadcn/ui
- **Estado:** TanStack Query v5 + React Hook Form v7 + Zod v3.24
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions)
- **IA:** Gemini 2.5 Flash, Groq (Llama 3.3 70B), DeepSeek R1, NVIDIA Nemotron
- **Scraping:** Crawlee v3 + Playwright v1.58 (Hetzner CX33)

## Regras Críticas

### Idioma
- Código, UI, erros, docs: **SEMPRE em Português (pt-BR)**
- Variáveis/funções: camelCase inglês
- Commits: Conventional Commits (feat:, fix:, docs:, refactor:)

### Segurança (NUNCA violar)
- NUNCA expor `SUPABASE_SERVICE_ROLE_KEY` ou API keys no frontend
- SEMPRE RLS habilitado em todas as tabelas (fail-close)
- SEMPRE verificar JWT em Edge Functions com dados sensíveis
- Credenciais: criptografar no banco (pgcrypto)
- SEMPRE validação Zod em todas as entradas

### Padrões de Código
- Componentes: JSX (não TSX)
- Edge Functions: TypeScript
- Aliases: `@/` → `./src/`
- UI components: SEMPRE `src/components/ui/` (shadcn/ui)
- Estender `BaseService` para novos serviços

## Estrutura
```
src/
├── pages/           # 16 páginas (config-driven)
├── components/      # UI + domínio
├── services/        # BaseService + CRUD
├── lib/             # Supabase, Auth, utils
└── modules/         # periciapro (lazy)

supabase/
├── functions/       # 13 Edge Functions
└── migrations/      # 60+ SQL
```

## Banco de Dados
- Tabelas: clients, processes, deadlines, tasks, financials, documents, appointments, templates, beneficios
- RLS: 5 roles (admin, advogado, user, secretaria, assistente)
- Jurisprudência: vector(768) pgvector

## IA Gateway
- NUNCA chamar IA diretamente do frontend — SEMPRE via `ai-proxy`

## Tarefas
| Tarefa | Caminho |
|--------|---------|
| Nova página | `src/pages/` + `src/pages.config.js` |
| Novo componente | `src/components/ui/` (shadcn) |
| Novo serviço | `src/services/` + BaseService |
| Edge Function | `supabase/functions/` + `_shared/auth.ts` |
| Migração | `supabase/migrations/` (sequencial + RLS) |

## Referências Detalhadas
- Schema: `supabase/migrations/008_core_rvadv_schema.sql`
- Regras completas: `.agent/rules/` (security.md, edge-functions.md, design-system.md, commits.md)
