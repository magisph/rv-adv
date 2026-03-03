import React, { useState, useEffect } from "react";
import { notificationService, notificationServiceSupabase } from "@/modules/periciapro/services/notificationServiceSupabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  AlertCircle,
  Calendar,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";

const priorityColors = {
  low: "bg-blue-50 border-blue-200 text-blue-900",
  medium: "bg-yellow-50 border-yellow-200 text-yellow-900",
  high: "bg-orange-50 border-orange-200 text-orange-900",
  critical: "bg-red-50 border-red-200 text-red-900",
};

const priorityIcons = {
  low: <Bell className="w-4 h-4" />,
  medium: <AlertCircle className="w-4 h-4" />,
  high: <AlertCircle className="w-4 h-4" />,
  critical: <AlertCircle className="w-4 h-4 animate-pulse" />,
};

export default function NotificationBell({ userEmail }) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  // Subscribe to Realtime notifications on mount
  useEffect(() => {
    let unsubscribe = null;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      unsubscribe = notificationServiceSupabase.subscribeToUserNotifications(
        user.id,
        (newNotification) => {
          // Invalidate the query cache so react-query refetches
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      );
    };

    setupRealtime();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [queryClient]);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", userEmail],
    queryFn: () => notificationService.listForCurrentUser(),
    initialData: [],
    enabled: !!userEmail,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifications = notifications.filter((n) => !n.is_read);
      await Promise.all(
        unreadNotifications.map((n) => notificationService.markAsRead(n.id)),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => notificationService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = (notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-slate-100"
        >
          <Bell className="w-5 h-5 text-slate-700" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold text-slate-900">Notificações</h3>
            <p className="text-xs text-slate-500">
              {unreadCount} não {unreadCount === 1 ? "lida" : "lidas"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="text-xs"
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Bell className="w-12 h-12 opacity-50 mb-3" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                    !notification.is_read ? "bg-blue-50/50" : ""
                  }`}
                  onClick={() => handleMarkAsRead(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg border ${priorityColors[notification.priority]}`}
                    >
                      {priorityIcons[notification.priority]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4
                          className={`text-sm font-semibold ${
                            !notification.is_read
                              ? "text-slate-900"
                              : "text-slate-600"
                          }`}
                        >
                          {notification.title}
                        </h4>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-red-100 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotificationMutation.mutate(notification.id);
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {notification.event_date &&
                            format(
                              new Date(notification.event_date),
                              "dd/MM/yyyy",
                              { locale: ptBR },
                            )}
                        </div>
                        {notification.days_until !== undefined && (
                          <Badge variant="outline" className="text-xs">
                            {notification.days_until}{" "}
                            {notification.days_until === 1 ? "dia" : "dias"}
                          </Badge>
                        )}
                        <span className="ml-auto">
                          {format(
                            new Date(notification.created_date),
                            "dd/MM HH:mm",
                            { locale: ptBR },
                          )}
                        </span>
                      </div>
                      {!notification.is_read && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-blue-600">
                          <div className="w-2 h-2 rounded-full bg-blue-600" />
                          Não lida
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
