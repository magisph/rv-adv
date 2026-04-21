# Frontend Patterns & Conventions

## Stack
- React 18 SPA (Vite 6) — NAO e Next.js, NAO tem SSR
- Tailwind CSS 3 + shadcn/ui (new-york style, neutral base color)
- TanStack Query v5 para server state
- React Router DOM v6 para routing client-side
- React Hook Form + Zod para formularios
- Framer Motion para animacoes (mode="popLayout", layoutId)
- Recharts para graficos

## Conventions
- Path alias: `@/` → `./src/` (vite.config.js)
- Imports absolutos obrigatorios. NUNCA usar relativos como `../../`.
- `import type` obrigatorio para interfaces e tipos.
- Componentes shadcn/ui em src/components/ui/ sao READ-ONLY.
  Criar wrappers em src/components/<domain>/ para customizacao.
- Um componente por arquivo. Arquivos em kebab-case.tsx.

## Componente shadcn/ui
- Busca: verificar se o componente ja existe em src/components/ui/
- Instalacao: `npx shadcn-ui@latest add <component>`
- Customizacao: criar wrapper com cva variants, nunca editar o original.

## Formularios
- Sempre usar React Hook Form + Zod para validacao.
- Null safety: strings vazias convertidas para null no payload.

## PDF e ZIP
- PDF: usar jsPDF (client-side). Verificar truncamento de texto.
- ZIP: usar jszip com processamento sequencial (for...of), nunca paralelo,
  para evitar OOM no navegador.