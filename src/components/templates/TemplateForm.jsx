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
import { Save, X, Plus, UploadCloud } from "lucide-react";
import { supabase } from "@/lib/supabase";

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
    file_url: "",
    variables: [],
    ...template,
  });

  const [newVariable, setNewVariable] = useState("");
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (template) {
      setFormData({ ...formData, ...template });
    }
  }, [template]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    let finalFormData = { ...formData };
    
    if (file) {
      setIsUploading(true);
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('document-templates')
          .upload(filePath, file);
          
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage
          .from('document-templates')
          .getPublicUrl(filePath);
          
        finalFormData.file_url = publicUrlData.publicUrl;
      } catch (error) {
        console.error("Upload error", error);
        alert("Erro no upload do arquivo.");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    } else if (!finalFormData.file_url) {
      alert("Selecione um arquivo .docx para o molde.");
      return;
    }
    
    delete finalFormData.content; // Garantir limpeza se vier do legado
    delete finalFormData.id;
    delete finalFormData.created_at;
    delete finalFormData.updated_at;

    onSave(finalFormData);
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
        <p className="text-xs text-slate-600">
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
        <Label htmlFor="file_url">Arquivo do Molde (.docx) *</Label>
        <div className="flex items-center gap-4">
          <Input
            id="file_url"
            type="file"
            accept=".docx"
            onChange={handleFileChange}
            className="flex-1"
          />
          {formData.file_url && !file && (
            <span className="text-sm text-green-600 truncate max-w-[200px]">
              Arquivo já anexado
            </span>
          )}
        </div>
        <p className="text-xs text-slate-600">
          Faça upload de um arquivo Word (.docx) contendo as variáveis desejadas.
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving || isUploading}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSaving || isUploading}
          className="bg-legal-blue hover:bg-legal-blue-light"
        >
          {isUploading ? <UploadCloud className="w-4 h-4 mr-2 animate-bounce" /> : <Save className="w-4 h-4 mr-2" />}
          {isSaving || isUploading ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
