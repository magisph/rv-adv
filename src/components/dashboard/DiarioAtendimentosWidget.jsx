import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { atendimentoService, clientService, taskService, documentService, aiService, userService } from "@/services";
import { authService } from "@/services/authService";
import { useNavigate } from "react-router-dom";
import { format, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BookOpen,
  PhoneCall,
  Plus,
  ArrowRight,
  Trash2,
  Search,
  Pencil,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  FileText,
  X,
} from "lucide-react";
import { toast } from "sonner";

// ─────────────────────────────────────────────
// Helpers de data
// ─────────────────────────────────────────────
const MONTHS_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];
const DAYS_PT = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

// ─────────────────────────────────────────────
// Sub-componente: Mini-Calendário
// ─────────────────────────────────────────────
function MiniCalendar({ atendimentos, onDayClick, selectedDay }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  // Construir um Set de dias que têm atendimentos (formato "YYYY-MM-DD")
  const daysWithAtendimentos = useMemo(() => {
    const set = new Set();
    atendimentos.forEach((a) => {
      if (a.created_at) {
        set.add(format(parseISO(a.created_at), "yyyy-MM-dd"));
      }
    });
    return set;
  }, [atendimentos]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const cells = [];
  // Células vazias antes do primeiro dia
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} />);
  }
  // Dias do mês
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const hasEvents = daysWithAtendimentos.has(dateStr);
    const isToday = d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
    const isSelected = selectedDay === dateStr;

    cells.push(
      <button
        key={d}
        type="button"
        onClick={() => onDayClick(dateStr)}
        className={[
          "relative flex items-center justify-center rounded-full w-7 h-7 text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-legal-blue",
          isSelected
            ? "bg-legal-blue text-white shadow"
            : isToday
            ? "bg-legal-gold/20 text-legal-gold font-bold"
            : "hover:bg-slate-100 text-slate-700",
        ].join(" ")}
        aria-label={`${d} de ${MONTHS_PT[viewMonth]} de ${viewYear}${hasEvents ? " — tem atendimentos" : ""}`}
      >
        {d}
        {hasEvents && (
          <span
            className={[
              "absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
              isSelected ? "bg-white" : "bg-legal-blue",
            ].join(" ")}
          />
        )}
      </button>
    );
  }

  return (
    <div className="px-4 pb-3 border-b border-slate-100">
      {/* Cabeçalho do calendário */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1 rounded hover:bg-slate-100 text-slate-500"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs font-semibold text-slate-700">
          {MONTHS_PT[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1 rounded hover:bg-slate-100 text-slate-500"
          aria-label="Próximo mês"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_PT.map((d) => (
          <div key={d} className="flex items-center justify-center text-[9px] font-bold text-slate-400 uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Grade de dias */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub-componente: Modal de Visualização Diária
// ─────────────────────────────────────────────
function DailyViewModal({ isOpen, onClose, selectedDay, atendimentos, onEdit, onDelete, onConvert, currentUser, navigate }) {
  const dayAtendimentos = useMemo(() => {
    if (!selectedDay) return [];
    return atendimentos.filter((a) => {
      if (!a.created_at) return false;
      return isSameDay(parseISO(a.created_at), parseISO(selectedDay));
    });
  }, [atendimentos, selectedDay]);

  const formattedDate = selectedDay
    ? format(parseISO(selectedDay), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
    : "";

  const statusColor = (status) => {
    if (status === "Pendente") return "bg-amber-100 text-amber-800 border-amber-200";
    if (status === "Concluído" || status === "Resolvido") return "bg-green-100 text-green-800 border-green-200";
    if (status === "Em Andamento") return "bg-blue-100 text-blue-800 border-blue-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  const categoriaColor = (cat) => {
    if (cat === "Prospecto") return "bg-blue-100 text-blue-800";
    if (cat === "Cliente") return "bg-green-100 text-green-800";
    return "bg-slate-100 text-slate-700";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-legal-blue" />
            <DialogTitle className="text-base font-bold text-slate-800 capitalize">
              {formattedDate}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500 mt-1">
            {dayAtendimentos.length === 0
              ? "Nenhum atendimento registado neste dia."
              : `${dayAtendimentos.length} atendimento(s) registado(s)`}
          </DialogDescription>
        </DialogHeader>

        {/* Lista de atendimentos do dia */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {dayAtendimentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <CalendarDays className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">Sem atendimentos para este dia.</p>
            </div>
          ) : (
            dayAtendimentos.map((atendimento) => (
              <div
                key={atendimento.id}
                className="rounded-lg border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Cabeçalho do card */}
                <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-legal-blue/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-legal-blue" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-800 truncate">
                        {atendimento.nome_contato}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${categoriaColor(atendimento.categoria)}`}>
                          {atendimento.categoria}
                        </span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${statusColor(atendimento.status)}`}>
                          {atendimento.status}
                        </span>
                        {atendimento.created_at && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {format(parseISO(atendimento.created_at), "HH:mm")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-legal-blue"
                      onClick={() => { onClose(); onEdit(atendimento); }}
                      aria-label="Editar atendimento"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-red-500"
                      onClick={() => onDelete(atendimento.id)}
                      aria-label="Excluir atendimento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Conteúdo */}
                <div className="px-4 pb-3 space-y-2">
                  {/* Assunto */}
                  <div className="flex items-start gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <p className="text-xs font-medium text-slate-700">{atendimento.assunto}</p>
                  </div>

                  {/* Detalhes / Observações */}
                  {atendimento.detalhes && (
                    <div className="bg-slate-50 rounded-md border border-slate-100 px-3 py-2">
                      <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {atendimento.detalhes}
                      </p>
                    </div>
                  )}

                  {/* Telefone */}
                  {atendimento.telefone && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <PhoneCall className="w-3 h-3" />
                      {atendimento.telefone}
                    </div>
                  )}

                  {/* Origem */}
                  {atendimento.origem && (
                    <div className="text-[10px] text-slate-400">
                      Origem: <span className="font-medium text-slate-600">{atendimento.origem}</span>
                      {atendimento.origem_nome && ` — ${atendimento.origem_nome}`}
                    </div>
                  )}

                  {/* Botão Converter */}
                  {atendimento.categoria === "Prospecto" && atendimento.status === "Pendente" && (
                    <Button
                      size="sm"
                      onClick={() => { onClose(); onConvert(atendimento); }}
                      className="bg-green-600 hover:bg-green-700 w-full text-white h-7 text-xs mt-1"
                    >
                      <span>Converter em Cliente</span>
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="px-6 py-3 border-t border-slate-100 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-3.5 h-3.5 mr-1.5" />
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// Componente Principal
// ─────────────────────────────────────────────
const EMPTY_FORM = {
  nome_contato: "",
  telefone: "",
  categoria: "Prospecto",
  assunto: "",
  status: "Pendente",
  client_id: null,
  origem: "",
  origem_nome: "",
  detalhes: "",
};

export default function DiarioAtendimentosWidget() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ── Estado do formulário de criação/edição ──
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [arquivos, setArquivos] = useState([]);
  const [encaminharAdmin, setEncaminharAdmin] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // ── Estado da visualização diária ──
  const [selectedDay, setSelectedDay] = useState(null);
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);

  // ── Pesquisa ──
  const [searchTerm, setSearchTerm] = useState("");

  // ── Queries ──
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => authService.getCurrentUser(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => userService.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", "lista-simples"],
    queryFn: () => clientService.list("full_name"),
  });

  // Busca TODOS os atendimentos para o calendário (sem limite)
  const { data: allAtendimentos = [], isLoading } = useQuery({
    queryKey: ["atendimentos", "all"],
    queryFn: () => atendimentoService.list("-created_at"),
  });

  // Os 5 mais recentes para a lista resumida
  const recentAtendimentos = useMemo(
    () => allAtendimentos.slice(0, 5),
    [allAtendimentos]
  );

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: (data) => atendimentoService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atendimentos"] });
      setIsFormOpen(false);
      setFormData(EMPTY_FORM);
      setArquivos([]);
      setEncaminharAdmin(false);
      toast.success("Atendimento registado com sucesso!");
    },
    onError: (err) => toast.error(err.message || "Erro ao registar atendimento"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => atendimentoService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atendimentos"] });
      setIsFormOpen(false);
      setEditingId(null);
      setFormData(EMPTY_FORM);
      toast.success("Atendimento actualizado!");
    },
    onError: (err) => toast.error(err.message || "Erro ao actualizar atendimento"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => atendimentoService.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData(["atendimentos", "all"], (old = []) =>
        old.filter((a) => a.id !== deletedId)
      );
      queryClient.invalidateQueries({ queryKey: ["atendimentos"] });
      toast.success("Atendimento excluído!");
    },
    onError: (err) => toast.error(err.message || "Erro ao excluir atendimento"),
  });

  // ── Handlers ──
  const handleSave = async () => {
    if (!formData.nome_contato || !formData.assunto) {
      toast.error("Preencha o nome do contato e o assunto.");
      return;
    }

    setIsUploading(true);
    try {
      if (arquivos.length > 0 && formData.client_id) {
        toast.info("Fazendo upload de documentos, aguarde...");
        for (const file of arquivos) {
          try {
            const { file_url } = await aiService.uploadFile({ file });
            await documentService.create({
              parent_type: "client",
              parent_id: formData.client_id,
              category: "outros",
              name: file.name,
              file_url,
            });
          } catch {
            toast.error(`Falha ao carregar: ${file.name}`);
          }
        }
      }

      const payload = { ...formData, created_by: currentUser?.id || null };

      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
        if (encaminharAdmin) {
          const adminUser = users.find((u) => u.role === "admin" || u.role === "dono");
          if (adminUser) {
            await taskService.create({
              title: "Atendimento: " + formData.nome_contato,
              description: formData.detalhes || formData.assunto,
              assigned_to: adminUser.email,
              client_id: formData.client_id,
              priority: "media",
            });
            toast.success("Tarefa criada para a admin.");
          }
        }
      }
    } catch (e) {
      if (!e.isSupabaseError) toast.error(e.message || "Erro inesperado");
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (atendimento) => {
    setFormData({
      nome_contato: atendimento.nome_contato || "",
      telefone: atendimento.telefone || "",
      categoria: atendimento.categoria || "Prospecto",
      assunto: atendimento.assunto || "",
      status: atendimento.status || "Pendente",
      client_id: atendimento.client_id || null,
      origem: atendimento.origem || "",
      origem_nome: atendimento.origem_nome || "",
      detalhes: atendimento.detalhes || "",
    });
    setEditingId(atendimento.id);
    setIsFormOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Excluir este atendimento?")) {
      deleteMutation.mutate(id);
    }
  };

  const converterCliente = (atendimento) => {
    const params = new URLSearchParams({
      nome: atendimento.nome_contato || "",
      telefone: atendimento.telefone || "",
      atendimento_id: atendimento.id,
    });
    navigate(`/Clients?${params.toString()}`);
  };

  const handleDayClick = (dateStr) => {
    setSelectedDay(dateStr);
    setIsDailyModalOpen(true);
  };

  const openNewForm = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setIsFormOpen(true);
  };

  // Filtro de pesquisa para a lista resumida
  const filteredRecent = useMemo(
    () =>
      recentAtendimentos.filter(
        (a) =>
          a.nome_contato?.trim() !== "" &&
          a.nome_contato?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [recentAtendimentos, searchTerm]
  );

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <>
      <Card className="flex flex-col h-full">
        {/* ── Cabeçalho ── */}
        <CardHeader className="flex flex-row items-center justify-between pb-2 shrink-0">
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
            <BookOpen className="w-5 h-5 text-legal-gold" />
            Diário de Atendimentos
          </CardTitle>
          <Button
            size="sm"
            className="bg-legal-blue hover:bg-legal-blue-light text-white"
            onClick={openNewForm}
          >
            <Plus className="w-4 h-4 mr-1" />
            Novo
          </Button>
        </CardHeader>

        {/* ── Mini-Calendário ── */}
        <MiniCalendar
          atendimentos={allAtendimentos}
          onDayClick={handleDayClick}
          selectedDay={selectedDay}
        />

        {/* ── Pesquisa ── */}
        <div className="px-4 pt-3 pb-0 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs bg-slate-50 border-slate-200 focus:bg-white"
            />
          </div>
        </div>

        {/* ── Lista Resumida (5 mais recentes) ── */}
        <CardContent className="flex-1 p-4 pt-2 space-y-3 overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-slate-500 text-center py-4">Carregando...</p>
          ) : filteredRecent.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              {searchTerm ? "Nenhum resultado." : "Nenhum atendimento registado."}
            </p>
          ) : (
            <div className="space-y-3 mt-2">
              {filteredRecent.map((atendimento) => (
                <div
                  key={atendimento.id}
                  className="p-3 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:bg-slate-50"
                  onClick={() => {
                    if (atendimento.client_id)
                      navigate(`/ClientDetail?id=${atendimento.client_id}&tab=atendimentos`);
                  }}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1.5 w-full min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm text-slate-800 truncate">
                          {atendimento.nome_contato}
                        </h3>
                        <div className="flex gap-1 items-center shrink-0">
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                            atendimento.categoria === "Prospecto" ? "bg-blue-100 text-blue-800" :
                            atendimento.categoria === "Cliente" ? "bg-green-100 text-green-800" :
                            "bg-slate-100 text-slate-700"
                          }`}>
                            {atendimento.categoria}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                            atendimento.status === "Pendente" ? "bg-amber-100 text-amber-800" :
                            atendimento.status === "Concluído" ? "bg-green-100 text-green-800" :
                            "bg-slate-100 text-slate-700"
                          }`}>
                            {atendimento.status}
                          </span>
                          <Button
                            variant="ghost" size="icon"
                            className="h-6 w-6 text-slate-400 hover:text-legal-blue"
                            onClick={(e) => { e.stopPropagation(); handleEdit(atendimento); }}
                            aria-label="Editar"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-6 w-6 text-slate-400 hover:text-red-500"
                            onClick={(e) => { e.stopPropagation(); handleDelete(atendimento.id); }}
                            aria-label="Excluir"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center justify-between">
                        {atendimento.created_at && (
                          <span>{format(parseISO(atendimento.created_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                        )}
                        {atendimento.telefone && (
                          <span className="flex items-center gap-1 font-medium text-slate-600">
                            <PhoneCall className="w-3 h-3" />
                            {atendimento.telefone}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 mt-1 line-clamp-2">
                        {atendimento.assunto}
                      </p>
                      {atendimento.detalhes && (
                        <p className="text-[11px] text-slate-500 italic mt-1 line-clamp-2">
                          {atendimento.detalhes}
                        </p>
                      )}
                    </div>
                  </div>

                  {atendimento.categoria === "Prospecto" && atendimento.status === "Pendente" && (
                    <Button
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); converterCliente(atendimento); }}
                      className="bg-green-600 hover:bg-green-700 w-full text-white shadow-sm h-8 text-xs mt-2"
                    >
                      Converter em Cliente
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Modal de Visualização Diária ── */}
      <DailyViewModal
        isOpen={isDailyModalOpen}
        onClose={() => setIsDailyModalOpen(false)}
        selectedDay={selectedDay}
        atendimentos={allAtendimentos}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onConvert={converterCliente}
        currentUser={currentUser}
        navigate={navigate}
      />

      {/* ── Modal de Criação/Edição ── */}
      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!open && (formData.nome_contato || formData.assunto)) {
            if (!window.confirm("Existem informações não salvas. Deseja cancelar?")) return;
          }
          setIsFormOpen(open);
          if (!open) setEditingId(null);
        }}
      >
        <DialogContent onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Atendimento" : "Registar Novo Atendimento"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4 max-h-[65vh] overflow-y-auto pr-1">
            {/* Cliente */}
            <div className="grid gap-2">
              <Label>Vincular a Cliente Existente (Opcional)</Label>
              <Select
                value={formData.client_id || "none"}
                onValueChange={(val) => {
                  if (val === "none") {
                    setFormData({ ...formData, client_id: null });
                  } else {
                    const client = clients.find((c) => c.id === val);
                    if (client) {
                      setFormData({
                        ...formData,
                        client_id: client.id,
                        nome_contato: client.full_name,
                        telefone: client.phone || "",
                        categoria: "Cliente",
                      });
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (Novo Contato)</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nome */}
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome do Contato *</Label>
              <Input
                id="nome"
                value={formData.nome_contato}
                onChange={(e) => setFormData({ ...formData, nome_contato: e.target.value })}
                placeholder="Ex: João Silva"
              />
            </div>

            {/* Telefone */}
            <div className="grid gap-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="Ex: (85) 99999-9999"
              />
            </div>

            {/* Categoria */}
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Select value={formData.categoria} onValueChange={(val) => setFormData({ ...formData, categoria: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Prospecto">Prospecto</SelectItem>
                  <SelectItem value="Cliente">Cliente</SelectItem>
                  <SelectItem value="Consulta">Consulta</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Origem */}
            {!formData.client_id && (
              <div className="grid gap-2">
                <Label>Origem</Label>
                <Select value={formData.origem} onValueChange={(val) => setFormData({ ...formData, origem: val })}>
                  <SelectTrigger><SelectValue placeholder="Selecione a origem..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Indicação">Indicação</SelectItem>
                    <SelectItem value="Parceiro">Parceiro</SelectItem>
                    <SelectItem value="Redes Sociais">Redes Sociais</SelectItem>
                    <SelectItem value="Passagem">Passagem</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Nome de quem indicou */}
            {!formData.client_id && (formData.origem === "Indicação" || formData.origem === "Parceiro") && (
              <div className="grid gap-2">
                <Label>Nome de quem indicou / Parceiro</Label>
                <Input
                  value={formData.origem_nome}
                  onChange={(e) => setFormData({ ...formData, origem_nome: e.target.value })}
                  placeholder="Ex: Maria Pereira"
                />
              </div>
            )}

            {/* Assunto */}
            <div className="grid gap-2">
              <Label>Assunto *</Label>
              <Select value={formData.assunto} onValueChange={(val) => setFormData({ ...formData, assunto: val })}>
                <SelectTrigger><SelectValue placeholder="Selecione o assunto..." /></SelectTrigger>
                <SelectContent>
                  {!formData.client_id ? (
                    <>
                      <SelectItem value="Consulta">Consulta</SelectItem>
                      <SelectItem value="Primeiro Atendimento">Primeiro Atendimento</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="Informações">Informações</SelectItem>
                      <SelectItem value="Reunião">Reunião</SelectItem>
                      <SelectItem value="Entregar Documento">Entregar Documento</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Detalhes */}
            {formData.assunto && (
              <div className="grid gap-2">
                <Label>Detalhes / Observações</Label>
                <Textarea
                  value={formData.detalhes}
                  onChange={(e) => setFormData({ ...formData, detalhes: e.target.value })}
                  placeholder="Descreva os detalhes do atendimento..."
                  rows={3}
                />
              </div>
            )}

            {/* Upload de arquivos */}
            {formData.assunto === "Entregar Documento" && (
              <div className="grid gap-2">
                <Label>Arquivos (Upload opcional)</Label>
                <Input type="file" multiple onChange={(e) => setArquivos(Array.from(e.target.files))} />
              </div>
            )}

            {/* Encaminhar para admin */}
            {currentUser?.role !== "admin" && (
              <div className="flex items-center space-x-2 mt-1">
                <Checkbox
                  id="encaminhar_admin"
                  checked={encaminharAdmin}
                  onCheckedChange={(val) => setEncaminharAdmin(val)}
                />
                <label htmlFor="encaminhar_admin" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Encaminhar para a Advogada (Criar Tarefa)
                </label>
              </div>
            )}

            {/* Status */}
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending || isUploading}
              className="bg-legal-blue hover:bg-legal-blue-light text-white"
            >
              {createMutation.isPending || updateMutation.isPending || isUploading
                ? "Salvando..."
                : editingId ? "Salvar Edição" : "Salvar Atendimento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
