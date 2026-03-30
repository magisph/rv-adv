import React, { useState, useEffect } from "react";
import { clientService } from "@/services";
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
import { Save, X } from "lucide-react";

const AREAS = {
  previdenciario: "Previdenciário",
  civel: "Cível",
  procuradoria_mulher: "Procuradoria da Mulher",
  outros: "Outros",
};

export default function ProcessForm({
  process,
  preselectedClientId,
  onSave,
  onCancel,
  isSaving,
}) {
  const [formData, setFormData] = useState({
    process_number: "",
    client_id: preselectedClientId || "",
    client_name: "",
    court: "",
    subject: "",
    case_value: "",
    status: "ativo",
    distribution_date: "",
    area: "previdenciario",
    ...process,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list"],
    queryFn: () => clientService.list(),
  });

  useEffect(() => {
    if (process) {
      setFormData({ ...formData, ...process });
    }
  }, [process]);

  useEffect(() => {
    if (preselectedClientId && clients.length > 0) {
      const client = clients.find((c) => c.id === preselectedClientId);
      if (client) {
        setFormData((prev) => ({
          ...prev,
          client_id: client.id,
          client_name: client.full_name,
        }));
      }
    }
  }, [preselectedClientId, clients]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleClientChange = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    setFormData((prev) => ({
      ...prev,
      client_id: clientId,
      client_name: client?.full_name || "",
      area: client?.area || prev.area,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      case_value: formData.case_value ? parseFloat(formData.case_value) : null,
    };
    onSave(dataToSave);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="process_number">Número do Processo (CNJ) *</Label>
          <Input
            id="process_number"
            value={formData.process_number}
            onChange={(e) => handleChange("process_number", e.target.value)}
            required
            placeholder="0000000-00.0000.0.00.0000"
            className="font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client_id">Cliente *</Label>
          <Select
            value={formData.client_id}
            onValueChange={handleClientChange}
            required
          >
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
        <div className="space-y-2">
          <Label htmlFor="court">Tribunal/Vara</Label>
          <Input
            id="court"
            value={formData.court}
            onChange={(e) => handleChange("court", e.target.value)}
            placeholder="Ex: 1ª Vara Federal de São Paulo"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="area">Área do Direito *</Label>
          <Select
            value={formData.area}
            onValueChange={(v) => handleChange("area", v)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a área" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(AREAS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formData.client_id && (
            <p className="text-xs text-slate-600 mt-1">
              Área herdada do cliente (pode ser alterada)
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="case_value">Valor da Causa (R$)</Label>
          <Input
            id="case_value"
            type="number"
            step="0.01"
            value={formData.case_value}
            onChange={(e) => handleChange("case_value", e.target.value)}
            placeholder="0,00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="distribution_date">Data de Distribuição</Label>
          <Input
            id="distribution_date"
            type="date"
            value={formData.distribution_date}
            onChange={(e) => handleChange("distribution_date", e.target.value)}
          />
        </div>
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
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="suspenso">Suspenso</SelectItem>
              <SelectItem value="arquivado">Arquivado</SelectItem>
              <SelectItem value="encerrado">Encerrado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Assunto/Objeto</Label>
        <Textarea
          id="subject"
          value={formData.subject}
          onChange={(e) => handleChange("subject", e.target.value)}
          placeholder="Descreva o assunto ou objeto do processo"
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          className="bg-legal-blue hover:bg-legal-blue-light"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Salvando..." : "Salvar Processo"}
        </Button>
      </div>
    </form>
  );
}
