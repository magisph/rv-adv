/* eslint-disable react/prop-types */
import React, { useState } from "react";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import { taskService, notificationService } from "@/services";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Eye,
  AlertCircle,
  Edit,
  Trash2,
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import TaskForm from "@/components/tasks/TaskForm";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { useAuth } from "@/lib/AuthContext";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Constants
const STATUS_COLORS = {
  todo: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  review: "bg-purple-100 text-purple-700",
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
  review: Eye,
  done: CheckCircle2,
};

const COLUMNS = [
  { id: "todo", title: "A Fazer", icon: Circle },
  { id: "in_progress", title: "Em Progresso", icon: Clock },
  { id: "review", title: "Em Revisão", icon: Eye },
  { id: "done", title: "Concluído", icon: CheckCircle2 },
];

function SortableTaskCard({ task, urgency, onEdit, onDelete, onStatusChange }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: task.id,
      data: { type: "Task", task },
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const StatusIcon = STATUS_ICONS[task.status] || Circle;

  // Render the original card contents but heavily structured for a vertical Kanban
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none block">
      <Card className={`border-0 shadow-sm hover:shadow-md transition-shadow relative ${isDragging ? "ring-2 ring-blue-500/50" : ""}`}>
        <CardContent className="p-3 leading-tight" onPointerDown={(e) => {
          if (e.target.closest("button") || e.target.closest("[role='menuitem']")) {
            // Dropdown triggers handled correctly without dragging issues
          }
        }}>
          <div className="flex items-start gap-2">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                const order = ["todo", "in_progress", "review", "done"];
                const nextStatus = order[(order.indexOf(task.status) + 1) % order.length];
                onStatusChange(task, nextStatus);
              }}
              className="mt-0.5 shrink-0"
            >
              <StatusIcon
                className={`w-4 h-4 ${
                  task.status === "done"
                    ? "text-green-600"
                    : task.status === "review"
                    ? "text-purple-600"
                    : task.status === "in_progress"
                    ? "text-blue-600"
                    : "text-slate-400"
                }`}
              />
            </button>

            <div className="flex-1 min-w-0">
              <h3
                className={`font-semibold text-sm mb-1.5 ${
                  task.status === "done" ? "line-through text-slate-500" : "text-slate-800"
                }`}
              >
                {task.title}
              </h3>

              <div className="flex flex-wrap gap-1 mb-2">
                <Badge variant="outline" className={`text-[10px] py-0 px-1 border-0 shadow-none bg-slate-100 ${PRIORITY_COLORS[task.priority] || ""}`}>
                  {task.priority || "Normal"}
                </Badge>
                {urgency === "overdue" && (
                  <Badge className="bg-red-50 text-red-600 border border-red-200 text-[10px] py-0 px-1">
                    Atrasada
                  </Badge>
                )}
                {urgency === "today" && (
                  <Badge className="bg-amber-50 text-amber-600 border border-amber-200 text-[10px] py-0 px-1">
                    Vence hoje
                  </Badge>
                )}
              </div>

              {task.description && (
                <p className="text-xs text-slate-500 mb-2 line-clamp-2">
                  {task.description}
                </p>
              )}

              <div className="flex flex-col gap-0.5 text-[10px] text-slate-400">
                {task.due_date && (
                  <span className="flex items-center gap-1">
                    Vencimento: {format(new Date(task.due_date), "dd/MM/yyyy")}
                  </span>
                )}
                {task.assigned_name && (
                  <span className="truncate">Resp: {task.assigned_name}</span>
                )}
              </div>
            </div>

            <div onPointerDown={(e) => e.stopPropagation()} className="shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 -mt-1 hover:bg-slate-100 text-slate-400">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="text-sm">
                  <DropdownMenuItem onClick={() => onEdit(task)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(task)} className="text-red-600 focus:bg-red-50 focus:text-red-700">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BoardColumn({ column, tasks, onEdit, onDelete, onStatusChange, getTaskUrgency }) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "Column", status: column.id },
  });

  const Icon = column.icon;

  return (
    <div className={`flex flex-col bg-slate-50/50 border ${isOver ? 'border-blue-400 bg-blue-50/20' : 'border-slate-100'} rounded-xl p-3 w-full h-full min-h-[500px] transition-colors`}>
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <Icon
            className={`w-4 h-4 ${
              column.id === "done"
                ? "text-green-600"
                : column.id === "review"
                ? "text-purple-600"
                : column.id === "in_progress"
                ? "text-blue-600"
                : "text-slate-500"
            }`}
          />
          <h3 className="font-semibold text-sm text-slate-700 tracking-tight">{column.title}</h3>
        </div>
        <Badge variant="secondary" className="bg-white hover:bg-white text-slate-500 text-xs shadow-sm border border-slate-200">
          {tasks.length}
        </Badge>
      </div>

      <div ref={setNodeRef} className="flex-1 flex flex-col gap-2.5">
        <SortableContext id={column.id} items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence>
            {tasks.map((task) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <SortableTaskCard
                  task={task}
                  urgency={getTaskUrgency(task)}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onStatusChange={onStatusChange}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </SortableContext>
      </div>
    </div>
  );
}

export default function Tasks() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => taskService.list("-created_at"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => taskService.create(data),
    onSuccess: async (task) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["monitor-tasks"] });
      setShowForm(false);

      if (task.assigned_to) {
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
    const role = user?.role?.toLowerCase() || "";
    const isAssistant = role === "secretaria" || role === "assistente";
    const isAdmin = role === "admin" || role === "dono";

    if (isAssistant && !isAdmin) {
      if (task.assigned_to !== user?.email) {
        toast.error("Você só pode interagir com tarefas atribuídas a você.");
        return;
      }
      if (newStatus === "done") {
        toast.error("Apenas o administrador pode dar a tarefa como Concluída");
        return;
      }
    }

    updateMutation.mutate({
      id: task.id,
      data: { ...task, status: newStatus },
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeTask = active.data.current?.task;
    let newStatus = over.data.current?.status; 
    
    if (!newStatus && over.data.current?.type === "Task") {
      newStatus = over.data.current?.task?.status;
    }

    if (!activeTask || !newStatus || activeTask.status === newStatus) return;

    const role = user?.role?.toLowerCase() || "";
    const isAdmin = role === "admin" || role === "dono";
    const isAssistant = role === "secretaria" || role === "assistente";

    if (isAssistant && !isAdmin) {
      if (activeTask.assigned_to !== user?.email) {
        toast.error("Você só pode interagir com tarefas atribuídas a você.");
        return;
      }
      if (newStatus === "done") {
        toast.error("Apenas o administrador pode dar a tarefa como Concluída");
        return; // BLOQUEIO CRÍTICO
      }
    }

    // Call update mutation
    updateMutation.mutate({
      id: activeTask.id,
      data: { ...activeTask, status: newStatus },
    });
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title?.toLowerCase().includes(search.toLowerCase()) ||
      task.description?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const getTaskUrgency = (task) => {
    if (!task.due_date || task.status === "done") return null;
    const dueDate = new Date(task.due_date);
    if (isPast(dueDate) && !isToday(dueDate)) return "overdue";
    if (isToday(dueDate)) return "today";
    return null;
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quadro de Tarefas</h1>
          <p className="text-sm text-slate-500">{tasks.length} tarefas no sistema</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar tarefas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 bg-white border-slate-200"
            />
          </div>
          <Button
            onClick={() => {
              setEditingTask(null);
              setShowForm(true);
            }}
            className="bg-[#1e3a5f] hover:bg-[#2d5a87] h-10 w-full sm:w-auto shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="w-full flex-1 overflow-x-auto pb-4 custom-scrollbar">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : filteredTasks.length === 0 && !search ? (
           <Card className="border-0 shadow-sm mt-4">
              <CardContent className="p-16 text-center text-slate-500">
                <Circle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Nenhuma tarefa no sistema. Crie a primeira tarefa!</p>
              </CardContent>
            </Card>
        ) : (
          <div className="flex gap-4 min-w-[1200px] h-[calc(100vh-220px)] mt-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              {COLUMNS.map((column) => (
                <div key={column.id} className="w-[300px] shrink-0">
                  <BoardColumn
                    column={column}
                    tasks={filteredTasks.filter((t) => {
                      if (column.id === 'todo') {
                        // Include todo and anything without a valid status mapped
                        return t.status === 'todo' || !['in_progress','review','done'].includes(t.status);
                      }
                      return t.status === column.id;
                    })}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                    getTaskUrgency={getTaskUrgency}
                  />
                </div>
              ))}
            </DndContext>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
