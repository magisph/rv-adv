# RV-Adv — LLM Wiki

> Base de conhecimento estruturada do projeto RV-Adv (RV Advocacia), uma plataforma LegalTech completa para gestao de escritorios de advocacia brasileiros, com foco nas areas Previdenciario, Civel e Trabalhista.

---

## Visao Geral

**RV-Adv** e um ecossistema LegalTech modular construido como SPA (Single Page Application) com React, projetado para automatizar o fluxo de trabalho diario de escritorios de advocacia brasileiros. A plataforma integra gestao de clientes, processos judiciais, prazos, documentos, financeiro, tarefas, agenda, inteligencia artificial, integracoes com APIs governamentais (DataJud/CNJ, DJEN, TNU) e um modulo dedicado de pericias previdenciarias (PericiaPro). Toda a interface e em portugues brasileiro (pt-BR).

**Stack primario**: React 18.2 + Vite 6.1 + Tailwind CSS 3.4 + shadcn/ui + Supabase (PostgreSQL + Auth + Storage + Edge Functions) + TanStack Query v5.

**Repositorio**: [github.com/magisph/rv-adv](https://github.com/magisph/rv-adv)

---

## Arquitetura do Sistema

### Padrao: Modular Monolith SPA com Camadas

```
┌───────────────────────────────────────────────────────────┐
│  CAMADA DE APRESENTACAO (React Pages + Components)        │
│  16 Paginas │ 100+ Componentes │ Widgets de Dashboard     │
├───────────────────────────────────────────────────────────┤
│  CAMADA DE ROTEAMENTO (React Router v6 + pages.config.js) │
│  Rotas Protegidas │ Lazy Loading │ Code Splitting          │
├───────────────────────────────────────────────────────────┤
│  GERENCIAMENTO DE ESTADO (TanStack Query v5 + Context)    │
│  staleTime Estrategico │ Prefetch │ Cache Invalidation    │
├───────────────────────────────────────────────────────────┤
│  CAMADA DE SERVICOS (BaseService + 20+ Servicos Espec.)   │
│  CRUD Generico │ Validacao Zod │ Mapeamento de Erros      │
├───────────────────────────────────────────────────────────┤
│  INFRAESTRUTURA (Supabase SDK + Edge Functions)           │
│  PostgreSQL │ Auth │ Storage │ Serverless Functions       │
├───────────────────────────────────────────────────────────┤
│  INTEGRACOES EXTERNAS                                    │
│  Scraper Server │ AI Proxy │ APIs Gov. │ Google Calendar  │
└───────────────────────────────────────────────────────────┘
```

### Principios Arquiteturais

- **Config-driven routing**: paginas sao registradas centralmente em `pages.config.js`, com metadados de visibilidade por role e lazy loading
- **Heranca de servicos**: `BaseService` fornece CRUD generico; servicos especializados estendem com logica de dominio
- **Sem SSR/SSG**: renderizacao exclusivamente client-side
- **Code splitting**: modulo PericiaPro possui 5 rotas lazy-loaded separadamente
- **Design system semantico**: tokens customizados `legal-blue` (#1e3a5f), `legal-gold` (#c9a227), `legal-gray`, com suporte a dark mode via classe CSS

---

## Stack Tecnologico Completo

### Framework e Build
| Tecnologia | Versao | Papel |
|---|---|---|
| React | 18.2 | Biblioteca UI |
| Vite | 6.1 | Build tool e dev server |
| React Router DOM | 6.26 | Roteamento client-side |
| JavaScript/JSX | — | Linguagem primaria |
| TypeScript | 5.8 (dev) | Schemas, tipos, edge functions |

### UI e Design
| Tecnologia | Papel |
|---|---|
| Tailwind CSS v3.4 | Framework utility-first |
| shadcn/ui (New York) | Componentes acessiveis sobre Radix UI |
| Radix UI (20+ primitives) | Primitives headless |
| Lucide React | Icones |
| Framer Motion v11 | Animacoes (Kanban, PWA) |
| Recharts v2 | Graficos de dashboard |
| react-day-picker v8 | Seletor de datas |
| react-markdown v9 | Renderizacao markdown |
| cmdk | Command palette |
| embla-carousel-react | Carrossel |
| react-resizable-panels | Paineis redimensionaveis |
| vaul | Drawer |

### Estado e Dados
| Tecnologia | Papel |
|---|---|
| TanStack Query v5 | Estado server-side, caching, background refetch |
| React Context | Estado de autenticacao (`AuthContext`) |
| React Hook Form v7.54 | Gerenciamento de formularios |
| Zod v3.24 | Validacao de schemas |

### Backend (BaaS)
| Tecnologia | Papel |
|---|---|
| Supabase (PostgreSQL) | Banco de dados, autenticacao, storage, edge functions |
| @supabase/supabase-js v2.99 | SDK cliente |

### IA/ML
| Provider | Modelo | Uso |
|---|---|---|
| Google Gemini 2.5 Flash | Multimodal | Parsing de emails INSS, OCR, embeddings para jurisprudencia |
| Groq + Llama 3.3 70B | LLM | Geracao de documentos juridicos (primario) |
| OpenRouter + DeepSeek R1 | LLM | Geracao de documentos (fallback), raciocinio |
| Groq + Llama 3.1 8B | LLM | Classificacao de documentos (ultra-rapido) |
| NVIDIA Nemotron | LLM | Analise de processos (contexto longo) |
| Qwen2.5 VL | Vision-Language | OCR (fallback) |
| Cohere Command R+ | LLM | Classificacao de documentos (fallback) |

Todas as chamadas de IA passam pelo Edge Function `ai-proxy` — nenhuma chave de API e exposta no client-side.

### Documentos
| Biblioteca | Papel |
|---|---|
| docxtemplater + pizzip | Geracao de documentos .docx |
| jsPDF | Geracao de PDF |
| html2canvas | Exportacao HTML-para-canvas |
| JSZip + file-saver | Download em lote como .zip |

### Scraper/Automacao
| Tecnologia | Papel |
|---|---|
| Crawlee v3 | Framework de web scraping |
| Playwright v1.58 | Automacao de navegador (stealth) |
| Express v5 | Servidor local de scraper (porta 3001) |

### DevOps
| Tecnologia | Papel |
|---|---|
| Netlify | Hosting estatico, CI/CD, SPA redirects |
| Cloudflare | DNS, SSL, Email Routing |
| Hetzner CX33 | Servidor dedicado de scraping (Ubuntu 24.04) |
| N8N | Automacao de workflows |
| Husky | Git hooks |
| Vitest | Testes de seguranca |
| ESLint v9 + eslint-plugin-security | Linting de seguranca |

---

## Estrutura de Diretorios

```
rv-adv-src/
├── public/                          # Assets estaticos
│   ├── favicon.svg
│   └── _redirects                   # Netlify SPA redirect
├── src/
│   ├── main.jsx                     # Entry point React
│   ├── App.jsx                      # App root com routing
│   ├── Layout.jsx                   # Layout com sidebar
│   ├── index.css                    # CSS globals
│   ├── globals.css                  # Tailwind layers
│   ├── pages.config.js              # Config centralizada de paginas
│   ├── pages/                       # 16 paginas da aplicacao
│   │   ├── Home.jsx                 # Dashboard principal
│   │   ├── Clients.jsx              # Gestao de clientes
│   │   ├── ClientDetail.jsx         # Detalhe do cliente
│   │   ├── Processes.jsx            # Gestao de processos
│   │   ├── ProcessDetail.jsx        # Detalhe do processo
│   │   ├── Tasks.jsx                # Kanban de tarefas
│   │   ├── Deadlines.jsx            # Gestao de prazos
│   │   ├── Documents.jsx            # GED documental
│   │   ├── Templates.jsx            # Templates de documentos
│   │   ├── Financial.jsx            # Financeiro (admin-only)
│   │   ├── JurisprudenciaPage.jsx   # Busca juridica com IA
│   │   ├── IntimacoesDJEN.jsx       # Diario de Justica Eletronico
│   │   ├── RadarCNJ.jsx             # DataJud/CNJ radar
│   │   ├── Settings.jsx             # Configuracoes do usuario
│   │   ├── CalendarSettings.jsx     # Config Google Calendar
│   │   ├── NotificationSettings.jsx # Preferencias de notificacao
│   │   └── AuthPage.jsx             # Login
│   ├── components/                  # Componentes de dominio
│   │   ├── ui/                      # 40+ componentes shadcn/ui
│   │   ├── dashboard/               # Widgets: StatsCard, Charts, TasksWidget
│   │   │   └── tasks/               # KanbanBoard, KanbanCard, BoardColumn, FiltersPanel
│   │   ├── processes/               # ProcessForm, ProcessMoveForm, RadarDataJud
│   │   ├── clients/                 # ClientForm, ClientPDFDocument, FinancialSection
│   │   │   └── pdf/sections/        # Secoes do PDF: Pessoal, Civeis, Beneficios
│   │   ├── beneficios/              # Forms por tipo de beneficio (5 tipos)
│   │   ├── documents/               # Upload, Viewer, OCR, Categories, Versions
│   │   ├── notifications/           # NotificationPanel, Monitor, Service
│   │   ├── templates/               # TemplateForm, TemplateEditor
│   │   ├── calendar/                # CalendarWidget
│   │   ├── financial/               # FinancialList, FinancialForm
│   │   ├── deadlines/               # DeadlineForm
│   │   ├── appointments/            # AppointmentForm
│   │   ├── tasks/                   # TaskForm
│   │   ├── djen/                    # PainelDJEN, CalculadoraCpcModal
│   │   ├── scraper/                 # PjeConfigModal
│   │   ├── settings/                # HolidayManager
│   │   └── pwa/                     # InstallButton, IOSInstallPrompt, PWADetector
│   ├── services/                    # Camada de servicos (12 arquivos)
│   │   ├── baseService.js           # CRUD generico (BaseService)
│   │   ├── authService.js           # Autenticacao Supabase
│   │   ├── clientService.js         # CRUD clientes + busca
│   │   ├── aiService.js             # Proxy de IA (geracao, OCR, classificacao)
│   │   ├── calendarService.js       # Google Calendar sync
│   │   ├── cnjService.js            # CNJ/DJEN/DataJud integracoes
│   │   ├── jurisprudenciaService.js # Busca vetorial + chat RAG
│   │   ├── scraperService.js        # Config MNI, OTP, sincronizacao
│   │   ├── holidayService.js        # Feriados
│   │   ├── atendimentoService.js    # Diario de atendimentos
│   │   └── index.js                 # Instanciacao de todos os servicos
│   ├── lib/                         # Utilitarios e infra
│   │   ├── supabase.js              # Singleton Supabase client
│   │   ├── AuthContext.jsx           # Context de autenticacao
│   │   ├── query-provider.jsx        # TanStack Query provider
│   │   ├── query-client.js          # Configuracao do query client
│   │   ├── constants/areas.js       # Areas juridicas
│   │   ├── validation/schemas/      # Schemas Zod de validacao
│   │   │   ├── index.ts             # CPF/CNPJ, domain objects
│   │   │   └── security-schemas.js  # Payload/upload/security validation
│   │   ├── PageNotFound.jsx         # 404 handler
│   │   ├── NavigationTracker.jsx    # Rastreamento de navegacao
│   │   └── utils.js                 # Utilitarios gerais
│   ├── hooks/                       # Custom hooks
│   │   ├── use-mobile.jsx           # Detecção de mobile
│   │   └── useDjenComunicacoes.jsx  # Hook DJEN
│   ├── utils/                       # Utilitarios de negocio
│   │   ├── index.ts                 # Helpers gerais
│   │   ├── businessDays.js          # Calculo de dias uteis (CPC)
│   │   ├── pdfExporter.js           # Geracao PDF com jsPDF (610+ linhas)
│   │   ├── documentGenerator.js     # Geracao DOCX com docxtemplater
│   │   └── clientDataExtractor.js   # Extracao de dados do cliente (426+ linhas)
│   ├── types/
│   │   └── radix-components.d.ts    # Tipos Radix UI
│   └── modules/
│       └── periciapro/              # Modulo PericiaPro (feature module)
│           ├── types/index.ts       # Tipos: Pericia, Pagamento, Lembrete, Notification
│           ├── pages/               # 6 paginas do modulo
│           ├── components/          # Componentes especificos
│           ├── services/            # 8 servicos do modulo
│           ├── hooks/               # use-mobile
│           └── lib/                 # AuthContext, utils, iframe-messaging, VisualEditAgent
├── supabase/
│   ├── functions/                   # 10 Edge Functions
│   │   ├── ai-proxy/index.ts       # Gateway de IA centralizado
│   │   ├── chat-jurisprudencia/     # Chat RAG juridico
│   │   ├── generate-embedding/      # Geracao de embeddings
│   │   ├── djen-bypass/             # Proxy DJEN (CNJ)
│   │   ├── datajud-bypass/          # Proxy DataJud (CNJ)
│   │   ├── scrape-tnu/              # Scraper TNU
│   │   ├── ti-webhook-receiver/     # Webhook Tramitacao Inteligente
│   │   ├── inss-webhook/            # Webhook email INSS
│   │   ├── import-tramita-clients/  # Importacao clientes Tramita
│   │   ├── ocr-classify-document/   # OCR + classificacao
│   │   ├── sync-google-calendar/    # Sync Google Calendar
│   │   ├── delete-google-calendar/  # Delete Google Calendar
│   │   └── _shared/                 # Auth, CORS, Rate Limit
│   └── migrations/                  # 58 migracoes SQL
│       ├── 001_periciapro_schema.sql
│       ├── 002_periciapro_rls.sql
│       ├── 008_core_rvadv_schema.sql  # Schema principal (16 tabelas)
│       ├── 045_jurisprudencia_vetorial.sql  # Busca vetorial
│       ├── 047_clients_shared_visibility.sql
│       ├── 055_robust_roles_and_atendimentos_rls.sql
│       ├── 058_atendimentos_full_crud_all_users.sql
│       └── 20260330000000_audit_rls_security.sql  # Auditoria RLS
├── local-scraper/                   # Servidor de scraping local
│   ├── server.ts                    # Express API (porta 3001)
│   ├── crawlers/
│   │   ├── pje-crawler.ts          # Crawler PJe (Crawlee + Playwright)
│   │   └── tnu-crawler.ts          # Crawler TNU (Crawlee + Playwright)
│   └── tsconfig.json
├── entities/                        # Definicoes JSON das entidades
│   ├── Client.json                  # 30+ campos
│   ├── Process.json
│   ├── Deadline.json
│   ├── Task.json
│   ├── Financial.json
│   ├── Document.json
│   ├── Beneficio.json              # Entidade pai
│   ├── BeneficioAposentadoriaRural.json  # 60+ campos
│   ├── BeneficioBPC_Idoso.json
│   ├── BeneficioIncapacidadeRural.json
│   ├── BeneficioSalarioMaternidadeRural.json
│   ├── Appointment.json
│   ├── Notification.json
│   ├── Template.json
│   ├── DocumentVersion.json
│   ├── DocumentFolder.json
│   └── ProcessMove.json
├── scripts/                         # Scripts utilitarios
├── tests/security/                  # Testes de seguranca
├── docs/                            # Documentacao do projeto
├── package.json
├── vite.config.js
├── tailwind.config.js
├── netlify.toml
├── components.json                  # Config shadcn/ui
└── eslint.config.js
```

---

## Modelo de Dados (Entidades)

### Entidades Core

#### Client (clientes)
- **Campos obrigatorios**: `full_name`, `cpf_cnpj`, `data_nascimento`, `estado_civil`, `phone`, `address`
- **Campos INSS**: `senha_meu_inss`, `senha_gov`, `inscrito_cadunico`, `possui_senha_gov`, `possui_biometria`, `pedido_anterior_inss`
- **Enums**: `estado_civil` (casado/solteiro/divorciado/viuvo/uniao_estavel), `grau_escolaridade` (8 niveis), `area` (previdenciario/civel/trabalhista/outros), `status` (ativo/inativo/processo_andamento/processo_concluido/prospecto)
- **Campos especiais**: `dados_civeis` (JSONB), `documents_checklist` (JSONB)
- **RLS**: Delete para admin + dono (created_by)

#### Process (processes)
- **Campos obrigatorios**: `process_number`, `client_id`, `area`
- **FK**: `clients(id)` ON DELETE SET NULL
- **Enums**: `status` (ativo/arquivado/suspenso/encerrado), `area` (4 valores)
- **Denormalizacao**: `client_name` para listagem sem join
- **Indice normalizado**: `process_number_normalized` (apenas digitos) para busca

#### Deadline (deadlines)
- **Campos obrigatorios**: `process_id`, `due_date`, `description`
- **FK**: `processes(id)` ON DELETE CASCADE
- **Enums**: `priority` (baixa/media/alta/urgente), `status` (pendente/concluido/cancelado)
- **RLS**: Delete restrito a **admin apenas**

#### Task (tasks)
- **Campos obrigatorios**: `title`, `status`
- **Colunas Kanban**: `todo`, `in_progress`, `in_review`, `done`
- **FKs opcionais**: `clients(id)`, `processes(id)`
- **Denormalizacao**: `client_name`, `process_number`
- **RBAC**: `secretaria/assistente` so visualizam proprias tarefas e nao podem mover para "done"

#### Financial (financials)
- **Campos obrigatorios**: `description`, `amount`, `date`, `type`, `category`
- **Enums**: `type` (receita/despesa), `category` (honorarios/custas_processuais/aluguel/salarios/fornecedores/impostos/outros), `payment_method` (dinheiro/pix/transferencia/cartao/boleto)
- **RLS**: Create para usuario; Read/Update/Delete **apenas admin** (mais restritivo)

#### Document (documents)
- **Campos obrigatorios**: `name`, `parent_type`, `parent_id`
- **Pai polimorfico**: `parent_type` (client/process), `parent_id` (UUID)
- **Categorias**: pessoais, inss, medicos, judicial, diversos, comprovacao
- **OCR**: `ocr_content` (text), `ocr_processed` (bool)
- **Versionamento**: `current_version` (int), versoes em tabela separada

### Entidades de Beneficios Previdenciarios

#### Beneficio (beneficios) — Entidade pai
- **Campos obrigatorios**: `client_id`, `categoria`, `tipo_beneficio`
- **Categorias**: `bpc_loas`, `rural`, `urbano`
- **Workflow de status**: `em_analise` → `documentacao_pendente` → `aguardando_protocolo` → `protocolado` → `deferido`|`indeferido`|`cancelado`
- **JSONB**: `dados_especificos`, `checklist_documentos`

#### BeneficioAposentadoriaRural (60+ campos)
- Perfil completo do trabalhador rural para aposentadoria por idade
- Secoes: residencia, historico emprego, grupo familiar (JSONB), propriedades (JSONB), producao rural, filiacao sindical, DAP/CAF, testemunhas (JSONB)
- **Enum `situacao_propriedade`**: proprietario/arrendatario/meeiro/posseiro
- **Enum `transporte_roca`**: 6 tipos (a pe, bicicleta, moto, carro, onibus, outros)

#### BeneficioBPC_Idoso (35+ campos)
- Avaliacao socioeconomica para BPC/LOAS idoso
- Campos: CadUnico, renda familiar, beneficios governamentais, habitacao, veiculos (JSONB), bens, fotos

#### BeneficioIncapacidadeRural (40+ campos)
- Avaliacao medica + comprovacao laboral rural
- Secao medica: CID, sintomas, acidente, tratamento, medicamentos, documentos (JSONB)
- Secao rural: campos compartilhados com aposentadoria_rural

#### BeneficioSalarioMaternidadeRural (40+ campos)
- Tipos de evento: parto, adocao, guarda_judicial, aborto_nao_criminoso
- Dados gestacionais, tipo de parto, beneficios anteriores
- Analise do conjugue (urbano vs rural)

### Entidades de Suporte

#### ProcessMove (process_moves)
- **Fonte**: `source` (datajud/manual/sistema)
- **Tipos**: despacho, sentenca, decisao, peticao, intimacao, citacao, audiencia, outros

#### Appointment (appointments)
- **Status**: agendado/realizado/cancelado
- `alerts_enabled` (bool), `alert_days` (integer array)

#### Template (templates)
- **Categorias**: peticao_inicial, recurso, contestacao, contrato, procuracao, notificacao, outros
- `variables` (string array), `content` (HTML)

#### DocumentVersion (document_versions)
- Rastreamento de versoes por documento

#### DocumentFolder (document_folders)
- Hierarquia de pastas com auto-referencia FK
- `parent_type` (client/process/general)

---

## Schema do Banco de Dados

### Tabelas Principais (Migration 008)

| Tabela | PK | FKs | Colunas Chave |
|---|---|---|---|
| `clients` | uuid | → auth.users(id) | 30+ colunas, CHECK constraints |
| `processes` | uuid | → clients(id) SET NULL | process_number, area, status |
| `deadlines` | uuid | → processes(id) CASCADE | due_date, priority, alert_active |
| `tasks` | uuid | → clients/processes SET NULL | kanban_column, assigned_to, attachments |
| `financials` | uuid | → clients/processes SET NULL | amount numeric(14,2), payment_method |
| `documents` | uuid | parent_id (polimorfo) | tags text[], ocr_content, file_size |
| `document_folders` | uuid | self-ref CASCADE | parent_type, parent_ref_id |
| `document_versions` | uuid | → documents(id) CASCADE | version_number, uploaded_by |
| `appointments` | uuid | → clients(id) SET NULL | date timestamptz, alert_days int[] |
| `templates` | uuid | → auth.users(id) | variables text[], content text |
| `process_moves` | uuid | → processes(id) CASCADE | source, move_type |
| `beneficios` | uuid | → clients(id) CASCADE | dados_especificos jsonb |
| `beneficios_aposentadoria_rural` | uuid | → beneficios, clients CASCADE | ~55 colunas |
| `beneficios_bpc_idoso` | uuid | → beneficios, clients CASCADE | ~35 colunas |
| `beneficios_incapacidade_rural` | uuid | → beneficios, clients CASCADE | ~40 colunas |
| `beneficios_salario_maternidade_rural` | uuid | → beneficios, clients CASCADE | ~40 colunas |

### Tabelas PericiaPro (Migration 001)

| Tabela | Proposito |
|---|---|
| `pericias` | Gestao de pericias (CPF, esfera, status, DCB, datas) |
| `pericia_pagamentos` | Pagamentos por pericia |
| `pericia_documentos` | Documentos por pericia com classificacao IA |
| `activity_logs` | Log de auditoria |
| `lembretes` | Lembretes vinculados a pericias |
| `notifications` | Notificacoes (DCB, pericia) |
| `notification_preferences` | Config de notificacao por usuario |

### Tabelas de Jurisprudencia (Migration 045)

| Tabela | Proposito |
|---|---|
| `courts` | Lookup de tribunais (acronimo, nome) |
| `jurisprudences` | Acordaos com embedding vector(768), fts_vector tsvector |
| `jurisprudencia_chat_sessions` | Sessoes de chat RAG |
| `jurisprudencia_chat_messages` | Historico de mensagens do chat |

### Tabelas de Suporte

| Tabela | Proposito |
|---|---|
| `users` | Perfis de usuario |
| `client_inss_emails` | Emails INSS recebidos |
| `holidays` | Calendario de feriados |
| `atendimentos` | Diario de atendimentos/CRM |

### Colunas Padrao

Todas as tabelas possuem: `id` (uuid PK), `created_by` (uuid → auth.users), `created_at` (timestamptz), `updated_at` (timestamptz via trigger).

---

## Camada de Servicos

### BaseService (CRUD Generico)

Classe base que fornece operacoes genericas para qualquer tabela:

- `list(orderBy, limit, filters, offset)` — listagem paginada com ordenacao
- `create(recordData)` — insercao com validacao Zod opcional
- `update(id, updates)` — atualizacao com validacao parcial Zod
- `delete(id)` — exclusao
- `getById(id)` — busca por ID
- `getByField(field, value)` — busca por campo
- `getAllByField(field, value, orderBy)` — multi-registros por campo
- `filter(filters, orderBy, limit, offset)` — filtragem generica
- `count(filters)` — contagem

Erros sao mapeados de codigos Supabase/PostgreSQL para mensagens em portugues via `SUPABASE_ERROR_MAP`.

### Servicos Especializados

| Servico | Estende | Funcionalidades Especificas |
|---|---|---|
| `authService` | — | Login/logout, sessao, mapeamento de user metadata |
| `clientService` | BaseService("clients") | `getByCPF`, `getByEmail`, `searchByName`, `listByArea`, soft delete |
| `aiService` | — | Proxy de IA: geracao de docs, OCR, classificacao, analise |
| `calendarService` | — | CRUD Google Calendar via Edge Functions |
| `cnjService` | — | Parser CNJ, busca DataJud, comunicacoes DJEN |
| `jurisprudenciaService` | — | Busca vetorial, chat RAG, scraping TNU, gestao de sessoes |
| `scraperService` | — | Config MNI, OTP, sincronizacao de processos |
| `holidayService` | — | CRUD de feriados |
| `atendimentoService` | — | Diario de atendimentos |

### Servicos Simples (instancias de BaseService)

`processService`, `deadlineService`, `taskService`, `financialService`, `documentService`, `appointmentService`, `notificationService`, `templateService`, `userService`, `inssEmailService`, `beneficioService`, `documentFolderService`, `documentVersionService`, `processMoveService`, e 4 servicos de subtipos de beneficio.

---

## Sistema de Roteamento

### Rotas Principais

| Caminho | Pagina | Descricao |
|---|---|---|
| `/` | Home | Dashboard principal |
| `/Clients` | Clients | Gestao de clientes |
| `/ClientDetail` | ClientDetail | Detalhe do cliente |
| `/Processes` | Processes | Gestao de processos |
| `/ProcessDetail` | ProcessDetail | Detalhe do processo |
| `/Tasks` | Tasks | Kanban de tarefas |
| `/Deadlines` | Deadlines | Gestao de prazos |
| `/Documents` | Documents | GED documental |
| `/Templates` | Templates | Templates juridicos |
| `/Financial` | Financial | Financeiro (admin-only) |
| `/Settings` | Settings | Configuracoes do usuario |
| `/CalendarSettings` | CalendarSettings | Config Google Calendar |
| `/NotificationSettings` | NotificationSettings | Preferencias de notificacao |
| `/IntimacoesDJEN` | IntimacoesDJEN | Diario de Justica Eletronico |
| `/Jurisprudencia` | JurisprudenciaPage | Busca juridica com IA |
| `/RadarCNJ` | RadarCNJ | Radar DataJud/CNJ |
| `/login` | AuthPage | Autenticacao |

### Rotas PericiaPro (Lazy-Loaded)

| Caminho | Pagina | Descricao |
|---|---|---|
| `/pericias/painel` | PericiasDashboard | Dashboard de pericias |
| `/pericias/cadastro` | PericiasCadastro | Cadastro de cliente |
| `/pericias/calendario` | PericiasCalendario | Calendario de pericias |
| `/pericias/alertas` | PericiasAlertas | Alertas de pericias |
| `/pericias/detalhes/:id` | PericiasDetalhes | Detalhe do cliente |

### Navegacao

- Sidebar colapsavel com filtragem por role
- Modulo PericiaPro como sub-grupo colapsavel
- Prefetching estrategico ao hover nos links de navegacao
- Layout responsivo mobile com header fixo e overlay

---

## Edge Functions (Supabase)

### ai-proxy — Gateway de IA Centralizado

Elimina exposicao de chaves de API no frontend. Roteia chamadas para multiplos providers.

**Acoes**: `generate` (docs juridicos), `invoke_llm` (LLM geral com JSON schema), `ocr` (OCR de documentos), `classify` (classificacao), `analyze` (analise de processos).

**Cadeia de fallback**:
- Geracao: Groq → DeepSeek R1 (OpenRouter)
- Vision/OCR: Gemini → Qwen2.5 VL (OpenRouter)
- Classificacao: Groq → Cohere
- Analise: NVIDIA → DeepSeek R1

**Seguranca**: JWT auth, timeout 45s, CORS restrito.

### chat-jurisprudencia — Chat RAG Juridico

Pipeline: query + sessionId → carrega historico → gera embedding (Gemini) → busca vetorial (RPC Supabase) → prompt RAG → Gemini Flash → salva mensagens.

- Memoria de curto prazo: ultimas 20 mensagens por sessao
- Propriedade de sessao validada via JWT
- Threshold de similaridade 0.4, max 5 resultados de contexto

### djen-bypass — Proxy DJEN

Proxy para API publica do CNJ (DJEN). Remove headers de autorizacao (WSO2 rejeita qualquer Authorization). Rate limit: 100 req/IP/min.

### datajud-bypass — Proxy DataJud

Proxy para API DataJud (ElasticSearch). Tribunais suportados: TJCE, TRF5 (configuravel via `TRIBUNAL_ENDPOINT_MAP`). Autenticacao via `DATAJUD_API_KEY`.

### scrape-tnu — Scraper TNU

Scraping do portal TNU para acordaos. Filtros de qualidade: rejeita decisoes monocraticas, votos, pedidos de reconsideracao, ementas < 50 chars. Codificacao ISO-8859-1. Range maximo de 30 dias.

### ti-webhook-receiver — Webhook Tramitacao Inteligente

Recebe eventos de webhook. Seguranca: rate limit 5 req/IP/min, HMAC-SHA256 com timing-safe verification, body bruto extraido ANTES de JSON.parse. Normaliza numero de processo e insere em `process_moves`.

### Bibliotecas Compartilhadas (_shared/)

- **auth.ts**: Verificacao JWT dual (ES256 via JWKS + HS256 legado). Rejeita role `anon`.
- **cors.ts**: Whitelist estrita de origens + security headers (nosniff, DENY, HSTS).
- **rate-limit.ts**: Sliding window de 1 minuto por IP.

---

## Seguranca

### Defense in Depth

| Camada | Medida | Detalhes |
|---|---|---|
| **CSP** | Content Security Policy | Definida em `index.html` |
| **RLS** | Row Level Security | Politicas JWT-based fail-close |
| **HMAC** | Webhook Signatures | Validacao HMAC-SHA256 timing-safe |
| **AI Vault** | Protecao de API Keys | Keys no Supabase Vault, proxy via Edge Functions |
| **Validacao** | Schemas Zod | 10+ schemas domain (CPF/CNPJ matematico) |
| **Upload** | Allowlist estrito | PDF, JPEG, PNG, WebP, DOC, DOCX |
| **RBAC** | Controle por role | admin/advogado/user/secretaria/assistente |
| **Geo-routing** | Edge Functions regionais | Header `x-region: sa-east-1` para APIs gov |
| **Sanitizacao OAB** | Normalizacao | Zero-padding 7 digitos, strip nao-numericos |
| **Rate Limiting** | Edge Functions | In-memory sliding window por IP |
| **Testes** | Vitest | Suite de testes de seguranca |

### RBAC

| Role | Acesso |
|---|---|
| `admin`/`dono` | Acesso total a todos os modulos |
| `advogado` | Acesso total conforme auditoria RLS |
| `user` | CRUD na maioria das entidades |
| `secretaria`/`assistente` | "Visao tunelada" em tarefas, nao concluem tarefas, sem acesso ao Financeiro |

### Modelo RLS

- `get_user_role()`: Funcao PostgreSQL SECURITY DEFINER que extrai role de multiplas paths JWT (`user_role`, `role`, `user_metadata.role`, `app_metadata.user_role`). Fallback: `'advogado'`.
- Padrao principal: `auth.uid() = created_by OR get_user_role() IN ('admin', 'advogado')`
- Excecoes: Financial (admin-only read/update/delete), Deadlines (admin-only delete)

---

## Integracoes com APIs Governamentais

### DataJud (CNJ)
- Proxy via Edge Function `datajud-bypass`
- Busca de processos por numero CNJ
- Tribunais configuraveis (TJCE, TRF5)
- Normalizacao de numero de processo (digitos apenas)

### DJEN (Diario de Justica Eletronico Nacional)
- Proxy via Edge Function `djen-bypass`
- Consulta de publicacoes por OAB
- **DJEN Vigia**: Worker que roda a cada 60 minutos no scraper server, busca novas publicacoes e cria notificacoes
- Deduplicacao via arquivo `djen_seen.json`

### TNU (Turma Nacional de Uniformizacao)
- Scraper via Edge Function `scrape-tnu`
- Coleta automatica de acordaos com filtros de qualidade
- Pipeline: scraping → DB → embedding → indexacao vetorial
- Coleta agendada via pg_cron (diario 03h BRT)

---

## Sistema de IA

### Geracao de Documentos Juridicos
- Prompt especializado para geracao de peticoes, recursos, contestacoes
- Templates com variaveis `{{FULL_NAME}}`, `{{cpf}}`, `{{endereco_completo}}`, etc.
- Fallback automatico entre providers

### OCR (Reconhecimento de Texto)
- Gemini 2.5 Flash (primario, multimodal) ou Qwen2.5 VL (fallback)
- Processamento de documentos PDF/images
- Conteudo extraido armazenado em `documents.ocr_content`

### Classificacao de Documentos
- Llama 3.1 8B via Groq (ultra-rapido) ou Cohere Command R+ (fallback)
- Categorizacao automatica de documentos por tipo

### Jurisprudencia com Busca Vetorial
- Embeddings: Gemini embedding-001 (768 dimensoes)
- Armazenamento: `pgvector` com indice HNSW (m=16, ef_construction=64)
- Busca: RPC `buscar_jurisprudencia` com cosine similarity
- Threshold: 0.5 (padrao), retorna top 10
- Full-text search: GIN index com tsvector portugues

### Chat RAG Juridico
- Pipeline completo: query → embedding → busca vetorial → contexto → LLM → resposta
- Memoria de sessao: ultimas 20 mensagens
- Citacoes de fontes com links para acordaos

---

## Modulo PericiaPro

### Proposito
Gestao do ciclo de vida completo de pericias INSS (pericias medicas previdenciarias) para advogados.

### Entidades
| Entidade | Descricao |
|---|---|
| `Pericia` | Cliente em pericia: CPF, esfera (Admin/Judicial), status, DIB/DCB, data/hora/local da pericia |
| `PericiaPagamento` | Pagamentos vinculados (pago/pendente) |
| `PericiaDocumento` | Documentos com classificacao IA opcional |
| `ActivityLog` | Auditoria (status_change, payment, document, update, reminder, creation) |
| `Lembrete` | Lembretes manuais por cliente |
| `Notification` | Notificacoes push com prioridade (low/medium/high/critical) |
| `NotificationPreferences` | Config por usuario: dias de alerta, templates customizados |

### Google Calendar (3 niveis)
1. **Server-side sync** via Edge Function (automatico ao criar/agendar pericia)
2. **Client-side URL** para adicao manual ao Google Calendar
3. **Exportacao ICS** para download de arquivo de calendario

### Notificacoes
- Geradas via pg_cron no servidor (nao mais no client)
- Entregue via Supabase Realtime (push, nao polling)
- Permissoes de navegador para Notification API

### PWA
- Prompt de instalacao para Android/iOS/Desktop
- Suporte iOS com instrucoes passo-a-passo
- Detecao de modo standalone
- Service worker registrado ao conceder permissao de notificacao

---

## Ferramentas e Utilitarios

### Geracao de PDF (`pdfExporter.js`, 610+ linhas)
- Baseado em jsPDF
- Paginacao A4 com `checkPageBreak()`
- Tipografia unificada (Helvetica 10pt corpo, 14pt titulos)
- Tabelas com linhas alternadas e quebra de pagina por linha
- Header/footer com branding e paginacao
- Formatters: data, CPF, moeda, booleano, label

### Geracao de DOCX (`documentGenerator.js`)
- Baseado em docxtemplater + PizZip
- Download de template + substituicao de variaveis
- Upload automatico para Supabase Storage

### Dias Uteis (`businessDays.js`)
- `addBusinessDays(startDate, days, holidaysArray)`
- Salta sabados, domingos e feriados
- Inicia contagem do dia seguinte (interpretacao legal CPC)

### Extracao de Dados do Cliente (`clientDataExtractor.js`, 426+ linhas)
- Suporte a 10 tipos de beneficio
- Switch por `tipo_beneficio` para funcoes de extracao especificas
- Label maps para exibicao em portugues
- Null safety: campos ausentes default '-'

### Calculo de CPC (`CalculadoraCpcModal.jsx`)
- Calculadora de prazos processuais (Codigo de Processo Civil)
- Integrado ao painel DJEN

---

## Regras de Negocio

### Workflow de Beneficios
```
em_analise → documentacao_pendente → aguardando_protocolo → protocolado → deferido|indeferido|cancelado
```

### Regras de Visibilidade
- Clientes: visibilidade compartilhada entre todos os autenticados (migration 047)
- Tarefas: visao tunelada para secretaria/assistente
- Financeiro: isolado ao admin
- Pericias: proprietario (created_by) OU admin

### Automacoes do Banco de Dados
- **pg_cron** (03h diariamente): varredura de processos obsoletos (>6 meses) e clientes sem CPF/CNPJ
- **Trigger AFTER INSERT documents**: resolve automaticamente appointments pendentes
- **pg_cron TNU**: coleta diaria de jurisprudencia

### Seguranca de Documentos
- Max upload: 50MB (security schema)
- MIME types permitidos: PDF, JPEG, PNG, WebP, DOC, DOCX
- Senhas INSS: campo criptografado (migration 005)
- Strings vazias convertidas para null antes de operacoes DB

---

## Configuracao e Deploy

### Variaveis de Ambiente (.env.example)
- `VITE_SUPABASE_URL` — URL do projeto Supabase
- `VITE_SUPABASE_ANON_KEY` — Chave anonima do Supabase
- `VITE_SCRAPER_URL` — URL do servidor de scraping

### Deploy
- **Frontend**: Netlify (SPA hosting, `netlify.toml` com redirects)
- **Backend**: Supabase (PostgreSQL + Edge Functions + Storage)
- **Scraper**: Hetzner CX33 (Ubuntu 24.04, 4 vCPU, 8GB RAM)
- **DNS/SSL**: Cloudflare (DNS Only mode)

### Scripts
- `pnpm run dev` — Inicia frontend + scraper em paralelo
- `pnpm run build` — Build de producao Vite
- `pnpm run security` — Testes de seguranca (Vitest)
- `pnpm run security:audit` — npm audit nivel alto

### Configuracao de Ferramentas
- **opencode.jsonc**: Config do OpenCode agent com AIOX skill
- **jsconfig.json**: Alias `@/*` → `./src/*`
- **components.json**: Config shadcn/ui (New York style)

---

## Historico de Migracoes (Evolucao)

| Fase | Migracoes | Descricao |
|---|---|---|
| **1 — PericiaPro** | 001-003 | Schema, RLS e indices do modulo original |
| **2 — Core** | 004-007 | Cron alerts, senha INSS, RLS fixes, RPC pagamentos |
| **3 — Core RVAdv** | 008-011 | Schema principal (16 tabelas), buckets publicos, templates |
| **4 — Jurisprudencia** | 012-014 | Schema, limpeza de dados |
| **5 — Fases INSS** | 015-025 | Roles, CadUnico, atendimentos, feriados, trigger, inspetor |
| **6 — Documentos** | 026-034 | Arquivados emails, fix constraints, novos users, area civel |
| **7 — Auditoria** | 035-044 | Fixes diversos, indices de performance, busca normalizada |
| **8 — Vetorial** | 045-050 | Busca vetorial, visibilidade clientes, embeddings |
| **9 — Robustez** | 051-058 | Chat memory, atendimentos CRUD completo, documentos diversos |
| **10 — Seguranca** | 202603* | Auditoria RLS, vault estrito |

---

## Notas de Manutencao e Problemas Conhecidos

### Duplicacao PericiaPro
O modulo `src/modules/periciapro/` possui copias paralelas de componentes UI, servicos e lib files — indicando integracao em andamento ou merge incompleto com o modulo principal.

### RLS Conflitantes
Tres migracoes conflitantes (008, 047, audit) aplicam politicas diferentes. A ultima migracao aplicada vence para cada nome de politica.

### PWA Incompleto
Codigo de instalacao PWA existe (InstallButton, IOSInstallPrompt, PWADetector) mas `manifest.json` e `service-worker.js` nao estao no repositorio — a funcionalidade nao opera sem esses arquivos.

### Hooks Duplicados
`src/hooks/use-mobile.jsx` e `src/modules/periciapro/hooks/use-mobile.jsx` sao identicos.

### Query Clients Duplicados
`src/lib/query-client.js` e `src/lib/query-provider.jsx` exportam `queryClientInstance` — potencial confusao.
