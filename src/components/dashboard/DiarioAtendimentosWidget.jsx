import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { atendimentoService, clientService } from "@/services";
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
import { BookOpen, PhoneCall, Plus, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function DiarioAtendimentosWidget() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome_contato: "",
    telefone: "",
    categoria: "Prospecto",
    assunto: "",
    status: "Pendente",
    client_id: null
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
      setFormData({ nome_contato: "", telefone: "", categoria: "Prospecto", assunto: "", status: "Pendente", client_id: null });
      toast({ title: "Atendimento registrado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao registrar", description: error.message, variant: "destructive" });
    }
  });

  const handleSave = () => {
    createMutation.mutate(formData);
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
          <BookOpen className="w-5 h-5 text-[#c9a227]" />
          Diário de Atendimentos
        </CardTitle>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 text-white">
              <Plus className="w-4 h-4 mr-1" />
              Novo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Novo Atendimento</DialogTitle>
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
                    <SelectItem value="Parceiro">Parceiro</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assunto">Assunto</Label>
                <Input id="assunto" value={formData.assunto} onChange={(e) => setFormData({...formData, assunto: e.target.value})} placeholder="Resumo do contato" />
              </div>
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
              <Button onClick={handleSave} disabled={createMutation.isPending} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 text-white">
                Salvar Atendimento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="flex-1 p-4 pt-0 space-y-3">
        {isLoading ? (
          <p className="text-sm text-slate-500 text-center py-4">Carregando atendimentos...</p>
        ) : atendimentos?.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">Nenhum atendimento registrado.</p>
        ) : (
          <div className="space-y-3 mt-2">
            {atendimentos.map(atendimento => (
              <div key={atendimento.id} className="p-3 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start flex-col gap-2">
                  <div className="space-y-1.5 w-full">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm text-slate-800">{atendimento.nome_contato}</h3>
                      <div className="flex gap-1.5">
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
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center justify-between">
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
        )}
      </CardContent>
    </Card>
  );
}
