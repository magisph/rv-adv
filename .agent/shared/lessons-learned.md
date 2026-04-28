# Lessons Learned — RV-Adv

Registro de incidentes resolvidos e aprendizados capturados pela equipe de agentes.

---

## [CONCLUÍDO] Incidente DataJud Bulk 404

| Campo        | Detalhe                                              |
|--------------|------------------------------------------------------|
| **Status**   | ✅ CONCLUÍDO                                         |
| **Data**     | 2025                                                 |
| **Commit**   | `2087da7` — `fix(edge-functions): atualiza rota upstream do datajud proxy para remover /bulk` |
| **Arquivo**  | `supabase/functions/datajud-bulk-proxy/index.ts`     |
| **Deploy**   | Delegado ao CI/CD — GitHub Actions (`deploy-edge-functions.yml`) |

### Root Cause
A rota de upstream no microsserviço Hetzner (local-scraper) mudou de `/bulk` para `/api/datajud`, quebrando o contrato de API entre a Edge Function e o scraper. A nuvem continuava rodando a versão antiga da Edge Function, retornando HTTP 404 para todas as requisições de busca em lote do Radar CNJ.

### Resolução
A correção já havia sido aplicada localmente no arquivo `index.ts` (endpoint normalizado para `/api/datajud` sem o sufixo `/bulk`). O deploy foi delegado à esteira de CI/CD (GitHub Actions) devido a restrições de Docker no host local do usuário, impedindo o uso do CLI `supabase functions deploy` diretamente.

### Aprendizado
> **Incidente DataJud Bulk 404 Concluído. A quebra de contrato de rotas foi corrigida e o deploy da Edge Function foi delegado à esteira de CI/CD (GitHub Actions) devido a restrições de Docker no host local.**

### Prevenção Futura
- Manter o contrato de rotas do microsserviço documentado em `supabase/functions/datajud-bulk-proxy/index.ts` (comentário no header).
- Adicionar teste de smoke no CI que valide o endpoint `/api/datajud/health` após cada deploy.
- Considerar variável de ambiente `SCRAPER_ENDPOINT_PATH` para desacoplar o caminho da rota do código da Edge Function.

---
