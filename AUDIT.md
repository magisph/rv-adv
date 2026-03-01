# Auditoria Completa — rv-adv

## Contexto do projeto
- Frontend Vite + React, SPA, React Router, React Query.
- Integração com Supabase (auth/db/storage) e variáveis via .env.local.
- Objetivo: auditoria completa + correções seguras e verificadas.

## Escopo da auditoria (obrigatório)
1) Build e qualidade
- Rodar: npm install, npm run lint, npm run typecheck, npm run build, npm run preview (se aplicável).
- Corrigir falhas (sem silenciar lint; sem remover validações).
- Padronizar imports, remover dead code, reduzir warnings.

2) Segurança (cliente + Supabase)
- Garantir que nenhum segredo está no repo (verificar .env*, configs, commits).
- Validar boas práticas de uso do Supabase no client:
  - Apenas anon key no frontend; nada de service role.
  - Tratamento robusto de erros e estados de auth.
  - Regras de acesso: exigir RLS no banco e política adequada (documentar o que precisa no Supabase).

3) Arquitetura e manutenibilidade
- Revisar estrutura de pastas e acoplamento de UI / lib / utils.
- Propor padrões: camada de API (React Query), schemas Zod, tipagem (mesmo que parcial).
- Criar documentação técnica mínima do repo (README melhorado + fluxo de dev).

4) UX/performance
- Identificar gargalos óbvios (bundle, libs pesadas, rotas).
- Recomendar quick wins sem refatoração ampla.

## Regras de execução
- Usar checkpoint-mode: pausar a cada 5 tasks OU 30 minutos.
- Toda mudança deve ser commit atômico.
- Não fazer refactors massivos sem checkpoint.
- Ao final, entregar:
  (a) Relatório por severidade (Critical/High/Medium/Low)
  (b) Lista de pendências que dependem do Supabase (RLS/policies/storage)
  (c) PR/commits com correções seguras.
