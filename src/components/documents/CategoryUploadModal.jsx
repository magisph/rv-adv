import React, { useState, useCallback } from "react";
import { documentService } from "@/services";
import { aiService } from "@/services/aiService";
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
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  File,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { DOCUMENT_CATEGORIES } from "./DocumentCategories";
import { motion, AnimatePresence } from "framer-motion";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const getFileIcon = (fileType) => {
  if (fileType?.startsWith("image/")) return ImageIcon;
  if (fileType?.includes("pdf")) return FileText;
  return File;
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

export default function CategoryUploadModal({
  category,
  parentType,
  parentId,
  onSuccess,
  onCancel,
}) {
  const [files, setFiles] = useState([]);
  const [subcategory, setSubcategory] = useState("");
  const [description, setDescription] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [isMain, setIsMain] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadStatus, setUploadStatus] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const categoryConfig = DOCUMENT_CATEGORIES[category];

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    addFiles(selectedFiles);
  };

  const addFiles = (newFiles) => {
    const validFiles = newFiles.filter((file) => {
      const fileExt = file.name.split('.').pop().toLowerCase();
      const validExts = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'tiff'];

      if (!ACCEPTED_TYPES.includes(file.type) && !validExts.includes(fileExt)) {
        alert(`Arquivo "${file.name}" não é um tipo aceito.`);
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        alert(`Arquivo "${file.name}" excede o tamanho máximo de 10MB.`);
        return false;
      }
      return true;
    });

    setFiles((prev) => [
      ...prev,
      ...validFiles.map((file) => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
      })),
    ]);
  };

  const removeFile = (fileId) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const uploadFiles = async () => {
    if (files.length === 0 || !subcategory) {
      alert("Selecione arquivos e uma subcategoria.");
      return;
    }

    setIsUploading(true);
    let successCount = 0;

    for (const fileData of files) {
      try {
        setUploadStatus((prev) => ({ ...prev, [fileData.id]: "uploading" }));
        setUploadProgress((prev) => ({ ...prev, [fileData.id]: 30 }));

        // Upload do arquivo
        const { file_url } = await aiService.uploadFile({
          file: fileData.file,
        });

        setUploadProgress((prev) => ({ ...prev, [fileData.id]: 70 }));

        // Processar OCR para PDFs e imagens
        let ocrContent = null;
        let ocrProcessed = false;
        const isOcrCompatible =
          fileData.type?.includes("pdf") || fileData.type?.startsWith("image/");

        if (isOcrCompatible) {
          try {
            const ocrResponse = await aiService.invokeLLM({
              prompt:
                "Extraia todo o texto deste documento. Retorne o texto completo extraído sem nenhuma formatação adicional ou comentário.",
              file_urls: [file_url],
              response_json_schema: {
                type: "object",
                properties: {
                  extracted_text: { type: "string" },
                  metadata: {
                    type: "object",
                    properties: {
                      page_count: { type: "number" },
                      has_text: { type: "boolean" },
                    },
                  },
                },
              },
            });
            ocrContent = ocrResponse.extracted_text;
            ocrProcessed = true;
          } catch (error) {
            console.log(
              "OCR processing failed, continuing without OCR:",
              error,
            );
          }
        }

        setUploadProgress((prev) => ({ ...prev, [fileData.id]: 85 }));

        // Criar registro do documento
        await documentService.create({
          name: fileData.name,
          file_url,
          category,
          subcategory,
          parent_type: parentType,
          parent_id: parentId,
          description: description || null,
          expiration_date: expirationDate || null,
          is_main: isMain && successCount === 0,
          file_size: fileData.size,
          file_type: fileData.type || null,
          is_active: true,
          current_version: 1,
          ocr_content: ocrContent,
          ocr_processed: ocrProcessed,
        });

        setUploadProgress((prev) => ({ ...prev, [fileData.id]: 100 }));
        setUploadStatus((prev) => ({ ...prev, [fileData.id]: "success" }));
        successCount++;
      } catch (error) {
        console.error("Erro no upload:", error);
        setUploadStatus((prev) => ({ ...prev, [fileData.id]: "error" }));
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      setTimeout(() => {
        onSuccess(
          `${successCount} arquivo(s) enviado(s) com sucesso para ${categoryConfig.name}`,
        );
      }, 500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com cor da categoria */}
      <div
        className="flex items-center gap-3 p-4 rounded-lg"
        style={{ backgroundColor: categoryConfig.bgColor }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: categoryConfig.color }}
        >
          <categoryConfig.icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold" style={{ color: categoryConfig.color }}>
            Upload - {categoryConfig.name}
          </h3>
          <p className="text-sm text-slate-600">{categoryConfig.description}</p>
        </div>
      </div>

      {/* Seleção de subcategoria */}
      <div className="space-y-2">
        <Label>Subcategoria *</Label>
        <Select value={subcategory} onValueChange={setSubcategory}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo de documento" />
          </SelectTrigger>
          <SelectContent>
            {categoryConfig.subcategories.map((sub) => (
              <SelectItem key={sub.id} value={sub.id}>
                {sub.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Área de Drag and Drop */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer
          ${
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById("file-input").click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.tiff"
          className="hidden"
          onChange={handleFileSelect}
        />
        <Upload className="w-12 h-12 mx-auto text-slate-600 mb-3" />
        <p className="text-slate-600 font-medium">
          Arraste arquivos aqui ou clique para selecionar
        </p>
        <p className="text-sm text-slate-600 mt-2">
          PDF, DOC, DOCX, JPG, PNG, TIFF (máx. 10MB por arquivo)
        </p>
      </div>

      {/* Lista de arquivos selecionados */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <Label>Arquivos selecionados ({files.length})</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {files.map((fileData) => {
                const FileIcon = getFileIcon(fileData.type);
                const status = uploadStatus[fileData.id];
                const progress = uploadProgress[fileData.id] || 0;

                return (
                  <motion.div
                    key={fileData.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                  >
                    <FileIcon className="w-8 h-8 text-slate-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {fileData.name}
                      </p>
                      <p className="text-xs text-slate-600">
                        {formatFileSize(fileData.size)}
                      </p>
                      {status === "uploading" && (
                        <Progress value={progress} className="h-1 mt-1" />
                      )}
                    </div>
                    {status === "success" && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {status === "error" && (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                    {status === "uploading" && (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    )}
                    {!status && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-600 hover:text-red-500"
                        onClick={() => removeFile(fileData.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Campos opcionais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Descrição/Observações (opcional)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Informações adicionais sobre o documento"
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label>Data de Validade (opcional)</Label>
          <Input
            type="date"
            value={expirationDate}
            onChange={(e) => setExpirationDate(e.target.value)}
          />
        </div>
      </div>

      {/* Checkbox documento principal */}
      <div className="flex items-center gap-2">
        <Checkbox id="is-main" checked={isMain} onCheckedChange={setIsMain} />
        <Label htmlFor="is-main" className="text-sm cursor-pointer">
          Marcar como documento principal desta categoria
        </Label>
      </div>

      {/* Botões de ação */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isUploading}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button
          onClick={uploadFiles}
          disabled={files.length === 0 || !subcategory || isUploading}
          style={{ backgroundColor: categoryConfig.color }}
          className="text-white"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Enviar {files.length > 0 ? `(${files.length})` : ""}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
