# LLM Wiki: RV-Adv (Plataforma de Gestão Jurídica Inteligente)

Este documento define o padrão de arquitetura de conhecimento e as diretrizes operacionais para agentes LLM que atuam como co-desenvolvedores e mantenedores do ecossistema RV-Adv. Ele serve como a "alma" da documentação dinâmica, estabelecendo como o conhecimento sobre o projeto é acumulado, interligado e mantido atualizado pelo agente LLM.

O RV-Adv é um ecossistema complexo (LegalTech) construído sob o paradigma de um Monólito Modular. Em vez de exigir que o agente "redescubra" a arquitetura, as regras de negócio e os padrões de código a cada novo prompt, o agente LLM deve construir, consultar e manter uma wiki persistente localizada na pasta `docs/`. Sempre que novas funcionalidades são implementadas ou bugs são corrigidos, o agente não apenas produz o código necessário, mas também atualiza proativamente as páginas da wiki relevantes. Isso garante que o contexto histórico, as decisões de design (ADRs) e os requisitos do sistema permaneçam perpetuamente sincronizados com a base de código.

---

## 1. Arquitetura da Base de Conhecimento

A base de conhecimento do RV-Adv é estruturada em três camadas fundamentais que separam a verdade bruta da interpretação sintetizada e das regras estritas de operação do agente.

| Camada | Componentes Principais | Função e Propriedade |
| :--- | :--- | :--- |
| **Fontes Brutas (Raw Sources)** | Código-fonte (`src/`, `supabase/functions/`, `local-scraper/`), Migrações SQL (`supabase/migrations/`), Esquemas JSON (`entities/`), Workflows GitHub (`.github/workflows/`). | Representam a verdade absoluta e imutável do sistema. A wiki as reflete fielmente, mas não as substitui. |
| **A Wiki (Documentação Dinâmica)** | Arquivos Markdown na pasta `docs/` (ex: `architecture.md`, `prd.md`, `Plano_Implementacao_Modulo_Jurisprudencia.md`, `Formulario_BPC.md`). | Documentação dinâmica e sintetizada mantida e atualizada continuamente pelo agente LLM conforme o sistema evolui. |
| **O Esquema (Regras do Agente)** | `.antigravity/rules.md`, `.aiox-core/constitution.md`, `.aiox-core/core-config.yaml`. | Define os princípios inegociáveis: o desenvolvimento é estritamente guiado por histórias (Story-Driven), prioriza o CLI (CLI First) e impõe rigorosos padrões de qualidade (Quality First). |

---

## 2. Stack Tecnológica Completa

O ecossistema RV-Adv utiliza uma stack tecnológica moderna e bem definida, que o agente LLM deve respeitar rigorosamente durante a execução de qualquer tarefa.

### 2.1. Frontend

O **Frontend** é construído com **React 18** e empacotado via **Vite**, utilizando **Tailwind CSS v4** para estilização com um Design System jurídico personalizado (cores `legal-blue`, `legal-gold`) e a biblioteca de componentes **shadcn/ui** (baseada em Radix UI). O gerenciamento de estado assíncrono e cache é tratado pelo **TanStack Query v5** (React Query), com estratégias de `staleTime`, `gcTime` e prefetch ao hover nos links de navegação. O roteamento é gerenciado pelo **React Router DOM v6**. O projeto inclui suporte a **Progressive Web App (PWA)** com manifest, `InstallButton.jsx` e `IOSInstallPrompt.jsx` para instalação nativa. Animações são implementadas com **Framer Motion**. Ícones utilizam a biblioteca **Lucide React**.

| Tecnologia | Versão/Detalhe | Função |
| :--- | :--- | :--- |
| React | 18.x | Biblioteca de UI |
| Vite | 6.x | Bundler e dev server |
| Tailwind CSS | 4.x | Estilização utilitária |
| shadcn/ui (Radix) | Última | Componentes acessíveis |
| TanStack Query | v5 | Cache e estado assíncrono |
| React Router DOM | v6 | Roteamento SPA |
| Framer Motion | Última | Animações |
| Lucide React | Última | Iconografia |
| PizZip + Docxtemplater | Última | Geração de documentos `.docx` |
| date-fns | Última | Manipulação de datas e prazos |

### 2.2. Backend (Supabase)

O **Backend** é suportado primariamente pelo **Supabase** (PostgreSQL). A lógica de negócio crítica, esquemas e políticas de segurança são definidos através de **57 migrações SQL** sequenciais em `supabase/migrations/`. As integrações externas, webhooks e lógicas que exigem ocultação de credenciais são implementadas como **Edge Functions** em **Deno/TypeScript** (`supabase/functions/`). O deploy das Edge Functions é automatizado via GitHub Actions (`deploy-edge-functions.yml`), com distinção automática entre funções que requerem `--no-verify-jwt` e as que utilizam verificação JWT padrão.

O banco de dados utiliza extensões especializadas como **pgcrypto** (UUIDs e criptografia), **pgvector** (busca vetorial semântica com índices HNSW), **pg_cron** (agendamento de tarefas noturnas) e **Full-Text Search** nativo do PostgreSQL com configuração para o idioma português.

### 2.3. Microsserviço de Scraping

O **local-scraper** é um microsserviço Node.js independente (`local-scraper/server.ts`) que roda na máquina local do escritório. Ele utiliza **Crawlee** e **Playwright** com técnicas de stealth (rotação de fingerprints, desabilitação de detecção de automação) para varredura de sistemas judiciais. Expõe endpoints REST para extração de processos do PJe (com suporte a 2FA/OTP), proxy para DataJud e DJEN, e scraping de acórdãos da TNU. Inclui um **Vigia DJEN** que executa polling periódico (a cada 5 minutos) para detectar novas intimações e inseri-las como notificações diretamente no Supabase.

### 2.4. Inteligência Artificial

A camada de IA é orquestrada pela Edge Function **`ai-proxy`**, que centraliza todas as chamadas de IA server-side, eliminando a exposição de chaves de API no frontend. O proxy implementa um sistema de fallback multi-provedor com timeout de 45 segundos por requisição.

| Ação | Provedor Primário | Provedor Backup | Modelo |
| :--- | :--- | :--- | :--- |
| Geração de Documentos Jurídicos | OpenRouter | DeepSeek R1 | `deepseek/deepseek-r1` |
| Invocação LLM Genérica | Groq | — | `llama-3.3-70b-versatile` |
| OCR Inteligente (Multimodal) | Gemini | Qwen2.5 VL (OpenRouter) | `gemini-2.5-flash` |
| Classificação de Documentos | Groq | Cohere Command R+ | `llama-3.1-8b` |
| Análise Processual (Longo Contexto) | NVIDIA Nemotron | DeepSeek R1 | `nemotron-3-nano-30b` |
| Embeddings Vetoriais | Gemini | — | `gemini-embedding-001` |
| Chat RAG Jurisprudência | Gemini | — | `gemini-2.5-flash-lite` |

---

## 3. Modelo de Dados e Schema do Banco

O schema do banco de dados é extenso e reflete a complexidade do domínio jurídico previdenciário. As tabelas são organizadas em domínios funcionais claros.

### 3.1. Domínio Core (Gestão Jurídica)

| Tabela | Descrição | Campos-Chave |
| :--- | :--- | :--- |
| `clients` | Cadastro de clientes do escritório | `full_name`, `cpf_cnpj`, `email`, `phone`, `address`, `status`, `created_by` |
| `processes` | Processos judiciais e administrativos | `client_id`, `process_number`, `court`, `status`, `area`, `created_by` |
| `deadlines` | Prazos processuais com cálculo de dias úteis | `process_id`, `due_date`, `status`, `type` |
| `tasks` | Tarefas internas do escritório | `client_id`, `process_id`, `status`, `due_date`, `assigned_to` |
| `financials` | Controle financeiro (honorários, custas) | `client_id`, `type`, `value`, `date`, `status` |
| `documents` | Documentos anexados a clientes/processos | `parent_type`, `parent_id`, `storage_path`, `folder_id` |
| `templates` | Templates de documentos jurídicos | `name`, `category`, `file_url` |
| `process_moves` | Movimentações processuais | `process_id`, `date`, `description` |
| `users` | Usuários do sistema com papéis | `auth_id`, `email`, `role`, `name` |
| `atendimentos` | Diário de atendimentos e prospecção | `nome_contato`, `categoria`, `status`, `client_id` |

### 3.2. Domínio PeríciaPro

| Tabela | Descrição | Campos-Chave |
| :--- | :--- | :--- |
| `pericias` | Perícias previdenciárias | `nome`, `cpf`, `esfera`, `status`, `dcb`, `data_pericia`, `google_calendar_event_id` |
| `pericia_pagamentos` | Pagamentos vinculados a perícias | `pericia_id`, `valor`, `status` |
| `pericia_documentos` | Documentos de perícia com classificação IA | `pericia_id`, `storage_path`, `classificacao_ia` |
| `activity_logs` | Log de atividades por perícia | `pericia_id`, `type`, `description`, `metadata` |
| `lembretes` | Lembretes vinculados a perícias | `pericia_id`, `titulo`, `data_lembrete`, `concluido` |
| `notifications` | Notificações de DCB e perícias | `pericia_id`, `type`, `priority`, `days_until`, `event_date` |
| `notification_preferences` | Preferências de alerta por usuário | `dcb_alert_days`, `pericia_alert_days`, `email_notifications_enabled` |

### 3.3. Domínio Benefícios Previdenciários

O sistema suporta múltiplos tipos de benefícios previdenciários, cada um com um schema especializado definido em `entities/*.json` e tabelas dedicadas no banco de dados.

| Tabela | Tipo de Benefício | Campos Específicos |
| :--- | :--- | :--- |
| `beneficios` | Tabela-mãe de benefícios | `client_id`, `categoria`, `tipo_beneficio`, `status` |
| `beneficios_aposentadoria_rural` | Aposentadoria Rural | `reside_zona`, `trabalha_exclusivo_agricultura`, `membros_grupo_familiar` |
| `beneficios_bpc_idoso` | BPC/LOAS Idoso | `cadunico_atualizado`, `renda_declarada_cadunico`, `triagem_elegibilidade`, `cif_pcd` |
| `beneficios_incapacidade_rural` | Incapacidade Rural | Campos específicos de incapacidade laboral rural |
| `beneficios_salario_maternidade_rural` | Salário-Maternidade Rural | Campos específicos de maternidade rural |

### 3.4. Domínio Jurisprudência (Vetorial)

| Tabela | Descrição | Campos-Chave |
| :--- | :--- | :--- |
| `courts` | Tribunais cadastrados | `acronym`, `name` |
| `jurisprudences` | Acórdãos com FTS e embeddings vetoriais | `process_number`, `excerpt`, `full_text`, `fts_vector`, `embedding` (vector 3072), `embedding_status` |
| `jurisprudencia_chat_sessions` | Sessões de chat RAG | `user_id`, `title`, `updated_at` |
| `jurisprudencia_chat_messages` | Mensagens de chat RAG | `session_id`, `role`, `content`, `sources` |

A função RPC `buscar_jurisprudencia(query_embedding, match_count, similarity_threshold)` realiza a busca vetorial via operador `<=>` (distância cosseno) sobre o índice HNSW da coluna `embedding`.

---

## 4. Edge Functions: Catálogo Completo

As Edge Functions são o backbone de integração do RV-Adv. Cada função é deployada como um serviço serverless no Supabase e utiliza o módulo compartilhado `_shared/auth.ts` para autenticação JWT (ES256 via JWKS e HS256 para service_role).

| Edge Function | Responsabilidade | Autenticação | Detalhes |
| :--- | :--- | :--- | :--- |
| `ai-proxy` | Proxy centralizado para todas as chamadas de IA | JWT (`--no-verify-jwt`) | Multi-provedor com fallback (Groq, Gemini, OpenRouter, NVIDIA, Cohere). Timeout de 45s. |
| `generate-embedding` | Geração de embeddings vetoriais | JWT (`--no-verify-jwt`) | Gemini Embedding API (`gemini-embedding-001`). Suporta `taskType` (RETRIEVAL_QUERY / RETRIEVAL_DOCUMENT). |
| `chat-jurisprudencia` | Chat RAG sobre jurisprudência da TNU | JWT (`--no-verify-jwt`) | Pipeline: query → embedding → busca vetorial → contexto + histórico → Gemini Pro → resposta. Memória de sessão (últimas 20 mensagens). |
| `scrape-tnu` | Scraping de acórdãos da TNU | JWT (`--no-verify-jwt`) | Filtros de qualidade (13 padrões de exclusão). Upsert idempotente por `process_number`. Validação de formato de data. |
| `ocr-classify-document` | OCR e classificação de documentos | JWT (verificado) | Extrai texto de PDFs via Gemini Vision. Classifica em 10 categorias (pessoais, inss, medicos, judicial, etc.). |
| `djen-bypass` | Proxy seguro para API pública do DJEN (CNJ) | JWT (`--no-verify-jwt`) | Resolve Mixed Content (HTTP/HTTPS) e Geo-Block (403). Rate limit: 100 req/min por IP. |
| `datajud-bypass` | Proxy seguro para API do DataJud (CNJ) | JWT (`--no-verify-jwt`) | Suporta tribunais TJCE e TRF5. Encaminha queries ElasticSearch ao WSO2 Gateway do CNJ. |
| `sync-google-calendar` | Sincronização de perícias com Google Calendar | JWT (`--no-verify-jwt`) | Cria/atualiza eventos no Google Calendar com dados da perícia (data, horário, local, paciente). |
| `delete-google-calendar` | Remoção de eventos do Google Calendar | JWT (`--no-verify-jwt`) | Remove evento vinculado a uma perícia quando ela é cancelada ou excluída. |
| `inss-webhook` | Receptor de webhooks do INSS | HMAC-SHA256 | Valida assinatura HMAC timing-safe. Rate limit: 5 req/min. Idempotência via header `X-Idempotency-Key`. |
| `ti-webhook-receiver` | Receptor de webhooks da Tramitação Inteligente | HMAC-SHA256 | Extrai número de processo de múltiplos formatos de payload (campos diretos e aninhados). |
| `import-tramita-clients` | Importação de clientes da API Tramitação Inteligente | Dual (API Key ou JWT) | Batch upsert em chunks de 100. Circuit breaker (max 100 páginas). Null Safety rigorosa. |

O módulo compartilhado `_shared/` contém três utilitários críticos reutilizados por todas as funções: `auth.ts` (autenticação JWT dual ES256/HS256 com cache JWKS), `cors.ts` (whitelist de origens com headers de segurança HSTS, X-Frame-Options, X-Content-Type-Options) e `rate-limit.ts` (limitador de taxa em memória por IP com janela de 1 minuto).

---

## 5. Pipelines de Automação (CI/CD e Cron)

O projeto utiliza três workflows GitHub Actions e agendamentos `pg_cron` para automação contínua.

### 5.1. GitHub Actions

| Workflow | Trigger | Função |
| :--- | :--- | :--- |
| `deploy-edge-functions.yml` | Push em `master` (paths: `supabase/functions/**`) ou manual | Deploy automático de todas as Edge Functions. Distingue automaticamente funções `--no-verify-jwt` das padrão. |
| `tnu-scraper.yml` | Cron diário às 03:00 BRT (06:00 UTC) ou manual | Coleta automatizada de acórdãos da TNU com rotação de 30 termos de busca. Gera embeddings para acórdãos pendentes via Gemini. |
| `security-scan.yml` | Push/PR em `main`/`dev` + cron diário às 02:00 | Auditoria NPM, ESLint Security Scan e testes de segurança Vitest. |

### 5.2. pg_cron (Banco de Dados)

| Job | Horário | Função |
| :--- | :--- | :--- |
| `periciapro-deadline-alerts` | 08:00 diariamente | Verifica DCBs e perícias próximas, gera notificações com prioridade escalonada (low → critical) conforme dias restantes. |
| `nightly-audit` | 03:00 diariamente | Inspetor noturno que detecta processos parados (>6 meses sem movimentação) e cadastros incompletos (sem CPF/CNPJ). |

---

## 6. Segurança: Modelo Defense-in-Depth

A segurança do RV-Adv é implementada em múltiplas camadas sobrepostas, seguindo o princípio de Defense-in-Depth.

### 6.1. Row Level Security (RLS)

Todas as tabelas críticas possuem RLS habilitado com padrão **Fail-Close** (acesso negado por padrão). As políticas utilizam `auth.uid()` para ownership e verificam o papel do usuário via claims JWT (`auth.jwt() ->> 'user_role'`). Administradores e advogados possuem acesso irrestrito, enquanto secretárias e assistentes têm escopo limitado. A migração `20260330000000_audit_rls_security.sql` implementa a auditoria completa de RLS em todas as tabelas, e a migração `055_robust_roles_and_atendimentos_rls.sql` introduz a função `get_user_role()` para resolução robusta de papéis.

### 6.2. Autenticação JWT Dual

O módulo `_shared/auth.ts` implementa verificação JWT em dois algoritmos. Tokens **ES256** (novo padrão Supabase desde 2025) são verificados criptograficamente via JWKS remoto com cache. Tokens **HS256** (legado) são aceitos apenas para `service_role` (chamadas internas) e usuários autenticados, com verificação de expiração. Tokens anônimos (`role === 'anon'`) são sempre rejeitados.

### 6.3. Proteções Adicionais

O sistema implementa Rate Limiting em memória por IP em todas as Edge Functions expostas, CORS restritivo com whitelist de origens permitidas, validação HMAC-SHA256 timing-safe para webhooks externos (INSS e Tramitação Inteligente), headers de segurança HTTP (HSTS, X-Frame-Options, X-Content-Type-Options) e criptografia de senhas INSS via `pgcrypto` no banco de dados.

---

## 7. Mapa de Rotas e Páginas do Frontend

O roteamento do frontend é definido em `src/pages.config.js` e renderizado pelo `App.jsx` com um layout compartilhado (`Layout.jsx`) que inclui sidebar, notificações e prefetch estratégico.

| Rota (pageName) | Componente | Descrição |
| :--- | :--- | :--- |
| `Home` | `Home.jsx` | Dashboard principal com KPIs e atividade recente |
| `Clients` | `Clients.jsx` | Listagem e gestão de clientes |
| `ClientDetail` | `ClientDetail.jsx` | Detalhes completos de um cliente |
| `Processes` | `Processes.jsx` | Listagem e gestão de processos |
| `ProcessDetail` | `ProcessDetail.jsx` | Detalhes e movimentações de um processo |
| `RadarCNJ` | `RadarCNJ.jsx` | Consulta ao DataJud (TJCE, TRF5) |
| `Jurisprudencia` | `JurisprudenciaPage.jsx` | Busca semântica e chat RAG sobre jurisprudência |
| `IntimacoesDJEN` | `IntimacoesDJEN.jsx` | Monitoramento de intimações do DJEN |
| `Tasks` | `Tasks.jsx` | Gestão de tarefas internas |
| `Templates` | `Templates.jsx` | Templates de documentos jurídicos |
| `Deadlines` | `Deadlines.jsx` | Controle de prazos processuais |
| `Financial` | `Financial.jsx` | Controle financeiro (restrito por role) |
| `Documents` | `Documents.jsx` | Gestão de documentos com GED |
| `Settings` | `Settings.jsx` | Configurações do sistema |
| `CalendarSettings` | `CalendarSettings.jsx` | Configuração do Google Calendar |
| `NotificationSettings` | `NotificationSettings.jsx` | Preferências de notificação |

O módulo **PeríciaPro** possui roteamento interno próprio (`src/modules/periciapro/pages/`) com páginas dedicadas: `Dashboard`, `CadastroCliente`, `DetalhesCliente`, `Calendario`, `Alertas`, `NotificationSettings` e `Home`.

---

## 8. Padrões de Código e Convenções

### 8.1. Camada de Serviços (Service Layer)

Todos os serviços do frontend herdam de `BaseService` (`src/services/baseService.js`), que encapsula operações CRUD genéricas sobre o Supabase com validação Zod opcional, mapeamento de erros para PT-BR (`SUPABASE_ERROR_MAP`) e suporte a paginação por offset. Serviços especializados como `clientService`, `processService` e `periciaService` estendem o `BaseService` adicionando métodos específicos do domínio.

### 8.2. Utilitários Compartilhados

O utilitário `businessDays.js` implementa cálculo de dias úteis conforme o CPC (Código de Processo Civil), desconsiderando sábados, domingos e feriados nacionais. O `documentGenerator.js` utiliza PizZip e Docxtemplater para gerar documentos `.docx` a partir de templates, com upload automático ao Supabase Storage.

### 8.3. Convenções de Commit e Branching

O projeto segue **Conventional Commits** (`feat:`, `fix:`, `docs:`, `refactor:`) com referência ao ID da story nos commits (ex: `feat: implement IDE detection [Story 2.1]`). O branch principal é `master`, com 227 commits no histórico. O deploy do frontend é realizado via **Netlify** (configurado em `netlify.toml`), com build via `pnpm run build` e publicação do diretório `dist/`.

---

## 9. Framework AIOX e Governança de Agentes

O RV-Adv utiliza o framework **Synkra AIOX** (AI-Orchestrated System) para orquestrar o desenvolvimento autônomo. O framework define uma hierarquia de agentes com autoridades exclusivas.

| Agente | Autoridade Exclusiva | Função |
| :--- | :--- | :--- |
| `@dev` | Implementação de código | Desenvolve features seguindo stories |
| `@qa` | Veredictos de qualidade | Valida implementações e executa testes |
| `@architect` | Decisões de arquitetura | Define padrões e estrutura do sistema |
| `@devops` | `git push`, PRs, releases | Único agente autorizado a publicar código |
| `@po` / `@sm` | Criação de stories | Define requisitos e prioridades |
| `@analyst` | Análise de dados | Pesquisa e validação de requisitos |
| `@data-engineer` | Engenharia de dados | Schema, migrações e otimização de banco |
| `@ux-expert` | Design de experiência | Interface e usabilidade |

### 9.1. Princípios Constitucionais (constitution.md)

A `constitution.md` do AIOX estabelece seis princípios inegociáveis que todo agente deve respeitar. O princípio **CLI First** determina que toda funcionalidade deve funcionar via CLI antes de qualquer UI. O princípio **Agent Authority** garante que nenhum agente assuma a autoridade de outro. O princípio **Story-Driven Development** exige que nenhum código seja escrito sem uma story associada. O princípio **No Invention** proíbe que especificações inventem requisitos não derivados de fontes verificadas. O princípio **Quality First** impõe que todo código passe por lint, typecheck, testes e build antes de merge. O princípio **Absolute Imports** recomenda o uso de imports absolutos com alias `@/` em vez de caminhos relativos.

---

## 10. Diretrizes Operacionais para o Agente LLM

O agente LLM deve interagir com o repositório RV-Adv através de um ciclo contínuo e rigoroso de planejamento, execução e atualização.

### 10.1. Ingestão e Planejamento

Antes de escrever qualquer linha de código para uma nova funcionalidade, o agente deve ler completamente as histórias de usuário na pasta `docs/stories/`, consultar os padrões de código estabelecidos em `docs/framework/coding-standards.md` e sintetizar um plano de implementação detalhado. A `constitution.md` do framework AIOX dita que "nenhum código é escrito sem uma story associada". O agente deve também verificar se existem migrações SQL relacionadas e entidades JSON que definam o modelo de dados esperado.

### 10.2. Execução

Durante a implementação, o agente deve sempre verificar as migrações SQL em `supabase/migrations/`, pois a lógica de negócio crítica (RLS, Triggers, Functions) reside exclusivamente lá. Qualquer integração externa, chamada de API de terceiros ou processamento de IA deve ser roteada através de Edge Functions em `supabase/functions/`, garantindo que lógicas sensíveis nunca sejam expostas no código do cliente. O agente deve reutilizar o `BaseService` para operações de banco de dados, os componentes `shadcn/ui` para interface, e o `aiService` para chamadas de IA. Novos serviços devem seguir o padrão de herança do `BaseService` com mapeamento de erros PT-BR.

### 10.3. Saneamento e Atualização

Após concluir a implementação, o agente é obrigado a atualizar a história correspondente marcando os itens concluídos (`[ ]` → `[x]`), manter a lista de arquivos modificados (`File List`) atualizada e revisar a documentação arquitetural e a wiki para garantir que reflitam com precisão as novas implementações. O custo de manutenção da wiki é integralmente transferido para o LLM, garantindo que o conhecimento do projeto permaneça sempre atual e confiável.

### 10.4. Regras Críticas de Implementação

O campo de ownership nas tabelas do RV-Adv é `created_by` (não `user_id`), e as políticas RLS devem sempre referenciar esse campo. As Edge Functions que utilizam `_shared/auth.ts` devem ser deployadas com `--no-verify-jwt`, pois a verificação é feita internamente pelo módulo. O frontend nunca deve armazenar ou expor chaves de API; toda comunicação com provedores de IA passa pelo `ai-proxy`. Novas migrações SQL devem seguir a numeração sequencial existente (atualmente em `055_`) e incluir `IF NOT EXISTS` / `IF EXISTS` para garantir idempotência. Todas as tabelas novas devem ter RLS habilitado com políticas Fail-Close desde a criação.

---

## 11. Variáveis de Ambiente e Provedores

O arquivo `.env.example` documenta todas as variáveis de ambiente necessárias para o funcionamento do ecossistema. As variáveis são organizadas por domínio funcional.

| Domínio | Variáveis Principais | Uso |
| :--- | :--- | :--- |
| **LLM Providers** | `DEEPSEEK_API_KEY`, `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`, `NVIDIA_API_KEY`, `COHERE_API_KEY` | Provedores de IA para o `ai-proxy` |
| **Supabase** | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Conexão com o banco de dados e autenticação |
| **Scraping** | `VITE_SCRAPER_URL` (default: `http://localhost:3001`) | URL do microsserviço local de scraping |
| **Google Calendar** | `GOOGLE_CALENDAR_ACCESS_TOKEN` | Integração com Google Calendar para perícias |
| **Webhooks** | `INSS_WEBHOOK_SECRET`, `TI_WEBHOOK_SECRET` | Segredos HMAC para validação de webhooks |
| **CI/CD** | `SUPABASE_ACCESS_TOKEN`, `GITHUB_TOKEN` | Deploy de Edge Functions e automação GitHub |

---

## 12. Domínios de Produção e Deploy

O frontend é deployado via **Netlify** com build `pnpm run build` e publicação do diretório `dist/`. O redirect universal (`/* → /index.html`) garante o funcionamento do roteamento SPA. Os domínios de produção configurados nas políticas CORS são `rv-adv.app`, `www.rv-adv.app`, `rafaelavasconcelos.adv.br` e `www.rafaelavasconcelos.adv.br`. O ambiente de desenvolvimento utiliza `localhost:5173` (Vite) e `localhost:3000` (alternativo). O projeto Supabase é identificado pelo ref `uxtgcarklizhwuotkwkd`.

---

*Nota para o LLM: Este arquivo consolida a essência completa do RV-Adv. Utilize-o como seu ponto de partida fundamental para compreender o contexto, as regras e a arquitetura do projeto antes de iniciar qualquer tarefa de desenvolvimento, refatoração ou manutenção. Ao modificar qualquer aspecto do sistema, atualize as seções relevantes deste documento para manter a wiki perpetuamente sincronizada com a base de código.*
