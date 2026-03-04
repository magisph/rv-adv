import React, { useState } from "react";
import { documentService } from "@/services";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  FileText,
  Image as ImageIcon,
  File,
  MoreVertical,
  Eye,
  Download,
  Edit,
  Trash2,
  Star,
  StarOff,
  AlertTriangle,
  Calendar,
  X,
} from "lucide-react";
import { DOCUMENT_CATEGORIES } from "./DocumentCategories";
import { format, differenceInDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const getFileIcon = (fileType) => {
  if (fileType?.startsWith("image/")) return ImageIcon;
  if (fileType?.includes("pdf")) return FileText;
  return File;
};

const formatFileSize = (bytes) => {
  if (!bytes) return "-";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

export default function DocumentListModal({
  category,
  documents = [],
  onClose,
  onRefresh,
  onViewDocument,
  onEditDocument,
}) {
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const categoryConfig = DOCUMENT_CATEGORIES[category];
  const categoryDocs = documents.filter(
    (doc) => doc.category === category && doc.is_active !== false,
  );

  // Agrupar documentos por subcategoria
  const groupedDocs = categoryConfig.subcategories.reduce((acc, sub) => {
    acc[sub.id] = categoryDocs.filter((doc) => doc.subcategory === sub.id);
    return acc;
  }, {});

  // Filtrar por busca
  const filteredGroups = Object.entries(groupedDocs).reduce(
    (acc, [subId, docs]) => {
      const filtered = docs.filter(
        (doc) =>
          doc.name?.toLowerCase().includes(search.toLowerCase()) ||
          doc.description?.toLowerCase().includes(search.toLowerCase()),
      );
      if (filtered.length > 0 || !search) {
        acc[subId] = filtered;
      }
      return acc;
    },
    {},
  );

  const deleteMutation = useMutation({
    mutationFn: (docId) =>
      documentService.update(docId, { is_active: false }),
    onSuccess: () => {
      setDeleteConfirm(null);
      onRefresh();
    },
  });

  const toggleMainMutation = useMutation({
    mutationFn: async ({ docId, isMain }) => {
      // Se estiver marcando como principal, desmarcar outros da mesma categoria
      if (isMain) {
        const mainDocs = categoryDocs.filter(
          (d) => d.is_main && d.id !== docId,
        );
        for (const doc of mainDocs) {
          await documentService.update(doc.id, { is_main: false });
        }
      }
      return documentService.update(docId, { is_main: isMain });
    },
    onSuccess: onRefresh,
  });

  const handleDownload = (doc) => {
    const link = document.createElement("a");
    link.href = doc.file_url;
    link.download = doc.name;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getExpirationStatus = (expirationDate) => {
    if (!expirationDate) return null;
    const days = differenceInDays(new Date(expirationDate), new Date());
    if (days < 0)
      return {
        status: "expired",
        label: "Vencido",
        color: "bg-red-100 text-red-700",
      };
    if (days <= 7)
      return {
        status: "urgent",
        label: `Vence em ${days}d`,
        color: "bg-red-100 text-red-700",
      };
    if (days <= 30)
      return {
        status: "warning",
        label: `Vence em ${days}d`,
        color: "bg-amber-100 text-amber-700",
      };
    return null;
  };

  const getSubcategoryLabel = (subId) => {
    return (
      categoryConfig.subcategories.find((s) => s.id === subId)?.label || subId
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 rounded-lg"
        style={{ backgroundColor: categoryConfig.bgColor }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: categoryConfig.color }}
          >
            <categoryConfig.icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold" style={{ color: categoryConfig.color }}>
              {categoryConfig.name}
            </h3>
            <p className="text-sm text-slate-600">
              {categoryDocs.length} documento(s)
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar documentos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista agrupada por subcategoria */}
      {categoryDocs.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>Nenhum documento nesta categoria</p>
        </div>
      ) : (
        <Accordion
          type="multiple"
          defaultValue={Object.keys(filteredGroups)}
          className="space-y-2"
        >
          {categoryConfig.subcategories.map((sub) => {
            const docs = filteredGroups[sub.id] || [];
            if (docs.length === 0 && search) return null;

            return (
              <AccordionItem
                key={sub.id}
                value={sub.id}
                className="border rounded-lg overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">{sub.label}</span>
                    <Badge variant="secondary" className="ml-2">
                      {docs.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {docs.length === 0 ? (
                    <p className="text-sm text-slate-500 px-4 py-2">
                      Nenhum documento
                    </p>
                  ) : (
                    <div className="divide-y">
                      <AnimatePresence>
                        {docs.map((doc, index) => {
                          const FileIcon = getFileIcon(doc.file_type);
                          const expStatus = getExpirationStatus(
                            doc.expiration_date,
                          );

                          return (
                            <motion.div
                              key={doc.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                            >
                              {/* Thumbnail/Icon */}
                              <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">
                                {doc.file_type?.startsWith("image/") ? (
                                  <img
                                    src={doc.file_url}
                                    alt={doc.name}
                                    className="w-full h-full object-cover rounded"
                                  />
                                ) : (
                                  <FileIcon className="w-5 h-5 text-slate-400" />
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => onViewDocument(doc)}
                                    className="font-medium text-sm text-slate-800 hover:text-blue-600 truncate text-left"
                                  >
                                    {doc.name}
                                  </button>
                                  {doc.is_main && (
                                    <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                                  )}
                                  {expStatus && (
                                    <Badge
                                      className={`${expStatus.color} text-xs flex-shrink-0`}
                                    >
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      {expStatus.label}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                  <span>{formatFileSize(doc.file_size)}</span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(
                                      new Date(doc.created_at),
                                      "dd/MM/yyyy",
                                    )}
                                  </span>
                                </div>
                              </div>

                              {/* Actions */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => onViewDocument(doc)}
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    Visualizar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDownload(doc)}
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => onEditDocument(doc)}
                                  >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Editar Info
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      toggleMainMutation.mutate({
                                        docId: doc.id,
                                        isMain: !doc.is_main,
                                      })
                                    }
                                  >
                                    {doc.is_main ? (
                                      <>
                                        <StarOff className="w-4 h-4 mr-2" />
                                        Remover Principal
                                      </>
                                    ) : (
                                      <>
                                        <Star className="w-4 h-4 mr-2" />
                                        Marcar Principal
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setDeleteConfirm(doc)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir o documento "{deleteConfirm?.name}"? Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteConfirm.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
