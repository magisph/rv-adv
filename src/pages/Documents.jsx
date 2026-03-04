import React, { useState } from "react";
import { documentService, documentFolderService } from "@/services";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  FileText,
  Search,
  Upload,
  MoreVertical,
  Eye,
  Trash2,
  FolderPlus,
  Folder,
  History,
} from "lucide-react";
import { format } from "date-fns";
import DocumentUpload from "@/components/documents/DocumentUpload";

export default function Documents() {
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(null);

  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["all-documents"],
    queryFn: () => documentService.list("-created_date"),
  });

  const { data: folders = [] } = useQuery({
    queryKey: ["document-folders"],
    queryFn: () => documentFolderService.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => documentService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["all-documents"] }),
  });

  const handleDelete = (doc) => {
    if (confirm(`Deseja excluir o documento "${doc.name}"?`)) {
      deleteMutation.mutate(doc.id);
    }
  };

  // Filter by search and OCR content
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.name?.toLowerCase().includes(search.toLowerCase()) ||
      doc.ocr_content?.toLowerCase().includes(search.toLowerCase()) ||
      doc.document_type?.toLowerCase().includes(search.toLowerCase());
    const matchesFolder = !selectedFolder || doc.folder_id === selectedFolder;
    return matchesSearch && matchesFolder;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Documentos</h1>
          <p className="text-slate-500">
            {documents.length} documentos no total
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FolderPlus className="w-4 h-4 mr-2" />
            Nova Pasta
          </Button>
          <Button
            onClick={() => setShowUpload(true)}
            className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome ou conteúdo (OCR)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {search && (
            <p className="text-xs text-slate-500 mt-2">
              Buscando em nomes de documentos e conteúdo extraído por OCR
            </p>
          )}
        </CardContent>
      </Card>

      {/* Folders */}
      {folders.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedFolder === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedFolder(null)}
          >
            Todos
          </Button>
          {folders.map((folder) => (
            <Button
              key={folder.id}
              variant={selectedFolder === folder.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFolder(folder.id)}
            >
              <Folder className="w-3 h-3 mr-1" />
              {folder.name}
            </Button>
          ))}
        </div>
      )}

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="h-32 bg-slate-100 animate-pulse rounded" />
              </CardContent>
            </Card>
          ))
        ) : filteredDocuments.length === 0 ? (
          <Card className="border-0 shadow-sm col-span-full">
            <CardContent className="p-12 text-center text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Nenhum documento encontrado</p>
            </CardContent>
          </Card>
        ) : (
          filteredDocuments.map((doc) => (
            <Card
              key={doc.id}
              className="border-0 shadow-sm hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-800 truncate">
                      {doc.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {doc.document_type || "outros"}
                      </Badge>
                      {doc.current_version && doc.current_version > 1 && (
                        <Badge
                          variant="outline"
                          className="text-xs flex items-center gap-1"
                        >
                          <History className="w-3 h-3" />v{doc.current_version}
                        </Badge>
                      )}
                    </div>
                    {doc.ocr_processed && (
                      <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                        {doc.ocr_content?.substring(0, 100)}...
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-2">
                      {format(new Date(doc.created_date), "dd/MM/yyyy")}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Visualizar
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <History className="w-4 h-4 mr-2" />
                        Ver Versões
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(doc)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload de Documento</DialogTitle>
          </DialogHeader>
          <DocumentUpload
            parentType="client"
            parentId=""
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["all-documents"] });
              setShowUpload(false);
            }}
            onCancel={() => setShowUpload(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
