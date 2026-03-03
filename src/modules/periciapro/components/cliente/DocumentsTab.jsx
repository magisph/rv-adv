import React, { useState, useMemo } from "react";
import { storageService } from "@/modules/periciapro/services/storageService";
import { periciaService } from "@/modules/periciapro/services/periciaService";
import { activityLogService } from "@/modules/periciapro/services/activityLogService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Trash2,
  Upload,
  Loader2,
  ExternalLink,
  Search,
  File,
  FileImage,
  X,
  Image as ImageIcon,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const DOCUMENT_CATEGORIES = [
  "Identificação (RG/CPF/CNH)",
  "Comprovante de Residência",
  "Laudo Médico",
  "Receita Médica",
  "Exames",
  "CNIS",
  "Carteira de Trabalho",
  "Procuração",
  "Contrato",
  "Petição",
  "Outros",
];

export default function DocumentsTab({ pericia, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [uploadCategory, setUploadCategory] = useState("Outros");

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      // Upload paralelo de todos os arquivos
      const uploadPromises = files.map(async (file) => {
        const result = await storageService.uploadDocument(pericia.id, file);
        return {
          nome: file.name,
          url: result.publicUrl,
          tipo: file.type,
          categoria: uploadCategory,
          data_upload: new Date().toISOString(),
          storage_path: result.storagePath,
        };
      });

      const novosDocumentos = await Promise.all(uploadPromises);

      const documentosAtuais = pericia.documentos || [];
      const novaLista = [...documentosAtuais, ...novosDocumentos];

      await periciaService.update(pericia.id, {
        documentos: novaLista,
      });

      // Registrar log (resumido se forem muitos)
      const desc =
        novosDocumentos.length === 1
          ? `Documento anexado: ${novosDocumentos[0].nome} (${uploadCategory})`
          : `${novosDocumentos.length} documentos anexados em ${uploadCategory}`;

      await activityLogService.create({
        pericia_id: pericia.id,
        type: "document",
        description: desc,
      });

      onUpdate();
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      alert("Erro ao enviar arquivos. Tente novamente.");
    } finally {
      setUploading(false);
      e.target.value = ""; // Reset input
    }
  };

  const handleDelete = async (docToDelete, index) => {
    if (!confirm(`Tem certeza que deseja remover "${docToDelete.nome}"?`))
      return;

    const documentosAtuais = pericia.documentos || [];
    // Encontrar o índice real no array original (já que estamos filtrando na visualização)
    // Se o index vier do map filtrado, pode estar errado.
    // Melhor filtrar o array original removendo o objeto específico.
    // Mas como não temos ID único no documento, vamos usar o index passado se garantirmos que é do array original ou usar identificadores.
    // O ideal seria passar o index correto.
    // Vamos confiar que quem chama handleDelete passa o documento e vamos achá-lo na lista original.

    const novaLista = documentosAtuais.filter(
      (d) => d.storage_path !== docToDelete.storage_path || d.url !== docToDelete.url
    );

    await periciaService.update(pericia.id, { documentos: novaLista });

    await activityLogService.create({
      pericia_id: pericia.id,
      type: "document",
      description: `Documento removido: ${docToDelete.nome}`,
    });

    onUpdate();
  };

  const filteredDocs = useMemo(() => {
    let docs = pericia.documentos || [];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      docs = docs.filter(
        (doc) =>
          doc.nome.toLowerCase().includes(term) ||
          (doc.categoria || "").toLowerCase().includes(term),
      );
    }

    if (categoryFilter !== "all") {
      docs = docs.filter(
        (doc) => (doc.categoria || "Outros") === categoryFilter,
      );
    }

    // Inverte para mostrar os mais recentes primeiro
    return [...docs].reverse();
  }, [pericia.documentos, searchTerm, categoryFilter]);

  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith("image/"))
      return <ImageIcon className="w-8 h-8 text-purple-500" />;
    if (mimeType?.includes("pdf"))
      return <FileText className="w-8 h-8 text-red-500" />;
    if (mimeType?.includes("word") || mimeType?.includes("doc"))
      return <FileText className="w-8 h-8 text-blue-500" />;
    return <File className="w-8 h-8 text-slate-400" />;
  };

  const isImage = (mimeType) => mimeType?.startsWith("image/");

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Adicionar Documentos
        </h3>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2 w-full">
            <label className="text-sm font-medium text-slate-700">
              Categoria do Documento
            </label>
            <Select value={uploadCategory} onValueChange={setUploadCategory}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 w-full">
            <Button
              disabled={uploading}
              className="w-full relative cursor-pointer h-10 bg-blue-600 hover:bg-blue-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando arquivos...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Selecionar Arquivos (Múltiplos)
                </>
              )}
              <input
                type="file"
                multiple
                className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="w-full md:w-64">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <SelectValue placeholder="Filtrar por categoria" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Categorias</SelectItem>
              {DOCUMENT_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Section */}
      {filteredDocs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Nenhum documento encontrado.</p>
            {searchTerm || categoryFilter !== "all" ? (
              <Button
                variant="link"
                onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter("all");
                }}
              >
                Limpar filtros
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc, index) => (
            <Card
              key={`${doc.nome}-${index}`}
              className="group hover:shadow-lg transition-all duration-200 overflow-hidden border-slate-200"
            >
              <CardContent className="p-0">
                <div className="relative aspect-video bg-slate-100 flex items-center justify-center border-b border-slate-100">
                  {isImage(doc.tipo) ? (
                    <div className="w-full h-full relative overflow-hidden group-hover:scale-105 transition-transform duration-300">
                      <img
                        src={doc.url}
                        alt={doc.nome}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </div>
                  ) : (
                    <div className="transform group-hover:scale-110 transition-transform duration-300">
                      {getFileIcon(doc.tipo)}
                    </div>
                  )}

                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                    <Button
                      variant="secondary"
                      size="sm"
                      asChild
                      className="h-8 w-8 p-0 rounded-full shadow-lg"
                    >
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Visualizar/Baixar"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(doc, index)}
                      className="h-8 w-8 p-0 rounded-full shadow-lg"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <Badge
                      variant="outline"
                      className="text-[10px] px-2 py-0 h-5 font-normal truncate max-w-[150px] bg-slate-50"
                    >
                      {doc.categoria || "Outros"}
                    </Badge>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">
                      {doc.data_upload
                        ? format(new Date(doc.data_upload), "dd/MM/yy", {
                            locale: ptBR,
                          })
                        : "-"}
                    </span>
                  </div>
                  <p
                    className="font-medium text-sm text-slate-900 truncate"
                    title={doc.nome}
                  >
                    {doc.nome}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
