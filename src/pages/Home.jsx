import React, { Suspense } from "react";

import { clientService, processService, deadlineService } from "@/services";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  FolderOpen,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import DeadlinesWidget from "@/components/dashboard/DeadlinesWidget";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy Load dos widgets pesados
const TasksWidget = React.lazy(() =>
  import("@/components/dashboard/TasksWidget").then((mod) => ({
    default: mod.default,
  }))
);

const InssEmailsWidget = React.lazy(() =>
  import("@/components/dashboard/InssEmailsWidget").then((mod) => ({
    default: mod.default,
  }))
);

const DiarioAtendimentosWidget = React.lazy(() =>
  import("@/components/dashboard/DiarioAtendimentosWidget").then((mod) => ({
    default: mod.default,
  }))
);

// Skeleton para widgets lazy
const WidgetSkeleton = ({ height = "h-64" }) => (
  <Card className="border-0 shadow-sm">
    <CardHeader className="pb-3">
      <Skeleton className="h-6 w-40" />
    </CardHeader>
    <CardContent>
      <Skeleton className={`${height} w-full`} />
    </CardContent>
  </Card>
);

// Skeleton para StatsCard
const StatsCardSkeleton = () => (
  <Card className="border-0 shadow-sm">
    <CardContent className="p-4">
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-8 w-16" />
    </CardContent>
  </Card>
);

export default function Home() {
  // Dashboard: carregar apenas últimos 10 de cada para performance
  // Queries síncronas para dados críticos do header
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["clients", { status: "ativo" }],
    queryFn: () => clientService.filter({ status: "ativo" }, "-created_at", 10),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: processes = [], isLoading: loadingProcesses } = useQuery({
    queryKey: ["processes", { status: "ativo" }],
    queryFn: () => processService.filter({ status: "ativo" }, "-created_at", 10),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: deadlines = [], isLoading: loadingDeadlines } = useQuery({
    queryKey: ["deadlines"],
    queryFn: () =>
      deadlineService.filter({ status: "pendente" }, "-due_date", 20),
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const activeProcesses = processes.length;
  const activeClients = clients.length;
  const pendingDeadlines = deadlines.filter(
    (d) => d.status === "pendente",
  ).length;
  const urgentDeadlines = deadlines.filter((d) => {
    if (d.status !== "pendente") return false;
    const diff = Math.ceil(
      (new Date(d.due_date) - new Date()) / (1000 * 60 * 60 * 24),
    );
    return diff <= 2;
  }).length;

  // Loading states para stats
  const isLoadingStats = loadingClients || loadingProcesses;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">
            Sistema RV Advocacia
          </h1>
          <p className="text-slate-600 mt-1">Visão geral do seu escritório</p>
        </div>
        {urgentDeadlines > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-500" aria-hidden="true" />
            <span className="text-red-700 font-medium">
              {urgentDeadlines} prazo(s) urgente(s)
            </span>
          </div>
        )}
      </motion.div>

      {/* Stats Grid - Visão Geral (carregamento prioritário) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoadingStats ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <StatsCard
              title="Clientes Ativos"
              value={activeClients}
              icon={Users}
              color="blue"
              trend={`${clients.length} total`}
              trendUp
            />
            <StatsCard
              title="Processos Ativos"
              value={activeProcesses}
              icon={FolderOpen}
              color="green"
              trend={`${processes.length} total`}
              trendUp
            />
            <StatsCard
              title="Prazos Pendentes"
              value={pendingDeadlines}
              icon={Calendar}
              color="purple"
            />
            <StatsCard
              title="Prazos Urgentes"
              value={urgentDeadlines}
              icon={AlertTriangle}
              color="red"
            />
          </>
        )}
      </div>

      {/* Widgets lazy-loaded com Suspense */}
      
      {/* Quadro de Tarefas - Lazy loaded */}
      <Suspense
        fallback={
          <WidgetSkeleton height="h-96" />
        }
      >
        <TasksWidget />
      </Suspense>

      {/* E-mails INSS - Lazy loaded */}
      <Suspense
        fallback={
          <WidgetSkeleton height="h-64" />
        }
      >
        <InssEmailsWidget />
      </Suspense>

      {/* Prazos da Semana - Componente crítico, carregamento prioritário */}
      <DeadlinesWidget deadlines={deadlines} isLoading={loadingDeadlines} />

      {/* Diário de Atendimentos - Lazy loaded */}
      <Suspense
        fallback={
          <WidgetSkeleton height="h-64" />
        }
      >
        <DiarioAtendimentosWidget />
      </Suspense>
    </div>
  );
}
