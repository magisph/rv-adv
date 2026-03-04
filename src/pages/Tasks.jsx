import React, { useState } from "react";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import { taskService, notificationService } from "@/services";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Plus,
  Search,
  MoreVertical,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Edit,
  Trash2,
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import TaskForm from "@/components/tasks/TaskForm";
import ConfirmDialog from "@/components/ui/confirm-dialog";

const STATUS_COLORS = {
  todo: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
};

const PRIORITY_COLORS = {
  baixa: "bg-slate-100 text-slate-600",
  media: "bg-yellow-100 text-yellow-700",
  alta: "bg-orange-100 text-orange-700",
  urgente: "bg-red-100 text-red-700",
};

const STATUS_ICONS = {
  todo: Circle,
  in_progress: Clock,
  done: CheckCircle2,
};

export default function Tasks() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => taskService.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => taskService.create(data),
    onSuccess: async (task) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["monitor-tasks"] });
      setShowForm(false);

      // Create notification for assigned user
      if (task.assigned_to) {
        const currentUser = await authService.getCurrentUser();
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
    onError: (error) => toast.error(error.message || "Erro ao criar tarefa"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => taskService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["monitor-tasks"] });
      setShowForm(false);
      setEditingTask(null);
    },
    onError: (error) => toast.error(error.message || "Erro ao atualizar tarefa"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => taskService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (error) => toast.error(error.message || "Erro ao excluir tarefa"),
  });

  const handleSave = (data) => {
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleDelete = (task) => {
    setDeleteConfirm(task);
  };

  const handleStatusChange = (task, newStatus) => {
    updateMutation.mutate({
      id: task.id,
      data: { ...task, status: newStatus },
    });
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title?.toLowerCase().includes(search.toLowerCase()) ||
      task.description?.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === "all" || task.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const getTaskUrgency = (task) => {
    if (!task.due_date || task.status === "done") return null;
    const dueDate = new Date(task.due_date);
    if (isPast(dueDate) && !isToday(dueDate)) return "overdue";
    if (isToday(dueDate)) return "today";
    return null;
  };

  const todoTasks = tasks.filter((t) => t.status === "todo").length;
  const inProgressTasks = tasks.filter(
    (t) => t.status === "in_progress",
  ).length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tarefas</h1>
          <p className="text-slate-500">{tasks.length} tarefas cadastradas</p>
        </div>
        <Button
          onClick={() => {
            setEditingTask(null);
            setShowForm(true);
          }}
          className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Tarefa
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">A Fazer</p>
                <p className="text-2xl font-bold text-slate-700">{todoTasks}</p>
              </div>
              <Circle className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Em Progresso</p>
                <p className="text-2xl font-bold text-blue-600">
                  {inProgressTasks}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Concluídas</p>
                <p className="text-2xl font-bold text-green-600">{doneTasks}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar tarefas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="todo">A Fazer</TabsTrigger>
          <TabsTrigger value="in_progress">Em Progresso</TabsTrigger>
          <TabsTrigger value="done">Concluídas</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-3 mt-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center text-slate-500">
                <Circle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Nenhuma tarefa encontrada</p>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence>
              {filteredTasks.map((task, index) => {
                const StatusIcon = STATUS_ICONS[task.status];
                const urgency = getTaskUrgency(task);

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <button
                            onClick={() =>
                              handleStatusChange(
                                task,
                                task.status === "done"
                                  ? "todo"
                                  : task.status === "todo"
                                    ? "in_progress"
                                    : "done",
                              )
                            }
                            className="mt-1"
                          >
                            <StatusIcon
                              className={`w-5 h-5 ${
                                task.status === "done"
                                  ? "text-green-600"
                                  : task.status === "in_progress"
                                    ? "text-blue-600"
                                    : "text-slate-400"
                              }`}
                            />
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3
                                className={`font-medium ${task.status === "done" ? "line-through text-slate-500" : "text-slate-800"}`}
                              >
                                {task.title}
                              </h3>
                              <Badge
                                variant="outline"
                                className={PRIORITY_COLORS[task.priority]}
                              >
                                {task.priority}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={STATUS_COLORS[task.status]}
                              >
                                {task.status === "todo"
                                  ? "A Fazer"
                                  : task.status === "in_progress"
                                    ? "Em Progresso"
                                    : "Concluída"}
                              </Badge>
                              {urgency === "overdue" && (
                                <Badge className="bg-red-600 text-white">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Atrasada
                                </Badge>
                              )}
                              {urgency === "today" && (
                                <Badge className="bg-amber-600 text-white">
                                  Vence hoje
                                </Badge>
                              )}
                            </div>

                            {task.description && (
                              <p className="text-sm text-slate-600 mt-2">
                                {task.description}
                              </p>
                            )}

                            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                              {task.due_date && (
                                <span>
                                  Vencimento:{" "}
                                  {format(
                                    new Date(task.due_date),
                                    "dd/MM/yyyy",
                                  )}
                                </span>
                              )}
                              {task.assigned_name && (
                                <span>Responsável: {task.assigned_name}</span>
                              )}
                              {task.client_name && (
                                <span>Cliente: {task.client_name}</span>
                              )}
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEdit(task)}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(task)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? "Editar Tarefa" : "Nova Tarefa"}
            </DialogTitle>
          </DialogHeader>
          <TaskForm
            task={editingTask}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingTask(null);
            }}
            isSaving={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Excluir tarefa"
        description={`Deseja excluir a tarefa "${deleteConfirm?.title}"? Esta ação não pode ser desfeita.`}
        onConfirm={() => {
          deleteMutation.mutate(deleteConfirm.id);
          setDeleteConfirm(null);
        }}
      />
    </div>
  );
}
