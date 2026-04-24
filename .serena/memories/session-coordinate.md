# Session Coordinate: Hotfix TNU

- **Session Start Time:** 2026-04-24T19:13:00-03:00
- **User Request Summary:** Diagnosticar a interrupção da rotina `pg_cron` (03:00) da TNU, aplicar backfill de acórdãos do período de 16/03/2026 a 24/04/2026 e normalizar a Edge Function `scrape-tnu`.

## Objectives
1. **ANALISAR (Diagnóstico via @debug-agent)**
   - Read `cron.job_run_details` in Supabase.
   - Verify execution logs of Edge Function `scrape-tnu` looking for 504 or 403 errors.

2. **EXECUTAR BACKFILL (Data Engineering)**
   - Divide load into:
     - Payload 1: `{ startDate: '2026-03-16', endDate: '2026-03-31' }`
     - Payload 2: `{ startDate: '2026-04-01', endDate: '2026-04-24' }`

3. **CORRIGIR ESTRUTURA (Se necessário)**
   - Fix eproc selectors or add proxies/stealth headers if anti-bot protection is detected.

4. **VALIDAR (Quality Assurance)**
   - Confirm records in `jurisprudencias` table.
   - Ensure `generate-embedding` routine was triggered successfully.
