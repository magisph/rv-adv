import React, { useState, useEffect } from "react";
import { base44 } from "@/lib/adapters/legacyBase44";
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
import { Switch } from "@/components/ui/switch";
import { Save, X, Loader2 } from "lucide-react";

export default function DeadlineForm({
  deadline,
  preselectedProcessId,
  onSave,
  onCancel,
  isSaving,
}) {
  const [formData, setFormData] = useState({
    process_id: preselectedProcessId || "",
    process_number: "",
    client_name: "",
    due_date: "",
    description: "",
    priority: "media",
    alert_active: true,
    status: "pendente",
    ...deadline,
  });

  const { data: processes = [] } = useQuery({
    queryKey: ["processes-list"],
    queryFn: () => base44.entities.Process.list(),
  });

  useEffect(() => {
    if (deadline) {
      setFormData({ ...formData, ...deadline });
    }
  }, [deadline]);

  useEffect(() => {
    if (preselectedProcessId && processes.length > 0) {
      const process = processes.find((p) => p.id === preselectedProcessId);
      if (process) {
        setFormData((prev) => ({
          ...prev,
          process_id: process.id,
          process_number: process.process_number,
          client_name: process.client_name,
        }));
      }
    }
  }, [preselectedProcessId, processes]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleProcessChange = (processId) => {
    const process = processes.find((p) => p.id === processId);
    setFormData((prev) => ({
      ...prev,
      process_id: processId,
      process_number: process?.process_number || "",
      client_name: process?.client_name || "",
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="process_id">Processo *</Label>
        <Select
          value={formData.process_id}
          onValueChange={handleProcessChange}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione um processo" />
          </SelectTrigger>
          <SelectContent>
            {processes.map((process) => (
              <SelectItem key={process.id} value={process.id}>
                {process.process_number} - {process.client_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          required
          placeholder="Ex: Prazo para contestação"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="due_date">Data Limite *</Label>
          <Input
            id="due_date"
            type="date"
            value={formData.due_date}
            onChange={(e) => handleChange("due_date", e.target.value)}
            required
          />
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
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
        <div>
          <Label htmlFor="alert_active">Alerta Ativo</Label>
          <p className="text-sm text-slate-500">
            Receber notificação antes do vencimento
          </p>
        </div>
        <Switch
          id="alert_active"
          checked={formData.alert_active}
          onCheckedChange={(v) => handleChange("alert_active", v)}
        />
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
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar
        </Button>
      </div>
    </form>
  );
}
