import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";

export default function DocumentViewer({ document, onClose }) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  if (!document) return null;

  const isImage = document.file_type?.startsWith("image/");
  const isPdf = document.file_type?.includes("pdf");

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleDownload = () => {
    const link = window.document.createElement("a");
    link.href = document.file_url;
    link.download = document.name;
    link.target = "_blank";
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const openInNewTab = () => {
    window.open(document.file_url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50">
        <div className="flex items-center gap-4">
          <h3 className="text-white font-medium truncate max-w-md">
            {document.name}
          </h3>
          {document.is_main && (
            <Badge className="bg-amber-500 text-white">Principal</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Controles para imagens */}
          {isImage && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                className="text-white hover:bg-white/20"
              >
                <ZoomOut className="w-5 h-5" />
              </Button>
              <span className="text-white text-sm min-w-[60px] text-center">
                {zoom}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                className="text-white hover:bg-white/20"
              >
                <ZoomIn className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRotate}
                className="text-white hover:bg-white/20"
              >
                <RotateCw className="w-5 h-5" />
              </Button>
              <div className="w-px h-6 bg-white/30 mx-2" />
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={openInNewTab}
            className="text-white hover:bg-white/20"
          >
            <ExternalLink className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="text-white hover:bg-white/20"
          >
            <Download className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        {isImage ? (
          <img
            src={document.file_url}
            alt={document.name}
            className="max-w-full h-auto transition-transform duration-200"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              maxHeight: "calc(100vh - 180px)",
            }}
          />
        ) : isPdf ? (
          <iframe
            src={document.file_url}
            className="w-full h-full bg-white rounded-lg"
            title={document.name}
          />
        ) : (
          <div className="text-center text-white">
            <FileText className="w-24 h-24 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-4">
              Pré-visualização não disponível para este tipo de arquivo
            </p>
            <Button onClick={handleDownload} variant="secondary">
              <Download className="w-4 h-4 mr-2" />
              Baixar Arquivo
            </Button>
          </div>
        )}
      </div>

      {/* Footer com informações */}
      <div className="p-4 bg-black/50">
        <div className="flex items-center justify-center gap-6 text-sm text-white/70">
          <span>
            Tamanho:{" "}
            {document.file_size
              ? `${(document.file_size / 1024 / 1024).toFixed(2)} MB`
              : "-"}
          </span>
          <span>•</span>
          <span>
            Enviado em:{" "}
            {format(new Date(document.created_at), "dd/MM/yyyy HH:mm")}
          </span>
          {document.description && (
            <>
              <span>•</span>
              <span>Obs: {document.description}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
