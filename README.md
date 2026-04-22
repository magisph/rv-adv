# 🏛️ RV-Adv: Plataforma de Gestão Jurídica Inteligente

<p align="center">
  <img src="https://img.shields.io/badge/React-18.2.0-61DAFB?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.8.2-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Supabase-2.99.1-3ECF8E?style=flat-square&logo=supabase" alt="Supabase">
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js" alt="Node.js">
</p>

---

O **RV-Adv** é um ecossistema jurídico autônomo (LegalTech) desenvolvido sob a arquitetura de **Monólito Modular**. O sistema opera como uma SPA (*Single Page Application*), proporcionando transições de tela instantâneas diretamente na memória do navegador, eliminando a necessidade de recarregamentos completos da página e otimizando a experiência do usuário.

---

## 🏗️ Topologia do Sistema (Arquitetura)

A infraestrutura do projeto é dividida em três camadas principais, garantindo alta disponibilidade, segurança e escalabilidade:

### 1. Frontend (Client-Side Rendering)

Responsável pela interface do usuário e gestão de estado em tempo real.

- **Tecnologias Base:** Desenvolvido em **React 18** e empacotado via **Vite**.
- **Gestão de Estado:** Utiliza **TanStack Query v5** (React Query) para sincronização e invalidação de cache em tempo real, mitigando a necessidade de recarregamentos manuais.
- **UI/UX:** Estilização implementada com **Tailwind CSS v4**, componentes acessíveis do **shadcn/ui** (baseado em Radix UI) e ícones do **Lucide React**.

### 2. Backend e Infraestrutura em Nuvem (BaaS)

Responsável pela persistência de dados, segurança e processamento serverless.

- **Banco de Dados:** Operado via **Supabase** utilizando **PostgreSQL**. A arquitetura exige tipagem forte e transações atômicas para prevenção de condições de corrida (*Race Conditions*).
- **Computação Serverless:** Processamento de background realizado por **Edge Functions** (escritas em Deno/TypeScript), responsáveis por orquestrar Inteligência Artificial e interceptar Webhooks.

### 3. Microsserviço de Scraping (Casa de Máquinas)

Servidor dedicado à execução de automações pesadas e interação com portais judiciais.

- **Infraestrutura Física:** Hospedado em um servidor **Ubuntu 24.04** na **Hetzner**, utilizando instância CX33 (arquitetura x86, 4 vCPU, 8GB RAM) para suportar instâncias do navegador sem vazamento de memória.
- **Tecnologias:** Operado via **Node.js/Express**, utilizando **Crawlee** e **Playwright** para simular navegação invisível (stealth), capacitado para contornar bloqueios anti-bot e injetar códigos de Autenticação de 2 Fatores (OTP/2FA) remotamente.

---

## ✨ Módulos e Funcionalidades Principais

### 👥 1. Gestão de Clientes

- **Pivotamento de Escopo:** O formulário principal adapta-se dinamicamente às áreas **Previdenciária** e **Cível**. A seleção da área altera a interface, exibindo abas densas (como formulários do módulo PeríciaPro) ou uma triagem cível expressa.
- **Armazenamento Flexível:** Dados variáveis (como fatos, expectativa e dados da parte adversa) são armazenados em uma coluna do tipo `JSONB` (`dados_civeis`), mantendo a tabela enxuta.
- **Saneamento de Dados (Null Safety):** Strings vazias são automaticamente convertidas para o valor `null` no payload, respeitando a tipagem rigorosa do banco de dados.

### 📖 2. Diário de Atendimentos e CRM

- **Filtro In-Memory:** Busca de clientes realizada instantaneamente na memória RAM do navegador, reduzindo a carga de requisições ao servidor.
- **Gatilho de Banco de Dados (Database Trigger):** Automação vinculada ao upload de arquivos. Caso uma pendência seja registrada e o documento correspondente seja posteriormente anexado, um gatilho nativo (`AFTER INSERT ON documents`) altera o status do atendimento para "Resolvido" automaticamente.

### 📋 3. Pipeline de Aprovação Estrita (Kanban)

- **Performance e Animação:** Movimentação via botões ("Teletransporte"), utilizando animações fluidas do **Framer Motion** (`mode="popLayout"` e `layoutId`), otimizando o consumo de CPU.
- **Governança (RBAC):** Secretárias e assistentes visualizam exclusivamente tarefas atribuídas a elas e são bloqueadas sistemicamente de mover cartões para a coluna "Concluído", reservando a homologação final aos administradores.

### 📅 4. Motor Jurídico e Integração DJEN

- **Integração Segura:** A comunicação com o Diário de Justiça Eletrônico Nacional (DJEN) ocorre por meio de uma Edge Function (`djen-bypass`), eliminando problemas de *Mixed Content* e bloqueios geográficos (*Geo-Block 403*).
- **Webhooks (Tramitação Inteligente):** Recebimento automatizado de intimações em tempo real via evento `publications.created`, armazenando-as de forma reativa na tabela `process_moves`.
- **Calculadora CPC:** Algoritmo matemático (`businessDays.js`) que processa prazos ignorando sábados, domingos e feriados cadastrados, blindado contra inconsistências de fuso horário (*Timezone Shift*).

### 📬 5. Gestão Eletrônica de Documentos (GED)

- **Processamento de E-mails INSS:** Integração com *Cloudflare Email Routing* acoplada a uma Edge Function que utiliza o **Gemini 2.5 Flash** para leitura de e-mails, extração de lixo HTML e formatação estruturada de datas de perícia.
- **Malote Digital:** Download em lote de documentos na forma de arquivo `.zip`. Utiliza um processamento sequencial (`for...of`) para mitigar o risco de estouro de memória (*Out of Memory*) no navegador do cliente durante o empacotamento com o `jszip`.

### 🌙 6. Auditoria Contínua (Inspetor Noturno)

- **Rotinas Proativas:** Utilização da extensão `pg_cron` no PostgreSQL para varrer o banco de dados pontualmente às 03:00 da manhã.
- O sistema identifica processos ativos sem movimentação há mais de 6 meses e clientes sem numeração de CPF/CNPJ, injetando alertas prévios no painel de notificações dos administradores.

---

## 🔒 Segurança e DevSecOps

O ecossistema RV-Adv aplica o paradigma de Defesa em Profundidade em múltiplas camadas:

- **Row Level Security (RLS) com Padrão Fail-Close:** As políticas do banco de dados interceptam o JWT do usuário e leem o cache (`auth.jwt() ->> 'user_role'`) em milissegundos, evitando subqueries lentas. O sistema nega o acesso por padrão a módulos sensíveis (como o Financeiro) para papéis não autorizados.
- **Validação Criptográfica (HMAC-SHA256):** A Edge Function receptora de Webhooks (`ti-webhook-receiver`) exige e valida o cabeçalho `X-Webhook-Signature`, mitigando a injeção de dados forjados por terceiros não autorizados.
- **Cofre de Inteligência (AI Proxy):** Chaves de API (como Google Gemini e OpenRouter) são armazenadas restritamente no Supabase Vault. As Edge Functions atuam como *proxies*, impedindo a exposição de segredos no *client-side*.

---

## 🚀 Implantação

A implantação do ambiente de produção opera sob um esquema de DNS Misto:

- O **Frontend** é construído via integração contínua (CI/CD) no **Netlify** e servido no domínio oficial do projeto.
- O **Cloudflare** atua como gerenciador de DNS principal em modo *DNS Only* (Nuvem Cinza), permitindo o roteamento de e-mails nativos simultaneamente à emissão de certificados SSL pelo Netlify.

---

## 📂 Estrutura de Diretórios

| Diretório | Descrição |
|-----------|-----------|
| `src/` | Código principal React (componentes, hooks, pages, services) |
| `src/components/` | Componentes reutilizáveis (benefícios, clientes, dashboard, etc.) |
| `src/modules/periciapro/` | Módulo modularizado PeríciaPro |
| `supabase/functions/` | Edge Functions Deno/TypeScript |
| `supabase/migrations/` | Migrações PostgreSQL |
| `local-scraper/` | Microsserviço de scraping (Crawlee + Playwright) |
| `.agent/` | Configurações de skills e regras de IA |

---

## ⚙️ Stack Tecnológico

| Categoria | Tecnologias |
|-----------|-------------|
| **Frontend** | React 18, Vite, TanStack Query v5, Tailwind CSS v4, shadcn/ui, Framer Motion |
| **Backend** | Supabase, PostgreSQL, Edge Functions (Deno) |
| **Scraping** | Node.js, Express, Crawlee, Playwright |
| **Validação** | Zod, React Hook Form |
| **Testes** | Vitest |
| **Linting** | ESLint, TypeScript |

---

## 🔧 Variáveis de Ambiente

O projeto utiliza o arquivo `.env` para configuração local. Referencie `.env.example` para a estrutura completa.

Variáveis essenciais:
- `VITE_SUPABASE_URL` — URL do projeto Supabase
- `VITE_SUPABASE_ANON_KEY` — Chave pública anônima
- `VITE_SUPABASE_SERVICE_ROLE_KEY` — Chave de serviço (backend)

---

## 📋 Scripts de Desenvolvimento

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Inicia frontend + scraper simultaneamente |
| `npm run dev:front` | Inicia apenas o frontend |
| `npm run dev:scraper` | Inicia apenas o scraper |
| `npm run build` | Build de produção |
| `npm run lint` | Verifica lint |
| `npm run typecheck` | Verificação TypeScript |
| `npm run security` | Testes de segurança |

---

## ⚠️ Aviso de Propriedade

Este software é **propriedade intelectual exclusiva** do escritório. O código-fonte, documentação e funcionalidades são protegidos e não devem ser compartilhados, distribuídos ou reproduzidos sem autorização expresa.

---

<p align="center">
  <strong>RV-Adv</strong> — Sistema de Gestão Jurídica Interna
</p>
