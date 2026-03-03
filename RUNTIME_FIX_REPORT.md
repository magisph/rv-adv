# 🐛 RUNTIME FIX REPORT

**Data:** 2026-03-03 | **Build:** ✅ 3942 modules, exit 0

---

## 1. CRÍTICO: Cadastro de Clientes — Botão Bloqueado

**Causa raiz:** `CadastroCliente.jsx:66-72`  
A função `createMutation.mutationFn` enviava o objeto completo (incluindo o array `pagamentos`) diretamente para `periciaService.create(data)`, que executa `supabase.from('pericias').insert(payload)`.  

A tabela `pericias` **não possui** a coluna `pagamentos` — os pagamentos vivem na tabela normalizada `pericia_pagamentos`. O Supabase rejeitava o INSERT com erro de coluna desconhecida, o que fazia o `useMutation` entrar em estado de erro, bloqueando o botão sem feedback visível.

**Correção:**
```diff
- const nova = await periciaService.create(data);
+ const { pagamentos, ...periciaData } = data;
+ const nova = await periciaService.create(periciaData);
+ if (pagamentos?.length > 0) {
+   await periciaService.upsertPagamentos(nova.id, pagamentos);
+ }
```

Adicionado `onError` com `useToast` para feedback visual de erros.

---

## 2. Manifest.json — Syntax Error

**Causa raiz:** `index.html:11` — `<link rel="manifest" href="/manifest.json" />`  
Nenhum arquivo `manifest.json` existia no projeto. O Vite SPA fallback servia o `index.html` como resposta para `/manifest.json`, causando "Syntax error Line 1, column 1" no console.

**Correção:** Removida a tag `<link rel="manifest">`. Também removidos: favicon Base44 (`base44.com/logo_v2.svg`) e título "Base44 APP".

---

## 3. React Router — Future Flags Warnings

**Causa raiz:** `App.jsx:127` — `<Router>` sem flags de v7.

**Correção:**
```diff
- <Router>
+ <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
```

---

## 4. Estado — Validação de Hooks

Nenhum problema identificado. Os hooks `useState`, `useMutation`, e `useQueryClient` inicializam corretamente com valores não-nulos. O array `pagamentos` inicia como `[]` (nunca `null`).
