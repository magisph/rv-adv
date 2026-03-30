// Task Widget Constants
// Configurações centralizadas de prioridade e colunas do Kanban

import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

export const PRIORITY_CONFIG = {
  urgente: {
    icon: AlertCircle,
    color: "bg-red-100 text-red-700 border-red-200",
    borderColor: "#dc2626",
    label: "Crítica",
    order: 0,
  },
  alta: {
    icon: AlertCircle,
    color: "bg-orange-100 text-orange-700 border-orange-200",
    borderColor: "#ea580c",
    label: "Alta",
    order: 1,
  },
  media: {
    icon: Clock,
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    borderColor: "#ca8a04",
    label: "Média",
    order: 2,
  },
  baixa: {
    icon: CheckCircle2,
    color: "bg-slate-100 text-slate-600 border-slate-200",
    borderColor: "#64748b",
    label: "Baixa",
    order: 3,
  },
};

export const KANBAN_COLUMNS = {
  todo: {
    id: "todo",
    title: "A Fazer",
    color: "#94a3b8",
    bgColor: "#f1f5f9",
    status: "todo",
  },
  in_progress: {
    id: "in_progress",
    title: "Em Progresso",
    color: "#3b82f6",
    bgColor: "#dbeafe",
    status: "in_progress",
  },
  in_review: {
    id: "in_review",
    title: "Em Revisão",
    color: "#f59e0b",
    bgColor: "#fef3c7",
    status: "in_progress",
  },
  done: {
    id: "done",
    title: "Concluído",
    color: "#10b981",
    bgColor: "#d1fae5",
    status: "done",
  },
};

export const PERIOD_FILTERS = [
  { key: "hoje", label: "Hoje", icon: Clock },
  { key: "esta_semana", label: "Esta Semana", icon: Clock },
  { key: "este_mes", label: "Este Mês", icon: Clock },
  { key: "vencidas", label: "Vencidas", icon: AlertCircle },
  { key: "sem_prazo", label: "Sem Prazo", icon: Clock },
];
