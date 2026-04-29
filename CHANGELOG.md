# Changelog

Todas as alterações notáveis deste projeto são documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [Hotfix] 2026-04-29 — Correção crítica do Radar CNJ (`datajud-bulk-proxy`)

### Problema
Erro HTTP 404 em produção no endpoint `POST /functions/v1/datajud-bulk-proxy`.
**Impacto:** funcionalidade de consulta de processos do Radar CNJ indisponível para todos os usuários autenticados.

### Causas Raiz (3 encadeadas)

| # | Causa | Sintoma | Fix |
|---|-------|---------|-----|
| 1 | Rota `POST /api/datajud` ausente no scraper Hetzner | `Cannot POST /api/datajud` (Express 404) | `git pull` + pm2 restart via GitHub Actions SSH |
| 2 | `SCRAPER_SERVICE_KEY` ausente no `.env` do servidor | HTTP 500 no middleware do scraper | Atualização do `.env` + fresh pm2 start |
| 3 | Secrets Supabase desatualizados | Edge Function enviando key desatualizada | Atualização via Supabase Management API |

### Correções Aplicadas

- **Deploy do local-scraper** no Hetzner (CX33 / nbg1) via GitHub Actions SSH:
  - `git pull origin master` (inclui commit `066b3c3 fix: datajud-bulk-proxy 404 routing mismatch`)
  - `pm2 delete all` + fresh start para recarregar `.env`
- **Secrets Supabase** atualizados: `SCRAPER_URL=http://46.224.176.59:3001`, `SCRAPER_SERVICE_KEY=****`
- **Redeploy da Edge Function** `datajud-bulk-proxy` (v33 → v34)
- **Rotação de credencial SSH** do servidor Hetzner
- **Consolidação dos workflows de CI/CD** em deploy unificado

### Verificação

```
GET  http://46.224.176.59:3001/api/datajud/health          → HTTP 200 ✅
POST http://46.224.176.59:3001/api/datajud  (TRF5)         → HTTP 200 {"success":true} ✅
POST http://46.224.176.59:3001/api/datajud  (TJCE 2019)    → HTTP 200 {"success":true,"erros":[]} ✅
POST /functions/v1/datajud-bulk-proxy (anon key)           → HTTP 401 (JWT check correto ✅)
Supabase logs: POST|404 → POST|401 (sem mais erros de rota) ✅
```

**Processo de teste:** `0175844-55.2019.8.06.0001` (TJCE) — `duracao_ms: 946` — `erros: []`

### Componentes Afetados

- `supabase/functions/datajud-bulk-proxy/index.ts` — Edge Function (Supabase)
- `local-scraper/server.ts` — Express/Node.js (Hetzner CX33, Nuremberg)
- `local-scraper/src/routes/datajud.ts` — Roteador DataJud
- `.github/workflows/deploy-local-scraper.yml` — Pipeline de deploy unificado

### Itens de Follow-up

- [ ] Confirmar `DATAJUD_API_KEY` no `.env` do servidor (teste retornou 200 sem erros, API provavelmente ativa)
- [ ] Considerar geo-restriction do DataJud (servidor em DE, API restrita ao BR) — monitorar resultados em produção
- [ ] Adicionar alertas de saúde do scraper ao Supabase Dashboard
