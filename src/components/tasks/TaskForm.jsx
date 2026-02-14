import React, { useState, useEffect } from "react";
import { authService } from "@/services/authService";
import { userService, clientService, processService, beneficioService } from "@/services";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X, Crown } from "lucide-react";

export default function TaskForm({ task, onSave, onCancel, isSaving }) {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
    };
    loadUser();
  }, []);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "media",
    due_date: "",
    assigned_to: "",
    assigned_name: "",
    client_id: "",
    client_name: "",
    process_id: "",
    process_number: "",
    beneficio_id: "",
    beneficio_tipo: "",
    ...task,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => userService.list(),
  });

  const isAdmin = currentUser?.role === "admin";
  const isCollaborativeMode = users.length > 1;

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list"],
    queryFn: () => clientService.list(),
  });

  const { data: processes = [] } = useQuery({
    queryKey: ["processes-list"],
    queryFn: () => processService.list(),
  });

  const { data: beneficios = [] } = useQuery({
    queryKey: ["beneficios-list"],
    queryFn: () => beneficioService.list(),
  });

  useEffect(() => {
    if (task) {
      setFormData({ ...formData, ...task });
    }
  }, [task]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleUserChange = (userId) => {
    const user = users.find((u) => u.id === userId);
    setFormData((prev) => ({
      ...prev,
      assigned_to: user?.email || "",
      assigned_name: user?.full_name || "",
    }));
  };

  const handleClientChange = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    setFormData((prev) => ({
      ...prev,
      client_id: clientId,
      client_name: client?.full_name || "",
    }));
  };

  const handleProcessChange = (processId) => {
    const process = processes.find((p) => p.id === processId);
    setFormData((prev) => ({
      ...prev,
      process_id: processId,
      process_number: process?.process_number || "",
    }));
  };

  const handleBeneficioChange = (beneficioId) => {
    const beneficio = beneficios.find((b) => b.id === beneficioId);
    setFormData((prev) => ({
      ...prev,
      beneficio_id: beneficioId,
      beneficio_tipo: beneficio?.tipo_beneficio || "",
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Título *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          required
          placeholder="Digite o título da tarefa"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Descreva a tarefa"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(v) => handleChange("status", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">A Fazer</SelectItem>
              <SelectItem value="in_progress">Em Progresso</SelectItem>
              <SelectItem value="done">Concluída</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Prioridade</Label>
          <Select
            value={formData.priority}
            onValueChange={(v) => handleChange("priority", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="due_date">Vencimento</Label>
          <Input
            id="due_date"
            type="date"
            value={formData.due_date}
            onChange={(e) => handleChange("due_date", e.target.value)}
          />
        </div>
      </div>

      {isAdmin && isCollaborativeMode && (
        <div className="space-y-2">
          <Label htmlFor="assigned_to">Responsável</Label>
          <Select
            value={
              users.find((u) => u.email === formData.assigned_to)?.id || ""
            }
            onValueChange={handleUserChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um responsável" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  <div className="flex items-center gap-2">
                    {user.full_name || user.email}
                    {user.role === "admin" && (
                      <Crown className="w-3 h-3 text-amber-500" />
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="client_id">Cliente (opcional)</Label>
          <Select value={formData.client_id} onValueChange={handleClientChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="process_id">Processo (opcional)</Label>
            <Select
              value={formData.process_id}
              onValueChange={handleProcessChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um processo" />
              </SelectTrigger>
              <SelectContent>
                {processes.map((process) => (
                  <SelectItem key={process.id} value={process.id}>
                    {process.process_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="beneficio_id">Benefício (opcional)</Label>
            <Select
              value={formData.beneficio_id}
              onValueChange={handleBeneficioChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um benefício" />
              </SelectTrigger>
              <SelectContent>
                {beneficios.map((beneficio) => (
                  <SelectItem key={beneficio.id} value={beneficio.id}>
                    {beneficio.tipo_beneficio} - {beneficio.client_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
