import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import BPCIdosoForm from "./BPCIdosoForm";
import AposentadoriaRuralForm from "./AposentadoriaRuralForm";
import IncapacidadeRuralForm from "./IncapacidadeRuralForm";
import SalarioMaternidadeRuralForm from "./SalarioMaternidadeRuralForm";

export default function BeneficioFormulario({
  categoria,
  tipoBeneficio,
  dados,
  onChange,
}) {
  const handleChange = (field, value) => {
    onChange({ ...dados, [field]: value });
  };

  // Formulários específicos por tipo de benefício
  const renderFormulario = () => {
    // BPC/LOAS - Idoso - Formulário Completo
    if (tipoBeneficio === "bpc_loas_idoso") {
      return <BPCIdosoForm dados={dados} onChange={onChange} />;
    }

    // Aposentadoria por Idade Rural - Formulário Completo
    if (tipoBeneficio === "aposentadoria_idade_rural") {
      return <AposentadoriaRuralForm dados={dados} onChange={onChange} />;
    }

    // Benefício por Incapacidade Rural - Formulário Completo
    if (tipoBeneficio === "incapacidade_rural") {
      return <IncapacidadeRuralForm dados={dados} onChange={onChange} />;
    }

    // Salário-Maternidade Rural - Formulário Completo
    if (tipoBeneficio === "salario_maternidade_rural") {
      return <SalarioMaternidadeRuralForm dados={dados} onChange={onChange} />;
    }

    // BPC/LOAS - PCD
    if (tipoBeneficio === "bpc_loas_pcd") {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Deficiência</Label>
            <Input
              value={dados.tipo_deficiencia || ""}
              onChange={(e) => handleChange("tipo_deficiencia", e.target.value)}
              placeholder="Ex: Física, Mental, Intelectual, Sensorial"
            />
          </div>
          <div className="space-y-2">
            <Label>Descrição da Deficiência</Label>
            <Textarea
              value={dados.descricao_deficiencia || ""}
              onChange={(e) =>
                handleChange("descricao_deficiencia", e.target.value)
              }
              placeholder="Descreva a condição de saúde"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Renda per capita familiar</Label>
            <Input
              type="number"
              step="0.01"
              value={dados.renda_per_capita || ""}
              onChange={(e) => handleChange("renda_per_capita", e.target.value === "" ? null : parseFloat(e.target.value))}
              placeholder="Valor em R$"
            />
          </div>
        </div>
      );
    }

    // Aposentadoria por Idade Urbano (genérico)
    if (tipoBeneficio === "aposentadoria_idade_urbano") {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Idade Atual</Label>
            <Input
              type="number"
              value={dados.idade_atual || ""}
              onChange={(e) => handleChange("idade_atual", e.target.value === "" ? null : parseInt(e.target.value, 10))}
            />
          </div>
          <div className="space-y-2">
            <Label>Tempo de Contribuição (anos)</Label>
            <Input
              type="number"
              value={dados.tempo_contribuicao || ""}
              onChange={(e) =>
                handleChange("tempo_contribuicao", e.target.value === "" ? null : parseInt(e.target.value, 10))
              }
            />
          </div>
          {categoria === "rural" && (
            <div className="space-y-2">
              <Label>Período de Atividade Rural</Label>
              <Textarea
                value={dados.periodo_atividade_rural || ""}
                onChange={(e) =>
                  handleChange("periodo_atividade_rural", e.target.value)
                }
                placeholder="Ex: De 1980 a 2020"
                rows={2}
              />
            </div>
          )}
        </div>
      );
    }

    // Benefício por Incapacidade Urbano (genérico)
    if (tipoBeneficio === "incapacidade_urbano") {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Data de Início da Incapacidade</Label>
            <Input
              type="date"
              value={dados.data_inicio_incapacidade || ""}
              onChange={(e) =>
                handleChange("data_inicio_incapacidade", e.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo de Incapacidade</Label>
            <Input
              value={dados.tipo_incapacidade || ""}
              onChange={(e) =>
                handleChange("tipo_incapacidade", e.target.value)
              }
              placeholder="Ex: Permanente, Temporária"
            />
          </div>
          <div className="space-y-2">
            <Label>Doença/Condição</Label>
            <Textarea
              value={dados.doenca || ""}
              onChange={(e) => handleChange("doenca", e.target.value)}
              placeholder="Descreva a doença ou condição"
              rows={3}
            />
          </div>
        </div>
      );
    }

    // Salário-Maternidade Urbano (genérico)
    if (tipoBeneficio === "salario_maternidade_urbano") {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Data Prevista do Parto</Label>
            <Input
              type="date"
              value={dados.data_prevista_parto || ""}
              onChange={(e) =>
                handleChange("data_prevista_parto", e.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo de Parto</Label>
            <Input
              value={dados.tipo_parto || ""}
              onChange={(e) => handleChange("tipo_parto", e.target.value)}
              placeholder="Ex: Normal, Cesárea, Aborto não criminoso"
            />
          </div>
        </div>
      );
    }

    // Pensão por Morte (Rural/Urbano)
    if (tipoBeneficio === "pensao_morte_rural" || tipoBeneficio === "pensao_morte_urbano") {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Falecido</Label>
            <Input
              value={dados.nome_falecido || ""}
              onChange={(e) => handleChange("nome_falecido", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Data do Óbito</Label>
            <Input
              type="date"
              value={dados.data_obito || ""}
              onChange={(e) => handleChange("data_obito", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Grau de Parentesco</Label>
            <Input
              value={dados.grau_parentesco || ""}
              onChange={(e) => handleChange("grau_parentesco", e.target.value)}
              placeholder="Ex: Cônjuge, Filho(a), Pai/Mãe"
            />
          </div>
        </div>
      );
    }

    // Outros
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Informações Adicionais</Label>
          <Textarea
            value={dados.informacoes || ""}
            onChange={(e) => handleChange("informacoes", e.target.value)}
            placeholder="Descreva as informações relevantes do benefício"
            rows={5}
          />
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardContent className="pt-6">{renderFormulario()}</CardContent>
    </Card>
  );
}
