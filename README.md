# ⚖️ RV-Adv (Sistema de Gestão Jurídica Inteligente)

## 🎯 Sobre o Projeto
O **RV-Adv** é um sistema integrado de gestão de alto nível, projetado exclusivamente para a advocacia. Desenvolvido como uma *Single Page Application* (SPA) moderna, o sistema atua como o "Coração Digital" do escritório, centralizando clientes, processos, finanças, geração de documentos e captura automatizada de dados.

O projeto evoluiu de um sistema de gestão básico para um **Monólito Modular** alimentado por Inteligência Artificial e Automação de Processos Robóticos (RPA), absorvendo nativamente o sistema legado *PeríciaPro* e eliminando tarefas manuais através de integrações profundas com APIs governamentais e ferramentas de nuvem.

---

## ✨ Módulos e Funcionalidades Principais

### 👥 1. Gestão de Clientes e Processos
*   **Fichas Consolidadas:** Cadastro completo de clientes com saneamento automático de dados (Data Sanitation) para evitar erros de banco de dados e higienização de CPFs/CNPJs.
*   **Rotas Protegidas:** Sistema blindado por autenticação real (JWT), impedindo acessos de "visitantes" anônimos.

### 🏭 2. Fábrica de Peças Jurídicas (Módulo de Templates)
*   **Motor Frontend (Client-Side):** Utiliza as bibliotecas `pizzip` e `docxtemplater` para abrir e preencher arquivos do Microsoft Word (`.docx`) diretamente na memória RAM do navegador do advogado.
*   **Formatação Preservada:** Substitui etiquetas (ex: `{{full_name}}`) pelos dados reais do banco, mantendo 100% o logotipo, margens e fontes originais do escritório.
*   **Fluxo Assíncrono:** Ao gerar a peça, o sistema faz o download imediato para a máquina e, silenciosamente, envia uma cópia de segurança para o Gerenciador Eletrônico de Documentos (GED) na nuvem.

### 📬 3. Agência de Correios Inteligente (Integração INSS)
*   **E-mails Únicos:** O sistema gera automaticamente um e-mail com domínio próprio do escritório para cada cliente (ex: `joaodgf@rafaelavasconcelos.adv.br`).
*   **Triagem Automatizada:** Integrado ao *Cloudflare Email Routing* e *Cloudflare Workers*, os e-mails recebidos do INSS são redirecionados em milissegundos para o nosso backend (Edge Functions) a custo zero.
*   **Leitura por IA:** A Edge Function `inss-webhook` recebe a carta do INSS e aciona o **Gemini 2.5-flash** para ler o texto não-estruturado, extraindo a data, hora e local exatos da perícia médica.
*   **Dashboard Central:** Os prazos extraídos piscam automaticamente em um "Quadro Geral de E-mails" na tela inicial do sistema, eliminando a perda de prazos.

### 🤖 4. Robô Jurídico (Scraper PJe TRF-5 e TJ-CE)
*   **Servidor Local (Sidecar):** Um robô invisível em Node.js rodando paralelamente (na porta 3001) usando a infraestrutura avançada do `Crawlee` e `Playwright`.
*   **Infiltração com 2FA:** Navegação com reconhecimento visual (semântico) que contorna bloqueios antibot, detecta a tela de Autenticação em Duas Etapas (OTP) e injeta o código do celular capturado diretamente no RV-Adv.
*   **Navegação Direta:** Uso de atalhos (saltos de URL diretos para o *Painel do Advogado*) para extrair movimentações judiciais sem esbarrar em pop-ups dos tribunais.

### 🧠 5. GED & Inteligência Artificial (AI Proxy)
*   **Cofre de Chaves:** Todas as chaves de IA (Gemini, Groq, OpenRouter) vivem no `ai-proxy` (Supabase Vault), garantindo segurança militar contra vazamentos.
*   **OCR e Classificação:** Documentos e laudos recebem leitura automatizada via IA para extração de dados e categorização inteligente.

---

## 🛠 Stack Tecnológico e Arquitetura

O projeto adota os padrões mais rigorosos de performance e segurança do mercado:

**🖥️ Frontend (A "Vitrine"):**
*   **Framework:** React 18 + Vite.
*   **Estilização:** Tailwind CSS 4 + Radix UI (`shadcn/ui`).
*   **Gerenciamento de Estado:** TanStack Query v5 (React Query).
*   **Processamento de Documentos:** PizZip + docxtemplater + file-saver.

**☁️ Backend (O "Cofre e a Casa de Máquinas"):**
*   **Banco de Dados:** PostgreSQL hospedado no **Supabase**.
*   **Segurança (RLS):** *Row Level Security* aplicado em todas as tabelas (17 tabelas principais) garantindo que as operações só ocorram com o crachá do usuário autenticado.
*   **Serverless:** Supabase Edge Functions (Deno/TypeScript) para automações como o webhook do INSS e o Proxy de IA.
*   **Storage:** Supabase Storage integrado ao GED.

**🕷️ Automação Desktop (Scraper Local):**
*   **Motor:** Express.js + Crawlee + Playwright (TypeScript).

---
