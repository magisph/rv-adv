import React from "react";
import { taskService, appointmentService, deadlineService } from "@/services";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  CheckSquare,
  Clock,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CalendarWidget({ user }) {
  const { data: tasks = [] } = useQuery({
    queryKey: ["calendar-tasks", user?.email],
    queryFn: () =>
      taskService.filter({
        assigned_to: user?.email,
        status: { $ne: "done" },
        due_date: { $ne: null },
      }),
    enabled: !!user?.email,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["calendar-appointments"],
    queryFn: () =>
      appointmentService.filter({
        status: "agendado",
      }),
    enabled: !!user,
  });

  const { data: deadlines = [] } = useQuery({
    queryKey: ["calendar-deadlines"],
    queryFn: () =>
      deadlineService.filter({
        status: "pendente",
      }),
    enabled: !!user,
  });

  // Combinar todos os eventos
  const allEvents = [
    ...tasks.map((t) => ({
      id: t.id,
      type: "task",
      title: t.title,
      date: new Date(t.due_date),
      client: t.client_name,
      priority: t.priority,
    })),
    ...appointments.map((a) => ({
      id: a.id,
      type: "appointment",
      title: a.title,
      date: new Date(a.date),
      client: a.client_name,
      location: a.location,
    })),
    ...deadlines.map((d) => ({
      id: d.id,
      type: "deadline",
      title: d.description,
      date: new Date(d.due_date),
      process: d.process_number,
      priority: d.priority,
    })),
  ].sort((a, b) => a.date - b.date);

  // Filtrar próximos 7 dias
  const upcomingEvents = allEvents
    .filter((e) => {
      const diff = e.date - new Date();
      return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
    })
    .slice(0, 10);

  const getEventIcon = (type) => {
    switch (type) {
      case "task":
        return CheckSquare;
      case "appointment":
        return Clock;
      case "deadline":
        return AlertCircle;
      default:
        return Calendar;
    }
  };

  const getEventColor = (event) => {
    if (event.type === "deadline") {
      const daysUntil = Math.ceil(
        (event.date - new Date()) / (1000 * 60 * 60 * 24),
      );
      if (daysUntil <= 1) return "bg-red-100 text-red-700 border-red-200";
      if (daysUntil <= 3)
        return "bg-orange-100 text-orange-700 border-orange-200";
    }
    if (event.type === "task" && event.priority === "urgente") {
      return "bg-red-100 text-red-700 border-red-200";
    }
    return "bg-blue-100 text-blue-700 border-blue-200";
  };

  const getDateLabel = (date) => {
    if (isToday(date)) return "Hoje";
    if (isTomorrow(date)) return "Amanhã";
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#1e3a5f]" />
            Próximos Eventos
            {upcomingEvents.length > 0 && (
              <Badge variant="outline">{upcomingEvents.length}</Badge>
            )}
          </CardTitle>
          <Link to={createPageUrl("CalendarSettings")}>
            <Button variant="ghost" size="sm">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">Nenhum evento nos próximos dias</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map((event) => {
              const Icon = getEventIcon(event.type);
              return (
                <div
                  key={`${event.type}-${event.id}`}
                  className={`p-3 rounded-lg border ${getEventColor(event)}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="w-4 h-4 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {event.type === "task"
                            ? "Tarefa"
                            : event.type === "appointment"
                              ? "Agendamento"
                              : "Prazo"}
                        </Badge>
                        <span className="text-xs font-semibold">
                          {getDateLabel(event.date)}
                        </span>
                      </div>
                      <p className="font-medium text-sm">{event.title}</p>
                      {event.client && (
                        <p className="text-xs mt-1">Cliente: {event.client}</p>
                      )}
                      {event.process && (
                        <p className="text-xs mt-1">
                          Processo: {event.process}
                        </p>
                      )}
                      {event.location && (
                        <p className="text-xs mt-1">📍 {event.location}</p>
                      )}
                      <p className="text-xs mt-1">
                        ⏰ {format(event.date, "HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
