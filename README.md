# ⚖️ RV-Adv (com Módulo PeríciaPro)

## 🎯 Sobre o Projeto

**RV-Adv** é um sistema integrado de gestão inteligente voltado para escritórios de advocacia. Desenvolvido como uma moderna *Single Page Application* (SPA), o sistema centraliza o controlo de clientes, processos judiciais, finanças e agenda. 

Recentemente, o sistema foi expandido com a incorporação nativa do módulo **PeríciaPro** (anteriormente um sistema legado isolado), trazendo capacidades avançadas de gestão de processos previdenciários e assistenciais (INSS e instâncias judiciais).

O grande diferencial tecnológico do projeto é a **integração com Inteligência Artificial**, que atua na leitura automatizada (OCR) e classificação heurística de documentos jurídicos e laudos médicos.

---

## ✨ Funcionalidades Principais

A arquitetura do sistema é dividida em domínios de negócio:

* 👥 **Gestão de Clientes (`/clients`):** Cadastro completo, histórico e painel consolidado (*ClientDetail*).
* 📂 **Controlo de Processos (`/processes`):** Acompanhamento de ações judiciais e movimentações.
* 🏥 **Módulo PeríciaPro (`/modules/periciapro`):** Gestão rigorosa de perícias médicas (DIB, DCB, datas de agendamento), com motor de alertas proativo para evitar a perda de prazos.
* 🧠 **GED & Inteligência Artificial (`/documents`):** Gerenciamento Eletrónico de Documentos com motor de extração de dados (OCR). Os laudos do PeríciaPro são processados automaticamente aqui logo após o upload.
* 📅 **Prazos e Tarefas (`/deadlines` e `/tasks`):** Controlo de agenda com sincronização automatizada para o Google Calendar (via Edge Functions).
* 💰 **Gestão Financeira (`/financial`):** Controlo de honorários, custas judiciais e pagamentos de clientes/perícias.

---

## 🛠 Stack Tecnológico

O projeto abandonou infraestruturas fechadas (BaaS legados) e opera numa stack moderna, segura e altamente escalável:

**Frontend (Client-Side):**
* **Framework:** React 18 (com JSX)
* **Build Tool:** Vite
* **Roteamento:** React Router DOM v6
* **Gestão de Estado & Cache:** TanStack Query v5 (React Query)
* **Estilização & UI:** Tailwind CSS + Radix UI (arquitetura `shadcn/ui`)
* **Ícones:** Lucide React

**Backend & Infraestrutura (Supabase):**
* **Base de Dados:** PostgreSQL (com tipagem rígida e RLS - *Row Level Security* nativo)
* **Autenticação:** Supabase Auth (Sessões via JWT)
* **Storage:** Supabase Storage (Buckets para PDFs, imagens e laudos)
* **Serverless:** Supabase Edge Functions (Deno/TypeScript) para rotinas como a sincronização do Google Calendar.
* **Tarefas Assíncronas:** `pg_cron` a rodar no banco de dados, empurrando alertas de prazos para o frontend via *Supabase Realtime*.

---

## 📁 Estrutura de Diretórios (Monólito Modular)

```text
📦 rv-adv
 ┣ 📂 src/
 ┃ ┣ 📂 components/     # Componentes UI reutilizáveis e de domínio (RV-Adv)
 ┃ ┣ 📂 hooks/          # Custom React hooks
 ┃ ┣ 📂 lib/            # Configurações globais (Supabase client, QueryClient, utils)
 ┃ ┣ 📂 pages/          # Telas principais de roteamento do sistema base
 ┃ ┣ 📂 services/       # Camada de comunicação com o Supabase
 ┃ ┗ 📂 modules/
 ┃    ┗ 📂 periciapro/  # 🚨 [NOVO] Módulo Integrado de Perícias Previdenciárias
 ┃       ┣ 📂 components/
 ┃       ┣ 📂 pages/
 ┃       ┣ 📂 services/
 ┃       ┗ 📂 types/
 ┣ 📂 supabase/         # ⚙️ Infraestrutura Backend
 ┃ ┣ 📂 functions/      # Edge Functions em TypeScript (Google Calendar Sync, etc.)
 ┃ ┗ 📂 migrations/     # Scripts SQL (Tabelas, RLS e pg_cron)
 ┣ 📜 App.jsx           # Roteamento e injeção de Providers
 ┣ 📜 package.json
 ┗ 📜 vite.config.js