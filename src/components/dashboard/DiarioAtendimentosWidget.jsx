import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { atendimentoService, clientService, taskService, documentService, aiService, userService } from "@/services";
import { authService } from "@/services/authService";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, PhoneCall, Plus, ArrowRight, Trash2, Search, Pencil } from "lucide-react";
import { toast } from "sonner";
export default function DiarioAtendimentosWidget() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome_contato: "",
    telefone: "",
    categoria: "Prospecto",
    assunto: "",
    status: "Pendente",
    client_id: null,
    origem: "",
    origem_nome: "",
    detalhes: ""
  });
  const [arquivos, setArquivos] = useState([]);
  const [encaminharAdmin, setEncaminharAdmin] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => authService.getCurrentUser(),
    staleTime: 5 * 60 * 1000
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => userService.list(),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients", "lista-simples"],
    queryFn: () => clientService.list("full_name"),
  });
  const { data: atendimentos = [], isLoading } = useQuery({
    queryKey: ["atendimentos", "widget"],
    queryFn: () => atendimentoService.list("-created_at", 5), // limite de 5
  });
  const createMutation = useMutation({
    mutationFn: (newAtendimento) => atendimentoService.create(newAtendimento),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atendimentos"] });
      setIsModalOpen(false);
      setFormData({ nome_contato: "", telefone: "", categoria: "Prospecto", assunto: "", status: "Pendente", client_id: null, origem: "", origem_nome: "", detalhes: "" });
      setArquivos([]);
      setEncaminharAdmin(false);
      toast.success("Atendimento registrado com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao registrar atendimento");
    }
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => atendimentoService.delete(id),
    onSuccess: (data, deletedId) => {
      // Atualização otimista ("cirúrgica" via filter): remove do cache instantaneamente sem necessidade de reload
      queryClient.setQueryData(["atendimentos", "widget"], (oldData) => {
        if (!oldData) return [];
        return oldData.filter((atendimento) => atendimento.id !== deletedId);
      });
      
      // Invalida outras queries de atendimentos base para manter consistência no background
      queryClient.invalidateQueries({ queryKey: ["atendimentos"] });
      toast.success("Atendimento excluído!");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao excluir atendimento");
    }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => atendimentoService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atendimentos"] });
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ nome_contato: "", telefone: "", categoria: "Prospecto", assunto: "", status: "Pendente", client_id: null, origem: "", origem_nome: "", detalhes: "" });
      toast.success("Atendimento atualizado!");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar atendimento");
    }
  });
  const handleSave = async () => {
    if (!formData.nome_contato || !formData.assunto) {
      toast.error("Por favor, preencha o nome do contato e o assunto.");
      return;
    }

    setIsUploading(true);
    try {
      // 1. Upload de arquivos se houver
      if (arquivos.length > 0) {
        toast.info("Fazendo upload de documentos, aguarde...");
        for (const file of arquivos) {
          try {
            const file_url = await aiService.uploadFile(file, 'outros');
            if (formData.client_id) {
              await documentService.create({
                parent_type: 'client',
                parent_id: formData.client_id,
                category: 'outros',
                name: file.name,
                file_url
              });
            }
          } catch (uploadErr) {
            console.error("Erro no upload de arquivo:", uploadErr);
            toast.error(`Falha ao carregar arquivo: ${file.name}`);
          }
        }
      }

      // 2. Preparar payload com created_by
      const payload = { 
        ...formData,
        created_by: currentUser?.id || null
      };

      // 3. Salvar (Criar ou Atualizar)
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
        
        // 4. Encaminhamento opcional para admin
        if (encaminharAdmin) {
          const adminUser = users.find(u => u.role === 'admin' || u.role === 'dono');
          if (adminUser) {
            await taskService.create({
              title: "Atendimento: " + formData.nome_contato,
              description: formData.detalhes || formData.assunto,
              assigned_to: adminUser.email,
              client_id: formData.client_id,
              priority: "media"
            });
            toast.success("Tarefa criada para a admin.");
          }
        }
      }
    } catch (e) {
      console.error("Erro ao salvar atendimento:", e);
      // O toast de erro já é disparado pelo onError do mutation, 
      // mas garantimos aqui caso o erro ocorra fora da mutation
      if (!e.isSupabaseError) {
        toast.error(e.message || "Erro inesperado ao salvar");
      }
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
      detalhes: atendimento.detalhes || ""
    });
    setEditingId(atendimento.id);
    setIsModalOpen(true);
  };
  const converterCliente = (atendimento) => {
    const params = new URLSearchParams({
      nome: atendimento.nome_contato || "",
      telefone: atendimento.telefone || "",
      atendimento_id: atendimento.id
    });
    navigate(`/Clients?${params.toString()}`);
  };
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
          <BookOpen className="w-5 h-5 text-legal-gold" />
          Diário de Atendimentos
        </CardTitle>
        <Dialog open={isModalOpen} onOpenChange={(isOpen) => { if (!isOpen && (formData.nome_contato || formData.telefone || formData.assunto)) { if (!window.confirm('Existem informações não salvas. Deseja realmente cancelar e perder os dados?')) return; } setIsModalOpen(isOpen); if (!isOpen) { setEditingId(null); } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-legal-blue hover:bg-legal-blue-light text-white" onClick={() => { setFormData({ nome_contato: "", telefone: "", categoria: "Prospecto", assunto: "", status: "Pendente", client_id: null, origem: "", origem_nome: "", detalhes: "" }); setEditingId(null); }}>
              <Plus className="w-4 h-4 mr-1" />
              Novo
            </Button>
          </DialogTrigger>
          <DialogContent onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Atendimento" : "Registrar Novo Atendimento"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Vincular a Cliente Existente (Opcional)</Label>
                <Select 
                  value={formData.client_id || "none"} 
                  onValueChange={(val) => {
                    if (val === "none") {
                      setFormData({...formData, client_id: null});
                    } else {
                      const client = clients.find(c => c.id === val);
                      if (client) {
                        setFormData({
                          ...formData,
                          client_id: client.id,
                          nome_contato: client.full_name,
                          telefone: client.phone || "",
                          categoria: "Cliente"
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
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome do Contato</Label>
                <Input id="nome" value={formData.nome_contato} onChange={(e) => setFormData({...formData, nome_contato: e.target.value})} placeholder="Ex: João Silva" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} placeholder="(00) 00000-0000" />
              </div>
              <div className="grid gap-2">
                <Label>Categoria</Label>
                <Select value={formData.categoria} onValueChange={(val) => setFormData({...formData, categoria: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Prospecto">Prospecto</SelectItem>
                    <SelectItem value="Cliente">Cliente</SelectItem>
                    <SelectItem value="Consulta">Consulta</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {!formData.client_id && (
                <div className="grid gap-2">
                  <Label>Origem</Label>
                  <Select value={formData.origem} onValueChange={(val) => setFormData({...formData, origem: val})}>
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
              {(!formData.client_id && (formData.origem === 'Indicação' || formData.origem === 'Parceiro')) && (
                <div className="grid gap-2">
                  <Label>Nome de quem indicou / Parceiro</Label>
                  <Input value={formData.origem_nome} onChange={(e) => setFormData({...formData, origem_nome: e.target.value})} placeholder="Ex: Maria Pereira" />
                </div>
              )}
              <div className="grid gap-2">
                <Label>Assunto</Label>
                <Select value={formData.assunto} onValueChange={(val) => setFormData({...formData, assunto: val})}>
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
              {formData.assunto && (
                <div className="grid gap-2">
                  <Label>Detalhes</Label>
                  <Textarea value={formData.detalhes} onChange={(e) => setFormData({...formData, detalhes: e.target.value})} placeholder="Descreva os detalhes..." rows={3} />
                </div>
              )}
              {formData.assunto === "Entregar Documento" && (
                <div className="grid gap-2">
                  <Label>Arquivos (Upload opcional)</Label>
                  <Input type="file" multiple onChange={(e) => setArquivos(Array.from(e.target.files))} />
                </div>
              )}
              {currentUser?.role !== 'admin' && (
                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox id="encaminhar_admin" checked={encaminharAdmin} onCheckedChange={(val) => setEncaminharAdmin(val)} />
                  <label htmlFor="encaminhar_admin" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Encaminhar para a Advogada (Criar Tarefa)
                  </label>
                </div>
              )}
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                    <SelectItem value="Concluído">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending || isUploading} className="bg-legal-blue hover:bg-legal-blue-light text-white">
                {(createMutation.isPending || updateMutation.isPending || isUploading) ? "Salvando..." : editingId ? "Salvar Edição" : "Salvar Atendimento"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <div className="px-4 pt-2 pb-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <Input
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-xs bg-slate-50 border-slate-200 focus:bg-white"
          />
        </div>
      </div>
      <CardContent className="flex-1 p-4 pt-2 space-y-3">
        {isLoading ? (
          <p className="text-sm text-slate-600 text-center py-4">Carregando atendimentos...</p>
        ) : (() => {
          const filteredAtendimentos = atendimentos.filter(a =>
            a.nome_contato && 
            a.nome_contato.trim() !== "" &&
            a.nome_contato.toLowerCase().includes(searchTerm.toLowerCase())
          );
          return filteredAtendimentos.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-4">
              {searchTerm ? "Nenhum resultado encontrado." : "Nenhum atendimento registrado."}
            </p>
          ) : (
          <div className="space-y-3 mt-2">
            {filteredAtendimentos.map(atendimento => (
              <div key={atendimento.id} className="p-3 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => { if (atendimento.client_id) navigate(`/ClientDetail?id=${atendimento.client_id}&tab=atendimentos`); }}>
                <div className="flex justify-between items-start flex-col gap-2">
                  <div className="space-y-1.5 w-full">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm text-slate-800">{atendimento.nome_contato}</h3>
                      <div className="flex gap-1.5 items-center">
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                          atendimento.categoria === 'Prospecto' ? 'bg-blue-100 text-blue-800' :
                          atendimento.categoria === 'Cliente' ? 'bg-green-100 text-green-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {atendimento.categoria}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                          atendimento.status === 'Pendente' ? 'bg-amber-100 text-amber-800' :
                          atendimento.status === 'Concluído' ? 'bg-green-100 text-green-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {atendimento.status}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-slate-600 hover:text-blue-600" 
                          onClick={(e) => { e.stopPropagation(); handleEdit(atendimento); }}
                          aria-label="Editar atendimento"
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        {(currentUser?.role === 'admin' || currentUser?.role === 'dono') && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-slate-600 hover:text-red-600" 
                            onClick={(e) => { e.stopPropagation(); if(window.confirm('Excluir este atendimento?')) deleteMutation.mutate(atendimento.id); }}
                            aria-label="Excluir atendimento"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 flex items-center justify-between">
                      {atendimento.created_at && (
                        <span>{format(new Date(atendimento.created_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                      )}
                      {atendimento.telefone && (
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <PhoneCall className="w-3 h-3" />
                          {atendimento.telefone}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 mt-1 line-clamp-2">
                      {atendimento.assunto}
                    </p>
                    {atendimento.detalhes && (
                      <p className="text-[11px] text-slate-600 italic mt-1 line-clamp-2">{atendimento.detalhes}</p>
                    )}
                  </div>
                  
                  {atendimento.categoria === 'Prospecto' && atendimento.status === 'Pendente' && (
                    <Button 
                      size="sm"
                      onClick={() => converterCliente(atendimento)}
                      className="bg-green-600 hover:bg-green-700 w-full text-white shadow-sm transition-all h-8 text-xs mt-1"
                    >
                      <span>Converter em Cliente</span>
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ); })()}
      </CardContent>
    </Card>
  );
}
