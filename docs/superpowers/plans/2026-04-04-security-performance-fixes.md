# Security and Performance Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement critical security, performance, and best-practice corrections identified in the RV-Adv code review, including securing the local scraper connection, encrypting client passwords, fixing RLS inconsistencies, and improving React performance.

**Architecture:** We will replace hardcoded HTTP IPs with environment variables, expand `pgcrypto` to the `clients` table, align JWT RLS claims to use `user_role` consistently, implement pagination in `BaseService`, and add mathematical CPF validation to the Zod schemas.

**Tech Stack:** React 18, Vite, Supabase (PostgreSQL, Edge Functions), Zod, Node.js (Scraper)

---

### Task 1: Secure Local Scraper Communication

**Files:**
- Modify: `src/services/scraperService.js`
- Modify: `.env.example`
- Modify: `local-scraper/server.ts`

- [ ] **Step 1: Update frontend environment variables**

Update `.env.example` to include the new variable.

```env
# Add this under AIOX Core Configuration or Custom Configuration
VITE_SCRAPER_URL=http://localhost:3001
```

- [ ] **Step 2: Update scraperService.js to use environment variables**

Modify `src/services/scraperService.js` to replace the hardcoded IP with the environment variable.

```javascript
/**
 * scraperService.js
 * Comunicação HTTP com o servidor local de scraping.
 */
const SCRAPER_BASE_URL = import.meta.env.VITE_SCRAPER_URL || 'http://localhost:3001';

async function handleResponse(response) {
```

- [ ] **Step 3: Secure the DataJud API Key in local-scraper**

Modify `local-scraper/server.ts` to use an environment variable instead of a hardcoded key.

```typescript
// ─── CNJ APIs Config (DataJud + DJEN) ───────────────────────────────
const DATAJUD_API_KEY = process.env.DATAJUD_API_KEY || '';
if (!DATAJUD_API_KEY) {
  console.warn('⚠️ DATAJUD_API_KEY não configurada no ambiente local-scraper.');
}
const DATAJUD_BASE = 'https://api-publica.datajud.cnj.jus.br';
```

- [ ] **Step 4: Update local-scraper/.env.example**

Create or update `local-scraper/.env.example` to include the API key template.

```env
# Credenciais PJe (preenchidas automaticamente via /configurar/mni)
PJE_CPF=
PJE_SENHA=

# CNJ API
DATAJUD_API_KEY=APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==
```

- [ ] **Step 5: Commit**

```bash
git add src/services/scraperService.js .env.example local-scraper/server.ts local-scraper/.env.example
git commit -m "fix(security): remove hardcoded scraper IP and DataJud API key"
```

### Task 2: Encrypt Client Passwords in Database

**Files:**
- Create: `supabase/migrations/043_encrypt_clients_passwords.sql`

- [ ] **Step 1: Create the migration file for clients table encryption**

Create `supabase/migrations/043_encrypt_clients_passwords.sql` with the following content:

```sql
-- =====================================================================
-- Migration 043: Criptografia dos campos senha_meu_inss e senha_gov na tabela clients
-- =====================================================================

-- 1. Adicionar colunas criptografadas (bytea)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS senha_meu_inss_encrypted bytea;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS senha_gov_encrypted bytea;

-- 2. Migrar dados existentes
DO $$
DECLARE
  encryption_key text;
BEGIN
  SELECT coalesce(
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'senha_inss_key' LIMIT 1),
    'CHANGE_ME_USE_VAULT'
  ) INTO encryption_key;

  -- Criptografar senha_meu_inss
  UPDATE public.clients
  SET senha_meu_inss_encrypted = pgp_sym_encrypt(senha_meu_inss, encryption_key)
  WHERE senha_meu_inss IS NOT NULL
    AND senha_meu_inss != ''
    AND senha_meu_inss != '***ENCRYPTED***'
    AND senha_meu_inss_encrypted IS NULL;

  -- Criptografar senha_gov
  UPDATE public.clients
  SET senha_gov_encrypted = pgp_sym_encrypt(senha_gov, encryption_key)
  WHERE senha_gov IS NOT NULL
    AND senha_gov != ''
    AND senha_gov != '***ENCRYPTED***'
    AND senha_gov_encrypted IS NULL;
END $$;

-- 3. Trigger para criptografar automaticamente
CREATE OR REPLACE FUNCTION public.encrypt_clients_senhas_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.senha_meu_inss IS NOT NULL AND NEW.senha_meu_inss != '' AND NEW.senha_meu_inss != '***ENCRYPTED***' THEN
    NEW.senha_meu_inss_encrypted = encrypt_senha_inss(NEW.senha_meu_inss);
    NEW.senha_meu_inss = '***ENCRYPTED***';
  END IF;

  IF NEW.senha_gov IS NOT NULL AND NEW.senha_gov != '' AND NEW.senha_gov != '***ENCRYPTED***' THEN
    NEW.senha_gov_encrypted = encrypt_senha_inss(NEW.senha_gov);
    NEW.senha_gov = '***ENCRYPTED***';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS clients_encrypt_senhas ON public.clients;
CREATE TRIGGER clients_encrypt_senhas
  BEFORE INSERT OR UPDATE OF senha_meu_inss, senha_gov ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_clients_senhas_trigger();
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/043_encrypt_clients_passwords.sql
git commit -m "feat(security): encrypt clients passwords (senha_meu_inss, senha_gov)"
```

### Task 3: Fix RLS JWT Claim Inconsistencies

**Files:**
- Create: `supabase/migrations/044_fix_rls_jwt_claims.sql`

- [ ] **Step 1: Create the migration file to unify RLS policies**

Create `supabase/migrations/044_fix_rls_jwt_claims.sql` to fix the inconsistency between `role` and `user_role` in JWT claims, aligning with `app_metadata.user_role`.

```sql
-- ==========================================
-- 044_fix_rls_jwt_claims.sql
-- Goal: Unify JWT role claims in RLS policies
-- Description: Fixes policies from migration 037 to use 'user_role' instead of 'role'
-- matching the app_metadata structure defined in migration 028/029.
-- ==========================================

-- 1. Fix Clients Table Policies
DROP POLICY IF EXISTS clients_select_policy ON public.clients;
DROP POLICY IF EXISTS clients_insert_policy ON public.clients;
DROP POLICY IF EXISTS clients_update_policy ON public.clients;
DROP POLICY IF EXISTS clients_delete_policy ON public.clients;

CREATE POLICY clients_select_policy ON public.clients FOR SELECT TO authenticated
USING (auth.uid() = created_by OR coalesce(auth.jwt() ->> 'user_role', auth.jwt() ->> 'role') = 'admin');

CREATE POLICY clients_insert_policy ON public.clients FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by OR coalesce(auth.jwt() ->> 'user_role', auth.jwt() ->> 'role') = 'admin');

CREATE POLICY clients_update_policy ON public.clients FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR coalesce(auth.jwt() ->> 'user_role', auth.jwt() ->> 'role') = 'admin')
WITH CHECK (auth.uid() = created_by OR coalesce(auth.jwt() ->> 'user_role', auth.jwt() ->> 'role') = 'admin');

CREATE POLICY clients_delete_policy ON public.clients FOR DELETE TO authenticated
USING (auth.uid() = created_by OR coalesce(auth.jwt() ->> 'user_role', auth.jwt() ->> 'role') = 'admin');

-- 2. Fix Processes Table Policies
DROP POLICY IF EXISTS processes_select_policy ON public.processes;
DROP POLICY IF EXISTS processes_insert_policy ON public.processes;
DROP POLICY IF EXISTS processes_update_policy ON public.processes;
DROP POLICY IF EXISTS processes_delete_policy ON public.processes;

CREATE POLICY processes_select_policy ON public.processes FOR SELECT TO authenticated
USING (auth.uid() = created_by OR coalesce(auth.jwt() ->> 'user_role', auth.jwt() ->> 'role') = 'admin');

CREATE POLICY processes_insert_policy ON public.processes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by OR coalesce(auth.jwt() ->> 'user_role', auth.jwt() ->> 'role') = 'admin');

CREATE POLICY processes_update_policy ON public.processes FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR coalesce(auth.jwt() ->> 'user_role', auth.jwt() ->> 'role') = 'admin')
WITH CHECK (auth.uid() = created_by OR coalesce(auth.jwt() ->> 'user_role', auth.jwt() ->> 'role') = 'admin');

CREATE POLICY processes_delete_policy ON public.processes FOR DELETE TO authenticated
USING (auth.uid() = created_by OR coalesce(auth.jwt() ->> 'user_role', auth.jwt() ->> 'role') = 'admin');
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/044_fix_rls_jwt_claims.sql
git commit -m "fix(security): unify JWT role claims in RLS policies"
```

### Task 4: Add Mathematical CPF Validation

**Files:**
- Modify: `src/lib/validation/schemas/index.ts`

- [ ] **Step 1: Add the CPF validation function to schemas/index.ts**

Update `src/lib/validation/schemas/index.ts` to include the mathematical validation function and apply it to `cpfCnpjSchema`.

```typescript
import { z } from "zod";

// Re-exporta schemas de segurança existentes
export { 
  MAX_PAYLOAD_SIZE, 
  MAX_UPLOAD_SIZE, 
  ALLOWED_MIME_TYPES, 
  securitySchemas 
} from '../security-schemas.js';

// Função de validação matemática de CPF
function validarCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
  let resto = 11 - (soma % 11);
  let digito1 = resto >= 10 ? 0 : resto;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
  resto = 11 - (soma % 11);
  let digito2 = resto >= 10 ? 0 : resto;

  return parseInt(cpf.charAt(9)) === digito1 && parseInt(cpf.charAt(10)) === digito2;
}

// Função de validação matemática de CNPJ
function validarCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]/g, "");
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return resultado === parseInt(digitos.charAt(1));
}

/**
 * Schema para validação de CPF/CNPJ
 */
const cpfCnpjSchema = z.string()
  .min(11, "CPF/CNPJ deve ter no mínimo 11 caracteres")
  .max(18, "CPF/CNPJ deve ter no máximo 18 caracteres")
  .regex(/^[\d.\-/]+$/, "CPF/CNPJ contém caracteres inválidos")
  .refine((val) => {
    const cleanVal = val.replace(/[^\d]/g, "");
    if (cleanVal.length === 11) return validarCPF(cleanVal);
    if (cleanVal.length === 14) return validarCNPJ(cleanVal);
    return false;
  }, "CPF ou CNPJ inválido");
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/validation/schemas/index.ts
git commit -m "feat(validation): add mathematical CPF/CNPJ validation to zod schema"
```

### Task 5: Implement Pagination in BaseService

**Files:**
- Modify: `src/services/baseService.js`

- [ ] **Step 1: Update list and filter methods to support offset pagination**

Modify `src/services/baseService.js` to add an `offset` parameter to the `list` and `filter` methods.

```javascript
  /**
   * Lista registros com ordenação e paginação opcionais
   * 
   * @param {string} [orderBy='created_at'] - Campo para ordenação (prefixar com "-" para descendente)
   * @param {number} [limit=100] - Limite de registros
   * @param {Object} [filters] - Filtros adicionais { campo: valor }
   * @param {number} [offset=0] - Offset para paginação
   * @returns {Promise<Array>} Lista de registros
   * @throws {Error} Erro mapeado para PT-BR
   */
  async list(orderBy = "created_at", limit = 100, filters = null, offset = 0) {
    let ascending = true;
    let column = orderBy;
    
    // Handle "-field" syntax for descending sort
    if (orderBy && orderBy.startsWith("-")) {
      ascending = false;
      column = orderBy.substring(1);
    }
    
    let query = supabase
      .from(this.table)
      .select("*")
      .order(column, { ascending });
      
    if (limit) {
      query = query.limit(limit);
    }
    
    if (offset > 0) {
      query = query.range(offset, offset + limit - 1);
    }
    
    // Apply additional filters if provided
    if (filters && typeof filters === 'object') {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }
    
    const { data, error } = await query;
    
    if (error) throw mapSupabaseError(error);
    return data;
  }
```

And update the `filter` method:

```javascript
  /**
   * Método genérico de filtro
   * 
   * @param {Object} filters - Objeto com filtros { campo: valor }
   * @param {string} [orderBy='created_at'] - Campo para ordenação
   * @param {number} [limit=100] - Limite de registros
   * @param {number} [offset=0] - Offset para paginação
   * @returns {Promise<Array>} Lista de registros filtrados
   * @throws {Error} Erro mapeado para PT-BR
   */
  async filter(filters, orderBy = "created_at", limit = 100, offset = 0) {
    let query = supabase.from(this.table).select("*");
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });
    
    let ascending = true;
    let column = orderBy;
    if (orderBy && orderBy.startsWith("-")) {
      ascending = false;
      column = orderBy.substring(1);
    }
    
    if (column) {
      query = query.order(column, { ascending });
    }
    
    if (limit) {
      query = query.limit(limit);
    }
    
    if (offset > 0 && limit) {
      query = query.range(offset, offset + limit - 1);
    }
    
    const { data, error } = await query;
    if (error) throw mapSupabaseError(error);
    return data;
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/services/baseService.js
git commit -m "feat(performance): implement offset pagination in baseService"
```

### Task 6: Implement React.lazy in App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Replace static imports with React.lazy in App.jsx**

Modify `src/App.jsx` to dynamically import the PericiaPro module pages and wrap them in a `Suspense` boundary.

```javascript
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import NavigationTracker from "@/lib/NavigationTracker";
import { pagesConfig } from "./pages.config";
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import AuthPage from "./pages/AuthPage";
import React, { Suspense } from "react";

// Lazy loaded PericiaPro module pages
const PericiasDashboard = React.lazy(() => import("@/modules/periciapro/pages/Dashboard"));
const PericiasCadastro = React.lazy(() => import("@/modules/periciapro/pages/CadastroCliente"));
const PericiasCalendario = React.lazy(() => import("@/modules/periciapro/pages/Calendario"));
const PericiasAlertas = React.lazy(() => import("@/modules/periciapro/pages/Alertas"));
const PericiasDetalhes = React.lazy(() => import("@/modules/periciapro/pages/DetalhesCliente"));

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) =>
  Layout ? (
    <Layout currentPageName={currentPageName}>{children}</Layout>
  ) : (
    <>{children}</>
  );

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Loading fallback for Suspense
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    } else if (authError.type === "auth_required") {
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/auth" element={<Navigate to="/login" replace />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <LayoutWrapper currentPageName={mainPageKey}>
              <MainPage />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <ProtectedRoute>
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />
      ))}

      {/* PericiaPro Module Routes with Suspense */}
      <Route
        path="/pericias/painel"
        element={
          <ProtectedRoute>
            <LayoutWrapper currentPageName="pericias-painel">
              <Suspense fallback={<PageLoader />}>
                <PericiasDashboard />
              </Suspense>
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pericias/cadastro"
        element={
          <ProtectedRoute>
            <LayoutWrapper currentPageName="pericias-cadastro">
              <Suspense fallback={<PageLoader />}>
                <PericiasCadastro />
              </Suspense>
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pericias/calendario"
        element={
          <ProtectedRoute>
            <LayoutWrapper currentPageName="pericias-calendario">
              <Suspense fallback={<PageLoader />}>
                <PericiasCalendario />
              </Suspense>
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pericias/alertas"
        element={
          <ProtectedRoute>
            <LayoutWrapper currentPageName="pericias-alertas">
              <Suspense fallback={<PageLoader />}>
                <PericiasAlertas />
              </Suspense>
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pericias/detalhes/:id"
        element={
          <ProtectedRoute>
            <LayoutWrapper currentPageName="pericias-detalhes">
              <Suspense fallback={<PageLoader />}>
                <PericiasDetalhes />
              </Suspense>
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
```

- [ ] **Step 2: Commit**

```bash
git add src/App.jsx
git commit -m "perf(react): implement React.lazy for PericiaPro module to reduce bundle size"
```
