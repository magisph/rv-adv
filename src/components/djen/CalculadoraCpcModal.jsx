import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Calculator, CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";
import { holidayService, processService, deadlineService } from "@/services";
import { addBusinessDays } from "@/utils/businessDays";

export function CalculadoraCpcModal({ isOpen, onClose, comunicacao, numeroProcesso }) {
  const queryClient = useQueryClient();

  const [prazoDias, setPrazoDias] = useState(15);
  const [processId, setProcessId] = useState("");
  const [descricao, setDescricao] = useState("Prazo - DJEN");

  // Buscar Feriados
  const { data: holidaysData = [] } = useQuery({
    queryKey: ["holidays-cpc"],
    queryFn: () => holidayService.list(),
  });
  const feriadosArray = useMemo(() => {
    return holidaysData.map(h => h.date.substring(0, 10));
  }, [holidaysData]);

  // Buscar Processos
  const { data: processes = [] } = useQuery({
    queryKey: ["processes-cpc"],
    queryFn: () => processService.list(),
  });

  // Tentar pre-selecionar processo
  useEffect(() => {
    if (numeroProcesso && processes.length > 0 && !processId) {
      const cleanNum = numeroProcesso.replace(/\D/g, "");
      const match = processes.find(p => p.process_number?.replace(/\D/g, "") === cleanNum);
      if (match) {
        setProcessId(match.id);
      }
    }
  }, [numeroProcesso, processes, processId]);

  // Motor Matemático CPC
  const datasCpc = useMemo(() => {
    if (!comunicacao || !comunicacao.data_disponibilizacao_raw) return null;
    try {
      const D = parseISO(comunicacao.data_disponibilizacao_raw.substring(0, 10));
      const P = addBusinessDays(D, 1, feriadosArray);
      const I = addBusinessDays(P, 1, feriadosArray);
      // Para o CPC, o prazo em dias úteis começa a correr efetivamente a partir do primeiro dia útil,
      // logo usamos V = addBusinessDays(I, prazoDias - 1) se I é o Dia 1. Mas a assinatura diz
      // explicitamente `addBusinessDays(Data Início, prazoDias)`. Vamos adotar o método exato descrito.
      const V = addBusinessDays(I, Math.max(0, prazoDias - 1), feriadosArray);

      return {
        disponibilizacao: D,
        publicacao: P,
        inicio: I,
        vencimento: V
      };
    } catch {
      return null;
    }
  }, [comunicacao, prazoDias, feriadosArray]);

  const saveMutation = useMutation({
    mutationFn: (payload) => deadlineService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["deadlines"]);
      onClose();
    }
  });

  const handleSave = () => {
    if (!datasCpc) return;
    saveMutation.mutate({
      process_id: processId,
      description: descricao,
      due_date: format(datasCpc.vencimento, "yyyy-MM-dd"),
      alert_active: true,
      priority: "alta",
      status: "pendente"
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#c9a227]" />
            Calculadora de Prazos CPC
          </DialogTitle>
          <DialogDescription>
            Confirme as datas e gere o registro na agenda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Processo Vinculado</Label>
            <Select value={processId} onValueChange={setProcessId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o processo" />
              </SelectTrigger>
              <SelectContent>
                {processes.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.process_number} - {p.client_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prazo em Dias (Úteis)</Label>
              <Input 
                type="number" 
                value={prazoDias} 
                onChange={e => setPrazoDias(Number(e.target.value) || 0)} 
                min={1} 
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição do Prazo</Label>
              <Input 
                value={descricao} 
                onChange={e => setDescricao(e.target.value)} 
              />
            </div>
          </div>

          {/* Timeline Visuais */}
          {datasCpc && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 mt-2 text-sm">
              <h4 className="font-semibold text-slate-700 flex items-center gap-2 mb-3">
                <CalendarDays className="w-4 h-4 text-[#1e3a5f]" />
                Resumo Matemático (CPC)
              </h4>
              <div className="flex justify-between items-center text-slate-600">
                <span>Disponibilização:</span>
                <span className="font-medium">{format(datasCpc.disponibilizacao, "dd/MM/yyyy")}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Publicação:</span>
                <span className="font-medium">{format(datasCpc.publicacao, "dd/MM/yyyy")}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Início Contagem:</span>
                <span className="font-medium">{format(datasCpc.inicio, "dd/MM/yyyy")}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-slate-900">
                <span className="font-bold">Data Vencimento:</span>
                <span className="font-bold text-[#b42e2e]">{format(datasCpc.vencimento, "dd/MM/yyyy")}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button 
            onClick={handleSave} 
            disabled={!processId || saveMutation.isPending || !datasCpc}
            className="bg-[#1e3a5f] hover:bg-[#152e4d] text-white"
          >
            {saveMutation.isPending && <span className="mr-2 animate-spin">⏳</span>}
            <Save className="w-4 h-4 mr-2" />
            Salvar Prazo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
