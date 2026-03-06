import React, { useState } from "react";
import { documentTemplateService } from "@/services";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  FileText,
  Edit,
  Trash2,
  Copy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TemplateForm from "@/components/templates/TemplateForm";
import TemplateEditor from "@/components/templates/TemplateEditor";

const CATEGORY_COLORS = {
  peticao_inicial: "bg-blue-100 text-blue-700",
  recurso: "bg-purple-100 text-purple-700",
  contestacao: "bg-orange-100 text-orange-700",
  contrato: "bg-green-100 text-green-700",
  procuracao: "bg-amber-100 text-amber-700",
  notificacao: "bg-red-100 text-red-700",
  outros: "bg-slate-100 text-slate-700",
};

const CATEGORY_LABELS = {
  peticao_inicial: "Petição Inicial",
  recurso: "Recurso",
  contestacao: "Contestação",
  contrato: "Contrato",
  procuracao: "Procuração",
  notificacao: "Notificação",
  outros: "Outros",
};

export default function Templates() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryFn: () => documentTemplateService.list("-created_at"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => documentTemplateService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => documentTemplateService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      setShowForm(false);
      setShowEditor(false);
      setEditingTemplate(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => documentTemplateService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });

  const handleSave = (data) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleOpenEditor = (template) => {
    setSelectedTemplate(template);
    setShowEditor(true);
  };

  const handleDelete = async (template) => {
    if (confirm(`Deseja realmente excluir o template "${template.name}"?`)) {
      deleteMutation.mutate(template.id);
    }
  };

  const handleDuplicate = async (template) => {
    createMutation.mutate({
      name: `${template.name} (Cópia)`,
      file_url: template.file_url,
      description: template.description,
    });
  };

  const filteredTemplates = templates.filter(
    (template) =>
      template.description?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Templates</h1>
          <p className="text-slate-500">
            {templates.length} modelos disponíveis
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingTemplate(null);
            setShowForm(true);
          }}
          className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Template
        </Button>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-48 bg-slate-100 animate-pulse rounded-xl"
            />
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">Nenhum template encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredTemplates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => handleOpenEditor(template)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#2d5a87] flex items-center justify-center">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(template);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicate(template);
                            }}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(template);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-2">
                      {template.name}
                    </h3>
                    {template.description && (
                      <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge className={CATEGORY_COLORS[template.category]}>
                        {CATEGORY_LABELS[template.category]}
                      </Badge>
                      {template.variables?.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {template.variables.length} variáveis
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Editar Template" : "Novo Template"}
            </DialogTitle>
          </DialogHeader>
          <TemplateForm
            template={editingTemplate}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingTemplate(null);
            }}
            isSaving={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-5xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>Editor: {selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <TemplateEditor
              template={selectedTemplate}
              onSave={(data) =>
                updateMutation.mutate({ id: selectedTemplate.id, data })
              }
              onClose={() => setShowEditor(false)}
              isSaving={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
