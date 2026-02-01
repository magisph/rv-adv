import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, AlertTriangle } from "lucide-react";
import { format, differenceInDays, isAfter, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DeadlinesWidget({ deadlines = [], isLoading }) {
  const today = new Date();

  const getDeadlineStatus = (dueDate) => {
    const due = parseISO(dueDate);
    const diff = differenceInDays(due, today);

    if (diff < 0)
      return {
        label: "Vencido",
        color: "bg-red-100 text-red-700 border-red-200",
      };
    if (diff === 0)
      return {
        label: "Hoje",
        color: "bg-orange-100 text-orange-700 border-orange-200",
      };
    if (diff <= 2)
      return {
        label: `${diff}d`,
        color: "bg-amber-100 text-amber-700 border-amber-200",
      };
    if (diff <= 5)
      return {
        label: `${diff}d`,
        color: "bg-blue-100 text-blue-700 border-blue-200",
      };
    return {
      label: `${diff}d`,
      color: "bg-slate-100 text-slate-700 border-slate-200",
    };
  };

  const priorityColors = {
    urgente: "bg-red-500",
    alta: "bg-orange-500",
    media: "bg-blue-500",
    baixa: "bg-slate-400",
  };

  const sortedDeadlines = [...deadlines]
    .filter((d) => d.status === "pendente")
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#1e3a5f]" />
            Prazos da Semana
          </CardTitle>
          <Link
            to={createPageUrl("Deadlines")}
            className="text-sm text-blue-600 hover:underline"
          >
            Ver todos
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-slate-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : sortedDeadlines.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>Nenhum prazo pendente</p>
          </div>
        ) : (
          sortedDeadlines.map((deadline, index) => {
            const status = getDeadlineStatus(deadline.due_date);
            return (
              <motion.div
                key={deadline.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div
                  className={`w-1 h-12 rounded-full ${priorityColors[deadline.priority]}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">
                    {deadline.description}
                  </p>
                  <p className="text-sm text-slate-500 truncate">
                    {deadline.process_number} • {deadline.client_name}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className={status.color}>
                    <Clock className="w-3 h-3 mr-1" />
                    {status.label}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    {format(parseISO(deadline.due_date), "dd MMM", {
                      locale: ptBR,
                    })}
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
