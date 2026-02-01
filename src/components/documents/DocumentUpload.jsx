import React, { useState } from "react";
import { base44 } from "@/lib/adapters/legacyBase44";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileText, X, Loader2 } from "lucide-react";

const DOCUMENT_TYPES = {
  peticao: "Petição",
  prova: "Prova",
  documento_pessoal: "Documento Pessoal",
  laudo: "Laudo Médico",
  contrato: "Contrato",
  procuracao: "Procuração",
  outros: "Outros",
};

export default function DocumentUpload({
  parentType,
  parentId,
  onSuccess,
  onCancel,
}) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [documentType, setDocumentType] = useState("outros");

  const uploadMutation = useMutation({
    mutationFn: async (data) => {
      const { file_url } = await base44.integrations.Core.UploadFile({
        file: data.file,
      });

      const docData = {
        name: data.name || file.name,
        file_url,
        document_type: data.documentType,
        parent_type: parentType,
        parent_id: parentId,
        ocr_processed: false,
      };

      return base44.entities.Document.create(docData);
    },
    onSuccess: () => {
      onSuccess?.();
    },
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!name) {
        setName(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    uploadMutation.mutate({
      file,
      name,
      documentType,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>Arquivo</Label>
        {file ? (
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border">
            <FileText className="w-8 h-8 text-blue-500" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-sm text-slate-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setFile(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="file"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg hover:bg-slate-50 transition-colors">
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-sm text-slate-600">
                Clique ou arraste um arquivo
              </p>
              <p className="text-xs text-slate-400 mt-1">
                PDF, DOC, DOCX, JPG, PNG
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="doc-name">Nome do Documento</Label>
        <Input
          id="doc-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Petição Inicial"
        />
      </div>

      <div className="space-y-2">
        <Label>Tipo do Documento</Label>
        <Select value={documentType} onValueChange={setDocumentType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DOCUMENT_TYPES).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={!file || uploadMutation.isPending}
          className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
        >
          {uploadMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Enviar
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
