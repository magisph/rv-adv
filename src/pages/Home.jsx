import React from "react";

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
import TasksWidget from "@/components/dashboard/TasksWidget";
import InssEmailsWidget from "@/components/dashboard/InssEmailsWidget";
import CalendarWidget from "@/components/calendar/CalendarWidget";
import DiarioAtendimentosWidget from "@/components/dashboard/DiarioAtendimentosWidget";
import { motion } from "framer-motion";
export default function Home() {
  // Dashboard: carregar apenas últimos 10 de cada para performance
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

      {/* E-mails INSS - Layout completo */}
      <InssEmailsWidget />

      {/* Prazos da Semana */}
      <DeadlinesWidget deadlines={deadlines} isLoading={loadingDeadlines} />

      {/* Diário de Atendimentos Widget (Substituindo Próximos Eventos) */}
      <DiarioAtendimentosWidget />
    </div>
  );
}
