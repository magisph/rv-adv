import React from "react";
import { base44 } from "@/lib/adapters/legacyBase44";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  FolderOpen,
  Calendar,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import DeadlinesWidget from "@/components/dashboard/DeadlinesWidget";
import TasksWidget from "@/components/dashboard/TasksWidget";
import CalendarWidget from "@/components/calendar/CalendarWidget";
import { motion } from "framer-motion";

export default function Home() {
  // Cache do usuário compartilhado com Layout
  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    retry: false,
  });

  // Dashboard: carregar apenas últimos 10 de cada para performance
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date", 10),
    staleTime: 2 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  const { data: processes = [], isLoading: loadingProcesses } = useQuery({
    queryKey: ["processes"],
    queryFn: () => base44.entities.Process.list("-created_date", 10),
    staleTime: 2 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  const { data: deadlines = [], isLoading: loadingDeadlines } = useQuery({
    queryKey: ["deadlines"],
    queryFn: () =>
      base44.entities.Deadline.filter({ status: "pendente" }, "-due_date", 20),
    staleTime: 1 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
  });

  const activeProcesses = processes.filter((p) => p.status === "ativo").length;
  const activeClients = clients.filter((c) => c.status === "ativo").length;
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
            Bem-vindo ao LegalFlow
          </h1>
          <p className="text-slate-500 mt-1">Visão geral do seu escritório</p>
        </div>
        {urgentDeadlines > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-red-700 font-medium">
              {urgentDeadlines} prazo(s) urgente(s)
            </span>
          </div>
        )}
      </motion.div>

      {/* Stats Grid - Visão Geral */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
      </div>

      {/* Quadro de Tarefas - Layout completo */}
      <TasksWidget />

      {/* Prazos da Semana */}
      <DeadlinesWidget deadlines={deadlines} isLoading={loadingDeadlines} />

      {/* Próximos Eventos */}
      <CalendarWidget user={user} />
    </div>
  );
}
