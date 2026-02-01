import React, { useState, useEffect } from "react";
import { base44 } from "@/lib/adapters/legacyBase44";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ArrowLeft,
  Save,
  X,
  Pencil,
  Trash2,
  FileText,
  CheckSquare,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import BeneficioFormulario from "./BeneficioFormulario";
import BeneficioChecklistEdit from "./BeneficioChecklistEdit";
import { format } from "date-fns";

const TIPOS_LABELS = {
  bpc_loas_idoso: "BPC/LOAS - Idoso",
  bpc_loas_pcd: "BPC/LOAS - Pessoa com Deficiência",
  aposentadoria_idade_rural: "Aposentadoria por Idade Rural",
  incapacidade_rural: "Benefício por Incapacidade Rural",
  salario_maternidade_rural: "Salário-Maternidade Rural",
  pensao_morte_rural: "Pensão por Morte Rural",
  aposentadoria_idade_urbano: "Aposentadoria por Idade Urbano",
  incapacidade_urbano: "Benefício por Incapacidade Urbano",
  salario_maternidade_urbano: "Salário-Maternidade Urbano",
  pensao_morte_urbano: "Pensão por Morte Urbano",
  outros_urbano: "Outros",
};

const CATEGORIA_LABELS = {
  bpc_loas: "BPC/LOAS",
  rural: "Rural",
  urbano: "Urbano",
};

const STATUS_OPTIONS = [
  { value: "em_analise", label: "Em Análise" },
  { value: "documentacao_pendente", label: "Documentação Pendente" },
  { value: "aguardando_protocolo", label: "Aguardando Protocolo" },
  { value: "protocolado", label: "Protocolado" },
  { value: "aguardando_inss", label: "Aguardando INSS" },
  { value: "indeferido", label: "Indeferido" },
  { value: "deferido", label: "Deferido/Concedido" },
  { value: "cancelado", label: "Cancelado" },
];

const STATUS_COLORS = {
  em_analise: "bg-amber-100 text-amber-700 border-amber-200",
  documentacao_pendente: "bg-orange-100 text-orange-700 border-orange-200",
  aguardando_protocolo: "bg-blue-100 text-blue-700 border-blue-200",
  protocolado: "bg-indigo-100 text-indigo-700 border-indigo-200",
  aguardando_inss: "bg-purple-100 text-purple-700 border-purple-200",
  indeferido: "bg-red-100 text-red-700 border-red-200",
  deferido: "bg-green-100 text-green-700 border-green-200",
  cancelado: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function BeneficioEditModal({
  open,
  onClose,
  beneficio,
  clientId,
  clientName,
}) {
  const [activeTab, setActiveTab] = useState("formulario");
  const [dadosEspecificos, setDadosEspecificos] = useState({});
  const [checklistDocumentos, setChecklistDocumentos] = useState({});
  const [status, setStatus] = useState("");
  const [numeroBeneficio, setNumeroBeneficio] = useState("");
  const [dataProtocolo, setDataProtocolo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  const queryClient = useQueryClient();

  // Carregar dados do benefício quando abrir
  useEffect(() => {
    if (beneficio && open) {
      setDadosEspecificos(beneficio.dados_especificos || {});
      setChecklistDocumentos(beneficio.checklist_documentos || {});
      setStatus(beneficio.status || "em_analise");
      setNumeroBeneficio(beneficio.numero_beneficio || "");
      setDataProtocolo(beneficio.data_protocolo || "");
      setObservacoes(beneficio.observacoes || "");
      setHasChanges(false);
      setActiveTab("formulario");
    }
  }, [beneficio, open]);

  // Detectar mudanças
  useEffect(() => {
    if (beneficio) {
      const originalData = JSON.stringify({
        dados_especificos: beneficio.dados_especificos || {},
        checklist_documentos: beneficio.checklist_documentos || {},
        status: beneficio.status || "em_analise",
        numero_beneficio: beneficio.numero_beneficio || "",
        data_protocolo: beneficio.data_protocolo || "",
        observacoes: beneficio.observacoes || "",
      });
      const currentData = JSON.stringify({
        dados_especificos: dadosEspecificos,
        checklist_documentos: checklistDocumentos,
        status,
        numero_beneficio: numeroBeneficio,
        data_protocolo: dataProtocolo,
        observacoes,
      });
      setHasChanges(originalData !== currentData);
    }
  }, [
    dadosEspecificos,
    checklistDocumentos,
    status,
    numeroBeneficio,
    dataProtocolo,
    observacoes,
    beneficio,
  ]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Beneficio.update(beneficio.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["client-beneficios", clientId]);
      setHasChanges(false);
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Beneficio.delete(beneficio.id),
    onSuccess: () => {
      queryClient.invalidateQueries(["client-beneficios", clientId]);
      onClose();
    },
  });

  const handleClose = () => {
    if (hasChanges) {
      setShowExitDialog(true);
    } else {
      onClose();
    }
  };

  const handleSave = () => {
    updateMutation.mutate({
      dados_especificos: dadosEspecificos,
      checklist_documentos: checklistDocumentos,
      status,
      numero_beneficio: numeroBeneficio,
      data_protocolo: dataProtocolo,
      observacoes,
    });
  };

  const handleSaveAndContinue = () => {
    updateMutation.mutate(
      {
        dados_especificos: dadosEspecificos,
        checklist_documentos: checklistDocumentos,
        status,
        numero_beneficio: numeroBeneficio,
        data_protocolo: dataProtocolo,
        observacoes,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries(["client-beneficios", clientId]);
          setHasChanges(false);
          setActiveTab("checklist");
        },
      },
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate();
    setShowDeleteDialog(false);
  };

  const handleForceClose = () => {
    setShowExitDialog(false);
    setHasChanges(false);
    onClose();
  };

  if (!beneficio) return null;

  const tipoLabel =
    TIPOS_LABELS[beneficio.tipo_beneficio] || beneficio.tipo_beneficio;
  const categoriaLabel =
    CATEGORIA_LABELS[beneficio.categoria] || beneficio.categoria;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleClose();
          }
        }}
      >
        <DialogContent
          className="max-w-5xl h-[90vh] overflow-hidden flex flex-col p-0"
          onPointerDownOutside={(e) => {
            e.preventDefault();
            if (hasChanges) {
              setShowExitDialog(true);
            } else {
              onClose();
            }
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            handleClose();
          }}
        >
          {/* Header */}
          <div className="flex-shrink-0 border-b bg-slate-50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={handleClose}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    {tipoLabel}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {clientName} • Categoria: {categoriaLabel}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`${STATUS_COLORS[status]} px-3 py-1`}
                >
                  {STATUS_OPTIONS.find((s) => s.value === status)?.label ||
                    status}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Status e Info Rápida */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">
                  Nº Benefício (NB)
                </Label>
                <Input
                  value={numeroBeneficio}
                  onChange={(e) => setNumeroBeneficio(e.target.value)}
                  placeholder="Ex: 123456789-0"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">
                  Data do Protocolo
                </Label>
                <Input
                  type="date"
                  value={dataProtocolo}
                  onChange={(e) => setDataProtocolo(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Cadastrado em</Label>
                <Input
                  value={
                    beneficio.created_date
                      ? format(new Date(beneficio.created_date), "dd/MM/yyyy")
                      : "-"
                  }
                  disabled
                  className="h-9 bg-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex-1 min-h-0 flex flex-col">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="flex-shrink-0 border-b px-6 bg-white">
                <TabsList className="h-12 bg-transparent p-0 gap-6">
                  <TabsTrigger
                    value="formulario"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-[#1e3a5f] rounded-none bg-transparent px-0 pb-3"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Formulário Específico
                  </TabsTrigger>
                  <TabsTrigger
                    value="checklist"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-[#1e3a5f] rounded-none bg-transparent px-0 pb-3"
                  >
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Checklist de Documentos
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 bg-slate-50">
                <div className="p-6">
                  <TabsContent value="formulario" className="mt-0">
                    <div className="space-y-6">
                      <BeneficioFormulario
                        categoria={beneficio.categoria}
                        tipoBeneficio={beneficio.tipo_beneficio}
                        dados={dadosEspecificos}
                        onChange={setDadosEspecificos}
                      />

                      {/* Observações Gerais */}
                      <div className="space-y-2">
                        <Label>Observações Gerais</Label>
                        <Textarea
                          value={observacoes}
                          onChange={(e) => setObservacoes(e.target.value)}
                          placeholder="Anotações e observações sobre o benefício..."
                          rows={4}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="checklist" className="mt-0">
                    <BeneficioChecklistEdit
                      categoria={beneficio.categoria}
                      tipoBeneficio={beneficio.tipo_beneficio}
                      checklist={checklistDocumentos}
                      onChange={setChecklistDocumentos}
                      clientId={clientId}
                      beneficioId={beneficio.id}
                    />
                  </TabsContent>
                </div>
              </div>
            </Tabs>
          </div>

          {/* Footer Actions */}
          <div className="flex-shrink-0 border-t bg-slate-50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-500">
                {hasChanges && (
                  <span className="text-amber-600 font-medium">
                    • Alterações não salvas
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                {activeTab === "formulario" && (
                  <Button
                    variant="outline"
                    onClick={handleSaveAndContinue}
                    disabled={updateMutation.isPending}
                  >
                    Salvar e Continuar
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
                {activeTab === "checklist" && (
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("formulario")}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar para Formulário
                  </Button>
                )}
                <Button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Benefício</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este benefício? Esta ação não pode
              ser desfeita.
              <br />
              <br />
              <strong>{tipoLabel}</strong> - {clientName}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Alterações não salvas
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você tem alterações que não foram salvas. O que deseja fazer?
              </p>
              <ul className="text-sm text-slate-600 space-y-1 mt-2">
                <li>• As alterações serão perdidas se você sair</li>
                <li>• Esta ação não pode ser desfeita</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              onClick={() => {
                setShowExitDialog(false);
                handleSave();
              }}
              className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar e Sair
                </>
              )}
            </Button>
            <AlertDialogAction
              onClick={handleForceClose}
              className="bg-red-600 hover:bg-red-700"
            >
              Sair sem Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
