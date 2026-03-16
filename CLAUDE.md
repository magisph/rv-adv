# Projeto RV-Adv 2.0 - Manual de Integração e Diretrizes de Auditoria

## 🛠️ Stack Tecnológico e Arquitetura
- **Frontend (SPA):** React 18, Vite, Tailwind CSS v4, shadcn/ui, Lucide React.
- **Gestão de Estado:** TanStack Query v5 (React Query) para cache e reatividade.
- **Backend (BaaS):** Supabase (PostgreSQL rígido, Auth via JWT, Storage, Edge Functions em Deno/TS).
- **Motor Periférico (Sidecar):** Node.js/Express na porta 3001, Web Scraping com Crawlee/Playwright (stealth).
- **Inteligência:** Synkra AIOX (Agentes com Fallback OpenRouter/Gemini/Groq).
- **Padrão Arquitetural:** Monólito Modular com separação estrita entre apresentação (CSR) e nuvem.

## 🛡️ Âncoras Semânticas (Padrões de Qualidade Exigidos)
- **Segurança DB:** "Padrão Fail-Close em Row Level Security (RLS)", "Transações ACID com Rollback via RPC".
- **Frontend:** "Memoização agressiva no React (useMemo/useCallback) para prevenir memory leaks no Drag-and-Drop".
- **Lógica e Matemática:** "Timezone Safe Math GMT-3 para evitar Timezone Shift em datas ISO".
- **Design de Código:** "Princípios SOLID e Early Return (Guard Clauses)".

## 📋 Diretrizes Operacionais (Obrigatório para o Claude Code)
1. **Verificar antes de agir:** Sempre execute `/plan` antes de iniciar uma refatoração ou alteração arquitetural complexa.
2. **Gerenciamento de Contexto (Ralph Loop):** Trabalhe focando em uma tarefa por vez. Se o uso de contexto (`Ctx(u)`) atingir 70%, sugira o comando `/compact`. Ao finalizar uma etapa da auditoria, solicite `/clear` para esvaziar a memória e evitar "podridão de contexto" (Context Rot).
3. **Restrição de Acessos:** Nunca modifique configurações de infraestrutura (`.env`, `supabase/config.toml`) sem aprovação explícita.
4. **Resiliência:** Ao sugerir código de integração externa (APIs de Tribunais, INSS), sempre implemente blocos robustos de `try/catch/finally` e rotas de *Fallback*.

## 🚀 Comandos Rápidos do Projeto
- `npm run dev` -> Inicia paralelamente o Frontend (Vite) e o Motor Sidecar (Express/Crawlee) via concurrently.
- `npx supabase db push` -> Envia alterações locais de banco de dados para a nuvem.

## 🗺️ Mapa de Auditoria Ativa (Estado Atual)
O sistema está estável (Fase 1 a 5 concluídas). Estamos atualmente na **Fase de Auditoria Profunda**.
- [ ] Etapa 1: O Cofre (RLS, Supabase, Triggers, Fallbacks de IA) -> **PRÓXIMA AÇÃO**
- [ ] Etapa 2: As Pontes (Scraping PJe, APIs Governamentais, Webhooks)
- [ ] Etapa 3: O Cérebro (Lógica de Negócios, Saneamento, Calculadora CPC)
- [ ] Etapa 4: A Vitrine (Performance React, Kanban, Fábrica de Peças)
