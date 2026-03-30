import React, { useState } from "react";
import { processMoveService } from "@/services";
import { useMutation } from "@tanstack/react-query";
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
import { Save, X, Loader2 } from "lucide-react";

const MOVE_TYPES = {
  despacho: "Despacho",
  sentenca: "Sentença",
  decisao: "Decisão",
  peticao: "Petição",
  intimacao: "Intimação",
  citacao: "Citação",
  audiencia: "Audiência",
  outros: "Outros",
};

export default function ProcessMoveForm({
  processId,
  processNumber,
  onSuccess,
  onCancel,
}) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    move_type: "outros",
    source: "manual",
  });

  const createMutation = useMutation({
    mutationFn: (data) =>
      processMoveService.create({
        ...data,
        process_id: processId,
        process_number: processNumber,
      }),
    onSuccess,
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Data *</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => handleChange("date", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="move_type">Tipo</Label>
          <Select
            value={formData.move_type}
            onValueChange={(v) => handleChange("move_type", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(MOVE_TYPES).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          required
          placeholder="Descreva a movimentação processual"
          rows={4}
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={createMutation.isPending}
          className="bg-legal-blue hover:bg-legal-blue-light"
        >
          {createMutation.isPending ? (
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
