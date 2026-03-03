# 🔌 FRONTEND WIRING REPORT — PericiaPro → RV-Adv

**Data:** 2026-03-03 | **Engenheiro:** Loki Mode (Frontend Sênior)
**Build:** ✅ 3942 modules, exit 0

---

## 1. Rotas Registradas (`App.jsx`)

| Rota | Componente | currentPageName |
|------|-----------|-----------------|
| `/pericias/painel` | `PericiasDashboard` | `pericias-painel` |
| `/pericias/cadastro` | `PericiasCadastro` | `pericias-cadastro` |
| `/pericias/calendario` | `PericiasCalendario` | `pericias-calendario` |
| `/pericias/alertas` | `PericiasAlertas` | `pericias-alertas` |
| `/pericias/detalhes/:id` | `PericiasDetalhes` | `pericias-detalhes` |

Imports adicionados com nomes prefixados (`PericiasDashboard`, etc.) para evitar colisão com o `Home` Dashboard do sistema base.

---

## 2. Sidebar (`Layout.jsx`)

- Adicionado separador visual (`border-t`) entre nav principal e módulo
- Grupo colapsável **"Perícias"** com ícone `Stethoscope` (dourado quando ativo)
- Sub-links: **Painel** (`LayoutDashboard`), **Cadastro** (`UserPlus`), **Calendário** (`CalendarDays`), **Alertas** (`BellRing`)
- Rota `/pericias/detalhes/:id` não aparece no menu (acesso via tabela)
- Auto-expande quando `currentPageName` começa com `"pericias-"`
- Ícones importados: `ChevronRight`, `Stethoscope`, `UserPlus`, `CalendarDays`, `BellRing`
- Removidos imports não-usados: `lazy`, `Suspense`

---

## 3. Correções de Navegação Interna

| Arquivo | Antes | Depois |
|---------|-------|--------|
| `CadastroCliente.jsx:99,241` | `navigate(createPageUrl("Dashboard"))` | `navigate("/pericias/painel")` |
| `PericiaTable.jsx:125` | `navigate(createPageUrl("DetalhesCliente") + "?id=...")` | `navigate("/pericias/detalhes/${id}")` |
| `PericiaTable.jsx:314` | mesma mudança (botão de ação) | `navigate("/pericias/detalhes/${id}")` |
| `DetalhesCliente.jsx:18` | `useNavigate` only | `useNavigate, useParams` |
| `DetalhesCliente.jsx:29-30` | `URLSearchParams.get("id")` | `useParams().id` |

---

## 4. Checklist de QA

- [x] Rotas registradas sem conflito com sistema base
- [x] Imports prefixados (`PericiasDashboard` vs `Home`)
- [x] Sidebar com grupo colapsável e ícones corretos
- [x] Detalhes usa `useParams()` (`:id` param) em vez de `?id=` query
- [x] Navegação interna prefixada com `/pericias/`
- [x] Build passa: 3942 modules, exit 0
