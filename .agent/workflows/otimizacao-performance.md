# Workflow: Otimização de Performance (Prioridade Produção)

## Contexto Atual
- JS Bundle: ~680KB Brotli (2.5MB raw) — bundle único
- FCP: ~372ms (bom), DOM Ready: ~2.9s (precisa melhorar)
- 4 recursos carregados (ótimo), Brotli habilitado (ótimo)

## Ações Prioritárias

### 1. Code Splitting por Rota (Crítico)
O App.jsx já possui lazy loading para PericiaPro. Extender para TODAS as rotas:

```jsx
// pages.config.js — alterar imports para lazy
const Home = React.lazy(() => import('./pages/Home'));
const Clients = React.lazy(() => import('./pages/Clients'));
const Processes = React.lazy(() => import('./pages/Processes'));
// ... todas as 16 páginas
```

### 2. Tree Shaking de Dependências
- Verificar se Recharts está sendo importado apenas nos componentes que usam
- Verificar importação seletiva de Lucide icons
- Remover Framer Motion de componentes que não usam animação

### 3. Otimizar TanStack Query
- Configurar `staleTime` adequado por serviço
- Usar `prefetchQuery` para rotas previsíveis
- Implementar cache invalidation granular

### 4. Imagens e Assets
- Converter SVGs inline para componentes React
- Lazy load de imagens pesadas
- WebP para screenshots/avatars
