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

// PericiaPro module pages — carregadas sob demanda (code splitting)
// Reduz o bundle inicial excluindo o módulo PericiaPro até a primeira navegação
const PericiasDashboard = React.lazy(() => import("@/modules/periciapro/pages/Dashboard"));
const PericiasCadastro  = React.lazy(() => import("@/modules/periciapro/pages/CadastroCliente"));
const PericiasCalendario = React.lazy(() => import("@/modules/periciapro/pages/Calendario"));
const PericiasAlertas   = React.lazy(() => import("@/modules/periciapro/pages/Alertas"));
const PericiasDetalhes  = React.lazy(() => import("@/modules/periciapro/pages/DetalhesCliente"));

/** Spinner exibido enquanto o chunk lazy está sendo carregado */
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
  </div>
);

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

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } =
    useAuth();

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
      // Redirect to login automatically
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

      {/* PericiaPro Module Routes — cada rota envolve o componente lazy em Suspense */}
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
