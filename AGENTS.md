# CONTEXTO DO PROJETO
- Nome: rv-adv — Plataforma de Gestão Jurídica Inteligente
- Tipo: LegalTech brasileira (SPA modular)
- Repositório: github.com/magisph/rv-adv
- Idioma: Português Brasileiro (pt-BR) para documentação | English para código

# STACK TECNOLÓGICA
- Frontend: React 18.2 + Vite 6.1 + TanStack Query v5 + Tailwind CSS v4 + shadcn/ui (Radix UI) + Framer Motion
- Backend: Supabase (PostgreSQL + Edge Functions Deno/TypeScript + Auth + Storage)
- Scraper: Node.js/Express + Crawlee v3 + Playwright v1.58 (servidor Ubuntu dedicado Hetzner)
- IA: Gemini 2.5 Flash, Groq + Llama, DeepSeek R1, NVIDIA Nemotron (todos via Edge Function ai-proxy)
- Deploy: Netlify (frontend) + Supabase (backend) + Cloudflare (DNS)

# ARQUITETURA DO SISTEMA
## Frontend (src/)
- 16 páginas React + 5 rotas lazy-loaded do módulo PericiaPro
- 100+ componentes reutilizáveis (dashboard, clients, processes, documents, etc.)
- Padrão: pages.config.js para rotas centralizadas com lazy loading
- Estado: TanStack Query v5 (staleTime, prefetch, invalidation) + React Context (AuthContext)
- Validação: Zod schemas + React Hook Form v7
- Design system: tokens customizados (legal-blue #1e3a5f, legal-gold #c9a227) com dark mode

## Backend (supabase/functions/)
- Edge Functions em Deno/TypeScript (10+ funções)
- Funções principais: ai-proxy (gateway IA), chat-jurisprudencia (RAG), djen-bypass, datajud-bypass, scrape-tnu
- Biblioteca compartilhada: _shared/auth.ts (JWT), _shared/cors.ts, _shared/rate-limit.ts
- Segurança: HMAC-SHA256 para webhooks, JWT validation, rate limiting por IP

## Database (supabase/migrations/)
- 58+ migrations PostgreSQL
- Schema core: 16 tabelas (clients, processes, deadlines, tasks, financials, documents, etc.)
- Entidades benefícios: aposentadoria_rural (60+ campos), bpc_idoso, incapacidade_rural, salario_maternidade_rural
- Jurisprudência: embeddings pgvector (768 dims) com índice HNSW
- Módulo PericiaPro: pericias, pericia_pagamentos, pericia_documentos, notifications
- RLS: get_user_role() para políticas fail-close (admin, advogado, user, secretaria, assistente)

## Scraper (local-scraper/)
- Servidor Express na porta 3001
- Crawlers: pje-crawler.ts, tnu-crawler.ts (Crawlee + Playwright stealth)
- Automação: MNI, OTP/2FA, bypass anti-bot

# PADRÕES DE CÓDIGO
## JavaScript/JSX (Frontend)
- Componentes funcionais com hooks
- camelCase para variáveis e funções
- PascalCase para componentes React
- Exports nomeados para utilitários, default para componentes
- Null safety: strings vazias convertidas para null

## TypeScript (Edge Functions e types)
- Interface/types para domain objects
- Strict mode habilitado
- Error handling comtry-catch e logging estruturado

## SQL (Migrations)
- Snake_case para tabelas e colunas
- Constraints CHECK para validação de domínio
- Triggers para updated_at automático
- Índices para consultas frequentes (process_number, trial_date, relator)

## APIs e Edge Functions
- Handler principal com try-catch
- Logging com logger.error({ error, path }, 'message')
- Response: json({ success, data/error }) com status codes apropriados
- Rate limiting: max 1 req/segundo para scraping
- CORS: whitelist estrita de origens

# REGRAS DE NEGÓCIO
## Workflow de Benefícios INSS
em_analise → documentacao_pendente → aguardando_protocolo → protocolado → deferido|indeferido|cancelado

## RBAC (Roles)
- admin/dono: acesso total
- advogado: CRUD completo conforme auditoria RLS
- user: CRUD na maioria das entidades
- secretaria/assistente: visão tunelada (tarefas próprias apenas), não podem mover para "done"

## Campos Obrigatórios
- Client: full_name, cpf_cnpj, data_nascimento, estado_civil, phone, address
- Process: process_number, client_id, area
- Beneficio: client_id, categoria, tipo_beneficio

## Validações
- CPF/CNPJ: validação matemática (funções de dígito verificador)
- Número de processo: normalização (apenas dígitos)
- OAB: zero-padding 7 dígitos, strip não-numéricos
- Strings vazias → null

# INTEGRAÇÕES EXTERNAS
## APIs Governamentais
- DataJud/CNJ: busca por número de processo, tribunais (TJCE, TRF5)
- DJEN: publicações por OAB, webhook notifications
- TNU: scraping de acórdãos (filtros qualidade)

## Google Calendar
- Sync via Edge Functions (sync-google-calendar, delete-google-calendar)
- 3 níveis: server-side (automático), client-side URL, export ICS

## IA Providers (via ai-proxy)
- Gemini 2.5 Flash: multimodal, OCR, embeddings
- Groq + Llama 3.3 70B: documentos jurídicos (primário)
- DeepSeek R1: fallback, raciocínio
- Llama 3.1 8B: classificação (ultra-rápido)
- Fallback chain: Groq → DeepSeek R1 → Cohere