import React, { useState } from "react";
import { base44 } from "@/lib/adapters/legacyBase44";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  User,
  Building,
  Calendar,
  DollarSign,
  FolderOpen,
  FileText,
  RefreshCw,
  Plus,
  Clock,
  Loader2,
  Upload,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import ProcessForm from "@/components/processes/ProcessForm";
import ProcessMoveForm from "@/components/processes/ProcessMoveForm";
import DocumentUpload from "@/components/documents/DocumentUpload";

const STATUS_COLORS = {
  ativo: "bg-green-100 text-green-700 border-green-200",
  arquivado: "bg-slate-100 text-slate-700 border-slate-200",
  suspenso: "bg-amber-100 text-amber-700 border-amber-200",
  encerrado: "bg-red-100 text-red-700 border-red-200",
};

const MOVE_TYPE_ICONS = {
  despacho: "📋",
  sentenca: "⚖️",
  decisao: "📝",
  peticao: "📄",
  intimacao: "📨",
  citacao: "📩",
  audiencia: "🏛️",
  outros: "📌",
};

export default function ProcessDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const processId = urlParams.get("id");

  const [showEditForm, setShowEditForm] = useState(false);
  const [showMoveForm, setShowMoveForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const queryClient = useQueryClient();

  const { data: process, isLoading } = useQuery({
    queryKey: ["process", processId],
    queryFn: () => base44.entities.Process.filter({ id: processId }),
    select: (data) => data[0],
    enabled: !!processId,
  });

  const { data: moves = [], isLoading: loadingMoves } = useQuery({
    queryKey: ["process-moves", processId],
    queryFn: () =>
      base44.entities.ProcessMove.filter({ process_id: processId }),
    enabled: !!processId,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["process-documents", processId],
    queryFn: () =>
      base44.entities.Document.filter({
        parent_type: "process",
        parent_id: processId,
      }),
    enabled: !!processId,
  });

  const { data: deadlines = [] } = useQuery({
    queryKey: ["process-deadlines", processId],
    queryFn: () => base44.entities.Deadline.filter({ process_id: processId }),
    enabled: !!processId,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Process.update(processId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["process", processId]);
      setShowEditForm(false);
    },
  });

  const syncDatajud = async () => {
    setIsSyncing(true);

    // Simulate DataJud API call
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Simule a resposta de uma API de consulta processual (DataJud) para o processo número ${process.process_number}.
      Gere 3 movimentações processuais recentes com datas dos últimos 30 dias.
      Cada movimentação deve ter: data, descrição detalhada, e tipo (escolha entre: despacho, sentenca, decisao, peticao, intimacao, citacao, audiencia, outros).
      As movimentações devem ser realistas para um processo judicial brasileiro.`,
      response_json_schema: {
        type: "object",
        properties: {
          movimentacoes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                data: {
                  type: "string",
                  description: "Data no formato YYYY-MM-DD",
                },
                descricao: { type: "string" },
                tipo: { type: "string" },
              },
            },
          },
        },
      },
    });

    // Insert the simulated moves
    for (const mov of response.movimentacoes) {
      await base44.entities.ProcessMove.create({
        process_id: processId,
        process_number: process.process_number,
        date: mov.data,
        description: mov.descricao,
        move_type: mov.tipo,
        source: "datajud",
      });
    }

    // Create notification for each move
    const user = await base44.auth.me();
    for (const mov of response.movimentacoes) {
      const priority =
        mov.tipo === "sentenca"
          ? "urgente"
          : mov.tipo === "intimacao"
            ? "importante"
            : "informativa";

      await base44.entities.Notification.create({
        title: `Nova Movimentação: ${mov.tipo}`,
        message: `${mov.descricao.substring(0, 100)}...`,
        type: "movimentacao",
        priority: priority,
        user_email: user.email,
        link: `/process-detail?id=${processId}`,
        related_id: processId,
      });
    }

    queryClient.invalidateQueries(["process-moves", processId]);
    setIsSyncing(false);
  };

  const sortedMoves = [...moves].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!process) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Processo não encontrado</p>
        <Link to={createPageUrl("Processes")}>
          <Button variant="link">Voltar para lista</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={createPageUrl("Processes")}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl lg:text-2xl font-bold text-slate-800 font-mono">
            {process.process_number}
          </h1>
          <p className="text-slate-500">{process.client_name}</p>
        </div>
        <Badge
          variant="outline"
          className={`${STATUS_COLORS[process.status]} text-sm`}
        >
          {process.status}
        </Badge>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Cliente</p>
                <Link
                  to={createPageUrl(`ClientDetail?id=${process.client_id}`)}
                  className="font-medium text-slate-800 hover:text-blue-600"
                >
                  {process.client_name}
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Building className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Tribunal</p>
                <p className="font-medium text-slate-800 text-sm">
                  {process.court || "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Valor da Causa</p>
                <p className="font-medium text-slate-800">
                  {process.case_value
                    ? `R$ ${process.case_value.toLocaleString("pt-BR")}`
                    : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Distribuição</p>
                <p className="font-medium text-slate-800">
                  {process.distribution_date
                    ? format(new Date(process.distribution_date), "dd/MM/yyyy")
                    : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeline" className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <TabsList>
            <TabsTrigger value="timeline">Movimentações</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="deadlines">Prazos</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={syncDatajud}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Sincronizar DataJud
            </Button>
            <Button
              onClick={() => setShowMoveForm(true)}
              className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Movimentação
            </Button>
          </div>
        </div>

        <TabsContent value="timeline">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              {loadingMoves ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : sortedMoves.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Nenhuma movimentação registrada</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200" />
                  <div className="space-y-6">
                    {sortedMoves.map((move, index) => (
                      <motion.div
                        key={move.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="relative flex gap-4 pl-12"
                      >
                        <div className="absolute left-4 w-5 h-5 rounded-full bg-white border-2 border-[#1e3a5f] flex items-center justify-center text-xs">
                          {MOVE_TYPE_ICONS[move.move_type] || "📌"}
                        </div>
                        <div className="flex-1 bg-slate-50 rounded-lg p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-medium text-slate-800">
                                {move.description}
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                                <span>
                                  {format(new Date(move.date), "dd/MM/yyyy", {
                                    locale: ptBR,
                                  })}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {move.move_type}
                                </Badge>
                                {move.source === "datajud" && (
                                  <Badge className="bg-blue-100 text-blue-700 text-xs">
                                    DataJud
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Documentos do Processo</CardTitle>
                <Button size="sm" onClick={() => setShowUpload(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Nenhum documento anexado</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documents.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-lg border hover:bg-slate-50 transition-colors"
                    >
                      <FileText className="w-8 h-8 text-blue-500" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.name}</p>
                        <p className="text-sm text-slate-500">
                          {doc.document_type}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deadlines">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Prazos do Processo</CardTitle>
                <Link to={createPageUrl(`Deadlines?process_id=${processId}`)}>
                  <Button size="sm" className="bg-[#1e3a5f] hover:bg-[#2d5a87]">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Prazo
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {deadlines.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Nenhum prazo cadastrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deadlines.map((deadline) => (
                    <div
                      key={deadline.id}
                      className="flex items-center gap-4 p-4 rounded-lg border"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{deadline.description}</p>
                        <p className="text-sm text-slate-500">
                          {format(new Date(deadline.due_date), "dd/MM/yyyy")}
                        </p>
                      </div>
                      <Badge variant="outline">{deadline.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Processo</DialogTitle>
          </DialogHeader>
          <ProcessForm
            process={process}
            onSave={(data) => updateMutation.mutate(data)}
            onCancel={() => setShowEditForm(false)}
            isSaving={updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showMoveForm} onOpenChange={setShowMoveForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Movimentação</DialogTitle>
          </DialogHeader>
          <ProcessMoveForm
            processId={processId}
            processNumber={process.process_number}
            onSuccess={() => {
              queryClient.invalidateQueries(["process-moves", processId]);
              setShowMoveForm(false);
            }}
            onCancel={() => setShowMoveForm(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload de Documento</DialogTitle>
          </DialogHeader>
          <DocumentUpload
            parentType="process"
            parentId={processId}
            onSuccess={() => {
              queryClient.invalidateQueries(["process-documents", processId]);
              setShowUpload(false);
            }}
            onCancel={() => setShowUpload(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
