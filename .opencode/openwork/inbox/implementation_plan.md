# Frontend RV-Adv Refactoring — Dex Implementation Plan

Refatoração completa do frontend com foco em eliminação de falsos positivos de TypeScript, centralização de schemas Zod, extração de constantes e otimização de performance com TanStack Query v5 e memoização.

## Estado Atual

Investigação revelou:
- **jsconfig.json** já tem `skipLibCheck: true` ✅ — mas o `include` é limitado a `src/components/**/*.js` e `src/pages/**/*.jsx`, excluindo lib, services, modules.
- **src/lib/validation/**: Apenas `security-schemas.js` existe. Pasta `schemas/` não existe.
- **src/lib/query-client.js** já existe com configuração básica do QueryClient.
- **src/services/baseService.js** — sem validação Zod, sem error mapper em PT-BR.
- **src/services/index.js** — `clientService` é instância direta de `BaseService`, sem schema dedicado.
- **KanbanBoard.jsx** — não encontrado ainda em `src/modules/kanban/`; será verificado.
- **Hardcoded strings** `"Previdenciário"` e `"Cível"` em 7+ arquivos diferentes.
- **QueryClientProvider** já está em `App.jsx` usando `queryClientInstance`.

---

## Proposed Changes

### P0 — TypeScript / Configuração (CRÍTICO)

#### [MODIFY] [jsconfig.json](file:///c:/Users/Junior%20do%20Titico/Desktop/PROJETOS/Proj_RV_Adv/jsconfig.json)
- Expandir `include` para cobrir `src/**/*.{js,jsx}` (atualmente limitado → gera falsos positivos por arquivos não analisados)
- Manter `skipLibCheck: true` (já presente)
- Adicionar `"strict": false` explícito para não quebrar projetos JS puros

#### [NEW] [src/types/radix-components.d.ts](file:///c:/Users/Junior%20do%20Titico/Desktop/PROJETOS/Proj_RV_Adv/src/types/radix-components.d.ts)
- Declarar módulos `@radix-ui/*` com tipos permissivos
- Suprimir erros de props de componentes Radix (ex: `asChild`, `onCheckedChange`, `onValueChange`)

#### [MODIFY] [AppointmentForm.jsx](file:///c:/Users/Junior%20do%20Titico/Desktop/PROJETOS/Proj_RV_Adv/src/components/appointments/AppointmentForm.jsx)
- Corrigir stale closure no `useEffect` (falta `formData` no array de deps — viola React Best Practices rule 2)
- Substituir por setter funcional `setFormData(prev => ({ ...prev, ...appointment }))` (eliminando dependência do `formData` no effect)
- Adicionar JSDoc nas props para reduzir erros de TS

---

### P1 — Serviços e Validação Zod (ALTO)

#### [NEW] [src/lib/validation/schemas/index.ts](file:///c:/Users/Junior%20do%20Titico/Desktop/PROJETOS/Proj_RV_Adv/src/lib/validation/schemas/index.ts)
Hub central re-exportando `security-schemas.js` + novos schemas de domínio:
- `clientSchema` — validação de `cpf_cnpj`, `nome`, `area_atuacao`
- `appointmentSchema` — validação de `date`, `title`, `status`
- `processSchema` — validação de `numero`, `tipo`

#### [MODIFY] [src/services/baseService.js](file:///c:/Users/Junior%20do%20Titico/Desktop/PROJETOS/Proj_RV_Adv/src/services/baseService.js)
- Adicionar método `_mapError(error)` privado — traduz códigos de erro Supabase para PT-BR
  - `23505` → "Registro duplicado"
  - `23503` → "Referência inválida"
  - `42501` → "Sem permissão para esta operação"
  - `PGRST116` → "Registro não encontrado"
- Aceitar `schema` opcional no constructor para validação automática no `create` e `update`
- Lançar erros com mensagem PT-BR em vez de erros raw do Supabase

#### [NEW] [src/services/clientService.js](file:///c:/Users/Junior%20do%20Titico/Desktop/PROJETOS/Proj_RV_Adv/src/services/clientService.js)
- Instância de `BaseService` com `clientSchema` injetado
- Exportar como `clientService` nomeado
- Atualizar `src/services/index.js` para importar do novo arquivo

---

### P2 — Arquitetura e Performance (MÉDIO)

#### [NEW] [src/lib/constants/areas.js](file:///c:/Users/Junior%20do%20Titico/Desktop/PROJETOS/Proj_RV_Adv/src/lib/constants/areas.js)
```js
export const AREAS_ATUACAO = {
  PREVIDENCIARIO: "Previdenciário",
  CIVEL: "Cível",
};
export const AREAS_LIST = Object.values(AREAS_ATUACAO);
```
Consumido por: `ProcessForm.jsx`, `Processes.jsx`, `ProcessesChart.jsx`, `ClientForm.jsx`, `ClientDetail.jsx`, `ClientDocumentsSection.jsx`, `clientDataExtractor.js`

#### [MODIFY] [src/lib/query-client.js](file:///c:/Users/Junior%20do%20Titico/Desktop/PROJETOS/Proj_RV_Adv/src/lib/query-client.js)
- Adicionar `staleTime` estratégico nas `defaultOptions`:
  - `staleTime: 5 * 60 * 1000` (5 min) para listas/dados semi-estáticos
  - `gcTime: 10 * 60 * 1000` (10 min) para garbage collection
- Criar e exportar `QueryProvider` wrapper em `src/lib/query-provider.jsx` para facilitar composição

#### [MODIFY] KanbanBoard (se existir em `src/modules/kanban/`)
- Aplicar `React.memo` no componente root
- `useMemo` nas colunas do Kanban (derivadas de dados)
- `useCallback` nos handlers de drag-and-drop (React Best Practices rule 2)

---

## Open Questions

> [!IMPORTANT]
> **Q1:** O `jsconfig.json` atual exclui `src/lib` do typecheck. Devo incluir `src/lib` no `include`? Isso pode expor novos erros em `AuthContext.jsx` e outros arquivos em `src/lib`. Avanço com isso ou mantenho a exclusão?

> [!IMPORTANT]  
> **Q2:** O KanbanBoard não foi encontrado em `src/modules/kanban/`. O Maestro confirmou esse caminho. Devo criar o diretório vazio ou procurar em outro local?

> [!NOTE]
> **Q3:** `clientService` em `index.js` é uma instância direta de `BaseService`. O novo `clientService.js` vai duplicar essa instância se mantida no `index.js`. Devo remover a linha do `index.js` e re-exportar do novo arquivo?

---

## Verification Plan

### Após Implementação
```shell
npm run typecheck   # Meta: < 100 erros (idealmente 0)
npm run lint        # Meta: 0 warnings
npm run build       # Meta: build finaliza com sucesso
```

### QA Review (@qa)
- Validar que `clientSchema.parse()` lança erro com dados inválidos
- Confirmar que erros Supabase chegam em PT-BR no toast
- Smoke test do formulário de compromisso (AppointmentForm)

---

**— Dex, sempre construindo 🔨**
