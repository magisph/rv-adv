import React, { useState } from "react";
import { documentService } from "@/services";
import { aiService } from "@/services/aiService";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import JSZip from "jszip";
import { saveAs } from "file-saver";

import {
  Upload,
  Eye,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  User,
  Building,
  Heart,
  Sprout,
  LineChart,
  Archive,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

// Definição das categorias e seus tipos de documentos
const DOCUMENT_TYPES = {
  pessoais: {
    name: "Pessoais",
    color: "#2196F3",
    bgColor: "#E3F2FD",
    icon: User,
    types: [
      { id: "rg", label: "RG", allowMultiple: true, fields: [] },
      { id: "cpf", label: "CPF", allowMultiple: false, fields: [] },
      {
        id: "comprovante_endereco",
        label: "Comprovante de Endereço",
        allowMultiple: false,
        fields: [
          {
            name: "data_comprovante",
            label: "Data do comprovante",
            type: "date",
          },
        ],
      },
      {
        id: "certidao_casamento",
        label: "Certidão de Casamento",
        allowMultiple: false,
        conditional: "married",
        fields: [],
      },
      {
        id: "procuracao",
        label: "Procuração",
        allowMultiple: false,
        fields: [
          {
            name: "tipo",
            label: "Tipo",
            type: "select",
            options: ["Normal", "À rogo", "Com representação"],
          },
        ],
      },
      {
        id: "declaracao_pobreza",
        label: "Declaração de Pobreza",
        allowMultiple: false,
        fields: [
          {
            name: "data_declaracao",
            label: "Data da declaração",
            type: "date",
          },
        ],
      },
      {
        id: "contrato",
        label: "Contrato",
        allowMultiple: false,
        fields: [
          {
            name: "numero_contrato",
            label: "Número do contrato",
            type: "text",
          },
        ],
      },
    ],
  },
  inss: {
    name: "INSS",
    color: "#FF9800",
    bgColor: "#FFF3E0",
    icon: Building,
    types: [
      {
        id: "cnis",
        label: "CNIS (Cadastro Nacional de Informações Sociais)",
        allowMultiple: false,
        fields: [
          { name: "data_emissao", label: "Data de emissão", type: "date" },
        ],
      },
      {
        id: "protocolos",
        label: "Protocolos",
        allowMultiple: true,
        fields: [
          {
            name: "numero_protocolo",
            label: "Número do protocolo",
            type: "text",
          },
        ],
      },
      {
        id: "ctps",
        label: "CTPS (Carteira de Trabalho)",
        allowMultiple: true,
        fields: [{ name: "paginas", label: "Páginas", type: "text" }],
      },
    ],
  },
  medicos: {
    name: "Médicos",
    color: "#FFC107",
    bgColor: "#FFF9C4",
    icon: Heart,
    types: [
      {
        id: "laudos_medicos",
        label: "Laudos Médicos",
        allowMultiple: true,
        fields: [
          { name: "especialidade", label: "Especialidade", type: "text" },
          { name: "data_laudo", label: "Data do laudo", type: "date" },
          { name: "cid", label: "CID", type: "text" },
        ],
      },
      {
        id: "exames",
        label: "Exames",
        allowMultiple: true,
        fields: [
          { name: "tipo_exame", label: "Tipo de exame", type: "text" },
          { name: "data_exame", label: "Data do exame", type: "date" },
        ],
      },
      {
        id: "atestados",
        label: "Atestados",
        allowMultiple: true,
        fields: [
          { name: "data_atestado", label: "Data do atestado", type: "date" },
        ],
      },
      {
        id: "receitas",
        label: "Receitas",
        allowMultiple: true,
        fields: [
          { name: "data_receita", label: "Data da receita", type: "date" },
        ],
      },
    ],
  },
  rurais: {
    name: "Documentos Rurais",
    color: "#4CAF50",
    bgColor: "#E8F5E9",
    icon: Sprout,
    types: [
      {
        id: "documento_terra",
        label: "Documento da terra",
        subtitle: "Escritura, contrato de arrendamento, posse",
        allowMultiple: false,
        fields: [
          {
            name: "tipo",
            label: "Tipo",
            type: "select",
            options: ["Escritura", "Contrato arrendamento", "Posse", "Outro"],
          },
        ],
      },
      {
        id: "dap",
        label: "DAP (Declaração de Aptidão ao Pronaf)",
        allowMultiple: false,
        fields: [{ name: "numero_dap", label: "Número DAP", type: "text" }],
      },
      {
        id: "caf",
        label: "CAF (Cadastro de Atividade Rural)",
        allowMultiple: false,
        fields: [{ name: "numero_caf", label: "Número CAF", type: "text" }],
      },
      {
        id: "seguro_safra",
        label: "Comprovante de Seguro Safra",
        allowMultiple: true,
        fields: [{ name: "ano_seguro", label: "Ano do seguro", type: "text" }],
      },
      {
        id: "emprestimo_rural",
        label: "Comprovante de empréstimo rural",
        allowMultiple: true,
        fields: [
          {
            name: "instituicao",
            label: "Instituição financeira",
            type: "text",
          },
        ],
      },
      {
        id: "notas_fiscais",
        label: "Notas fiscais de produtor rural",
        allowMultiple: true,
        fields: [{ name: "periodo", label: "Período/Ano", type: "text" }],
      },
      {
        id: "itr",
        label: "Comprovante de pagamento de ITR",
        allowMultiple: true,
        fields: [
          { name: "ano_exercicio", label: "Ano exercício", type: "text" },
        ],
      },
      {
        id: "contrato_arrendamento",
        label: "Contrato de arrendamento/parceria/meação",
        allowMultiple: false,
        fields: [
          {
            name: "tipo_contrato",
            label: "Tipo",
            type: "select",
            options: ["Arrendamento", "Parceria", "Meação"],
          },
        ],
      },
      {
        id: "certidao_imovel",
        label: "Certidão de Imóvel Rural",
        allowMultiple: false,
        fields: [{ name: "matricula", label: "Matrícula", type: "text" }],
      },
      {
        id: "declaracao_sindicato",
        label: "Declaração do Sindicato dos Trabalhadores Rurais",
        allowMultiple: false,
        fields: [],
      },
      {
        id: "carteira_sindical",
        label: "Carteira de filiação sindical",
        allowMultiple: false,
        fields: [
          {
            name: "numero_carteira",
            label: "Número da carteira",
            type: "text",
          },
        ],
      },
      {
        id: "contribuicao_sindical",
        label: "Comprovante de pagamento de contribuição sindical",
        allowMultiple: true,
        fields: [],
      },
      {
        id: "declaracao_vizinhos",
        label: "Declaração de vizinhos/proprietários de terra",
        allowMultiple: true,
        fields: [],
      },
    ],
    conjugeTypes: [
      {
        id: "beneficio_conjuge",
        label: "Comprovante de benefício previdenciário do cônjuge",
        allowMultiple: false,
        fields: [
          {
            name: "numero_beneficio",
            label: "Número do benefício (NB)",
            type: "text",
          },
        ],
      },
      {
        id: "ctps_conjuge",
        label: "CTPS do cônjuge",
        allowMultiple: true,
        fields: [],
      },
      {
        id: "cnis_conjuge",
        label: "CNIS do cônjuge",
        allowMultiple: false,
        fields: [
          { name: "data_emissao", label: "Data de emissão", type: "date" },
        ],
      },
    ],
  },
  analises: {
    name: "Análises",
    color: "#9C27B0",
    bgColor: "#F3E5F5",
    icon: LineChart,
    types: [
      {
        id: "analise_risco",
        label: "Análise de Risco",
        allowMultiple: true,
        fields: [
          { name: "data_analise", label: "Data da análise", type: "date" },
        ],
      },
      {
        id: "calculo_previdenciario",
        label: "Cálculo Previdenciário",
        allowMultiple: true,
        fields: [
          { name: "competencia", label: "Competência", type: "text" },
        ],
      },
      {
        id: "parecer_tecnico",
        label: "Parecer Técnico",
        allowMultiple: true,
        fields: [
          { name: "numero_parecer", label: "Número do parecer", type: "text" },
        ],
      },
      {
        id: "outros_analises",
        label: "Outros",
        allowMultiple: true,
        fields: [],
      },
    ],
  },
  comprovacao: {
    name: "Comprovação",
    color: "#E91E63",
    bgColor: "#FCE4EC",
    icon: FileText,
    types: [
      {
        id: "provas_documentais",
        label: "Provas Documentais",
        allowMultiple: true,
        fields: [
          { name: "descricao", label: "Descrição", type: "text" }
        ],
      },
      {
        id: "boletim_ocorrencia",
        label: "Boletim de Ocorrência",
        allowMultiple: true,
        fields: [],
      },
      {
        id: "outros_comprovantes",
        label: "Outros Comprovantes",
        allowMultiple: true,
        fields: [
          { name: "descricao", label: "Descrição", type: "text" }
        ],
      },
    ],
  },
};

function DocumentTypeCard({
  category,
  categoryKey,
  documents,
  clientId,
  isMarried,
  onRefresh,
  onOCRData,
}) {
  const [expanded, setExpanded] = useState(false);
  const [uploadingType, setUploadingType] = useState(null);
  const [uploadFields, setUploadFields] = useState({});
  const [showOCR, setShowOCR] = useState(false);
  const [ocrFileUrl, setOcrFileUrl] = useState(null);
  const [ocrDocType, setOcrDocType] = useState(null);
  const [selectedDocs, setSelectedDocs] = useState(new Set());
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);

  const queryClient = useQueryClient();

  const Icon = category.icon;

  // Filtrar documentos desta categoria
  const categoryDocs = React.useMemo(() => {
    return documents.filter(
      (doc) => doc.category === categoryKey && doc.is_active !== false,
    );
  }, [documents, categoryKey]);

  const uploadMutation = useMutation({
    mutationFn: async ({ file, typeId, fields }) => {
      // Upload do arquivo
      const { file_url } = await aiService.uploadFile({ file });

      // Verificar se é documento suportado por OCR
      const ocrTypes = ["rg", "cpf", "cnh", "comprovante_endereco"];
      if (
        ocrTypes.includes(typeId) &&
        (file.type === "image/jpeg" ||
          file.type === "image/png" ||
          file.type === "application/pdf")
      ) {
        setOcrFileUrl(file_url);
        setOcrDocType(typeId);
        setShowOCR(true);
      }

      // Serializar campos dinâmicos (ex: data_comprovante, numero_protocolo)
      // em uma string de descrição para não poluir o payload com colunas inexistentes
      const extraFields = fields || {};
      const descriptionParts = Object.entries(extraFields)
        .filter(([, v]) => v !== "" && v != null)
        .map(([k, v]) => {
          const label = k
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
          return `${label}: ${v}`;
        });
      const description = descriptionParts.length > 0
        ? descriptionParts.join(" | ")
        : null;

      // Criar documento — apenas colunas válidas da tabela documents
      return documentService.create({
        name: file.name,
        file_url,
        category: categoryKey,
        subcategory: typeId,
        parent_type: "client",
        parent_id: clientId,
        is_active: true,
        file_size: file.size,
        file_type: file.type || null,
        description,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atendimentos"] });
      queryClient.invalidateQueries({ queryKey: ["client-atendimentos"] });
      toast.success("Documento enviado com sucesso!");
      setUploadingType(null);
      setUploadFields({});
      onRefresh();
    },
    onError: () => {
      toast.error("Erro ao enviar documento");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (docId) => documentService.delete(docId),
    onSuccess: () => {
      toast.success("Documento excluído");
      onRefresh();
    },
  });

  const handleFileSelect = async (typeId, event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }

    // Validar formato
    const validFormats = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (!validFormats.includes(file.type)) {
      toast.error(
        "Formato inválido. Use PDF, JPG, PNG, DOC, DOCX, XLS ou XLSX",
      );
      return;
    }

    setUploadingType(typeId);
  };

  const handleUploadConfirm = (typeId) => {
    const fileInput = document.getElementById(`file-${categoryKey}-${typeId}`);
    const file = fileInput?.files[0];
    if (!file) return;

    uploadMutation.mutate({
      file,
      typeId,
      fields: uploadFields[typeId] || {},
    });
  };


  const getDocsForType = (typeId) => {
    return categoryDocs.filter((doc) => doc.subcategory === typeId);
  };

  const toggleDocSelection = (docId) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const allDocIds = categoryDocs.map((d) => d.id);
  const allSelected =
    allDocIds.length > 0 && allDocIds.every((id) => selectedDocs.has(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(allDocIds));
    }
  };

  const handleBulkDownload = async () => {
    const docsToDownload = categoryDocs.filter((d) => selectedDocs.has(d.id));
    if (docsToDownload.length === 0) {
      toast.warning("Selecione ao menos um documento.");
      return;
    }
    setIsBulkDownloading(true);
    toast.info(`Preparando ${docsToDownload.length} arquivo(s) para download...`);
    try {
      const zip = new JSZip();
      for (const doc of docsToDownload) {
        try {
          const response = await fetch(doc.file_url);
          if (!response.ok) throw new Error(`Falha no download: ${response.status}`);
          const blob = await response.blob();
          zip.file(doc.name || `documento_${doc.id}`, blob);
        } catch {
          // arquivo individual falhou — continua com os demais
        }
      }
      const today = new Date().toISOString().split("T")[0];
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `Documentos_${category.name}_${today}.zip`);
      toast.success("ZIP gerado com sucesso!");
      setSelectedDocs(new Set());
    } catch {
      toast.error("Erro ao gerar o arquivo ZIP.");
    } finally {
      setIsBulkDownloading(false);
    }
  };

  const allTypes = React.useMemo(() => {
    const types = [...category.types];
    if (categoryKey === "rurais" && isMarried && category.conjugeTypes) {
      types.push({ divider: true, label: "Documentos do Cônjuge" });
      types.push(...category.conjugeTypes);
    }
    return types;
  }, [category.types, categoryKey, isMarried, category.conjugeTypes]);

  const docsCount = categoryDocs.length;

  return (
    <Card
      className="relative overflow-hidden transition-all"
      style={{ borderLeftWidth: "4px", borderLeftColor: category.color }}
    >
      <CardHeader className="pb-3">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: category.bgColor }}
            >
              <Icon className="w-5 h-5" style={{ color: category.color }} />
            </div>
            <div>
              <CardTitle className="text-lg" style={{ color: category.color }}>
                {category.name}
              </CardTitle>
              <p className="text-xs text-slate-600 mt-0.5">
                {docsCount} documento(s)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className="h-7 w-7 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: category.color }}
            >
              {docsCount}
            </Badge>
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-slate-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-600" />
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-3">
          {/* Barra de Seleção Múltipla */}
          {categoryDocs.length > 0 && (
            <div className="flex items-center justify-between py-2 px-3 bg-slate-50 border rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                />
                <span>Selecionar Todos ({categoryDocs.length})</span>
              </label>
              {selectedDocs.size > 0 && (
                <Button
                  size="sm"
                  className="text-xs gap-1"
                  style={{ backgroundColor: category.color }}
                  onClick={handleBulkDownload}
                  disabled={isBulkDownloading}
                >
                  <Archive className="w-3 h-3" />
                  {isBulkDownloading
                    ? "Gerando ZIP..."
                    : `Baixar ${selectedDocs.size} selecionado(s)`}
                </Button>
              )}
            </div>
          )}
          {allTypes.map((type, idx) => {
            if (type.divider) {
              return (
                <div key={idx} className="border-t pt-4 mt-4">
                  <h4 className="font-semibold text-sm text-slate-700 mb-3">
                    {type.label}
                  </h4>
                </div>
              );
            }

            const typeDocs = getDocsForType(type.id);
            const hasFiles = typeDocs.length > 0;
            const isUploading = uploadingType === type.id;

            return (
              <div
                key={type.id}
                className={`p-3 rounded-lg border transition-all ${
                  hasFiles
                    ? "bg-green-50 border-green-200"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={hasFiles} disabled />
                      <div>
                        <label className="text-sm font-medium text-slate-700 cursor-pointer">
                          {type.label}
                        </label>
                        {type.subtitle && (
                          <p className="text-xs text-slate-600">
                            {type.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Arquivos carregados */}
                    {typeDocs.length > 0 && (
                      <div className="mt-2 space-y-2 ml-6">
                        {typeDocs.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center gap-2 text-xs"
                          >
                            <Checkbox
                              checked={selectedDocs.has(doc.id)}
                              onCheckedChange={() => toggleDocSelection(doc.id)}
                              className="h-3.5 w-3.5"
                            />
                            <span className="text-slate-600 flex-1 truncate">
                              📎 {doc.name}
                            </span>
                            <span className="text-slate-600">
                              ({(doc.file_size / 1024).toFixed(1)} KB)
                            </span>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() =>
                                  window.open(doc.file_url, "_blank")
                                }
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => {
                                  const a = document.createElement("a");
                                  a.href = doc.file_url;
                                  a.download = doc.name;
                                  a.click();
                                }}
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-red-600"
                                onClick={() => {
                                  if (
                                    confirm("Deseja excluir este documento?")
                                  ) {
                                    deleteMutation.mutate(doc.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <input
                      id={`file-${categoryKey}-${type.id}`}
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                      onChange={(e) => handleFileSelect(type.id, e)}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() =>
                        document
                          .getElementById(`file-${categoryKey}-${type.id}`)
                          .click()
                      }
                      disabled={!type.allowMultiple && hasFiles}
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      Upload
                    </Button>
                  </div>
                </div>

                {/* Campos adicionais para upload */}
                {isUploading && type.fields && type.fields.length > 0 && (
                  <div className="mt-3 p-3 bg-white rounded border space-y-2">
                    {type.fields.map((field) => (
                      <div key={field.name} className="space-y-1">
                        <Label className="text-xs">{field.label}</Label>
                        {field.type === "select" ? (
                          <Select
                            value={uploadFields[type.id]?.[field.name] || ""}
                            onValueChange={(v) =>
                              setUploadFields({
                                ...uploadFields,
                                [type.id]: {
                                  ...(uploadFields[type.id] || {}),
                                  [field.name]: v,
                                },
                              })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            type={field.type}
                            className="h-8 text-xs"
                            value={uploadFields[type.id]?.[field.name] || ""}
                            onChange={(e) =>
                              setUploadFields({
                                ...uploadFields,
                                [type.id]: {
                                  ...(uploadFields[type.id] || {}),
                                  [field.name]: e.target.value,
                                },
                              })
                            }
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Botão de confirmação — renderiza SEMPRE que um arquivo está selecionado */}
                {isUploading && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      className="text-xs"
                      onClick={() => handleUploadConfirm(type.id)}
                      disabled={uploadMutation.isPending}
                    >
                      {uploadMutation.isPending
                        ? "Enviando..."
                        : "Confirmar Upload"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => {
                        setUploadingType(null);
                        setUploadFields({});
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            );
          })}



        </CardContent>
      )}
    </Card>
  );
}

export default function ClientDocumentsSection({
  clientId,
  clientName,
  isMarried: isMarriedProp,
  onOCRDataExtracted,
  areaAtuacao,
}) {
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["client-documents-full", clientId],
    queryFn: () =>
      documentService.filter({
        parent_type: "client",
        parent_id: clientId,
      }),
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries(["client-documents-full", clientId]);
  };

  const handleOCRData = (data) => {
    if (onOCRDataExtracted) {
      onOCRDataExtracted(data);
    }
  };

  const [isBulkDownloadingAll, setIsBulkDownloadingAll] = useState(false);

  const handleDownloadAll = async () => {
    const activeDocs = documents.filter((d) => d.is_active !== false && d.file_url);
    if (activeDocs.length === 0) {
      toast.warning("Nenhum documento disponível para download.");
      return;
    }
    setIsBulkDownloadingAll(true);
    toast.info(`Preparando malote com ${activeDocs.length} documento(s)...`);
    try {
      const zip = new JSZip();
      for (const doc of activeDocs) {
        try {
          const response = await fetch(doc.file_url);
          if (!response.ok) throw new Error(`Falha no download: ${response.status}`);
          const blob = await response.blob();
          zip.file(doc.name || `documento_${doc.id}`, blob);
        } catch {
          // arquivo individual falhou — continua com os demais
        }
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, "Documentos_Completos_Cliente.zip");
      toast.success("Malote Digital gerado com sucesso!");
    } catch {
      toast.error("Erro ao gerar o Malote Digital.");
    } finally {
      setIsBulkDownloadingAll(false);
    }
  };

  const isMarried = !!isMarriedProp;

  const filteredCategories = React.useMemo(() => {
    if (areaAtuacao === "Cível") {
      const allowed = ["pessoais", "comprovacao", "analises"];
      return Object.entries(DOCUMENT_TYPES).filter(([key]) => allowed.includes(key));
    }
    return Object.entries(DOCUMENT_TYPES).filter(([key]) => key !== "comprovacao");
  }, [areaAtuacao]);

  return (
    <div className="space-y-4">
      {/* Header Global: Malote Digital */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Documentos do Cliente</h2>
          {clientName && (
            <p className="text-sm text-slate-600">{clientName}</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-legal-blue text-legal-blue hover:bg-legal-blue hover:text-white"
          onClick={handleDownloadAll}
          disabled={isBulkDownloadingAll || documents.filter((d) => d.is_active !== false).length === 0}
        >
          <Archive className="w-4 h-4" />
          {isBulkDownloadingAll ? "Gerando ZIP..." : "Baixar Todos (ZIP)"}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 bg-slate-100 animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : (
        <>
          {filteredCategories.map(([key, category]) => (
            <DocumentTypeCard
              key={key}
              category={category}
              categoryKey={key}
              documents={documents}
              clientId={clientId}
              isMarried={isMarried}
              onRefresh={handleRefresh}
              onOCRData={handleOCRData}
            />
          ))}
        </>
      )}
    </div>
  );
}
