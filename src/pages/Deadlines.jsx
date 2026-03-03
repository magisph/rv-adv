import React, { useState, useEffect } from "react";
import { authService } from "@/services/authService";
import { deadlineService } from "@/services";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
  Calendar,
  Edit,
  Trash2,
  Check,
  Clock,
  AlertTriangle,
  Filter,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, differenceInDays, parseISO } from "date-fns";
import DeadlineForm from "@/components/deadlines/DeadlineForm";

const PRIORITY_COLORS = {
  baixa: "bg-slate-100 text-slate-700 border-slate-200",
  media: "bg-blue-100 text-blue-700 border-blue-200",
  alta: "bg-orange-100 text-orange-700 border-orange-200",
  urgente: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_COLORS = {
  pendente: "bg-amber-100 text-amber-700",
  concluido: "bg-green-100 text-green-700",
  cancelado: "bg-slate-100 text-slate-500",
};

export default function Deadlines() {
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedProcessId = urlParams.get("process_id");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pendente");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showForm, setShowForm] = useState(!!preselectedProcessId);
  const [editingDeadline, setEditingDeadline] = useState(null);
  const [user, setUser] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const u = await authService.getCurrentUser();
      setUser(u);
    };
    loadUser();
  }, []);

  const { data: deadlines = [], isLoading } = useQuery({
    queryKey: ["deadlines"],
    queryFn: () => deadlineService.list("-due_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => deadlineService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["deadlines"]);
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => deadlineService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["deadlines"]);
      setShowForm(false);
      setEditingDeadline(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deadlineService.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["deadlines"]),
  });

  const handleSave = (data) => {
    if (editingDeadline) {
      updateMutation.mutate({ id: editingDeadline.id, data });
    } else {
      createMutation.mutate({
        ...data,
        responsible_email: user?.email,
        responsible_name: user?.full_name,
      });
    }
  };

  const handleToggleStatus = async (deadline) => {
    const newStatus = deadline.status === "pendente" ? "concluido" : "pendente";
    updateMutation.mutate({ id: deadline.id, data: { status: newStatus } });
  };

  const handleEdit = (deadline) => {
    setEditingDeadline(deadline);
    setShowForm(true);
  };

  const handleDelete = async (deadline) => {
    if (confirm(`Deseja excluir o prazo "${deadline.description}"?`)) {
      deleteMutation.mutate(deadline.id);
    }
  };

  const getDeadlineStatus = (dueDate) => {
    const diff = differenceInDays(parseISO(dueDate), new Date());
    if (diff < 0)
      return { label: "Vencido", icon: AlertTriangle, color: "text-red-600" };
    if (diff === 0)
      return { label: "Hoje", icon: Clock, color: "text-orange-600" };
    if (diff <= 2)
      return { label: `${diff}d`, icon: Clock, color: "text-amber-600" };
    return { label: `${diff}d`, icon: Calendar, color: "text-slate-500" };
  };

  const filteredDeadlines = deadlines
    .filter((d) => {
      const matchesSearch =
        d.description?.toLowerCase().includes(search.toLowerCase()) ||
        d.process_number?.toLowerCase().includes(search.toLowerCase()) ||
        d.client_name?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || d.status === statusFilter;
      const matchesPriority =
        priorityFilter === "all" || d.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    })
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Prazos</h1>
          <p className="text-slate-500">
            {deadlines.filter((d) => d.status === "pendente").length} prazos
            pendentes
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingDeadline(null);
            setShowForm(true);
          }}
          className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Prazo
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar prazos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="concluido">Concluídos</SelectItem>
                  <SelectItem value="cancelado">Cancelados</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-36">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deadlines List */}
      <div className="space-y-3">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-slate-100 animate-pulse rounded-xl"
            />
          ))
        ) : filteredDeadlines.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500">Nenhum prazo encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence>
            {filteredDeadlines.map((deadline, index) => {
              const status = getDeadlineStatus(deadline.due_date);
              const StatusIcon = status.icon;

              return (
                <motion.div
                  key={deadline.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className={`
                    border-0 shadow-sm hover:shadow-md transition-all
                    ${deadline.status === "concluido" ? "opacity-60" : ""}
                  `}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={deadline.status === "concluido"}
                          onCheckedChange={() => handleToggleStatus(deadline)}
                          className="w-5 h-5"
                        />

                        <div
                          className={`w-1 h-12 rounded-full ${
                            deadline.priority === "urgente"
                              ? "bg-red-500"
                              : deadline.priority === "alta"
                                ? "bg-orange-500"
                                : deadline.priority === "media"
                                  ? "bg-blue-500"
                                  : "bg-slate-300"
                          }`}
                        />

                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-medium ${deadline.status === "concluido" ? "line-through text-slate-400" : "text-slate-800"}`}
                          >
                            {deadline.description}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                            <Link
                              to={createPageUrl(
                                `ProcessDetail?id=${deadline.process_id}`,
                              )}
                              className="hover:text-blue-600 font-mono"
                            >
                              {deadline.process_number}
                            </Link>
                            <span>•</span>
                            <span>{deadline.client_name}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div
                              className={`flex items-center gap-1 ${status.color}`}
                            >
                              <StatusIcon className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                {status.label}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              {format(
                                parseISO(deadline.due_date),
                                "dd/MM/yyyy",
                              )}
                            </p>
                          </div>

                          <Badge
                            variant="outline"
                            className={PRIORITY_COLORS[deadline.priority]}
                          >
                            {deadline.priority}
                          </Badge>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(deadline)}
                              >
                                <Check className="w-4 h-4 mr-2" />
                                {deadline.status === "concluido"
                                  ? "Reabrir"
                                  : "Concluir"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEdit(deadline)}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(deadline)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingDeadline ? "Editar Prazo" : "Novo Prazo"}
            </DialogTitle>
          </DialogHeader>
          <DeadlineForm
            deadline={editingDeadline}
            preselectedProcessId={preselectedProcessId}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingDeadline(null);
            }}
            isSaving={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
