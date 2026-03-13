import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { atendimentoService } from "@/services";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Card,
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

export default function Atendimentos() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome_contato: "",
    telefone: "",
    categoria: "Prospecto",
    assunto: "",
    status: "Pendente"
  });

  const { data: atendimentos = [], isLoading } = useQuery({
    queryKey: ["atendimentos"],
    queryFn: () => atendimentoService.list("-created_at"),
  });

  const createMutation = useMutation({
    mutationFn: (newAtendimento) => atendimentoService.create(newAtendimento),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atendimentos"] });
      setIsModalOpen(false);
      setFormData({ nome_contato: "", telefone: "", categoria: "Prospecto", assunto: "", status: "Pendente" });
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2 text-slate-800">
          <BookOpen className="w-8 h-8 text-[#c9a227]" />
          Diário de Bordo
        </h1>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Novo Atendimento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Novo Atendimento</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
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
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <p className="text-slate-500">Carregando atendimentos...</p>
        ) : atendimentos?.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              Nenhum atendimento registrado.
            </CardContent>
          </Card>
        ) : (
          atendimentos.map(atendimento => (
            <Card key={atendimento.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg text-slate-800">{atendimento.nome_contato}</h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        atendimento.categoria === 'Prospecto' ? 'bg-blue-100 text-blue-800' :
                        atendimento.categoria === 'Cliente' ? 'bg-green-100 text-green-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {atendimento.categoria}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        atendimento.status === 'Pendente' ? 'bg-amber-100 text-amber-800' :
                        atendimento.status === 'Concluído' ? 'bg-green-100 text-green-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {atendimento.status}
                      </span>
                    </div>
                    <div className="text-sm text-slate-500 flex items-center gap-4 flex-wrap">
                      {atendimento.created_at && (
                        <span>{format(new Date(atendimento.created_at), "dd/MM/yyyy • HH:mm", { locale: ptBR })}</span>
                      )}
                      {atendimento.telefone && (
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <PhoneCall className="w-3.5 h-3.5" />
                          {atendimento.telefone}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-700 bg-slate-50 p-3 rounded-md border border-slate-100 mt-2">
                      {atendimento.assunto}
                    </p>
                  </div>
                  
                  {atendimento.categoria === 'Prospecto' && atendimento.status === 'Pendente' && (
                    <Button 
                      onClick={() => converterCliente(atendimento)}
                      className="bg-green-600 hover:bg-green-700 w-full sm:w-auto text-white shadow-sm transition-all shadow-green-600/20"
                    >
                      <span>Converter em Cliente</span>
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
