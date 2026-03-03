import React, { useState } from "react";
import { beneficioService } from "@/services";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Save, X } from "lucide-react";
import BeneficioFormulario from "./BeneficioFormulario";
import BeneficioChecklist from "./BeneficioChecklist";

const TIPOS_POR_CATEGORIA = {
  bpc_loas: [
    { value: "bpc_loas_idoso", label: "BPC/LOAS - Idoso" },
    { value: "bpc_loas_pcd", label: "BPC/LOAS - Pessoa com Deficiência (PCD)" },
  ],
  rural: [
    {
      value: "aposentadoria_idade_rural",
      label: "Aposentadoria por Idade Rural",
    },
    { value: "incapacidade_rural", label: "Benefício por Incapacidade Rural" },
    { value: "salario_maternidade_rural", label: "Salário-Maternidade Rural" },
    { value: "pensao_morte_rural", label: "Pensão por Morte Rural" },
  ],
  urbano: [
    {
      value: "aposentadoria_idade_urbano",
      label: "Aposentadoria por Idade Urbano",
    },
    {
      value: "incapacidade_urbano",
      label: "Benefício por Incapacidade Urbano",
    },
    {
      value: "salario_maternidade_urbano",
      label: "Salário-Maternidade Urbano",
    },
    { value: "pensao_morte_urbano", label: "Pensão por Morte Urbano" },
    { value: "outros_urbano", label: "Outros" },
  ],
};

export default function BeneficioModal({
  open,
  onClose,
  clientId,
  clientName,
}) {
  const [step, setStep] = useState(1);
  const [categoria, setCategoria] = useState("");
  const [tipoBeneficio, setTipoBeneficio] = useState("");
  const [dadosEspecificos, setDadosEspecificos] = useState({});
  const [checklistDocumentos, setChecklistDocumentos] = useState({});
  const [activeTab, setActiveTab] = useState("formulario");

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => beneficioService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["client-beneficios", clientId]);
      handleClose();
    },
    onError: (error) => {
      console.error("Erro ao criar benefício:", error);
    },
  });

  const handleClose = () => {
    setStep(1);
    setCategoria("");
    setTipoBeneficio("");
    setDadosEspecificos({});
    setChecklistDocumentos({});
    setActiveTab("formulario");
    onClose();
  };

  const handleCategoriaChange = (value) => {
    setCategoria(value);
    setTipoBeneficio("");
    setDadosEspecificos({});
    setChecklistDocumentos({});
    setStep(2);
  };

  const handleTipoBeneficioChange = (value) => {
    setTipoBeneficio(value);
    setDadosEspecificos({});
    setChecklistDocumentos({});
    setStep(3);
  };

  const handleSave = () => {
    if (!categoria || !tipoBeneficio) {
      console.warn("Categoria e tipo de benefício são obrigatórios.");
      return;
    }
    createMutation.mutate({
      client_id: clientId,
      client_name: clientName,
      categoria,
      tipo_beneficio: tipoBeneficio,
      dados_especificos: dadosEspecificos,
      checklist_documentos: checklistDocumentos,
      status: "em_analise",
    });
  };

  const tiposDisponiveis = categoria ? TIPOS_POR_CATEGORIA[categoria] : [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Benefício</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Categoria */}
          {step >= 1 && (
            <div className="space-y-3">
              <Label>Passo 1: Categoria do Benefício</Label>
              <Select value={categoria} onValueChange={handleCategoriaChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bpc_loas">
                    BPC/LOAS (Benefício de Prestação Continuada)
                  </SelectItem>
                  <SelectItem value="rural">
                    Rural (Trabalhador Rural)
                  </SelectItem>
                  <SelectItem value="urbano">
                    Urbano (Trabalhador Urbano)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Step 2: Tipo de Benefício */}
          {step >= 2 && categoria && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-500">
                <ArrowRight className="w-4 h-4" />
                <Label>Passo 2: Tipo de Benefício</Label>
              </div>
              <Select
                value={tipoBeneficio}
                onValueChange={handleTipoBeneficioChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o tipo específico" />
                </SelectTrigger>
                <SelectContent>
                  {tiposDisponiveis.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Step 3: Formulário e Checklist */}
          {step >= 3 && tipoBeneficio && (
            <div className="space-y-3 border-t pt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="formulario">
                    Formulário Específico
                  </TabsTrigger>
                  <TabsTrigger value="checklist">
                    Checklist de Documentos
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="formulario" className="mt-6">
                  <BeneficioFormulario
                    categoria={categoria}
                    tipoBeneficio={tipoBeneficio}
                    dados={dadosEspecificos}
                    onChange={setDadosEspecificos}
                  />
                </TabsContent>

                <TabsContent value="checklist" className="mt-6">
                  <BeneficioChecklist
                    categoria={categoria}
                    tipoBeneficio={tipoBeneficio}
                    checklist={checklistDocumentos}
                    onChange={setChecklistDocumentos}
                  />
                </TabsContent>
              </Tabs>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t">
                <Button type="button" variant="outline" onClick={handleClose}>
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={createMutation.isPending}
                  className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {createMutation.isPending
                    ? "Salvando..."
                    : "Salvar Benefício"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
