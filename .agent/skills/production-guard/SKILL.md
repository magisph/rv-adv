---
name: production-guard
description: Guardião de produção. Use SEMPRE antes de realizar qualquer alteração que possa impactar o site em produção https://rafaelavasconcelos.adv.br/. Verifica segurança, performance e estabilidade antes de qualquer deploy.
---

# Production Guard

## Checklist Pré-Deploy (Obrigatório)

### 1. Segurança
- [ ] Nenhum dado sensível novo no frontend (API keys, tokens, senhas)
- [ ] CSP mantido (sem novos domínios externos não autorizados)
- [ ] Edge Functions com JWT verification (se acessam dados de usuário)
- [ ] Rate limiting em funções públicas
- [ ] Validação Zod em novas entradas
- [ ] RLS atualizado se novas tabelas/colunas
- [ ] `pnpm run security` passa sem erros
- [ ] `pnpm run lint` passa sem erros
- [ ] `npm audit` sem vulnerabilidades high/critical

### 2. Estabilidade
- [ ] Sem breaking changes sem migração de dados
- [ ] Novas tabelas com valores default para colunas NOT NULL
- [ ] Edge Functions backward compatible
- [ ] API responses mantêm formato existente
- [ ] Sem remoção de funcionalidades sem aviso

### 3. Performance
- [ ] Novo bundle não excede 750KB Brotli significativamente
- [ ] Sem queries N+1 no Supabase
- [ ] Novos índices para queries pesadas
- [ ] Lazy loading para novos componentes pesados

### 4. Experiência do Usuário
- [ ] Dark mode funcional em novos componentes
- [ ] Responsividade testada (mobile + desktop)
- [ ] Mensagens de erro em português
- [ ] Loading states em novas interações
- [ ] Sem regressões visuais em páginas existentes

### 5. LGPD
- [ ] Sem dados pessoais em logs
- [ ] Sem tracking não autorizado
- [ ] RLS garante隔离 por usuário/escritório

## Após Deploy
1. Verificar Netlify deploy logs (sem erros de build)
2. Testar login e 3 rotas principais em produção
3. Verificar Supabase Edge Function logs (sem erros)
4. Monitorar por 30 minutos após deploy
5. Ter plano de rollback pronto (git revert + force push)
