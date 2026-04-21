# AGENTS.md — RV-Adv (RV Advocacia)

## Sobre o Projeto

RV-Adv é uma plataforma LegalTech SaaS para escritórios de advocacia brasileiros,
focada nas áreas Previdenciária, Cível e Trabalhista. É uma aplicação SPA modular
monolítica implantada em produção em https://rafaelavasconcelos.adv.br/

**Stack Principal:**
- Frontend: React 18.2 + Vite 6.1 + Tailwind CSS 3.4 + shadcn/ui (New York style)
- Estado: TanStack Query v5 + React Hook Form v7 + Zod v3.24
- Backend/BaaS: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- IA/ML: Gemini 2.5 Flash, Groq (Llama 3.3 70B), DeepSeek R1, NVIDIA Nemotron
- Documentos: docxtemplater, jsPDF, html2canvas, JSZip
- Scraping: Crawlee v3 + Playwright v1.58 (servidor dedicado Hetzner CX33)
- Deploy: Netlify (frontend) + Supabase (backend/edge) + Hetzner (scraper)
- Automação: N8N + GitHub Actions

## Arquitetura

```
PRESENTAÇÃO  → React Pages (16) + Componentes (100+) + Widgets
ROUTING      → React Router v6 + pages.config.js (config-driven)
ESTADO       → TanStack Query v5 (staleTime, prefetch, cache)
SERVIÇOS     → BaseService (CRUD genérico + Zod) + 20+ serviços especializados
INFRA        → Supabase SDK + 13 Edge Functions + PostgreSQL (60 migrações)
INTEGRAÇÕES  → Scraper (PJe/DJEN/TNU) + IA (7 provedores) + Google Calendar
```

## Regras Críticas

### Idioma e Tom
- **Todo o código, comentários, mensagens de erro e UI deve ser em Português (pt-BR)**
- Commits em português, variáveis e funções em camelCase inglês (padrão JS)
- Mensagens de commit: formato Conventional Commits (feat:, fix:, docs:, refactor:, etc.)

### Segurança (PRODUÇÃO — LGPD + Dados Sensíveis)
- NUNCA exponha `SUPABASE_SERVICE_ROLE_KEY`, API keys ou senhas no frontend
- Todas as mutations no Supabase DEVEM ter RLS habilitado (fail-close)
- Edge Functions com dados sensíveis: SEMPRE verificar JWT (ES256 JWKS)
- Funções públicas (djen-bypass, datajud-bypass): usar rate limiting obrigatório
- Senhas e credenciais: SEMPRE criptografar no banco (pgcrypto)
- CSP já configurado, mas REVISAR antes de adicionar novos domínios externos
- Validação Zod em TODAS as entradas de dados (frontend + backend)

### Padrões de Código
- Componentes: JSX (não TypeScript) para pages/components, TS para edge functions/schemas
- Caminho de alias: `@/` → `./src/` (configurado em vite.config.js)
- Componentes UI: usar SEMPRE `@/components/ui/` (shadcn/ui), nunca HTML cru
- Serviços: estender `BaseService` para novas entidades, não criar fetch manual
- Paleta: `--legal-blue: #1e3a5f`, `--legal-gold: #c9a227`, `--legal-gray: #64748b`
- Dark mode: estratégia `class` do Tailwind

### Banco de Dados
- Tabelas principais: clients, processes, deadlines, tasks, financials, documents,
  document_folders, document_versions, appointments, templates, process_moves
- Tabelas de benefícios: beneficios, beneficios_aposentadoria_rural (55+ cols),
  beneficios_bpc_idoso, beneficios_incapacidade_rural, beneficios_salario_maternidade_rural
- Jurisprudência: jurisesprudences (com vector(768) pgvector), courts,
  jurisprudencia_chat_sessions, jurisprudencia_chat_messages
- PericiaPro: pericias, pericia_pagamentos, pericia_documento, activity_logs, lembretes
- Migrações: SEMPRE criar arquivo numerado sequencial em supabase/migrations/
- RLS: SEMPRE incluir políticas para os 5 roles (admin, advogado, user, secretaria, assistente)

### IA e LLMs
- Gateway centralizado: Edge Function `ai-proxy`
- Provedores: Gemini 2.5 Flash (multimodal/OCR), Groq/Llama 3.3 70B (documentos),
  DeepSeek R1 (fallback docs), NVIDIA Nemotron (processos longo contexto)
- Embeddings: vector(768) com HNSW, via `generate-embedding` Edge Function
- NUNCA chamar APIs de IA diretamente do frontend — sempre via edge function

### Estrutura de Arquivos

```
src/
├── pages/              # 16 páginas (config-driven via pages.config.js)
├── components/
│   ├── ui/             # 40+ componentes shadcn/ui
│   ├── appointments/   # Formulários e listas de atendimentos
│   ├── beneficios/     # 8 formulários de benefícios previdenciários
│   ├── calendar/       # Calendário integrado
│   ├── clients/        # CRUD de clientes + seções PDF + financeiro
│   ├── dashboard/      # Gráficos Recharts + widget tarefas + kanban
│   ├── deadlines/      # Prazos processuais
│   ├── djen/           # Painel DJEN + calculadora CPC
│   ├── documents/      # Upload, viewer, OCR, categorias, versões
│   ├── financial/      # Fluxo de caixa
│   ├── notifications/  # Sistema de notificações
│   ├── processes/      # Processos judiciais
│   ├── pwa/            # Progressive Web App
│   ├── scraper/        # Interface do scraper
│   ├── settings/       # Configurações
│   └── tasks/          # Kanban de tarefas
├── services/           # 12 arquivos de serviço (BaseService + especializados)
├── lib/                # Supabase client, Auth, QueryClient, utils
├── hooks/              # Custom hooks
├── utils/              # Utilitários de negócio (businessDays, pdfExporter, etc.)
├── modules/periciapro/ # Módulo lazy-loaded (páginas, componentes, serviços)
└── types/              # Definições de tipos

supabase/
├── functions/          # 13 Edge Functions
│   ├── _shared/        # auth.ts, cors.ts, rate-limit.ts
│   └── [funcoes]/
└── migrations/         # 60 migrações SQL (001-058 + timestamps)

local-scraper/          # Express server (porta 3001) — Crawlee + Playwright
entities/               # 17 definições JSON de entidades
scripts/                # Scripts auxiliares (backfill, verificação RLS)
```

### Tarefas Comuns do Agent

| Tarefa | Arquivos-chave | Observações |
|--------|---------------|-------------|
| Nova página | `src/pages/`, `src/pages.config.js`, `src/App.jsx` | Registrar no pagesConfig + lazy loading |
| Novo componente UI | `src/components/ui/` | Seguir padrão shadcn/ui New York |
| Novo serviço | `src/services/`, `src/lib/validation/schemas/` | Estender BaseService, criar Zod schema |
| Nova Edge Function | `supabase/functions/`, `supabase/functions/_shared/` | Usar auth.ts + cors.ts + rate-limit.ts |
| Nova migração | `supabase/migrations/` | Numerar sequencialmente, incluir RLS |
| Novo benefício | `entities/`, `src/components/beneficios/`, `src/services/` | JSON entity + formulário + serviço |
| Integração IA | `supabase/functions/ai-proxy/` | Nunca direto do frontend |
| Novo scraper | `local-scraper/crawlers/` | Crawlee + Playwright stealth |

### Fluxo de Desenvolvimento (Produção)

1. Branch: `feature/<nome>` ou `fix/<nome>` a partir de `master`
2. Desenvolvimento: `pnpm run dev` (frontend + scraper)
3. Testes de segurança: `pnpm run security`
4. Lint: `pnpm run lint`
5. Deploy automático via push para `master` (Netlify + Supabase CLI)
6. Edge Functions: deploy via GitHub Actions (`deploy-edge-functions.yml`)
7. Security scan: automático em push/PR + diário às 02:00

### Perfis de RBAC

| Role | Permissões |
|------|-----------|
| admin/dono | Acesso total a todos os módulos |
| advogado | Acesso total com auditoria RLS |
| user | CRUD na maioria das entidades |
| secretaria/assistente | Apenas tarefas visíveis, sem concluir, sem Financeiro |
