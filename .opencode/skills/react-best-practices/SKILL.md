---
name: react-best-practices
description: Regras oficiais de otimização e boas práticas para React 18 e Vite. Use sempre que for criar ou alterar componentes .jsx no frontend.
---
# React Best Practices
1. **Memory Leaks:** Sempre use Cleanup Functions no `useEffect` para cancelar temporizadores (setTimeout) e inscrições, prevenindo memory leaks.
2. **Ciclo de Vida:** Evite Stale Closures garantindo que todas as variáveis usadas dentro de `useCallback` e `useMemo` estejam no array de dependências.
3. **UX Feedback:** Sempre implemente tratamentos visuais (ex: states de `isLoading` e tratamento no `onError` do React Query).
