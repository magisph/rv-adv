// TasksWidget - Main Component
// Kanban de tarefas com colunas, filtros e gestão
// Arquitetura modularizada com sub-componentes

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import { userService, taskService, notificationService } from "@/services";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  ChevronRight,
} from "lucide-react";
import { LayoutGroup } from "framer-motion";
import TaskForm from "@/components/tasks/TaskForm";

// Sub-componentes modulares
import { BoardColumn, FiltersPanel, PRIORITY_CONFIG, KANBAN_COLUMNS, getTemporalStatus } from "./tasks";

// ============================================
// Funções utilitárias (mantidas aqui para o componente principal)
// ============================================

// Função para gerar cor do avatar
const getAvatarColor = (email) => {
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
  const hash = email.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

// Função para pegar iniciais do nome
const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function TasksWidget() {
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const [quickTaskColumn, setQuickTaskColumn] = useState("todo");
  const [quickTaskPriority, setQuickTaskPriority] = useState("media");
  const [quickTaskDueDate, setQuickTaskDueDate] = useState("");
  const [quickAssignedUser, setQuickAssignedUser] = useState("");
  const [longPressTask, setLongPressTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

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

  // Carregar usuário
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await authService.getCurrentUser();
        setUser(userData);

        const allUsers = await userService.list();
        setIsCollaborativeMode(allUsers.length > 1);

        const filters = {};
        allUsers.forEach((u) => {
          filters[u.email] = true;
        });
        setUserFilters(filters);
      } catch {
        // Usuário não autenticado
      }
    };
    loadUser();
  }, []);

  // Buscar usuários
  const { data: allUsers = [] } = useQuery({
    queryKey: ["all-users"],
    queryFn: () => userService.list(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Buscar tarefas
  const {
    data: allTasks = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["kanban-tasks", user?.email, user?.role, viewMode],
    queryFn: async () => {
      if (!user) return [];
      const isAdmin = user.role === "admin";
      if (isAdmin && viewMode === "all") {
        return taskService.list();
      } else {
        return taskService.filter({ assigned_to: user?.email });
      }
    },
    enabled: !!user?.email,
    refetchInterval: 30000,
  });

  // Notificações de tarefas
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

        if (dueDate.getTime() === tomorrow.getTime()) {
          const notificationKey = `notified_${task.id}_24h`;
          if (!localStorage.getItem(notificationKey) && "Notification" in window && Notification.permission === "granted") {
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
    const interval = setInterval(checkNotifications, 60000);

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => clearInterval(interval);
  }, [allTasks, user]);

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => taskService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => taskService.create(data),
    onSuccess: async (task) => {
      queryClient.invalidateQueries({ queryKey: ["kanban-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setShowForm(false);
      setShowQuickCreate(false);
      setQuickTaskTitle("");

      if (task.assigned_to && user && task.assigned_to !== user?.email) {
        const assignedUserId = await authService.getUserIdByEmail(task.assigned_to);
        if (assignedUserId) {
          await notificationService.create({
            title: "Nova Tarefa Atribuída",
            message: `${task.title}${task.client_name ? ` - Cliente: ${task.client_name}` : ""}`,
            type: "tarefa",
            priority: task.priority === "urgente" ? "urgente" : "importante",
            user_id: assignedUserId,
            link: "/tasks",
            related_id: task.id,
          });
        }
      }
    },
  });

  // ============================================
  // Handlers (memoizados)
  // ============================================

  const handleMoveTask = useCallback(async (task, columnId) => {
    const userRole = user?.role?.toLowerCase() || "";
    if ((userRole === "secretaria" || userRole === "assistente") && columnId === "done") {
      toast.error("Apenas a advogada (admin) pode revisar e concluir as tarefas.");
      setLongPressTask(null);
      return;
    }

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
  }, [user, updateMutation]);

  const handleQuickCreate = useCallback(() => {
    if (!quickTaskTitle.trim() || !user) return;

    const isAdmin = user?.role?.toLowerCase() === "admin";
    const column = KANBAN_COLUMNS[quickTaskColumn];

    let assignedEmail = user?.email;
    let assignedName = user?.full_name;

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
  }, [quickTaskTitle, user, quickTaskColumn, quickAssignedUser, quickTaskPriority, quickTaskDueDate, allUsers, isCollaborativeMode, createMutation]);

  const handleChangePriority = useCallback(async (task, newPriority) => {
    if (user?.role !== "admin") return;
    await updateMutation.mutateAsync({
      id: task.id,
      data: { ...task, priority: newPriority },
    });
    setLongPressTask(null);
  }, [user, updateMutation]);

  // Toggle handlers (memoizados)
  const togglePriorityFilter = useCallback((priority) => {
    setPriorityFilters((prev) => ({ ...prev, [priority]: !prev[priority] }));
  }, []);

  const togglePeriodFilter = useCallback((period) => {
    setPeriodFilters((prev) => ({ ...prev, [period]: !prev[period] }));
  }, []);

  const toggleUserFilter = useCallback((userEmail) => {
    setUserFilters((prev) => ({ ...prev, [userEmail]: !prev[userEmail] }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setPriorityFilters({ urgente: true, alta: true, media: true, baixa: true });
    setPeriodFilters({ hoje: false, esta_semana: false, este_mes: false, vencidas: false, sem_prazo: false });
    setSearchQuery("");
    const filters = {};
    allUsers.forEach((u) => { filters[u.email] = true; });
    setUserFilters(filters);
  }, [allUsers]);

  const getActiveFiltersCount = useCallback(() => {
    let count = 0;
    if (Object.values(priorityFilters).some((v) => !v)) count++;
    if (Object.values(periodFilters).some((v) => v)) count++;
    if (Object.values(userFilters).some((v) => !v)) count++;
    if (searchQuery) count++;
    return count;
  }, [priorityFilters, periodFilters, userFilters, searchQuery]);

  // Task handlers
  const handleDuplicateTask = useCallback(async (task) => {
    const duplicateData = {
      ...task,
      id: undefined,
      title: `${task.title} (cópia)`,
      status: "todo",
      kanban_column: "todo",
    };
    await createMutation.mutateAsync(duplicateData);
    setLongPressTask(null);
  }, [createMutation]);

  const handleEdit = useCallback((task) => {
    setEditingTask(task);
    setShowForm(true);
  }, []);

  const handleSave = useCallback((data) => {
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data });
    } else {
      createMutation.mutate(data);
    }
    setShowForm(false);
    setEditingTask(null);
  }, [editingTask, updateMutation, createMutation]);

  const toggleTaskSelection = useCallback((taskId) => {
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
  }, [selectedTasks]);

  const handleBulkMove = useCallback(async (columnId) => {
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
  }, [allTasks, selectedTasks, updateMutation]);

  const handleBulkPriority = useCallback(async (priority) => {
    if (user?.role !== "admin") return;
    const tasks = allTasks.filter((t) => selectedTasks.has(t.id));
    for (const task of tasks) {
      await updateMutation.mutateAsync({
        id: task.id,
        data: { ...task, priority },
      });
    }
    setSelectedTasks(new Set());
    setIsSelectionMode(false);
  }, [allTasks, selectedTasks, user, updateMutation]);

  const handleBulkAssign = useCallback(async (userEmail) => {
    if (user?.role !== "admin") return;
    const selectedUser = allUsers.find((u) => u.email === userEmail);
    if (!selectedUser) return;
    const tasks = allTasks.filter((t) => selectedTasks.has(t.id));
    for (const task of tasks) {
      await updateMutation.mutateAsync({
        id: task.id,
        data: { ...task, assigned_to: selectedUser.email, assigned_name: selectedUser.full_name },
      });
    }
    setSelectedTasks(new Set());
    setIsSelectionMode(false);
  }, [allUsers, selectedTasks, user, updateMutation]);

  const handleReassignTask = useCallback(async (task, newUserEmail) => {
    const newUser = allUsers.find((u) => u.email === newUserEmail);
    if (!newUser) return;
    await updateMutation.mutateAsync({
      id: task.id,
      data: { ...task, assigned_to: newUser.email, assigned_name: newUser.full_name },
    });
    if (newUser.email !== user?.email) {
      const newUserId = await authService.getUserIdByEmail(newUser.email);
      if (newUserId) {
        await notificationService.create({
          title: "Tarefa Atribuída",
          message: `"${task.title}" foi atribuída a você`,
          type: "tarefa",
          user_id: newUserId,
          link: "/tasks",
          related_id: task.id,
        });
      }
    }
    setLongPressTask(null);
  }, [allUsers, user, updateMutation]);

  // ============================================
  // Filtros e organização (useMemo)
  // ============================================

  const passesDateFilter = useCallback((task) => {
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
  }, [periodFilters]);

  const tasksByColumn = useMemo(() => {
    const role = user?.role?.toLowerCase() || "";
    const isAdmin = role === "admin" || role === "dono";
    const isTunnelVision = role === "secretaria" || role === "assistente";

    // CORREÇÃO CRÍTICA: Adicionar valor inicial {} ao reduce para evitar
    // "TypeError: Cannot create property 'in_progress' on string 'todo'"
    return Object.keys(KANBAN_COLUMNS).reduce((acc, columnId) => {
      const columnTasks = allTasks.filter((task) => {
        if (isTunnelVision && task.assigned_to !== user?.email) return false;

        const taskColumn = task.kanban_column || (task.status === "done" ? "done" : "todo");
        const matchesColumn = taskColumn === columnId;
        const matchesPriority = priorityFilters[task.priority || "media"];
        const matchesDate = passesDateFilter(task);

        const matchesUser = !isAdmin || !isCollaborativeMode || userFilters[task.assigned_to] !== false;

        const matchesSearch = !searchQuery ||
          task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.client_name?.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesColumn && matchesPriority && matchesDate && matchesUser && matchesSearch;
      });

      // Ordenação
      acc[columnId] = columnTasks.sort((a, b) => {
        if (sortBy === "due_date") {
          const statusA = getTemporalStatus(a.due_date);
          const statusB = getTemporalStatus(b.due_date);
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          if (statusA?.priority !== statusB?.priority) return statusA.priority - statusB.priority;
          return new Date(a.due_date) - new Date(b.due_date);
        } else {
          const priorityA = PRIORITY_CONFIG[a.priority || "media"]?.order ?? 2;
          const priorityB = PRIORITY_CONFIG[b.priority || "media"]?.order ?? 2;
          return priorityA - priorityB;
        }
      });

      return acc;
    }, {}); // ✅ VALOR INICIAL: objeto vazio para evitar TypeError
  }, [allTasks, user, priorityFilters, periodFilters, userFilters, searchQuery, sortBy, isCollaborativeMode, passesDateFilter]);

  const filteredTaskCount = Object.values(tasksByColumn).flat().length;

  // ============================================
  // Métricas
  // ============================================

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
    urgente: allTasks.filter((t) => t.priority === "urgente" && t.status !== "done").length,
    alta: allTasks.filter((t) => t.priority === "alta" && t.status !== "done").length,
    media: allTasks.filter((t) => t.priority === "media" && t.status !== "done").length,
    baixa: allTasks.filter((t) => t.priority === "baixa" && t.status !== "done").length,
  };

  const isAdmin = user?.role?.toLowerCase() === "admin" || user?.role?.toLowerCase() === "dono";
  const canCreateTasks = isAdmin;

  // ============================================
  // Render
  // ============================================

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-legal-blue" aria-hidden="true" />
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
                aria-label={showFilters ? "Ocultar filtros" : "Mostrar filtros"}
              >
                <AlertCircle className="w-4 h-4" aria-hidden="true" />
                {getActiveFiltersCount() > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                    {getActiveFiltersCount()}
                  </Badge>
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isLoading} aria-label="Atualizar tarefas">
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 p-3 bg-slate-50 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-slate-600">Ativas</p>
              <p className="text-xl font-bold text-slate-800">{activeTasks}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-600">Esta Semana</p>
              <p className="text-xl font-bold text-green-600">{completedThisWeek}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-600">Atrasadas</p>
              <p className="text-xl font-bold text-red-600">{overdueTasks}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-600">Urgentes</p>
              <p className="text-xl font-bold text-orange-600">{tasksByPriority.urgente}</p>
            </div>
          </div>

          {/* Filters Panel */}
          <FiltersPanel
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortBy={sortBy}
            setSortBy={setSortBy}
            viewMode={viewMode}
            setViewMode={setViewMode}
            priorityFilters={priorityFilters}
            setPriorityFilters={setPriorityFilters}
            periodFilters={periodFilters}
            setPeriodFilters={setPeriodFilters}
            userFilters={userFilters}
            setUserFilters={setUserFilters}
            allUsers={allUsers}
            isAdmin={isAdmin}
            isCollaborativeMode={isCollaborativeMode}
            isLoading={isLoading}
            refetch={refetch}
            canCreateTasks={canCreateTasks}
            onTogglePriorityFilter={togglePriorityFilter}
            onTogglePeriodFilter={togglePeriodFilter}
            onToggleUserFilter={toggleUserFilter}
            onClearFilters={clearAllFilters}
            getActiveFiltersCount={getActiveFiltersCount}
            filteredTaskCount={filteredTaskCount}
            totalTasks={totalTasks}
            isSelectionMode={isSelectionMode}
            setIsSelectionMode={setIsSelectionMode}
            selectedTasks={selectedTasks}
            handleBulkMove={handleBulkMove}
            handleBulkPriority={handleBulkPriority}
            handleBulkAssign={handleBulkAssign}
            onShowQuickCreate={() => setShowQuickCreate(true)}
            setSelectedTasks={setSelectedTasks}
          />
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <LayoutGroup>
                <div className="flex gap-3 overflow-x-auto pb-4">
                  {Object.values(KANBAN_COLUMNS).map((column) => (
                    <BoardColumn
                      key={column.id}
                      column={column}
                      tasks={tasksByColumn[column.id] || []}
                      user={user}
                      allUsers={allUsers}
                      isCollaborativeMode={isCollaborativeMode}
                      isAdmin={isAdmin}
                      isRestricted={user?.role?.toLowerCase() === "secretaria" || user?.role?.toLowerCase() === "assistente"}
                      selectedTasks={selectedTasks}
                      isSelectionMode={isSelectionMode}
                      onEditTask={handleEdit}
                      onMoveTask={handleMoveTask}
                      onChangePriority={handleChangePriority}
                      onDuplicateTask={handleDuplicateTask}
                      onReassignTask={handleReassignTask}
                      onToggleSelection={toggleTaskSelection}
                      onLongPress={setLongPressTask}
                    />
                  ))}
                </div>
              </LayoutGroup>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 mt-4 border-t flex-wrap">
                {!isSelectionMode ? (
                  <>
                    {canCreateTasks && (
                      <Button onClick={() => setShowQuickCreate(true)} size="sm" className="bg-legal-blue hover:bg-legal-blue-light">
                        <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                        Criar Tarefa
                      </Button>
                    )}
                    <Button onClick={() => setIsSelectionMode(true)} size="sm" variant="outline">
                      Selecionar Múltiplas
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={createPageUrl("Tasks")}>
                        Ver Todas
                        <ChevronRight className="w-4 h-4 ml-2" aria-hidden="true" />
                      </Link>
                    </Button>
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
                            <Button size="sm" variant="outline">Mover para...</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {Object.values(KANBAN_COLUMNS).map((col) => (
                              <DropdownMenuItem key={col.id} onClick={() => handleBulkMove(col.id)}>
                                {col.title}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {isAdmin && (
                          <>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline">Alterar Prioridade</Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                                  <DropdownMenuItem key={key} onClick={() => handleBulkPriority(key)}>
                                    {config.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                            {isCollaborativeMode && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="outline">Atribuir a...</Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  {allUsers.map((u) => (
                                    <DropdownMenuItem key={u.email} onClick={() => handleBulkAssign(u.email)}>
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
                    <Button onClick={() => { setIsSelectionMode(false); setSelectedTasks(new Set()); }} size="sm" variant="ghost">
                      Cancelar
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditingTask(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
          </DialogHeader>
          <TaskForm
            task={editingTask}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingTask(null); }}
            isSaving={updateMutation.isPending || createMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
