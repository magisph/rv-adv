# Rule: Arquitetura e Design System

## Design System Legal

### Paleta de Cores Obrigatória
- Primary: HSL(215, 52%, 24%) → `--legal-blue: #1e3a5f`
- Accent: HSL(43, 71%, 47%) → `--legal-gold: #c9a227`
- Muted: HSL(215, 16%, 47%) → `--legal-gray: #64748b`
- Background: `hsl(0 0% 100%)` / Dark: `hsl(222 47% 11%)`
- Destrutivo: `hsl(0 84% 60%)`

### Tipografia
- Headings: `font-heading` (sans-serif system)
- Body: `font-sans` (system)
- Mono: `font-mono` (code)

### Componentes Obrigatórios
- Sempre usar componentes de `@/components/ui/` (shadcn/ui New York style)
- Ícones: SEMPRE Lucide React (`lucide-react`)
- Formulários: React Hook Form v7 + Zod v3.24
- Modais: Radix UI Dialog
- Tabelas: Radix UI Table ou TanStack Table
- Tooltips/Popovers: Radix UI
- Date Picker: react-day-picker v8

### Animações
- Kanban: Framer Motion v11 (`framer-motion`)
- Confetti: `canvas-confetti` (apenas para celebrações de meta)
- Accordion: tailwindcss-animate

### Responsividade
- Breakpoints: sm(640), md(768), lg(1024), xl(1280)
- Layout: Sidebar colapsável + Header fixo (Layout.jsx)
- Mobile-first: construir para mobile, expandir para desktop

### Dark Mode
- Estratégia: `class` (Tailwind)
- Toggle: verificar preferência do usuário no perfil
- TODOS os componentes DEVEM funcionar em dark mode
