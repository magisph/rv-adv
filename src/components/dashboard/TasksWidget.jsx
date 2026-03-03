import React, { useState, useEffect } from "react";
import { authService } from "@/services/authService";
import { userService, taskService, notificationService } from "@/services";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  RefreshCw,
  ChevronRight,
  Calendar,
  MoreVertical,
  GripVertical,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const PRIORITY_CONFIG = {
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

const KANBAN_COLUMNS = {
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

export default function TasksWidget() {
  const [showForm, setShowForm] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const [quickTaskColumn, setQuickTaskColumn] = useState("todo");
  const [quickTaskPriority, setQuickTaskPriority] = useState("media");
  const [quickTaskDueDate, setQuickTaskDueDate] = useState("");
  const [quickAssignedUser, setQuickAssignedUser] = useState("");
  const [longPressTask, setLongPressTask] = useState(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState(null);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [editingTaskDesc, setEditingTaskDesc] = useState(null);
  const [editDescValue, setEditDescValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [swipingTask, setSwipingTask] = useState(null);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("priority");
  const [viewMode, setViewMode] = useState("my");
  const [userFilters, setUserFilters] = useState({});
  const [periodFilters, setPeriodFilters] = useState({
    hoje: false,
    esta_semana: false,
    este_mes: false,
    vencidas: false,
    sem_prazo: false,
  });
  const [priorityFilters, setPriorityFilters] = useState({
    urgente: true,
    alta: true,
    media: true,
    baixa: true,
  });
  const [user, setUser] = useState(null);
  const [isCollaborativeMode, setIsCollaborativeMode] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await authService.getCurrentUser();
        setUser(userData);

        // Verificar modo colaborativo
        const allUsers = await userService.list();
        setIsCollaborativeMode(allUsers.length > 1);

        // Inicializar filtros de usuário (todos ativos)
        const filters = {};
        allUsers.forEach((u) => {
          filters[u.email] = true;
        });
        setUserFilters(filters);
      } catch (e) {
        console.log("User not logged in");
      }
    };
    loadUser();
  }, []);

  // Buscar usuários para filtros
  const { data: allUsers = [] } = useQuery({
    queryKey: ["all-users"],
    queryFn: () => userService.list(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Buscar tarefas baseado no perfil
  const {
    data: allTasks = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["kanban-tasks", user?.email, user?.role, viewMode],
    queryFn: async () => {
      const isAdmin = user.role === "admin";

      if (isAdmin && viewMode === "all") {
        // Admin visualiza todas as tarefas
        return taskService.list();
      } else {
        // User comum ou admin no modo "minhas"
        return taskService.filter({ assigned_to: user.email });
      }
    },
    enabled: !!user?.email,
    refetchInterval: 30000,
  });

  // Sistema de notificações para tarefas vencendo
  useEffect(() => {
    if (!allTasks.length || !user) return;

    const checkNotifications = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      allTasks.forEach((task) => {
        if (!task.due_date || task.status === "done") return;

        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);

        // Notificar 24h antes
        if (dueDate.getTime() === tomorrow.getTime()) {
          const notificationKey = `notified_${task.id}_24h`;
          const alreadyNotified = localStorage.getItem(notificationKey);

          if (
            !alreadyNotified &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification("Tarefa vence amanhã", {
              body: `"${task.title}" vence em 24 horas`,
              icon: "/icon-192.png",
              tag: task.id,
            });
            localStorage.setItem(notificationKey, "true");
          }
        }
      });
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 60000); // Verificar a cada minuto

    // Solicitar permissão de notificações
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => clearInterval(interval);
  }, [allTasks, user]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => taskService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["kanban-tasks"]);
      queryClient.invalidateQueries(["tasks"]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => taskService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["kanban-tasks"]);
      queryClient.invalidateQueries(["tasks"]);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => taskService.create(data),
    onSuccess: async (task) => {
      queryClient.invalidateQueries(["kanban-tasks"]);
      queryClient.invalidateQueries(["tasks"]);
      setShowForm(false);
      setShowQuickCreate(false);
      setQuickTaskTitle("");

      if (task.assigned_to && user && task.assigned_to !== user.email) {
        await notificationService.create({
          title: "Nova Tarefa Atribuída",
          message: `${task.title}${task.client_name ? ` - Cliente: ${task.client_name}` : ""}`,
          type: "tarefa",
          priority: task.priority === "urgente" ? "urgente" : "importante",
          user_email: task.assigned_to,
          link: "/tasks",
          related_id: task.id,
        });
      }
    },
  });

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    const task = allTasks.find((t) => t.id === draggableId);
    if (!task) return;

    // Verificar permissões
    const isAdmin = user?.role === "admin";
    const isMyTask = task.assigned_to === user?.email;

    if (!isAdmin && !isMyTask) return;

    const newColumn = KANBAN_COLUMNS[destination.droppableId];

    try {
      await updateMutation.mutateAsync({
        id: task.id,
        data: {
          ...task,
          status: newColumn.status,
          kanban_column: destination.droppableId,
        },
      });
    } catch (error) {
      console.error("Erro ao mover tarefa:", error);
    }

    // Notificar admin se user comum concluiu tarefa
    if (!isAdmin && destination.droppableId === "done") {
      const admin = allUsers.find((u) => u.role === "admin");
      if (admin) {
        await notificationService.create({
          title: "Tarefa Concluída",
          message: `${user.full_name} concluiu: "${task.title}"`,
          type: "tarefa",
          user_email: admin.email,
          link: "/tasks",
          related_id: task.id,
        });
      }
    }
  };

  const handleMoveTask = async (task, columnId) => {
    const newColumn = KANBAN_COLUMNS[columnId];
    await updateMutation.mutateAsync({
      id: task.id,
      data: {
        ...task,
        status: newColumn.status,
        kanban_column: columnId,
      },
    });
    setLongPressTask(null);
  };

  const handleQuickCreate = () => {
    if (!quickTaskTitle.trim()) return;

    const isAdmin = user.role === "admin";
    const column = KANBAN_COLUMNS[quickTaskColumn];

    // Determinar responsável
    let assignedEmail = user.email;
    let assignedName = user.full_name;

    if (isAdmin && isCollaborativeMode && quickAssignedUser) {
      const selectedUser = allUsers.find((u) => u.email === quickAssignedUser);
      if (selectedUser) {
        assignedEmail = selectedUser.email;
        assignedName = selectedUser.full_name;
      }
    }

    const taskData = {
      title: quickTaskTitle,
      status: column.status,
      kanban_column: quickTaskColumn,
      assigned_to: assignedEmail,
      assigned_name: assignedName,
      priority: quickTaskPriority,
    };

    if (quickTaskDueDate) {
      taskData.due_date = quickTaskDueDate;
    }

    createMutation.mutate(taskData);
  };

  const handleChangePriority = async (task, newPriority) => {
    // Apenas admin pode mudar prioridade
    if (user.role !== "admin") return;

    await updateMutation.mutateAsync({
      id: task.id,
      data: { ...task, priority: newPriority },
    });
    setLongPressTask(null);
  };

  const togglePriorityFilter = (priority) => {
    setPriorityFilters((prev) => ({
      ...prev,
      [priority]: !prev[priority],
    }));
  };

  const togglePeriodFilter = (period) => {
    setPeriodFilters((prev) => ({
      ...prev,
      [period]: !prev[period],
    }));
  };

  const toggleUserFilter = (userEmail) => {
    setUserFilters((prev) => ({
      ...prev,
      [userEmail]: !prev[userEmail],
    }));
  };

  const clearAllFilters = () => {
    setPriorityFilters({
      urgente: true,
      alta: true,
      media: true,
      baixa: true,
    });
    setPeriodFilters({
      hoje: false,
      esta_semana: false,
      este_mes: false,
      vencidas: false,
      sem_prazo: false,
    });
    setSearchQuery("");
    const filters = {};
    allUsers.forEach((u) => {
      filters[u.email] = true;
    });
    setUserFilters(filters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (Object.values(priorityFilters).some((v) => !v)) count++;
    if (Object.values(periodFilters).some((v) => v)) count++;
    if (Object.values(userFilters).some((v) => !v)) count++;
    if (searchQuery) count++;
    return count;
  };

  const handleDuplicateTask = async (task) => {
    const duplicateData = {
      ...task,
      id: undefined,
      title: `${task.title} (cópia)`,
      status: "todo",
      kanban_column: "todo",
    };
    await createMutation.mutateAsync(duplicateData);
    setLongPressTask(null);
  };

  const handleInlineEditTitle = async (task) => {
    if (!editTitleValue.trim() || editTitleValue === task.title) {
      setEditingTaskTitle(null);
      return;
    }

    await updateMutation.mutateAsync({
      id: task.id,
      data: { ...task, title: editTitleValue },
    });
    setEditingTaskTitle(null);
  };

  const startEditTitle = (task) => {
    const isAdmin = user?.role === "admin";
    const isMyTask = task.assigned_to === user?.email;
    if (!isAdmin && !isMyTask) return;

    setEditingTaskTitle(task.id);
    setEditTitleValue(task.title);
  };

  const handleInlineEditDesc = async (task) => {
    if (editDescValue === task.description) {
      setEditingTaskDesc(null);
      return;
    }

    await updateMutation.mutateAsync({
      id: task.id,
      data: { ...task, description: editDescValue },
    });
    setEditingTaskDesc(null);
  };

  const startEditDesc = (task) => {
    const isAdmin = user?.role === "admin";
    const isMyTask = task.assigned_to === user?.email;
    if (!isAdmin && !isMyTask) return;

    setEditingTaskDesc(task.id);
    setEditDescValue(task.description || "");
  };

  const toggleTaskSelection = (taskId) => {
    const newSelection = new Set(selectedTasks);
    if (newSelection.has(taskId)) {
      newSelection.delete(taskId);
    } else {
      newSelection.add(taskId);
    }
    setSelectedTasks(newSelection);
    if (newSelection.size === 0) {
      setIsSelectionMode(false);
    }
  };

  const handleBulkMove = async (columnId) => {
    const column = KANBAN_COLUMNS[columnId];
    const tasks = allTasks.filter((t) => selectedTasks.has(t.id));

    for (const task of tasks) {
      await updateMutation.mutateAsync({
        id: task.id,
        data: { ...task, status: column.status, kanban_column: columnId },
      });
    }
    setSelectedTasks(new Set());
    setIsSelectionMode(false);
  };

  const handleBulkPriority = async (priority) => {
    if (user.role !== "admin") return;

    const tasks = allTasks.filter((t) => selectedTasks.has(t.id));
    for (const task of tasks) {
      await updateMutation.mutateAsync({
        id: task.id,
        data: { ...task, priority },
      });
    }
    setSelectedTasks(new Set());
    setIsSelectionMode(false);
  };

  const handleBulkAssign = async (userEmail) => {
    if (user.role !== "admin") return;

    const selectedUser = allUsers.find((u) => u.email === userEmail);
    if (!selectedUser) return;

    const tasks = allTasks.filter((t) => selectedTasks.has(t.id));
    for (const task of tasks) {
      await updateMutation.mutateAsync({
        id: task.id,
        data: {
          ...task,
          assigned_to: selectedUser.email,
          assigned_name: selectedUser.full_name,
        },
      });
    }
    setSelectedTasks(new Set());
    setIsSelectionMode(false);
  };

  const handleSwipeAction = async (task, action) => {
    if (action === "complete") {
      await handleMoveTask(task, "done");
    } else if (action === "delete") {
      if (window.confirm("Tem certeza que deseja excluir esta tarefa?")) {
        await deleteMutation.mutateAsync(task.id);
      }
    }
    setSwipingTask(null);
    setSwipeDirection(null);
  };

  const handleReassignTask = async (task, newUserEmail) => {
    const newUser = allUsers.find((u) => u.email === newUserEmail);
    if (!newUser) return;

    await updateMutation.mutateAsync({
      id: task.id,
      data: {
        ...task,
        assigned_to: newUser.email,
        assigned_name: newUser.full_name,
      },
    });

    // Notificar novo responsável
    if (newUser.email !== user.email) {
      await notificationService.create({
        title: "Tarefa Atribuída",
        message: `"${task.title}" foi atribuída a você`,
        type: "tarefa",
        user_email: newUser.email,
        link: "/tasks",
        related_id: task.id,
      });
    }

    setLongPressTask(null);
  };

  // Calcular status temporal de uma tarefa
  const getTemporalStatus = (dueDate) => {
    if (!dueDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        type: "overdue",
        label: `Atrasada ${Math.abs(diffDays)} dia${Math.abs(diffDays) !== 1 ? "s" : ""}`,
        color: "bg-red-100 text-red-700 border-red-200",
        bgColor: "bg-red-50",
        priority: 0,
      };
    } else if (diffDays === 0) {
      return {
        type: "today",
        label: "Vence hoje",
        color: "bg-orange-100 text-orange-700 border-orange-200",
        bgColor: "bg-orange-50",
        priority: 1,
      };
    } else if (diffDays <= 3) {
      return {
        type: "soon",
        label: `Vence em ${diffDays} dia${diffDays !== 1 ? "s" : ""}`,
        color: "bg-yellow-100 text-yellow-700 border-yellow-200",
        bgColor: "",
        priority: 2,
      };
    } else {
      return {
        type: "ok",
        label: `Vence em ${diffDays} dias`,
        color: "bg-slate-100 text-slate-600 border-slate-200",
        bgColor: "",
        priority: 3,
      };
    }
  };

  // Verificar se tarefa passa nos filtros de período
  const passesDateFilter = (task) => {
    const hasActiveFilter = Object.values(periodFilters).some((v) => v);
    if (!hasActiveFilter) return true;

    const dueDate = task.due_date ? new Date(task.due_date) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (periodFilters.sem_prazo && !dueDate) return true;
    if (!dueDate) return false;

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    if (periodFilters.vencidas && due < today) return true;
    if (periodFilters.hoje && due.getTime() === today.getTime()) return true;

    if (periodFilters.esta_semana) {
      const weekEnd = new Date(today);
      weekEnd.setDate(today.getDate() + 7);
      if (due >= today && due <= weekEnd) return true;
    }

    if (periodFilters.este_mes) {
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      if (due >= today && due <= monthEnd) return true;
    }

    return false;
  };

  // Organizar, filtrar e ordenar tarefas
  const tasksByColumn = Object.keys(KANBAN_COLUMNS).reduce((acc, columnId) => {
    const columnTasks = allTasks.filter((task) => {
      const taskColumn =
        task.kanban_column || (task.status === "done" ? "done" : "todo");
      const matchesColumn = taskColumn === columnId;
      const matchesPriority = priorityFilters[task.priority || "media"];
      const matchesDate = passesDateFilter(task);

      // Filtro por usuário (apenas admin)
      const isAdmin = user?.role === "admin";
      const matchesUser =
        !isAdmin ||
        !isCollaborativeMode ||
        userFilters[task.assigned_to] !== false;

      // Filtro de busca por texto
      const matchesSearch =
        !searchQuery ||
        task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.client_name?.toLowerCase().includes(searchQuery.toLowerCase());

      return (
        matchesColumn &&
        matchesPriority &&
        matchesDate &&
        matchesUser &&
        matchesSearch
      );
    });

    // Ordenar por prioridade ou data
    acc[columnId] = columnTasks.sort((a, b) => {
      if (sortBy === "due_date") {
        const statusA = getTemporalStatus(a.due_date);
        const statusB = getTemporalStatus(b.due_date);

        // Sem data vai para o final
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;

        // Ordenar por prioridade temporal
        if (statusA.priority !== statusB.priority) {
          return statusA.priority - statusB.priority;
        }

        // Se mesma prioridade temporal, ordenar por data
        return new Date(a.due_date) - new Date(b.due_date);
      } else {
        // Ordenar por prioridade
        const priorityA = PRIORITY_CONFIG[a.priority || "media"]?.order ?? 2;
        const priorityB = PRIORITY_CONFIG[b.priority || "media"]?.order ?? 2;
        return priorityA - priorityB;
      }
    });

    return acc;
  }, {});

  const filteredTaskCount = Object.values(tasksByColumn).flat().length;

  const KanbanCard = ({ task, index, columnId }) => {
    const priorityConfig =
      PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.media;
    const temporalStatus = getTemporalStatus(task.due_date);
    const [touchStartTime, setTouchStartTime] = useState(null);
    const [touchStartX, setTouchStartX] = useState(null);
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [showPriorityMenu, setShowPriorityMenu] = useState(false);
    const PriorityIcon = priorityConfig.icon;

    const isAdmin = user?.role === "admin";
    const isMyTask = task.assigned_to === user?.email;
    const canEditPriority = isAdmin;

    const handleTouchStart = (e) => {
      setTouchStartTime(Date.now());
      setTouchStartX(e.touches[0].clientX);
    };

    const handleTouchMove = (e) => {
      if (!touchStartX) return;
      const currentX = e.touches[0].clientX;
      const diff = currentX - touchStartX;

      if (Math.abs(diff) > 10) {
        setSwipeOffset(diff);
      }
    };

    const handleTouchEnd = () => {
      const swipeThreshold = 80;

      if (Math.abs(swipeOffset) > swipeThreshold) {
        if (swipeOffset > 0) {
          // Swipe direita: concluir
          handleSwipeAction(task, "complete");
        } else {
          // Swipe esquerda: excluir
          handleSwipeAction(task, "delete");
        }
      } else if (
        touchStartTime &&
        Date.now() - touchStartTime > 500 &&
        Math.abs(swipeOffset) < 10
      ) {
        setLongPressTask(task);
      }

      setTouchStartTime(null);
      setTouchStartX(null);
      setSwipeOffset(0);
    };

    const isCritical = task.priority === "urgente";
    const isOverdue = temporalStatus?.type === "overdue";
    const isToday = temporalStatus?.type === "today";

    return (
      <Draggable
        draggableId={task.id}
        index={index}
        isDragDisabled={isSelectionMode}
      >
        {(provided, snapshot) => (
          <motion.div
            ref={provided.innerRef}
            {...provided.draggableProps}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, x: swipeOffset }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`rounded-lg border-l-4 border p-3 mb-2 shadow-sm hover:shadow-md transition-all group relative ${
              snapshot.isDragging ? "shadow-lg rotate-2" : ""
            } ${isCritical ? "animate-pulse-border" : ""} ${
              isOverdue ? "bg-red-50" : isToday ? "bg-orange-50" : "bg-white"
            } ${selectedTasks.has(task.id) ? "ring-2 ring-blue-500" : ""}`}
            style={{
              borderLeftColor: priorityConfig.borderColor,
              transform:
                swipeOffset !== 0 ? `translateX(${swipeOffset}px)` : undefined,
            }}
          >
            {/* Swipe Actions Background */}
            {Math.abs(swipeOffset) > 10 && (
              <div
                className={`absolute inset-0 flex items-center justify-between px-4 rounded-lg ${
                  swipeOffset > 0 ? "bg-green-500" : "bg-red-500"
                }`}
              >
                {swipeOffset > 0 ? (
                  <CheckCircle2 className="w-6 h-6 text-white" />
                ) : (
                  <div className="ml-auto">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>
            )}
            <div className="flex items-start gap-2">
              {isSelectionMode ? (
                <input
                  type="checkbox"
                  checked={selectedTasks.has(task.id)}
                  onChange={() => toggleTaskSelection(task.id)}
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              ) : (
                <div
                  {...provided.dragHandleProps}
                  className="cursor-grab active:cursor-grabbing hidden md:block pt-1"
                >
                  <GripVertical className="w-4 h-4 text-slate-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {canEditPriority ? (
                    <DropdownMenu
                      open={showPriorityMenu}
                      onOpenChange={setShowPriorityMenu}
                    >
                      <DropdownMenuTrigger asChild>
                        <Badge
                          variant="outline"
                          className={`${priorityConfig.color} text-xs cursor-pointer hover:opacity-80 transition-opacity`}
                          style={{ minWidth: "65px", minHeight: "20px" }}
                        >
                          <PriorityIcon className="w-3 h-3 mr-1" />
                          {priorityConfig.label}
                        </Badge>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {Object.entries(PRIORITY_CONFIG).map(
                          ([key, config]) => {
                            const Icon = config.icon;
                            return (
                              <DropdownMenuItem
                                key={key}
                                onClick={() => handleChangePriority(task, key)}
                                className="flex items-center gap-2"
                              >
                                <Icon
                                  className="w-4 h-4"
                                  style={{ color: config.borderColor }}
                                />
                                {config.label}
                              </DropdownMenuItem>
                            );
                          },
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Badge
                      variant="outline"
                      className={`${priorityConfig.color} text-xs`}
                      style={{ minWidth: "65px", minHeight: "20px" }}
                    >
                      <PriorityIcon className="w-3 h-3 mr-1" />
                      {priorityConfig.label}
                    </Badge>
                  )}

                  {temporalStatus && (isOverdue || isToday) && (
                    <Badge
                      variant="outline"
                      className={`${temporalStatus.color} text-xs font-medium`}
                    >
                      {isOverdue && <AlertCircle className="w-3 h-3 mr-1" />}
                      {temporalStatus.label}
                    </Badge>
                  )}

                  <span className="text-xs font-medium text-slate-500 truncate ml-auto">
                    #{task.id.slice(0, 6)}
                  </span>
                </div>

                {editingTaskTitle === task.id ? (
                  <Input
                    value={editTitleValue}
                    onChange={(e) => setEditTitleValue(e.target.value)}
                    onBlur={() => handleInlineEditTitle(task)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") handleInlineEditTitle(task);
                      if (e.key === "Escape") setEditingTaskTitle(null);
                    }}
                    autoFocus
                    className="text-sm mb-1"
                  />
                ) : (
                  <h4
                    className="font-medium text-slate-800 text-sm mb-1 break-words cursor-text hover:bg-slate-50 rounded px-1 -mx-1"
                    onDoubleClick={() => startEditTitle(task)}
                  >
                    {task.title}
                  </h4>
                )}

                {task.client_name && (
                  <p className="text-xs text-slate-500 truncate mb-1">
                    {task.client_name}
                  </p>
                )}

                {/* Descrição editável inline */}
                {(task.description || editingTaskDesc === task.id) &&
                  (editingTaskDesc === task.id ? (
                    <textarea
                      value={editDescValue}
                      onChange={(e) => setEditDescValue(e.target.value)}
                      onBlur={() => handleInlineEditDesc(task)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.ctrlKey)
                          handleInlineEditDesc(task);
                        if (e.key === "Escape") setEditingTaskDesc(null);
                      }}
                      autoFocus
                      className="text-xs text-slate-600 mb-1 w-full border rounded px-2 py-1"
                      rows="2"
                      placeholder="Adicionar descrição..."
                    />
                  ) : (
                    <p
                      className="text-xs text-slate-600 mb-1 break-words cursor-text hover:bg-slate-50 rounded px-1 -mx-1"
                      onDoubleClick={() => startEditDesc(task)}
                    >
                      {task.description}
                    </p>
                  ))}

                {task.due_date && (
                  <div className="flex items-center gap-1 text-xs">
                    <Calendar className="w-3 h-3" />
                    <span
                      className={
                        temporalStatus
                          ? isOverdue
                            ? "text-red-700 font-medium"
                            : isToday
                              ? "text-orange-700 font-medium"
                              : "text-slate-500"
                          : "text-slate-500"
                      }
                    >
                      {format(new Date(task.due_date), "dd/MM/yy", {
                        locale: ptBR,
                      })}
                    </span>
                    {temporalStatus && !isOverdue && !isToday && (
                      <span className="text-slate-400">
                        • {temporalStatus.label}
                      </span>
                    )}
                  </div>
                )}

                {/* Avatar do Responsável */}
                {isCollaborativeMode && task.assigned_name && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
                      style={{
                        backgroundColor: getAvatarColor(task.assigned_to),
                      }}
                      title={task.assigned_name}
                    >
                      {getInitials(task.assigned_name)}
                    </div>
                    <span className="text-xs text-slate-600 truncate">
                      {task.assigned_name}
                    </span>
                  </div>
                )}
              </div>

              <DropdownMenu
                open={longPressTask?.id === task.id}
                onOpenChange={(open) => !open && setLongPressTask(null)}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 md:opacity-0 md:group-hover:opacity-100"
                    onClick={() => setLongPressTask(task)}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {Object.values(KANBAN_COLUMNS)
                    .filter((col) => col.id !== columnId)
                    .map((col) => (
                      <DropdownMenuItem
                        key={col.id}
                        onClick={() => handleMoveTask(task, col.id)}
                      >
                        Mover para {col.title}
                      </DropdownMenuItem>
                    ))}

                  <DropdownMenuItem onClick={() => handleDuplicateTask(task)}>
                    Duplicar Tarefa
                  </DropdownMenuItem>

                  {isAdmin && isCollaborativeMode && (
                    <>
                      <DropdownMenuItem disabled className="font-semibold">
                        Alterar Responsável
                      </DropdownMenuItem>
                      {allUsers.map((u) => (
                        <DropdownMenuItem
                          key={u.email}
                          onClick={() => handleReassignTask(task, u.email)}
                          disabled={u.email === task.assigned_to}
                        >
                          {u.full_name || u.email}
                          {u.email === task.assigned_to && " (atual)"}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.div>
        )}
      </Draggable>
    );
  };

  const totalTasks = allTasks.length;
  const activeTasks = allTasks.filter((t) => t.status !== "done").length;
  const completedThisWeek = allTasks.filter((t) => {
    if (t.status !== "done" || !t.updated_date) return false;
    const updated = new Date(t.updated_date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return updated >= weekAgo;
  }).length;
  const overdueTasks = allTasks.filter((t) => {
    if (t.status === "done" || !t.due_date) return false;
    const status = getTemporalStatus(t.due_date);
    return status?.type === "overdue";
  }).length;
  const tasksByPriority = {
    urgente: allTasks.filter(
      (t) => t.priority === "urgente" && t.status !== "done",
    ).length,
    alta: allTasks.filter((t) => t.priority === "alta" && t.status !== "done")
      .length,
    media: allTasks.filter((t) => t.priority === "media" && t.status !== "done")
      .length,
    baixa: allTasks.filter((t) => t.priority === "baixa" && t.status !== "done")
      .length,
  };

  const isAdmin = user?.role === "admin";
  const canCreateTasks = isAdmin;

  // Gerar cor do avatar baseado no email
  const getAvatarColor = (email) => {
    const colors = [
      "#3b82f6",
      "#10b981",
      "#f59e0b",
      "#ef4444",
      "#8b5cf6",
      "#ec4899",
    ];
    const hash = email
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Pegar iniciais do nome
  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#1e3a5f]" />
              Quadro de Tarefas
              {totalTasks > 0 && (
                <Badge variant="outline">
                  {filteredTaskCount} de {totalTasks}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className={getActiveFiltersCount() > 0 ? "text-blue-600" : ""}
              >
                <AlertCircle className="w-4 h-4" />
                {getActiveFiltersCount() > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                    {getActiveFiltersCount()}
                  </Badge>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>

          {/* Painel de Análises */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 p-3 bg-slate-50 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-slate-500">Ativas</p>
              <p className="text-xl font-bold text-slate-800">{activeTasks}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">Esta Semana</p>
              <p className="text-xl font-bold text-green-600">
                {completedThisWeek}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">Atrasadas</p>
              <p className="text-xl font-bold text-red-600">{overdueTasks}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">Urgentes</p>
              <p className="text-xl font-bold text-orange-600">
                {tasksByPriority.urgente}
              </p>
            </div>
          </div>

          {/* Busca */}
          <div className="mb-3">
            <Input
              placeholder="🔍 Buscar tarefas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Controles de Ordenação e Filtros */}
          {showFilters && (
            <div className="space-y-2 p-3 bg-slate-50 rounded-lg mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-600">Ordenar por:</span>
                <Button
                  variant={sortBy === "priority" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortBy("priority")}
                  className="text-xs"
                >
                  Prioridade
                </Button>
                <Button
                  variant={sortBy === "due_date" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortBy("due_date")}
                  className="text-xs"
                >
                  Prazo
                </Button>

                {/* Toggle visualização admin */}
                {isAdmin && isCollaborativeMode && (
                  <>
                    <span className="text-xs text-slate-400 mx-2">|</span>
                    <Button
                      variant={viewMode === "my" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("my")}
                      className="text-xs"
                    >
                      Minhas Tarefas
                    </Button>
                    <Button
                      variant={viewMode === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("all")}
                      className="text-xs"
                    >
                      Todas as Tarefas
                    </Button>
                  </>
                )}
              </div>

              {/* Filtros por Usuário (apenas admin em modo all) */}
              {isAdmin && isCollaborativeMode && viewMode === "all" && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-slate-600">
                    Filtrar por usuário:
                  </span>
                  {allUsers.map((u) => (
                    <Button
                      key={u.email}
                      variant={userFilters[u.email] ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleUserFilter(u.email)}
                      className="text-xs"
                    >
                      <div
                        className="w-4 h-4 rounded-full mr-1 flex items-center justify-center text-[10px] font-medium text-white"
                        style={{ backgroundColor: getAvatarColor(u.email) }}
                      >
                        {getInitials(u.full_name || u.email)}
                      </div>
                      {u.full_name || u.email}
                    </Button>
                  ))}
                </div>
              )}

              {/* Filtros de Período */}
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "hoje", label: "Hoje", icon: Clock },
                  { key: "esta_semana", label: "Esta Semana", icon: Calendar },
                  { key: "este_mes", label: "Este Mês", icon: Calendar },
                  { key: "vencidas", label: "Vencidas", icon: AlertCircle },
                  { key: "sem_prazo", label: "Sem Prazo", icon: Clock },
                ].map(({ key, label, icon: Icon }) => (
                  <Button
                    key={key}
                    variant={periodFilters[key] ? "default" : "outline"}
                    size="sm"
                    onClick={() => togglePeriodFilter(key)}
                    className={`text-xs ${periodFilters[key] ? "bg-[#1e3a5f]" : ""}`}
                  >
                    <Icon className="w-3 h-3 mr-1" />
                    {label}
                  </Button>
                ))}
              </div>

              {/* Filtros de Prioridade */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => {
                  const Icon = config.icon;
                  const isActive = priorityFilters[key];
                  return (
                    <Button
                      key={key}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => togglePriorityFilter(key)}
                      className={`text-xs ${isActive ? "" : "opacity-50"}`}
                      style={
                        isActive
                          ? {
                              backgroundColor: config.borderColor,
                              borderColor: config.borderColor,
                            }
                          : {}
                      }
                    >
                      <Icon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Button>
                  );
                })}
              </div>

              {/* Botão Limpar Filtros */}
              {getActiveFiltersCount() > 0 && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-xs"
                  >
                    Limpar Todos os Filtros
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Chips de Filtros Ativos */}
          {getActiveFiltersCount() > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {searchQuery && (
                <Badge variant="secondary" className="text-xs">
                  Busca: "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery("")}
                    className="ml-2 hover:text-red-600"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {Object.entries(periodFilters)
                .filter(([_, active]) => active)
                .map(([key]) => (
                  <Badge key={key} variant="secondary" className="text-xs">
                    {key === "hoje" && "Hoje"}
                    {key === "esta_semana" && "Esta Semana"}
                    {key === "este_mes" && "Este Mês"}
                    {key === "vencidas" && "Vencidas"}
                    {key === "sem_prazo" && "Sem Prazo"}
                    <button
                      onClick={() => togglePeriodFilter(key)}
                      className="ml-2 hover:text-red-600"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              {Object.entries(priorityFilters)
                .filter(([_, active]) => !active)
                .map(([key]) => (
                  <Badge key={key} variant="secondary" className="text-xs">
                    Sem: {PRIORITY_CONFIG[key]?.label}
                    <button
                      onClick={() => togglePriorityFilter(key)}
                      className="ml-2 hover:text-red-600"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="flex gap-3 overflow-x-auto pb-4">
                  {Object.values(KANBAN_COLUMNS).map((column) => {
                    const columnTasks = tasksByColumn[column.id] || [];

                    return (
                      <div
                        key={column.id}
                        className="flex-shrink-0 w-64 bg-slate-50 rounded-lg p-3"
                        style={{ minWidth: "16rem" }}
                      >
                        <div
                          className="flex items-center justify-between mb-3 pb-2 border-b-2"
                          style={{ borderColor: column.color }}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: column.color }}
                            />
                            <h3 className="font-semibold text-sm text-slate-700">
                              {column.title}
                            </h3>
                          </div>
                          <Badge
                            variant="secondary"
                            className="text-xs"
                            style={{
                              backgroundColor: column.bgColor,
                              color: column.color,
                            }}
                          >
                            {columnTasks.length}
                          </Badge>
                        </div>

                        <Droppable droppableId={column.id}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`min-h-[200px] transition-colors ${
                                snapshot.isDraggingOver
                                  ? "bg-slate-100 rounded-lg"
                                  : ""
                              }`}
                            >
                              {columnTasks.map((task, index) => (
                                <KanbanCard
                                  key={task.id}
                                  task={task}
                                  index={index}
                                  columnId={column.id}
                                />
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    );
                  })}
                </div>
              </DragDropContext>

              <div className="flex items-center gap-3 pt-4 mt-4 border-t flex-wrap">
                {!isSelectionMode ? (
                  <>
                    {canCreateTasks && (
                      <Button
                        onClick={() => setShowQuickCreate(true)}
                        size="sm"
                        className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Tarefa
                      </Button>
                    )}
                    <Button
                      onClick={() => setIsSelectionMode(true)}
                      size="sm"
                      variant="outline"
                    >
                      Selecionar Múltiplas
                    </Button>
                    <Link to={createPageUrl("Tasks")}>
                      <Button variant="outline" size="sm">
                        Ver Todas
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Badge variant="secondary" className="text-sm">
                      {selectedTasks.size} selecionada(s)
                    </Badge>
                    {selectedTasks.size > 0 && (
                      <>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline">
                              Mover para...
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {Object.values(KANBAN_COLUMNS).map((col) => (
                              <DropdownMenuItem
                                key={col.id}
                                onClick={() => handleBulkMove(col.id)}
                              >
                                {col.title}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {isAdmin && (
                          <>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline">
                                  Alterar Prioridade
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                {Object.entries(PRIORITY_CONFIG).map(
                                  ([key, config]) => (
                                    <DropdownMenuItem
                                      key={key}
                                      onClick={() => handleBulkPriority(key)}
                                    >
                                      {config.label}
                                    </DropdownMenuItem>
                                  ),
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                            {isCollaborativeMode && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    Atribuir a...
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  {allUsers.map((u) => (
                                    <DropdownMenuItem
                                      key={u.email}
                                      onClick={() => handleBulkAssign(u.email)}
                                    >
                                      {u.full_name || u.email}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </>
                        )}
                      </>
                    )}
                    <Button
                      onClick={() => {
                        setIsSelectionMode(false);
                        setSelectedTasks(new Set());
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      Cancelar
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick Create Dialog */}
      <Dialog open={showQuickCreate} onOpenChange={setShowQuickCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Tarefa Rápida</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título da Tarefa *</Label>
              <Input
                placeholder="Digite o título..."
                value={quickTaskTitle}
                onChange={(e) => setQuickTaskTitle(e.target.value)}
                onKeyPress={(e) =>
                  e.key === "Enter" && !quickTaskDueDate && handleQuickCreate()
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Data de Vencimento (opcional)</Label>
              <Input
                type="date"
                value={quickTaskDueDate}
                onChange={(e) => setQuickTaskDueDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            {/* Atribuir usuário (apenas admin em modo colaborativo) */}
            {isAdmin && isCollaborativeMode && (
              <div className="space-y-2">
                <Label>Atribuir a</Label>
                <Select
                  value={quickAssignedUser}
                  onValueChange={setQuickAssignedUser}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Atribuir a mim mesmo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Atribuir a mim mesmo</SelectItem>
                    {allUsers
                      .filter((u) => u.email !== user.email)
                      .map((u) => (
                        <SelectItem key={u.email} value={u.email}>
                          {u.full_name || u.email}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <Button
                      key={key}
                      variant={
                        quickTaskPriority === key ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setQuickTaskPriority(key)}
                      style={
                        quickTaskPriority === key
                          ? {
                              backgroundColor: config.borderColor,
                              borderColor: config.borderColor,
                            }
                          : {}
                      }
                    >
                      <Icon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Coluna Inicial</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(KANBAN_COLUMNS).map((col) => (
                  <Button
                    key={col.id}
                    variant={quickTaskColumn === col.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setQuickTaskColumn(col.id)}
                    style={
                      quickTaskColumn === col.id
                        ? {
                            backgroundColor: col.color,
                            borderColor: col.color,
                          }
                        : {}
                    }
                  >
                    {col.title}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleQuickCreate}
                disabled={!quickTaskTitle.trim() || createMutation.isPending}
                className="flex-1 bg-[#1e3a5f] hover:bg-[#2d5a87]"
              >
                {createMutation.isPending ? "Criando..." : "Criar"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowQuickCreate(false);
                  setQuickTaskTitle("");
                  setQuickTaskPriority("media");
                  setQuickTaskDueDate("");
                  setQuickAssignedUser("");
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* FAB Mobile - apenas admin */}
      {canCreateTasks && (
        <Button
          onClick={() => setShowQuickCreate(true)}
          className="md:hidden fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-2xl bg-[#1e3a5f] hover:bg-[#2d5a87]"
        >
          <Plus className="w-6 h-6" />
        </Button>
      )}
    </>
  );
}
