# Workflow: Hotfix de Produção

## Gatilho
Bug crítico identificado em produção (rafaelavasconcelos.adv.br)

## Passos
1. **Diagnóstico Rápido** (Agente: Debug)
   - Reproduzir o bug em ambiente local (`pnpm run dev:front`)
   - Verificar logs do Netlify Deploy e Edge Functions no Supabase Dashboard
   - Identificar causa raiz (frontend vs. edge function vs. RLS vs. dados)

2. **Correção** (Agente: Dev)
   - Branch: `hotfix/<descricao-curta>` a partir de `master`
   - Corrigir o bug com teste de regressão
   - Validar: `pnpm run lint && pnpm run security`

3. **Validação** (Agente: QA)
   - Testar cenário afetado + cenários adjacentes
   - Verificar que não há regressão em outras áreas
   - Confirmar funcionamento em dark mode e mobile

4. **Deploy** (Agente: DevOps)
   - Merge para `master` → deploy automático Netlify
   - Verificar Edge Functions: `supabase functions deploy <funcao>`
   - Monitorar logs pós-deploy por 15 minutos

5. **Comunicação**
   - Registrar no changelog
