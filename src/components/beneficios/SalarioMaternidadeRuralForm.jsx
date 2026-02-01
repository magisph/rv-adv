import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, AlertCircle } from "lucide-react";

const PARENTESCOS = [
  "Cônjuge/Companheiro",
  "Pai",
  "Mãe",
  "Filho(a)",
  "Irmão(ã)",
  "Outro",
];

export default function SalarioMaternidadeRuralForm({ dados, onChange }) {
  const [filhos, setFilhos] = useState(dados.filhos_adotados || []);
  const [membros, setMembros] = useState(dados.membros_grupo_familiar || []);
  const [propriedades, setPropriedades] = useState(
    dados.propriedades_trabalhadas || [],
  );
  const [testemunhas, setTestemunhas] = useState(dados.testemunhas || []);

  const handleChange = (field, value) => {
    onChange({ ...dados, [field]: value });
  };

  // Filhos
  const adicionarFilho = () => {
    const novo = {
      nome: "",
      cpf: "",
      data_nascimento: "",
      certidao_nascimento: "",
      dnv: "",
      num_processo: "",
    };
    const novos = [...filhos, novo];
    setFilhos(novos);
    handleChange("filhos_adotados", novos);
  };

  const removerFilho = (index) => {
    const novos = filhos.filter((_, i) => i !== index);
    setFilhos(novos);
    handleChange("filhos_adotados", novos);
  };

  const atualizarFilho = (index, field, value) => {
    const novos = [...filhos];
    novos[index][field] = value;
    setFilhos(novos);
    handleChange("filhos_adotados", novos);
  };

  // Membros
  const adicionarMembro = () => {
    const novo = { nome: "", cpf: "", parentesco: "", trabalha_roca: false };
    const novos = [...membros, novo];
    setMembros(novos);
    handleChange("membros_grupo_familiar", novos);
  };

  const removerMembro = (index) => {
    const novos = membros.filter((_, i) => i !== index);
    setMembros(novos);
    handleChange("membros_grupo_familiar", novos);
  };

  const atualizarMembro = (index, field, value) => {
    const novos = [...membros];
    novos[index][field] = value;
    setMembros(novos);
    handleChange("membros_grupo_familiar", novos);
  };

  // Propriedades
  const adicionarPropriedade = () => {
    const nova = {
      nome_localizacao: "",
      proprietario: "",
      periodo_inicio: "",
      periodo_fim: "",
      tempo_trabalhado: "",
      atividades: "",
    };
    const novas = [...propriedades, nova];
    setPropriedades(novas);
    handleChange("propriedades_trabalhadas", novas);
  };

  const removerPropriedade = (index) => {
    const novas = propriedades.filter((_, i) => i !== index);
    setPropriedades(novas);
    handleChange("propriedades_trabalhadas", novas);
  };

  const atualizarPropriedade = (index, field, value) => {
    const novas = [...propriedades];
    novas[index][field] = value;

    if (
      (field === "periodo_inicio" || field === "periodo_fim") &&
      novas[index].periodo_inicio &&
      novas[index].periodo_fim
    ) {
      const inicio = new Date(novas[index].periodo_inicio);
      const fim = new Date(novas[index].periodo_fim);
      const meses =
        (fim.getFullYear() - inicio.getFullYear()) * 12 +
        (fim.getMonth() - inicio.getMonth());
      const anos = Math.floor(meses / 12);
      const mesesRestantes = meses % 12;
      novas[index].tempo_trabalhado =
        `${anos} ano(s) e ${mesesRestantes} mês(es)`;
    }

    setPropriedades(novas);
    handleChange("propriedades_trabalhadas", novas);
  };

  // Testemunhas
  const adicionarTestemunha = () => {
    const nova = { nome: "", cpf: "", telefone: "", relacao: "" };
    const novas = [...testemunhas, nova];
    setTestemunhas(novas);
    handleChange("testemunhas", novas);
  };

  const removerTestemunha = (index) => {
    const novas = testemunhas.filter((_, i) => i !== index);
    setTestemunhas(novas);
    handleChange("testemunhas", novas);
  };

  const atualizarTestemunha = (index, field, value) => {
    const novas = [...testemunhas];
    novas[index][field] = value;
    setTestemunhas(novas);
    handleChange("testemunhas", novas);
  };

  return (
    <div className="space-y-6">
      {/* SEÇÃO 1: INFORMAÇÕES SOBRE MATERNIDADE */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Informações sobre Maternidade/Gestação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cards informativos */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>Período de Carência:</strong> Para salário-maternidade
              rural, é necessário comprovar exercício de atividade rural nos 10
              meses imediatamente anteriores ao parto/evento, ainda que de forma
              descontínua.
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <strong>Duração do Benefício:</strong> 120 dias (parto simples ou
              adoção), 120 dias (aborto não criminoso após 23ª semana). Início:
              28 dias antes do parto até a data de ocorrência do parto (parto),
              data da adoção/guarda (adoção), data do aborto (aborto).
            </div>
          </div>

          {/* Dados da Gestação/Parto */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-slate-700">
              Dados da Gestação/Parto
            </h4>

            <div className="space-y-2">
              <Label>Tipo de evento</Label>
              <RadioGroup
                value={dados.tipo_evento || ""}
                onValueChange={(v) => handleChange("tipo_evento", v)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="parto" id="evt-parto" />
                  <Label
                    htmlFor="evt-parto"
                    className="font-normal cursor-pointer"
                  >
                    Parto
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="adocao" id="evt-adocao" />
                  <Label
                    htmlFor="evt-adocao"
                    className="font-normal cursor-pointer"
                  >
                    Adoção
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="guarda_judicial" id="evt-guarda" />
                  <Label
                    htmlFor="evt-guarda"
                    className="font-normal cursor-pointer"
                  >
                    Guarda judicial
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="aborto_nao_criminoso"
                    id="evt-aborto"
                  />
                  <Label
                    htmlFor="evt-aborto"
                    className="font-normal cursor-pointer"
                  >
                    Aborto não criminoso
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data do parto/evento</Label>
                <Input
                  type="date"
                  value={dados.data_parto_evento || ""}
                  onChange={(e) =>
                    handleChange("data_parto_evento", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Data prevista do parto</Label>
                <Input
                  type="date"
                  value={dados.data_prevista_parto || ""}
                  onChange={(e) =>
                    handleChange("data_prevista_parto", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Está gestante atualmente?</Label>
              <RadioGroup
                value={
                  dados.gestante_atualmente === null
                    ? ""
                    : String(dados.gestante_atualmente)
                }
                onValueChange={(v) =>
                  handleChange("gestante_atualmente", v === "true")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="gest-sim" />
                  <Label
                    htmlFor="gest-sim"
                    className="font-normal cursor-pointer"
                  >
                    Sim
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="gest-nao" />
                  <Label
                    htmlFor="gest-nao"
                    className="font-normal cursor-pointer"
                  >
                    Não
                  </Label>
                </div>
              </RadioGroup>
              {dados.gestante_atualmente && (
                <div className="space-y-2">
                  <Label>Semanas de gestação</Label>
                  <Input
                    type="number"
                    value={dados.semanas_gestacao || ""}
                    onChange={(e) =>
                      handleChange("semanas_gestacao", parseInt(e.target.value))
                    }
                  />
                </div>
              )}
            </div>

            {dados.tipo_evento === "parto" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de parto</Label>
                  <Select
                    value={dados.tipo_parto || ""}
                    onValueChange={(v) => handleChange("tipo_parto", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="cesarea">Cesárea</SelectItem>
                      <SelectItem value="forceps">Fórceps</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Número de filhos no parto</Label>
                  <Input
                    type="number"
                    value={dados.numero_filhos_parto || ""}
                    onChange={(e) =>
                      handleChange(
                        "numero_filhos_parto",
                        parseInt(e.target.value),
                      )
                    }
                    placeholder="Ex: 1 (único), 2 (gêmeos)"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Informações dos Filhos/Adotados */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm text-slate-700">
              Informações dos Filhos/Adotados
            </h4>

            <div className="space-y-3">
              {filhos.map((filho, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 space-y-3 bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">
                      Filho/Adotado {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removerFilho(index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Nome completo"
                      value={filho.nome}
                      onChange={(e) =>
                        atualizarFilho(index, "nome", e.target.value)
                      }
                    />
                    <Input
                      placeholder="CPF (se tiver)"
                      value={filho.cpf}
                      onChange={(e) =>
                        atualizarFilho(index, "cpf", e.target.value)
                      }
                    />
                    <Input
                      type="date"
                      placeholder="Data nascimento/adoção/guarda"
                      value={filho.data_nascimento}
                      onChange={(e) =>
                        atualizarFilho(index, "data_nascimento", e.target.value)
                      }
                    />
                    <Input
                      placeholder="Nº Certidão Nascimento"
                      value={filho.certidao_nascimento}
                      onChange={(e) =>
                        atualizarFilho(
                          index,
                          "certidao_nascimento",
                          e.target.value,
                        )
                      }
                    />
                    {dados.tipo_evento === "parto" && (
                      <Input
                        placeholder="Nº DNV"
                        value={filho.dnv}
                        onChange={(e) =>
                          atualizarFilho(index, "dnv", e.target.value)
                        }
                      />
                    )}
                    {(dados.tipo_evento === "adocao" ||
                      dados.tipo_evento === "guarda_judicial") && (
                      <Input
                        placeholder="Nº processo adoção/guarda"
                        value={filho.num_processo}
                        onChange={(e) =>
                          atualizarFilho(index, "num_processo", e.target.value)
                        }
                      />
                    )}
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={adicionarFilho}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Filho
              </Button>
            </div>
          </div>

          {/* Histórico de Maternidade */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm text-slate-700">
              Histórico de Maternidade
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label>É o primeiro filho?</Label>
                <RadioGroup
                  value={
                    dados.primeiro_filho === null
                      ? ""
                      : String(dados.primeiro_filho)
                  }
                  onValueChange={(v) =>
                    handleChange("primeiro_filho", v === "true")
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="prim-sim" />
                    <Label
                      htmlFor="prim-sim"
                      className="font-normal cursor-pointer"
                    >
                      Sim
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="prim-nao" />
                    <Label
                      htmlFor="prim-nao"
                      className="font-normal cursor-pointer"
                    >
                      Não
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              {dados.primeiro_filho === false && (
                <div className="space-y-2">
                  <Label>Quantos filhos já teve?</Label>
                  <Input
                    type="number"
                    value={dados.quantidade_filhos || ""}
                    onChange={(e) =>
                      handleChange(
                        "quantidade_filhos",
                        parseInt(e.target.value),
                      )
                    }
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label>Já recebeu salário-maternidade anteriormente?</Label>
              <RadioGroup
                value={
                  dados.recebeu_salario_maternidade === null
                    ? ""
                    : String(dados.recebeu_salario_maternidade)
                }
                onValueChange={(v) =>
                  handleChange("recebeu_salario_maternidade", v === "true")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="sal-sim" />
                  <Label
                    htmlFor="sal-sim"
                    className="font-normal cursor-pointer"
                  >
                    Sim
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="sal-nao" />
                  <Label
                    htmlFor="sal-nao"
                    className="font-normal cursor-pointer"
                  >
                    Não
                  </Label>
                </div>
              </RadioGroup>
              {dados.recebeu_salario_maternidade && (
                <Textarea
                  value={dados.detalhes_salario_anterior || ""}
                  onChange={(e) =>
                    handleChange("detalhes_salario_anterior", e.target.value)
                  }
                  placeholder="Quando e por qual órgão?"
                  rows={2}
                />
              )}
            </div>

            <div className="space-y-3">
              <Label>Teve complicações na gestação/parto?</Label>
              <RadioGroup
                value={
                  dados.complicacoes_gestacao === null
                    ? ""
                    : String(dados.complicacoes_gestacao)
                }
                onValueChange={(v) =>
                  handleChange("complicacoes_gestacao", v === "true")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="comp-sim" />
                  <Label
                    htmlFor="comp-sim"
                    className="font-normal cursor-pointer"
                  >
                    Sim
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="comp-nao" />
                  <Label
                    htmlFor="comp-nao"
                    className="font-normal cursor-pointer"
                  >
                    Não
                  </Label>
                </div>
              </RadioGroup>
              {dados.complicacoes_gestacao && (
                <Textarea
                  value={dados.detalhes_complicacoes || ""}
                  onChange={(e) =>
                    handleChange("detalhes_complicacoes", e.target.value)
                  }
                  placeholder="Detalhar complicações"
                  rows={2}
                />
              )}
            </div>

            <div className="space-y-3">
              <Label>Precisou afastar-se do trabalho durante gestação?</Label>
              <RadioGroup
                value={
                  dados.afastou_trabalho_gestacao === null
                    ? ""
                    : String(dados.afastou_trabalho_gestacao)
                }
                onValueChange={(v) =>
                  handleChange("afastou_trabalho_gestacao", v === "true")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="afas-sim" />
                  <Label
                    htmlFor="afas-sim"
                    className="font-normal cursor-pointer"
                  >
                    Sim
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="afas-nao" />
                  <Label
                    htmlFor="afas-nao"
                    className="font-normal cursor-pointer"
                  >
                    Não
                  </Label>
                </div>
              </RadioGroup>
              {dados.afastou_trabalho_gestacao && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Início do afastamento</Label>
                    <Input
                      type="date"
                      value={dados.periodo_afastamento_inicio || ""}
                      onChange={(e) =>
                        handleChange(
                          "periodo_afastamento_inicio",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fim do afastamento</Label>
                    <Input
                      type="date"
                      value={dados.periodo_afastamento_fim || ""}
                      onChange={(e) =>
                        handleChange("periodo_afastamento_fim", e.target.value)
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Situação Laboral */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm text-slate-700">
              Situação Laboral no Período
            </h4>

            <div className="space-y-3">
              <Label>
                Estava trabalhando na atividade rural no período de carência?
              </Label>
              <RadioGroup
                value={
                  dados.trabalhando_periodo_carencia === null
                    ? ""
                    : String(dados.trabalhando_periodo_carencia)
                }
                onValueChange={(v) =>
                  handleChange("trabalhando_periodo_carencia", v === "true")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="car-sim" />
                  <Label
                    htmlFor="car-sim"
                    className="font-normal cursor-pointer"
                  >
                    Sim
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="car-nao" />
                  <Label
                    htmlFor="car-nao"
                    className="font-normal cursor-pointer"
                  >
                    Não
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>
                Período de trabalho rural nos 10 meses anteriores ao
                parto/evento
              </Label>
              <Textarea
                value={dados.detalhes_trabalho_10_meses || ""}
                onChange={(e) =>
                  handleChange("detalhes_trabalho_10_meses", e.target.value)
                }
                placeholder="Detalhar atividades rurais nos 10 meses anteriores"
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <Label>Afastou-se da atividade rural após o parto?</Label>
              <RadioGroup
                value={
                  dados.afastou_apos_parto === null
                    ? ""
                    : String(dados.afastou_apos_parto)
                }
                onValueChange={(v) =>
                  handleChange("afastou_apos_parto", v === "true")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="pos-sim" />
                  <Label
                    htmlFor="pos-sim"
                    className="font-normal cursor-pointer"
                  >
                    Sim
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="pos-nao" />
                  <Label
                    htmlFor="pos-nao"
                    className="font-normal cursor-pointer"
                  >
                    Não
                  </Label>
                </div>
              </RadioGroup>
              {dados.afastou_apos_parto && (
                <div className="space-y-2">
                  <Label>Data de afastamento</Label>
                  <Input
                    type="date"
                    value={dados.data_afastamento_parto || ""}
                    onChange={(e) =>
                      handleChange("data_afastamento_parto", e.target.value)
                    }
                  />
                </div>
              )}
            </div>
          </div>

          {/* Informações do Cônjuge */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm text-slate-700">
              Informações do Cônjuge/Companheiro
            </h4>

            <div className="space-y-2">
              <Label>Estado civil</Label>
              <Select
                value={dados.estado_civil || ""}
                onValueChange={(v) => handleChange("estado_civil", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solteira">Solteira</SelectItem>
                  <SelectItem value="casada">Casada</SelectItem>
                  <SelectItem value="uniao_estavel">União Estável</SelectItem>
                  <SelectItem value="divorciada">Divorciada</SelectItem>
                  <SelectItem value="viuva">Viúva</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(dados.estado_civil === "casada" ||
              dados.estado_civil === "uniao_estavel") && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do cônjuge/companheiro</Label>
                    <Input
                      value={dados.nome_conjuge || ""}
                      onChange={(e) =>
                        handleChange("nome_conjuge", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CPF do cônjuge</Label>
                    <Input
                      value={dados.cpf_conjuge || ""}
                      onChange={(e) =>
                        handleChange("cpf_conjuge", e.target.value)
                      }
                      placeholder="000.000.000-00"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Cônjuge trabalha na atividade rural?</Label>
                  <RadioGroup
                    value={
                      dados.conjuge_trabalha_rural === null
                        ? ""
                        : String(dados.conjuge_trabalha_rural)
                    }
                    onValueChange={(v) =>
                      handleChange("conjuge_trabalha_rural", v === "true")
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id="conj-rur-sim" />
                      <Label
                        htmlFor="conj-rur-sim"
                        className="font-normal cursor-pointer"
                      >
                        Sim
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id="conj-rur-nao" />
                      <Label
                        htmlFor="conj-rur-nao"
                        className="font-normal cursor-pointer"
                      >
                        Não
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label>Cônjuge possui vínculo urbano/contribui INSS?</Label>
                  <RadioGroup
                    value={
                      dados.conjuge_vinculo_urbano === null
                        ? ""
                        : String(dados.conjuge_vinculo_urbano)
                    }
                    onValueChange={(v) =>
                      handleChange("conjuge_vinculo_urbano", v === "true")
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id="conj-urb-sim" />
                      <Label
                        htmlFor="conj-urb-sim"
                        className="font-normal cursor-pointer"
                      >
                        Sim
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id="conj-urb-nao" />
                      <Label
                        htmlFor="conj-urb-nao"
                        className="font-normal cursor-pointer"
                      >
                        Não
                      </Label>
                    </div>
                  </RadioGroup>
                  {dados.conjuge_vinculo_urbano && (
                    <Textarea
                      value={dados.detalhes_vinculo_conjuge || ""}
                      onChange={(e) =>
                        handleChange("detalhes_vinculo_conjuge", e.target.value)
                      }
                      placeholder="Especificar"
                      rows={2}
                    />
                  )}
                </div>
              </>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-2 border-t pt-4">
            <Label>Observações sobre Maternidade</Label>
            <Textarea
              value={dados.observacoes_maternidade || ""}
              onChange={(e) =>
                handleChange("observacoes_maternidade", e.target.value)
              }
              placeholder="Campo livre para anotações específicas sobre o caso de maternidade"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO 2: COMPROVAÇÃO DE ATIVIDADE RURAL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Comprovação de Atividade Rural
          </CardTitle>
          <p className="text-sm text-slate-500">
            Informações sobre atividade agrícola nos 10 meses anteriores ao
            evento
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Resumo da atividade rural */}
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Reside em zona:</Label>
              <RadioGroup
                value={dados.reside_zona || ""}
                onValueChange={(v) => handleChange("reside_zona", v)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="urbana" id="zona-urb" />
                  <Label
                    htmlFor="zona-urb"
                    className="font-normal cursor-pointer"
                  >
                    Urbana
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="rural" id="zona-rur" />
                  <Label
                    htmlFor="zona-rur"
                    className="font-normal cursor-pointer"
                  >
                    Rural
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Há quanto tempo reside no local atual?</Label>
                <Input
                  value={dados.tempo_residencia_local || ""}
                  onChange={(e) =>
                    handleChange("tempo_residencia_local", e.target.value)
                  }
                  placeholder="Ex: 15 anos"
                />
              </div>
              <div className="space-y-2">
                <Label>Trabalha na agricultura desde quando?</Label>
                <Input
                  type="month"
                  value={dados.trabalha_agricultura_desde || ""}
                  onChange={(e) =>
                    handleChange("trabalha_agricultura_desde", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Trabalha exclusivamente na agricultura?</Label>
              <RadioGroup
                value={
                  dados.trabalha_exclusivo_agricultura === null
                    ? ""
                    : String(dados.trabalha_exclusivo_agricultura)
                }
                onValueChange={(v) =>
                  handleChange("trabalha_exclusivo_agricultura", v === "true")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="exc-agr-sim" />
                  <Label
                    htmlFor="exc-agr-sim"
                    className="font-normal cursor-pointer"
                  >
                    Sim
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="exc-agr-nao" />
                  <Label
                    htmlFor="exc-agr-nao"
                    className="font-normal cursor-pointer"
                  >
                    Não
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Membros do grupo familiar */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm text-slate-700">
              Grupo Familiar
            </h4>
            <div className="space-y-3">
              {membros.map((membro, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 space-y-3 bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">
                      Membro {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removerMembro(index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Nome Completo"
                      value={membro.nome}
                      onChange={(e) =>
                        atualizarMembro(index, "nome", e.target.value)
                      }
                    />
                    <Input
                      placeholder="CPF"
                      value={membro.cpf}
                      onChange={(e) =>
                        atualizarMembro(index, "cpf", e.target.value)
                      }
                    />
                    <Select
                      value={membro.parentesco}
                      onValueChange={(v) =>
                        atualizarMembro(index, "parentesco", v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Parentesco" />
                      </SelectTrigger>
                      <SelectContent>
                        {PARENTESCOS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={adicionarMembro}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Membro
              </Button>
            </div>
          </div>

          {/* Histórico de Propriedades */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm text-slate-700">
              Propriedades Trabalhadas
            </h4>
            <div className="space-y-3">
              {propriedades.map((prop, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 space-y-3 bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">
                      Propriedade {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removerPropriedade(index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Nome/Localização"
                      value={prop.nome_localizacao}
                      onChange={(e) =>
                        atualizarPropriedade(
                          index,
                          "nome_localizacao",
                          e.target.value,
                        )
                      }
                    />
                    <Input
                      placeholder="Proprietário"
                      value={prop.proprietario}
                      onChange={(e) =>
                        atualizarPropriedade(
                          index,
                          "proprietario",
                          e.target.value,
                        )
                      }
                    />
                    <Input
                      type="month"
                      placeholder="Período início"
                      value={prop.periodo_inicio}
                      onChange={(e) =>
                        atualizarPropriedade(
                          index,
                          "periodo_inicio",
                          e.target.value,
                        )
                      }
                    />
                    <Input
                      type="month"
                      placeholder="Período fim"
                      value={prop.periodo_fim}
                      onChange={(e) =>
                        atualizarPropriedade(
                          index,
                          "periodo_fim",
                          e.target.value,
                        )
                      }
                    />
                    {prop.tempo_trabalhado && (
                      <div className="col-span-2 text-sm text-slate-600 bg-blue-50 p-2 rounded">
                        <strong>Tempo trabalhado:</strong>{" "}
                        {prop.tempo_trabalhado}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={adicionarPropriedade}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Propriedade
              </Button>
            </div>
          </div>

          {/* Sindicato e Documentos Rurais */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm text-slate-700">
              Sindicato e Documentação
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label>É filiado ao Sindicato dos Trabalhadores Rurais?</Label>
                <RadioGroup
                  value={
                    dados.filiado_sindicato === null
                      ? ""
                      : String(dados.filiado_sindicato)
                  }
                  onValueChange={(v) =>
                    handleChange("filiado_sindicato", v === "true")
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="sind-sim" />
                    <Label
                      htmlFor="sind-sim"
                      className="font-normal cursor-pointer"
                    >
                      Sim
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="sind-nao" />
                    <Label
                      htmlFor="sind-nao"
                      className="font-normal cursor-pointer"
                    >
                      Não
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              {dados.filiado_sindicato && (
                <div className="space-y-2">
                  <Label>Desde quando?</Label>
                  <Input
                    type="month"
                    value={dados.filiado_sindicato_desde || ""}
                    onChange={(e) =>
                      handleChange("filiado_sindicato_desde", e.target.value)
                    }
                  />
                </div>
              )}
              <div className="space-y-3">
                <Label>Possui DAP?</Label>
                <RadioGroup
                  value={
                    dados.possui_dap === null ? "" : String(dados.possui_dap)
                  }
                  onValueChange={(v) =>
                    handleChange("possui_dap", v === "true")
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="dap-sim" />
                    <Label
                      htmlFor="dap-sim"
                      className="font-normal cursor-pointer"
                    >
                      Sim
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="dap-nao" />
                    <Label
                      htmlFor="dap-nao"
                      className="font-normal cursor-pointer"
                    >
                      Não
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-3">
                <Label>Possui CAF?</Label>
                <RadioGroup
                  value={
                    dados.possui_caf === null ? "" : String(dados.possui_caf)
                  }
                  onValueChange={(v) =>
                    handleChange("possui_caf", v === "true")
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="caf-sim" />
                    <Label
                      htmlFor="caf-sim"
                      className="font-normal cursor-pointer"
                    >
                      Sim
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="caf-nao" />
                    <Label
                      htmlFor="caf-nao"
                      className="font-normal cursor-pointer"
                    >
                      Não
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>

          {/* Testemunhas */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm text-slate-700">
              Testemunhas do Labor Rural
            </h4>
            <div className="space-y-3">
              {testemunhas.map((test, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 space-y-3 bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">
                      Testemunha {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removerTestemunha(index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Nome completo"
                      value={test.nome}
                      onChange={(e) =>
                        atualizarTestemunha(index, "nome", e.target.value)
                      }
                    />
                    <Input
                      placeholder="CPF"
                      value={test.cpf}
                      onChange={(e) =>
                        atualizarTestemunha(index, "cpf", e.target.value)
                      }
                    />
                    <Input
                      placeholder="Telefone"
                      value={test.telefone}
                      onChange={(e) =>
                        atualizarTestemunha(index, "telefone", e.target.value)
                      }
                    />
                    <Input
                      placeholder="Relação (ex: vizinho)"
                      value={test.relacao}
                      onChange={(e) =>
                        atualizarTestemunha(index, "relacao", e.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={adicionarTestemunha}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Testemunha
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Observações Gerais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observações Gerais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Observações Gerais do Caso</Label>
            <Textarea
              value={dados.observacoes_gerais || ""}
              onChange={(e) =>
                handleChange("observacoes_gerais", e.target.value)
              }
              placeholder="Campo livre para anotações do advogado sobre o caso"
              rows={6}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
