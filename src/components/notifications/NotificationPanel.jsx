import React, { useState } from "react";
import { base44 } from "@/lib/adapters/legacyBase44";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Calendar,
  FolderOpen,
  Settings,
  Search,
  MoreVertical,
  Check,
  Trash2,
  Archive,
  X,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const PRIORITY_CONFIG = {
  urgente: {
    icon: "🔴",
    label: "URGENTE",
    color: "bg-red-100 text-red-700 border-red-200",
    badgeColor: "bg-red-600",
  },
  importante: {
    icon: "⚠️",
    label: "IMPORTANTE",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    badgeColor: "bg-orange-600",
  },
  informativa: {
    icon: "ℹ️",
    label: "INFO",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    badgeColor: "bg-blue-600",
  },
  sucesso: {
    icon: "✅",
    label: "SUCESSO",
    color: "bg-green-100 text-green-700 border-green-200",
    badgeColor: "bg-green-600",
  },
};

const TYPE_ICONS = {
  prazo: Calendar,
  tarefa: CheckCircle2,
  agendamento: Clock,
  processo: FolderOpen,
  documento: FileText,
  sistema: Bell,
  alerta: AlertCircle,
};

export default function NotificationPanel({ user, onClose }) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.email],
    queryFn: () =>
      base44.entities.Notification.filter({ user_email: user.email }),
    enabled: !!user?.email,
    refetchInterval: 10000, // Atualiza a cada 10 segundos
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => queryClient.invalidateQueries(["notifications"]),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter((n) => !n.read);
      await Promise.all(
        unread.map((n) =>
          base44.entities.Notification.update(n.id, { read: true }),
        ),
      );
    },
    onSuccess: () => queryClient.invalidateQueries(["notifications"]),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["notifications"]),
  });

  const clearReadMutation = useMutation({
    mutationFn: async () => {
      const read = notifications.filter((n) => n.read);
      await Promise.all(
        read.map((n) => base44.entities.Notification.delete(n.id)),
      );
    },
    onSuccess: () => queryClient.invalidateQueries(["notifications"]),
  });

  const handleNotificationClick = (notification) => {
    markAsReadMutation.mutate(notification.id);
    if (notification.link) {
      navigate(notification.link);
      onClose?.();
    }
  };

  // Filtrar notificações
  const filteredNotifications = notifications
    .filter((n) => {
      const matchesSearch =
        !search ||
        n.title?.toLowerCase().includes(search.toLowerCase()) ||
        n.message?.toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "unread" && !n.read) ||
        (activeFilter === "prazo" && n.type === "prazo") ||
        (activeFilter === "tarefa" && n.type === "tarefa") ||
        (activeFilter === "agendamento" && n.type === "compromisso") ||
        (activeFilter === "processo" && n.type === "movimentacao");

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      // Ordenar por: não lidas primeiro, depois por prioridade, depois por data
      if (a.read !== b.read) return a.read ? 1 : -1;

      const priorityOrder = {
        urgente: 0,
        importante: 1,
        informativa: 2,
        sucesso: 3,
      };
      const aPriority = priorityOrder[a.priority] ?? 4;
      const bPriority = priorityOrder[b.priority] ?? 4;

      if (aPriority !== bPriority) return aPriority - bPriority;

      return new Date(b.created_date) - new Date(a.created_date);
    });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const NotificationItem = ({ notification }) => {
    const priorityConfig =
      PRIORITY_CONFIG[notification.priority] || PRIORITY_CONFIG.informativa;
    const TypeIcon = TYPE_ICONS[notification.type] || Bell;

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -10 }}
        className={`p-3 border-b last:border-b-0 hover:bg-slate-50 transition-colors ${
          !notification.read ? "bg-blue-50/50" : ""
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-full ${priorityConfig.color} flex items-center justify-center`}
          >
            <TypeIcon className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base">{priorityConfig.icon}</span>
                <Badge
                  variant="outline"
                  className={`${priorityConfig.color} text-xs font-semibold`}
                >
                  {priorityConfig.label}
                </Badge>
                {!notification.read && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full" />
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!notification.read && (
                    <DropdownMenuItem
                      onClick={() => markAsReadMutation.mutate(notification.id)}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Marcar como lida
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => deleteMutation.mutate(notification.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <button
              onClick={() => handleNotificationClick(notification)}
              className="text-left w-full"
            >
              <h4
                className={`font-semibold text-sm ${!notification.read ? "text-slate-900" : "text-slate-700"}`}
              >
                {notification.title}
              </h4>
              <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                {notification.message}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-slate-400">
                  {formatDistanceToNow(new Date(notification.created_date), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
                {notification.link && (
                  <Badge variant="outline" className="text-xs">
                    Ver detalhes
                  </Badge>
                )}
              </div>
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="w-[450px] max-w-[95vw] bg-white rounded-lg shadow-2xl border">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-slate-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-slate-700" />
            <h3 className="font-semibold text-slate-800">Notificações</h3>
            {unreadCount > 0 && (
              <Badge className="bg-red-600 text-white">{unreadCount}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={unreadCount === 0}
              title="Marcar todas como lidas"
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearReadMutation.mutate()}
              title="Limpar lidas"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar notificações..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-2 border-b bg-slate-50 overflow-x-auto">
        <div className="flex gap-2">
          <Button
            variant={activeFilter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveFilter("all")}
            className="text-xs"
          >
            Todas
          </Button>
          <Button
            variant={activeFilter === "unread" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveFilter("unread")}
            className="text-xs"
          >
            Não Lidas
          </Button>
          <Button
            variant={activeFilter === "prazo" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveFilter("prazo")}
            className="text-xs"
          >
            Prazos
          </Button>
          <Button
            variant={activeFilter === "tarefa" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveFilter("tarefa")}
            className="text-xs"
          >
            Tarefas
          </Button>
          <Button
            variant={activeFilter === "agendamento" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveFilter("agendamento")}
            className="text-xs"
          >
            Agendamentos
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <ScrollArea className="h-[500px]">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Bell className="w-12 h-12 mb-3 text-slate-300" />
            <p className="text-sm">
              {search
                ? "Nenhuma notificação encontrada"
                : "Nenhuma notificação"}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
              />
            ))}
          </AnimatePresence>
        )}
      </ScrollArea>
    </div>
  );
}
