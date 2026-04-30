# Changelog

Todas as alterações notáveis deste projeto são documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [Hotfix] 2026-04-29 — Coleta TNU: 6 bugs corrigidos nos workflows CI/CD

### Impacto
Workflow `Coleta Automatizada TNU` falhava diariamente com `ValueError: unknown url type: '/functions/v1/scrape-tnu'`. Coleta de jurisprudência e geração de embeddings estavam 100% indisponíveis.

### Bugs Corrigidos

| # | Gravidade | Problema | Arquivo | Fix |
|---|-----------|----------|---------|-----|
| 1 | 🔴 Crítico | `SUPABASE_URL` vazia → `ValueError` na coleta | `tnu-scraper.yml` | Guard `startswith('https://')` + `sys.exit(1)` |
| 2 | 🔴 Crítico | Mesma falha no step de embeddings (3 URLs afetadas) | `tnu-scraper.yml` | Mesmo guard no segundo step |
| 3 | 🟠 Alto | `os.environ["KEY"]` não detectava secret vazio | `tnu-scraper.yml` | Migrado para `os.environ.get()` com strip() |
| 4 | 🟡 Médio | `security-scan.yml` escutava `main`/`dev` em vez de `master` | `security-scan.yml` | Branches corrigidas para `master` |
| 5 | 🟡 Médio | Sem retry em falhas transitórias de rede | `tnu-scraper.yml` | Helper `http_call()` com backoff exponencial (1s/2s/4s) |
| 6 | 🔵 Tech Debt | `generate-embedding` usava `serve()` std@0.177.0 deprecated | `generate-embedding/index.ts` | Migrado para `Deno.serve()` nativo |

### Arquivos Alterados
- `.github/workflows/tnu-scraper.yml` — Guards de validação + helper `http_call()` com retry
- `.github/workflows/security-scan.yml` — Branches corrigidas: `main/dev` → `master`
- `supabase/functions/generate-embedding/index.ts` — `serve()` → `Deno.serve()`
- `CHANGELOG.md` — Este registro

### Ação Manual Necessária
> ⚠️ **O bug raiz (Bugs #1 e #2) exige configuração de secrets no GitHub.**
> Acesse: https://github.com/magisph/rv-adv/settings/secrets/actions
> - `SUPABASE_URL` = `https://uxtgcarklizhwuotkwkd.supabase.co`
> - `SUPABASE_SERVICE_ROLE_KEY` = chave de serviço (Supabase Dashboard → Project Settings → API)

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
