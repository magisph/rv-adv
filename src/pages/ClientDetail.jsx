import React, { useState } from "react";
import { authService } from "@/services/authService";
import { clientService, processService, appointmentService, beneficioService, documentService, notificationService } from "@/services";
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
  MapPin,
  FileText,
  FolderOpen,
  Edit,
  Plus,
  Pencil,
} from "lucide-react";
import { format } from "date-fns";
import ClientForm from "@/components/clients/ClientForm";
import AppointmentForm from "@/components/appointments/AppointmentForm";
import ClientDocumentsSection from "@/components/documents/ClientDocumentsSection";
import BeneficioModal from "@/components/beneficios/BeneficioModal";
import BeneficioEditModal from "@/components/beneficios/BeneficioEditModal";
import DocumentStatusCard from "@/components/clients/DocumentStatusCard";

const BENEFIT_LABELS = {
  aposentadoria_idade_rural: "Aposentadoria por Idade Rural",
  incapacidade: "Aposentadoria por Incapacidade",
  pensao_morte: "Pensão por Morte",
  bpc_loas: "BPC/LOAS",
  outros: "Outros",
};

const BENEFIT_CHECKLISTS = {
  aposentadoria_idade_rural: [
    { id: "autodeclaracao_rural", label: "Autodeclaração Rural" },
    { id: "docs_terra", label: "Documentos da Terra" },
    { id: "notas_fiscais", label: "Notas Fiscais de Produção" },
    { id: "cnis", label: "CNIS Atualizado" },
    { id: "certidao_casamento", label: "Certidão de Casamento/Nascimento" },
    { id: "comprovante_residencia", label: "Comprovante de Residência" },
  ],
  incapacidade: [
    { id: "laudos_medicos", label: "Laudos Médicos" },
    { id: "receitas", label: "Receitas e Exames" },
    { id: "cat", label: "CAT (se acidente de trabalho)" },
    { id: "cnis", label: "CNIS Atualizado" },
    { id: "carteira_trabalho", label: "Carteira de Trabalho" },
    { id: "historico_profissional", label: "Histórico Profissional (PPP)" },
  ],
  pensao_morte: [
    { id: "certidao_obito", label: "Certidão de Óbito" },
    { id: "comprovante_dependencia", label: "Comprovante de Dependência" },
    { id: "certidao_casamento", label: "Certidão de Casamento/União Estável" },
    { id: "docs_falecido", label: "Documentos do Falecido" },
    { id: "cnis_falecido", label: "CNIS do Falecido" },
  ],
  bpc_loas: [
    { id: "cadunico", label: "CadÚnico Atualizado" },
    { id: "renda_familiar", label: "Comprovantes de Renda Familiar" },
    { id: "laudo_medico", label: "Laudo Médico (se PcD)" },
    { id: "comprovante_residencia", label: "Comprovante de Residência" },
    { id: "docs_grupo_familiar", label: "Documentos do Grupo Familiar" },
  ],
  outros: [],
};

export default function ClientDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get("id");

  const [showEditForm, setShowEditForm] = useState(false);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [showBeneficioModal, setShowBeneficioModal] = useState(false);
  const [showBeneficioEditModal, setShowBeneficioEditModal] = useState(false);
  const [editingBeneficio, setEditingBeneficio] = useState(null);
  const [activeTab, setActiveTab] = useState("info");

  const queryClient = useQueryClient();

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => clientService.filter({ id: clientId }),
    select: (data) => data[0],
    enabled: !!clientId,
    staleTime: 3 * 60 * 1000, // 3 minutos
    cacheTime: 15 * 60 * 1000, // 15 minutos
  });

  const { data: processes = [] } = useQuery({
    queryKey: ["client-processes", clientId],
    queryFn: () => processService.filter({ client_id: clientId }),
    enabled: !!clientId,
    staleTime: 3 * 60 * 1000,
    cacheTime: 15 * 60 * 1000,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["client-appointments", clientId],
    queryFn: () => appointmentService.filter({ client_id: clientId }),
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  const { data: beneficios = [] } = useQuery({
    queryKey: ["client-beneficios", clientId],
    queryFn: () => beneficioService.filter({ client_id: clientId }),
    enabled: !!clientId,
    staleTime: 3 * 60 * 1000,
    cacheTime: 15 * 60 * 1000,
  });

  const { data: clientDocuments = [] } = useQuery({
    queryKey: ["client-documents", clientId],
    queryFn: () =>
      documentService.filter({
        parent_type: "client",
        parent_id: clientId,
      }),
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => clientService.update(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["client", clientId]);
      setShowEditForm(false);
    },
  });

  const createAppointmentMutation = useMutation({
    mutationFn: (data) => appointmentService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["client-appointments", clientId]);
      setShowAppointmentForm(false);
      setEditingAppointment(null);
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: ({ id, data }) => appointmentService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["client-appointments", clientId]);
      setShowAppointmentForm(false);
      setEditingAppointment(null);
    },
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: (id) => appointmentService.delete(id),
    onSuccess: () =>
      queryClient.invalidateQueries(["client-appointments", clientId]),
  });

  const handleAppointmentSave = async (data) => {
    const savedAppointment = editingAppointment
      ? await updateAppointmentMutation.mutateAsync({
          id: editingAppointment.id,
          data,
        })
      : await createAppointmentMutation.mutateAsync(data);

    if (data.alerts_enabled && data.alert_days && data.alert_days.length > 0) {
      const user = await authService.getCurrentUser();
      if (!user) return;
      const appointmentDate = new Date(data.date);

      for (const daysBefore of data.alert_days) {
        const notificationDate = new Date(appointmentDate);
        notificationDate.setDate(notificationDate.getDate() - daysBefore);

        await notificationService.create({
          title:
            daysBefore === 0
              ? "Compromisso hoje"
              : `Lembrete: Compromisso em ${daysBefore} dia(s)`,
          message: `${data.title} - ${data.client_name}`,
          type: "compromisso",
          user_email: user?.email,
          related_id: savedAppointment.id || editingAppointment?.id,
          scheduled_date: notificationDate.toISOString(),
        });
      }
    }
  };

  const handleEditAppointment = (appointment) => {
    setEditingAppointment(appointment);
    setShowAppointmentForm(true);
  };

  const handleDeleteAppointment = async (appointment) => {
    if (
      confirm(
        `Deseja realmente excluir este registro do histórico? Esta ação não pode ser desfeita.`,
      )
    ) {
      deleteAppointmentMutation.mutate(appointment.id);

      const notifications = await notificationService.filter({
        related_id: appointment.id,
      });
      for (const notification of notifications) {
        await notificationService.delete(notification.id);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Cliente não encontrado</p>
        <Link to={createPageUrl("Clients")}>
          <Button variant="link">Voltar para lista</Button>
        </Link>
      </div>
    );
  }

  const checklist = BENEFIT_CHECKLISTS[client.benefit_type] || [];
  const completedDocs = checklist.filter(
    (doc) => client.documents_checklist?.[doc.id],
  ).length;
  const progressPercent =
    checklist.length > 0 ? (completedDocs / checklist.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={createPageUrl("Clients")}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">
            {client.full_name}
          </h1>
          <p className="text-slate-500">{client.cpf_cnpj}</p>
        </div>
        <Button onClick={() => setShowEditForm(true)} variant="outline">
          <Edit className="w-4 h-4 mr-2" />
          Editar
        </Button>
      </div>

      {/* Tabs de navegação */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="info" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Informações
          </TabsTrigger>
          <TabsTrigger value="beneficios" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Benefícios
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="processes" className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Processos
          </TabsTrigger>
        </TabsList>

        {/* Tab: Informações */}
        <TabsContent value="info">
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card 1: Informações Pessoais */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5 text-[#1e3a5f]" />
                    Informações Pessoais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-slate-500 text-sm">
                        Nome Completo
                      </span>
                      <span className="font-medium text-slate-800">
                        {client.full_name}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-slate-500 text-sm">CPF</span>
                      <span className="font-medium text-slate-800">
                        {client.cpf_cnpj}
                      </span>
                    </div>
                    {client.data_nascimento && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-slate-500 text-sm">
                          Data de Nascimento | Idade
                        </span>
                        <span className="font-medium text-slate-800">
                          {format(
                            new Date(client.data_nascimento),
                            "dd/MM/yyyy",
                          )}
                          {" | "}
                          {(() => {
                            const hoje = new Date();
                            const nasc = new Date(client.data_nascimento);
                            let idade = hoje.getFullYear() - nasc.getFullYear();
                            const m = hoje.getMonth() - nasc.getMonth();
                            if (
                              m < 0 ||
                              (m === 0 && hoje.getDate() < nasc.getDate())
                            )
                              idade--;
                            return `${idade} anos`;
                          })()}
                        </span>
                      </div>
                    )}
                    {(client.rg ||
                      client.data_emissao_rg ||
                      client.orgao_expedidor) && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-slate-500 text-sm">
                          RG | Data Emissão | Órgão
                        </span>
                        <span className="font-medium text-slate-800 text-right">
                          {client.rg || "-"}
                          {client.data_emissao_rg &&
                            ` | ${format(new Date(client.data_emissao_rg), "dd/MM/yyyy")}`}
                          {client.orgao_expedidor &&
                            ` | ${client.orgao_expedidor}`}
                        </span>
                      </div>
                    )}
                    {client.estado_civil && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-slate-500 text-sm">
                          Estado Civil
                        </span>
                        <span className="font-medium text-slate-800 capitalize">
                          {client.estado_civil.replace(/_/g, " ")}
                        </span>
                      </div>
                    )}
                    {client.grau_escolaridade && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-slate-500 text-sm">
                          Escolaridade
                        </span>
                        <span className="font-medium text-slate-800 capitalize">
                          {client.grau_escolaridade.replace(/_/g, " ")}
                        </span>
                      </div>
                    )}
                    {client.profissao && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-slate-500 text-sm">
                          Profissão
                        </span>
                        <span className="font-medium text-slate-800">
                          {client.profissao}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Contato e Endereço */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#1e3a5f]" />
                    Contato e Endereço
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {client.email && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-slate-500 text-sm">E-mail</span>
                        <span className="font-medium text-slate-800">
                          {client.email}
                        </span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-slate-500 text-sm">Telefone</span>
                        <span className="font-medium text-slate-800">
                          {client.phone}
                        </span>
                      </div>
                    )}
                    {client.address && (
                      <div className="py-2 border-b">
                        <span className="text-slate-500 text-sm block mb-1">
                          Endereço Completo
                        </span>
                        <span className="font-medium text-slate-800">
                          {client.address}
                        </span>
                      </div>
                    )}
                    {(client.zip_code || client.city || client.state) && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-slate-500 text-sm">
                          CEP | Cidade | Estado
                        </span>
                        <span className="font-medium text-slate-800 text-right">
                          {client.zip_code || "-"} | {client.city || "-"} |{" "}
                          {client.state || "-"}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Informações Preliminares */}
              <Card className="border-0 shadow-sm lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#1e3a5f]" />
                    Informações Preliminares
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {client.senha_meu_inss && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-slate-500 text-sm">
                          Senha do MEU INSS
                        </span>
                        <span className="font-medium text-slate-800 font-mono">
                          {client.senha_meu_inss}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-slate-500 text-sm">
                        Inscrito no Cadastro Único?
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          client.inscrito_cadunico
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-600"
                        }
                      >
                        {client.inscrito_cadunico ? "Sim" : "Não"}
                      </Badge>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-slate-500 text-sm">
                        Possui a senha GOV?
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          client.possui_senha_gov
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-600"
                        }
                      >
                        {client.possui_senha_gov ? "Sim" : "Não"}
                      </Badge>
                    </div>
                    {client.possui_senha_gov && client.senha_gov && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-slate-500 text-sm">
                          Senha GOV
                        </span>
                        <span className="font-medium text-slate-800 font-mono">
                          {client.senha_gov}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-slate-500 text-sm">
                        Já possui biometria?
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          client.possui_biometria
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-600"
                        }
                      >
                        {client.possui_biometria ? "Sim" : "Não"}
                      </Badge>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-slate-500 text-sm">
                        Pedido anterior INSS/Judicial?
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          client.pedido_anterior_inss
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-600"
                        }
                      >
                        {client.pedido_anterior_inss ? "Sim" : "Não"}
                      </Badge>
                    </div>
                    {client.pedido_anterior_inss && (
                      <>
                        {client.numero_processo_administrativo && (
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-slate-500 text-sm">
                              Processo Administrativo (NB)
                            </span>
                            <span className="font-medium text-slate-800 font-mono">
                              {client.numero_processo_administrativo}
                            </span>
                          </div>
                        )}
                        {client.numero_processo_judicial && (
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-slate-500 text-sm">
                              Processo Judicial
                            </span>
                            <span className="font-medium text-slate-800 font-mono">
                              {client.numero_processo_judicial}
                            </span>
                          </div>
                        )}
                        {client.observacoes_processos_anteriores && (
                          <div className="py-2">
                            <span className="text-slate-500 text-sm block mb-2">
                              Observações sobre processos anteriores
                            </span>
                            <p className="text-slate-700 text-sm bg-slate-50 p-3 rounded">
                              {client.observacoes_processos_anteriores}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Status de Documentos */}
            <DocumentStatusCard
              documents={clientDocuments}
              beneficios={beneficios}
              onNavigateToDocuments={() => setActiveTab("documents")}
              onNavigateToBeneficio={(beneficio) => {
                setEditingBeneficio(beneficio);
                setShowBeneficioEditModal(true);
              }}
            />
          </div>
        </TabsContent>

        {/* Tab: Documentos */}
        <TabsContent value="documents">
          <ClientDocumentsSection
            clientId={clientId}
            clientName={client?.full_name}
          />
        </TabsContent>

        {/* Tab: Benefícios */}
        <TabsContent value="beneficios">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#1e3a5f]" />
                  Documentos e Benefícios
                </CardTitle>
                <Button
                  onClick={() => setShowBeneficioModal(true)}
                  className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Benefício
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {beneficios.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Nenhum benefício cadastrado</p>
                  <Button
                    variant="link"
                    onClick={() => setShowBeneficioModal(true)}
                    className="mt-2"
                  >
                    Adicionar primeiro benefício
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {beneficios.map((beneficio) => {
                    const STATUS_LABELS = {
                      em_analise: "Em Análise",
                      documentacao_pendente: "Documentação Pendente",
                      aguardando_protocolo: "Aguardando Protocolo",
                      protocolado: "Protocolado",
                      aguardando_inss: "Aguardando INSS",
                      indeferido: "Indeferido",
                      deferido: "Deferido/Concedido",
                      cancelado: "Cancelado",
                    };

                    const TIPO_LABELS = {
                      bpc_loas_idoso: "BPC/LOAS - Idoso",
                      bpc_loas_pcd: "BPC/LOAS - PCD",
                      aposentadoria_idade_rural:
                        "Aposentadoria por Idade Rural",
                      incapacidade_rural: "Benefício por Incapacidade Rural",
                      salario_maternidade_rural: "Salário-Maternidade Rural",
                      pensao_morte_rural: "Pensão por Morte Rural",
                      aposentadoria_idade_urbano:
                        "Aposentadoria por Idade Urbano",
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

                    return (
                      <Card
                        key={beneficio.id}
                        className="hover:shadow-md transition-all cursor-pointer group relative"
                        onClick={() => {
                          setEditingBeneficio(beneficio);
                          setShowBeneficioEditModal(true);
                        }}
                      >
                        {/* Action Buttons */}
                        <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-white shadow-sm hover:bg-blue-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingBeneficio(beneficio);
                              setShowBeneficioEditModal(true);
                            }}
                          >
                            <Pencil className="w-4 h-4 text-blue-600" />
                          </Button>
                        </div>

                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between pr-16">
                              <div className="flex-1">
                                <p className="font-semibold text-slate-800">
                                  {TIPO_LABELS[beneficio.tipo_beneficio] ||
                                    beneficio.tipo_beneficio
                                      ?.replace(/_/g, " ")
                                      .toUpperCase()}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  Categoria:{" "}
                                  {CATEGORIA_LABELS[beneficio.categoria] ||
                                    beneficio.categoria
                                      ?.replace(/_/g, " ")
                                      .toUpperCase()}
                                </p>
                              </div>
                            </div>

                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                beneficio.status === "deferido"
                                  ? "bg-green-100 text-green-700 border-green-200"
                                  : beneficio.status === "indeferido"
                                    ? "bg-red-100 text-red-700 border-red-200"
                                    : beneficio.status === "protocolado"
                                      ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                                      : beneficio.status === "aguardando_inss"
                                        ? "bg-purple-100 text-purple-700 border-purple-200"
                                        : beneficio.status ===
                                            "documentacao_pendente"
                                          ? "bg-orange-100 text-orange-700 border-orange-200"
                                          : beneficio.status === "cancelado"
                                            ? "bg-slate-100 text-slate-700 border-slate-200"
                                            : "bg-amber-100 text-amber-700 border-amber-200"
                              }`}
                            >
                              {STATUS_LABELS[beneficio.status] ||
                                beneficio.status?.replace(/_/g, " ")}
                            </Badge>

                            {beneficio.numero_beneficio && (
                              <p className="text-sm text-slate-600">
                                <span className="text-slate-500">NB:</span>{" "}
                                {beneficio.numero_beneficio}
                              </p>
                            )}

                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              {beneficio.data_protocolo && (
                                <span>
                                  Protocolo:{" "}
                                  {format(
                                    new Date(beneficio.data_protocolo),
                                    "dd/MM/yyyy",
                                  )}
                                </span>
                              )}
                              {beneficio.created_date && (
                                <span>
                                  Cadastrado:{" "}
                                  {format(
                                    new Date(beneficio.created_date),
                                    "dd/MM/yyyy",
                                  )}
                                </span>
                              )}
                            </div>

                            {beneficio.observacoes && (
                              <p className="text-sm text-slate-600 pt-2 border-t line-clamp-2">
                                {beneficio.observacoes}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Processos */}
        <TabsContent value="processes">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-[#1e3a5f]" />
                  Processos ({processes.length})
                </CardTitle>
                <Link to={createPageUrl(`Processes?client_id=${clientId}`)}>
                  <Button size="sm" className="bg-[#1e3a5f] hover:bg-[#2d5a87]">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Processo
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {processes.length === 0 ? (
                <p className="text-center text-slate-500 py-8">
                  Nenhum processo vinculado a este cliente
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {processes.map((process) => (
                    <Link
                      key={process.id}
                      to={createPageUrl(`ProcessDetail?id=${process.id}`)}
                      className="block"
                    >
                      <Card className="hover:shadow-md transition-all hover:border-[#1e3a5f]/30">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-mono font-medium text-sm">
                                {process.process_number}
                              </p>
                              <p className="text-sm text-slate-500 mt-1">
                                {process.court}
                              </p>
                              {process.subject && (
                                <p className="text-xs text-slate-400 mt-2">
                                  {process.subject}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className={`
                              ${process.status === "ativo" ? "bg-green-50 text-green-700 border-green-200" : ""}
                              ${process.status === "arquivado" ? "bg-slate-50 text-slate-700 border-slate-200" : ""}
                              ${process.status === "suspenso" ? "bg-amber-50 text-amber-700 border-amber-200" : ""}
                              ${process.status === "encerrado" ? "bg-red-50 text-red-700 border-red-200" : ""}
                            `}
                            >
                              {process.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <ClientForm
            client={client}
            onSave={(data) => updateMutation.mutate(data)}
            onCancel={() => setShowEditForm(false)}
            isSaving={updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Appointment Dialog */}
      <Dialog open={showAppointmentForm} onOpenChange={setShowAppointmentForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAppointment ? "Editar Compromisso" : "Novo Compromisso"}
            </DialogTitle>
          </DialogHeader>
          <AppointmentForm
            appointment={editingAppointment}
            clientId={clientId}
            clientName={client?.full_name}
            onSave={handleAppointmentSave}
            onCancel={() => {
              setShowAppointmentForm(false);
              setEditingAppointment(null);
            }}
            isSaving={
              createAppointmentMutation.isPending ||
              updateAppointmentMutation.isPending
            }
          />
        </DialogContent>
      </Dialog>

      {/* Beneficio Modal */}
      <BeneficioModal
        open={showBeneficioModal}
        onClose={() => setShowBeneficioModal(false)}
        clientId={clientId}
        clientName={client?.full_name}
      />

      {/* Beneficio Edit Modal */}
      <BeneficioEditModal
        open={showBeneficioEditModal}
        onClose={() => {
          setShowBeneficioEditModal(false);
          setEditingBeneficio(null);
        }}
        beneficio={editingBeneficio}
        clientId={clientId}
        clientName={client?.full_name}
      />
    </div>
  );
}
