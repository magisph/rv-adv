import React, { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Save, X, Plus } from "lucide-react";

const CATEGORIES = {
  peticao_inicial: "Petição Inicial",
  recurso: "Recurso",
  contestacao: "Contestação",
  contrato: "Contrato",
  procuracao: "Procuração",
  notificacao: "Notificação",
  outros: "Outros",
};

const DEFAULT_VARIABLES = [
  "nome_cliente",
  "cpf_cliente",
  "numero_processo",
  "data_hoje",
  "nome_advogado",
  "oab_advogado",
  "tribunal",
  "valor_causa",
];

export default function TemplateForm({ template, onSave, onCancel, isSaving }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "outros",
    content: "",
    variables: [],
    ...template,
  });

  const [newVariable, setNewVariable] = useState("");

  useEffect(() => {
    if (template) {
      setFormData({ ...formData, ...template });
    }
  }, [template]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addVariable = (variable) => {
    if (variable && !formData.variables?.includes(variable)) {
      setFormData((prev) => ({
        ...prev,
        variables: [...(prev.variables || []), variable],
      }));
    }
    setNewVariable("");
  };

  const removeVariable = (variable) => {
    setFormData((prev) => ({
      ...prev,
      variables: prev.variables?.filter((v) => v !== variable) || [],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Nome do Template *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
            placeholder="Ex: Petição Inicial Previdenciária"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
          <Select
            value={formData.category}
            onValueChange={(v) => handleChange("category", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORIES).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Breve descrição do template"
          rows={2}
        />
      </div>

      <div className="space-y-3">
        <Label>Variáveis</Label>
        <p className="text-xs text-slate-500">
          Use a sintaxe {"{{variavel}}"} no conteúdo do template
        </p>

        <div className="flex flex-wrap gap-2">
          {formData.variables?.map((variable) => (
            <Badge
              key={variable}
              variant="secondary"
              className="cursor-pointer hover:bg-red-100 hover:text-red-700"
              onClick={() => removeVariable(variable)}
            >
              {`{{${variable}}}`}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          ))}
        </div>

        <div className="flex gap-2">
          <Select value="" onValueChange={addVariable}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Adicionar variável" />
            </SelectTrigger>
            <SelectContent>
              {DEFAULT_VARIABLES.filter(
                (v) => !formData.variables?.includes(v),
              ).map((variable) => (
                <SelectItem key={variable} value={variable}>
                  {`{{${variable}}}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            <Input
              placeholder="Variável personalizada"
              value={newVariable}
              onChange={(e) =>
                setNewVariable(e.target.value.replace(/[^a-z_]/g, ""))
              }
              className="w-40"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => addVariable(newVariable)}
              disabled={!newVariable}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Conteúdo Inicial (opcional)</Label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e) => handleChange("content", e.target.value)}
          placeholder="Digite o conteúdo inicial do template ou deixe em branco para editar depois"
          rows={6}
          className="font-mono text-sm"
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
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
