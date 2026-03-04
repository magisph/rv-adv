import { useEffect } from "react";
import { deadlineService, taskService, appointmentService, notificationService } from "@/services";
import { useQuery } from "@tanstack/react-query";
import { differenceInDays, isToday, isPast, addHours } from "date-fns";

/**
 * Componente que monitora e cria notificações automáticas
 * baseadas em prazos, tarefas e agendamentos
 */
export default function NotificationMonitor({ user }) {
  // Buscar dados que precisam de monitoramento
  const { data: deadlines = [] } = useQuery({
    queryKey: ["monitor-deadlines"],
    queryFn: () => deadlineService.filter({ status: "pendente" }),
    enabled: !!user,
    refetchInterval: 60000, // Verificar a cada 1 minuto
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["monitor-tasks"],
    queryFn: () =>
      taskService.filter({
        assigned_to: user?.email,
        status: { $ne: "done" },
      }),
    enabled: !!user,
    refetchInterval: 60000,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["monitor-appointments"],
    queryFn: () => appointmentService.filter({ status: "agendado" }),
    enabled: !!user,
    refetchInterval: 60000,
  });

  // Monitorar prazos
  useEffect(() => {
    if (!user || !deadlines.length) return;

    const checkDeadlines = async () => {
      for (const deadline of deadlines) {
        if (!deadline.due_date) continue;

        const dueDate = new Date(deadline.due_date);
        const today = new Date();
        const daysUntil = differenceInDays(dueDate, today);

        // Verificar se já existe notificação para este prazo hoje
        const existingNotifications = await notificationService.filter(
          {
            user_email: deadline.responsible_email || user?.email,
            related_id: deadline.id,
            type: "prazo",
          },
        );

        const hasNotificationToday = existingNotifications.some((n) =>
          isToday(new Date(n.created_date)),
        );

        if (hasNotificationToday) continue;

        // Criar notificação baseada nos dias até o vencimento
        const shouldNotify =
          daysUntil === 7 ||
          daysUntil === 3 ||
          daysUntil === 1 ||
          daysUntil === 0 ||
          (daysUntil < 0 && !isPast(addHours(dueDate, 24)));

        if (shouldNotify) {
          const priority =
            daysUntil <= 0
              ? "urgente"
              : daysUntil <= 2
                ? "urgente"
                : daysUntil <= 7
                  ? "importante"
                  : "informativa";

          await notificationService.create({
            user_email: deadline.responsible_email || user?.email,
            type: "prazo",
            priority: priority,
            title:
              daysUntil <= 0
                ? "🔴 Prazo Vencendo HOJE"
                : `Prazo vence em ${daysUntil} dia(s)`,
            message: `${deadline.description} - Processo: ${deadline.process_number || "N/A"}`,
            link: `/process-detail?id=${deadline.process_id}`,
            related_id: deadline.id,
          });
        }
      }
    };

    checkDeadlines();
  }, [deadlines, user]);

  // Monitorar tarefas
  useEffect(() => {
    if (!user || !tasks.length) return;

    const checkTasks = async () => {
      for (const task of tasks) {
        if (!task.due_date) continue;

        const dueDate = new Date(task.due_date);
        const now = new Date();
        const hoursUntil = Math.floor((dueDate - now) / (1000 * 60 * 60));
        const daysUntil = differenceInDays(dueDate, now);

        // Verificar se já existe notificação
        const existingNotifications = await notificationService.filter(
          {
            user_email: task.assigned_to,
            related_id: task.id,
            type: "tarefa",
          },
        );

        const hasRecentNotification = existingNotifications.some((n) => {
          const notifDate = new Date(n.created_date);
          return now - notifDate < 6 * 60 * 60 * 1000; // Últimas 6 horas
        });

        if (hasRecentNotification) continue;

        // Notificar em momentos específicos
        const shouldNotify =
          (daysUntil === 1 && hoursUntil <= 24) || // 1 dia antes
          hoursUntil === 1 || // 1 hora antes
          daysUntil < 0; // Atrasada

        if (shouldNotify) {
          const priority =
            daysUntil < 0
              ? "urgente"
              : hoursUntil <= 1
                ? "urgente"
                : task.priority === "urgente"
                  ? "urgente"
                  : "importante";

          const title =
            daysUntil < 0
              ? "🔴 Tarefa Atrasada"
              : hoursUntil <= 1
                ? "⚠️ Tarefa vence em 1 hora"
                : "Tarefa vence em 1 dia";

          await notificationService.create({
            user_email: task.assigned_to,
            type: "tarefa",
            priority: priority,
            title: title,
            message: `${task.title}${task.client_name ? ` - Cliente: ${task.client_name}` : ""}`,
            link: `/tasks`,
            related_id: task.id,
          });
        }
      }
    };

    checkTasks();
  }, [tasks, user]);

  // Monitorar agendamentos
  useEffect(() => {
    if (!user || !appointments.length) return;

    const checkAppointments = async () => {
      for (const appointment of appointments) {
        if (!appointment.date) continue;

        const appointmentDate = new Date(appointment.date);
        const now = new Date();
        const hoursUntil = Math.floor(
          (appointmentDate - now) / (1000 * 60 * 60),
        );
        const minutesUntil = Math.floor((appointmentDate - now) / (1000 * 60));
        const daysUntil = differenceInDays(appointmentDate, now);

        // Verificar se já existe notificação recente
        const existingNotifications = await notificationService.filter(
          {
            user_email: user?.email,
            related_id: appointment.id,
            type: "compromisso",
          },
        );

        const hasRecentNotification = existingNotifications.some((n) => {
          const notifDate = new Date(n.created_date);
          return now - notifDate < 30 * 60 * 1000; // Últimos 30 minutos
        });

        if (hasRecentNotification) continue;

        // Notificar em momentos específicos
        const shouldNotify =
          (daysUntil === 1 && hoursUntil <= 24) || // 1 dia antes
          hoursUntil === 1 || // 1 hora antes
          minutesUntil === 15; // 15 minutos antes

        if (shouldNotify) {
          const priority = minutesUntil <= 15 ? "urgente" : "importante";

          const title =
            minutesUntil <= 15
              ? "🔴 Agendamento em 15 minutos"
              : hoursUntil === 1
                ? "⚠️ Agendamento em 1 hora"
                : "Agendamento amanhã";

          await notificationService.create({
            user_email: user?.email,
            type: "compromisso",
            priority: priority,
            title: title,
            message: `${appointment.title} - ${appointment.client_name}`,
            link: `/client-detail?id=${appointment.client_id}`,
            related_id: appointment.id,
          });
        }
      }
    };

    checkAppointments();
  }, [appointments, user]);

  return null; // Componente invisível
}
