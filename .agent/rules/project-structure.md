# Project Structure Rules

## Diretorio Source (src/)
```
src/
  components/ui/       # shadcn/ui — READ-ONLY, nunca editar diretamente
  components/<domain>/ # Wrappers e componentes de dominio
  hooks/               # Custom hooks (useAuth, useQuery wrappers)
  lib/                 # Utilidades globais (supabaseClient, utils)
  modules/periciapro/  # Sub-modulo autocontido (45+ arquivos)
  pages/               # Paginas de rota (React Router)
  services/            # Camada de servicos (baseService pattern)
  types/               # Definicoes TypeScript globais
  utils/               # Helpers (businessDays.js, formatters)
```

## Servicos (src/services/)
- Todos seguem o padrao de baseService.js (Supabase client wrapper)
- Um service por dominio: clientService, atendimentoService, etc.
- Metodos CRUD: list, getById, create, update, delete

## Edge Functions (supabase/functions/)
- Uma funcao por diretorio com index.ts
- Compartilhar via imports relativos: ../_shared/auth.ts
- NAO misturar logica de dominio entre funcoes

## Entities (entities/)
- Schemas JSON de referencia para cada entidade do dominio
- Usar como source-of-truth para validacoes Zod

## Local Scraper (local-scraper/)
- Independente do frontend. Executa com: pnpm dev:scraper
- Porta: 3001 (configurada via VITE_SCRAPER_URL)