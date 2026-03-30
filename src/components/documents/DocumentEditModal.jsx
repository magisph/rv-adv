import React, { useState, useEffect } from "react";
import { documentService } from "@/services";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Save, X, FileText, Loader2, Plus } from "lucide-react";
import { DOCUMENT_CATEGORIES } from "./DocumentCategories";
import { format } from "date-fns";

export default function DocumentEditModal({ document, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    category: "",
    subcategory: "",
    description: "",
    expiration_date: "",
    is_main: false,
    tags: [],
  });
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (document) {
      setFormData({
        category: document.category || "",
        subcategory: document.subcategory || "",
        description: document.description || "",
        expiration_date: document.expiration_date || "",
        is_main: document.is_main || false,
        tags: document.tags || [],
      });
    }
  }, [document]);

  const updateMutation = useMutation({
    mutationFn: (data) => documentService.update(document.id, data),
    onSuccess: () => {
      onSuccess("Documento atualizado com sucesso");
    },
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Limpar subcategoria se mudar categoria
    if (field === "category") {
      setFormData((prev) => ({ ...prev, subcategory: "" }));
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const categoryConfig = formData.category
    ? DOCUMENT_CATEGORIES[formData.category]
    : null;

  if (!document) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Info do arquivo (não editável) */}
      <div className="p-4 bg-slate-50 rounded-lg">
        <div className="flex items-center gap-3">
          <FileText className="w-10 h-10 text-slate-600" />
          <div>
            <p className="font-medium">{document.name}</p>
            <p className="text-sm text-slate-600">
              Enviado em {format(new Date(document.created_at), "dd/MM/yyyy")}{" "}
              •
              {document.file_size
                ? ` ${(document.file_size / 1024 / 1024).toFixed(2)} MB`
                : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Categoria */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select
            value={formData.category}
            onValueChange={(v) => handleChange("category", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a categoria" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DOCUMENT_CATEGORIES).map(([key, cat]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Subcategoria</Label>
          <Select
            value={formData.subcategory}
            onValueChange={(v) => handleChange("subcategory", v)}
            disabled={!formData.category}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a subcategoria" />
            </SelectTrigger>
            <SelectContent>
              {categoryConfig?.subcategories.map((sub) => (
                <SelectItem key={sub.id} value={sub.id}>
                  {sub.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Descrição */}
      <div className="space-y-2">
        <Label>Descrição/Observações</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Informações adicionais sobre o documento"
          rows={3}
        />
      </div>

      {/* Data de validade */}
      <div className="space-y-2">
        <Label>Data de Validade</Label>
        <Input
          type="date"
          value={formData.expiration_date}
          onChange={(e) => handleChange("expiration_date", e.target.value)}
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="cursor-pointer">
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 hover:text-red-500"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Adicionar tag..."
            onKeyPress={(e) =>
              e.key === "Enter" && (e.preventDefault(), handleAddTag())
            }
          />
          <Button type="button" variant="outline" onClick={handleAddTag}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Documento principal */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="is-main"
          checked={formData.is_main}
          onCheckedChange={(checked) => handleChange("is_main", checked)}
        />
        <Label htmlFor="is-main" className="cursor-pointer">
          Marcar como documento principal desta categoria
        </Label>
      </div>

      {/* Botões */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={updateMutation.isPending}
          className="bg-legal-blue hover:bg-legal-blue-light"
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
