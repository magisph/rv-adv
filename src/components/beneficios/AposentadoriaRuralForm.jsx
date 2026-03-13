import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

const PARENTESCOS = [
  "Cônjuge/Companheiro",
  "Pai",
  "Mãe",
  "Padrasto",
  "Madrasta",
  "Filho(a)",
  "Enteado(a)",
  "Irmão(ã)",
  "Outro",
];

const BENEFICIOS = [
  "Salário-Maternidade",
  "Auxílio-Doença",
  "Aposentadoria",
  "Outro",
];


export default function AposentadoriaRuralForm({ dados, onChange }) {
  const [membros, setMembros] = useState(dados.membros_grupo_familiar || []);
  const [propriedades, setPropriedades] = useState(
    dados.propriedades_trabalhadas || [],
  );
  const [testemunhas, setTestemunhas] = useState(dados.testemunhas || []);

  const handleChange = (field, value) => {
    onChange({ ...dados, [field]: value });
  };

  const handleArrayToggle = (field, value) => {
    const current = dados[field] || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    handleChange(field, updated);
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
    novos[index] = { ...novos[index], [field]: value };
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
    novas[index] = { ...novas[index], [field]: value };

    // Calcular tempo trabalhado (com validação de ordem das datas)
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
      if (meses >= 0) {
        const anos = Math.floor(meses / 12);
        const mesesRestantes = meses % 12;
        novas[index] = { ...novas[index], tempo_trabalhado: `${anos} ano(s) e ${mesesRestantes} mês(es)` };
      } else {
        novas[index] = { ...novas[index], tempo_trabalhado: "" };
      }
    }

    setPropriedades(novas);
    handleChange("propriedades_trabalhadas", novas);
  };

  // Testemunhas
  const adicionarTestemunha = () => {
    const nova = {
      nome: "",
      cpf: "",
      telefone: "",
      relacao: "",
      periodo_inicio: "",
      periodo_fim: "",
    };
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
    novas[index] = { ...novas[index], [field]: value };
    setTestemunhas(novas);
    handleChange("testemunhas", novas);
  };

  return (
    <div className="space-y-6">
      {/* SEÇÃO 1: QUESTIONÁRIO SOBRE ATIVIDADE AGRÍCOLA */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Questionário sobre Atividade Agrícola
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 1. Informações de Residência e Mobilidade */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-slate-700">
              1. Informações de Residência e Mobilidade
            </h4>

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

            <div className="space-y-3">
              <Label>Já morou fora por algum período?</Label>
              <RadioGroup
                value={
                  dados.morou_fora === null ? "" : String(dados.morou_fora)
                }
                onValueChange={(v) => handleChange("morou_fora", v === "true")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="fora-sim" />
                  <Label
                    htmlFor="fora-sim"
                    className="font-normal cursor-pointer"
                  >
                    Sim
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="fora-nao" />
                  <Label
                    htmlFor="fora-nao"
                    className="font-normal cursor-pointer"
                  >
                    Não
                  </Label>
                </div>
              </RadioGroup>
              {dados.morou_fora && (
                <Textarea
                  value={dados.detalhes_morou_fora || ""}
                  onChange={(e) =>
                    handleChange("detalhes_morou_fora", e.target.value)
                  }
                  placeholder="Quando e onde?"
                  rows={2}
                />
              )}
            </div>
          </div>

          {/* 2. Atividade Laboral Atual */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm text-slate-700">
              2. Atividade Laboral Atual
            </h4>

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
                  <RadioGroupItem value="true" id="exc-sim" />
                  <Label
                    htmlFor="exc-sim"
                    className="font-normal cursor-pointer"
                  >
                    Sim
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="exc-nao" />
                  <Label
                    htmlFor="exc-nao"
                    className="font-normal cursor-pointer"
                  >
                    Não
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Faz algum bico/trabalho extra?</Label>
              <Textarea
                value={dados.faz_bico || ""}
                onChange={(e) => handleChange("faz_bico", e.target.value)}
                placeholder="Especificar"
                rows={2}
              />
            </div>

            <div className="space-y-3">
              <Label>Já exerceu alguma atividade urbana formal?</Label>
              <RadioGroup
                value={
                  dados.exerceu_atividade_urbana === null
                    ? ""
                    : String(dados.exerceu_atividade_urbana)
                }
                onValueChange={(v) =>
                  handleChange("exerceu_atividade_urbana", v === "true")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="urb-sim" />
                  <Label
                    htmlFor="urb-sim"
                    className="font-normal cursor-pointer"
                  >
                    Sim
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="urb-nao" />
                  <Label
                    htmlFor="urb-nao"
                    className="font-normal cursor-pointer"
                  >
                    Não
                  </Label>
                </div>
              </RadioGroup>
              {dados.exerceu_atividade_urbana && (
                <Textarea
                  value={dados.detalhes_atividade_urbana || ""}
                  onChange={(e) =>
                    handleChange("detalhes_atividade_urbana", e.target.value)
                  }
                  placeholder="Especificar atividade e período"
                  rows={2}
                />
              )}
            </div>
          </div>

          {/* 3. Composição e Trabalho do Grupo Familiar */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm text-slate-700">
              3. Composição e Trabalho do Grupo Familiar
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
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={membro.trabalha_roca}
                        onCheckedChange={(checked) =>
                          atualizarMembro(index, "trabalha_roca", checked)
                        }
                      />
                      <Label className="font-normal">Trabalha na roça</Label>
                    </div>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estado civil do requerente</Label>
                <Select
                  value={dados.estado_civil || ""}
                  onValueChange={(v) => handleChange("estado_civil", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solteiro">Solteiro</SelectItem>
                    <SelectItem value="casado">Casado</SelectItem>
                    <SelectItem value="uniao_estavel">União Estável</SelectItem>
                    <SelectItem value="divorciado">Divorciado</SelectItem>
                    <SelectItem value="viuvo">Viúvo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(dados.estado_civil === "casado" ||
              dados.estado_civil === "uniao_estavel") && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do cônjuge/companheiro(a)</Label>
                  <Input
                    value={dados.nome_conjuge || ""}
                    onChange={(e) =>
                      handleChange("nome_conjuge", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Atividade do cônjuge/companheiro(a)</Label>
                  <Input
                    value={dados.atividade_conjuge || ""}
                    onChange={(e) =>
                      handleChange("atividade_conjuge", e.target.value)
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* 4. Vínculos Formais e Renda Familiar */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm text-slate-700">
              4. Vínculos Formais e Renda Familiar
            </h4>

            <div className="space-y-3">
              <Label>
                Alguém da casa trabalha/trabalhou com carteira assinada?
              </Label>
              <RadioGroup
                value={
                  dados.vinculo_formal_familia === null
                    ? ""
                    : String(dados.vinculo_formal_familia)
                }
                onValueChange={(v) =>
                  handleChange("vinculo_formal_familia", v === "true")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="vinc-sim" />
                  <Label
                    htmlFor="vinc-sim"
                    className="font-normal cursor-pointer"
                  >
                    Sim
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="vinc-nao" />
                  <Label
                    htmlFor="vinc-nao"
                    className="font-normal cursor-pointer"
                  >
                    Não
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label>
                Alguém teve empresa aberta ou contribuiu como
                autônomo/facultativo?
              </Label>
              <RadioGroup
                value={
                  dados.empresa_autonomo === null
                    ? ""
                    : String(dados.empresa_autonomo)
                }
                onValueChange={(v) =>
                  handleChange("empresa_autonomo", v === "true")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="emp-sim" />
                  <Label
                    htmlFor="emp-sim"
                    className="font-normal cursor-pointer"
                  >
                    Sim
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="emp-nao" />
                  <Label
                    htmlFor="emp-nao"
                    className="font-normal cursor-pointer"
                  >
                    Não
                  </Label>
                </div>
              </RadioGroup>
              {(dados.vinculo_formal_familia || dados.empresa_autonomo) && (
                <Textarea
                  value={dados.detalhes_vinculo_formal || ""}
                  onChange={(e) =>
                    handleChange("detalhes_vinculo_formal", e.target.value)
                  }
                  placeholder="Detalhar"
                  rows={2}
                />
              )}
            </div>

            <div className="space-y-3">
              <Label>A renda da família é exclusivamente da roça?</Label>
              <RadioGroup
                value={
                  dados.renda_exclusiva_roca === null
                    ? ""
                    : String(dados.renda_exclusiva_roca)
                }
                onValueChange={(v) =>
                  handleChange("renda_exclusiva_roca", v === "true")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="renda-sim" />
                  <Label
                    htmlFor="renda-sim"
                    className="font-normal cursor-pointer"
                  >
                    Sim
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="renda-nao" />
                  <Label
                    htmlFor="renda-nao"
                    className="font-normal cursor-pointer"
                  >
                    Não
                  </Label>
                </div>
              </RadioGroup>
              {dados.renda_exclusiva_roca === false && (
                <Textarea
                  value={dados.outras_fontes_renda || ""}
                  onChange={(e) =>
                    handleChange("outras_fontes_renda", e.target.value)
                  }
                  placeholder="Especificar outras fontes"
                  rows={2}
                />
              )}
            </div>
          </div>

          {/* 5. Histórico de Benefícios Previdenciários */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm text-slate-700">
              5. Histórico de Benefícios Previdenciários
            </h4>

            <div className="space-y-3">
              <Label>Já recebeu algum benefício como agricultor?</Label>
              <RadioGroup
                value={
                  dados.recebeu_beneficio === null
                    ? ""
                    : String(dados.recebeu_beneficio)
                }
                onValueChange={(v) =>
                  handleChange("recebeu_beneficio", v === "true")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="ben-sim" />
                  <Label
                    htmlFor="ben-sim"
                    className="font-normal cursor-pointer"
                  >
                    Sim
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="ben-nao" />
                  <Label
                    htmlFor="ben-nao"
                    className="font-normal cursor-pointer"
                  >
                    Não
                  </Label>
                </div>
              </RadioGroup>
              {dados.recebeu_beneficio && (
                <div className="space-y-2">
                  {BENEFICIOS.map((ben) => (
                    <div key={ben} className="flex items-center gap-2">
                      <Checkbox
                        checked={(dados.beneficios_recebidos || []).includes(
                          ben,
                        )}
                        onCheckedChange={() =>
                          handleArrayToggle("beneficios_recebidos", ben)
                        }
                      />
                      <Label className="font-normal cursor-pointer">
                        {ben}
                      </Label>
                    </div>
                  ))}
                  {(dados.beneficios_recebidos || []).includes("Outro") && (
                    <Input
                      placeholder="Especificar outro benefício"
                      value={dados.beneficio_outro_especificar || ""}
                      onChange={(e) =>
                        handleChange(
                          "beneficio_outro_especificar",
                          e.target.value,
                        )
                      }
                    />
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label>Cônjuge já recebeu benefício como agricultor?</Label>
              <RadioGroup
                value={
                  dados.conjuge_recebeu_beneficio === null
                    ? ""
                    : String(dados.conjuge_recebeu_beneficio)
                }
                onValueChange={(v) =>
                  handleChange("conjuge_recebeu_beneficio", v === "true")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="conj-ben-sim" />
                  <Label
                    htmlFor="conj-ben-sim"
                    className="font-normal cursor-pointer"
                  >
                    Sim
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="conj-ben-nao" />
                  <Label
                    htmlFor="conj-ben-nao"
                    className="font-normal cursor-pointer"
                  >
                    Não
                  </Label>
                </div>
              </RadioGroup>
              {dados.conjuge_recebeu_beneficio && (
                <Textarea
                  value={dados.detalhes_beneficio_conjuge || ""}
                  onChange={(e) =>
                    handleChange("detalhes_beneficio_conjuge", e.target.value)
                  }
                  placeholder="Especificar"
                  rows={2}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO 2: HISTÓRICO PROFISSIONAL RURAL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Histórico Profissional Rural
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 6. Trajetória no Trabalho Rural */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-slate-700">
              6. Trajetória no Trabalho Rural
            </h4>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Trabalha na agricultura desde quando?</Label>
                <Input
                  type="text"
                  placeholder="Ex: Desde criança, 1990..."
                  value={dados.trabalha_agricultura_desde || ""}
                  onChange={(e) =>
                    handleChange("trabalha_agricultura_desde", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Propriedade onde iniciou</Label>
                <Input
                  value={dados.propriedade_inicial || ""}
                  onChange={(e) =>
                    handleChange("propriedade_inicial", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Proprietário da terra inicial</Label>
                <Input
                  value={dados.proprietario_terra_inicial || ""}
                  onChange={(e) =>
                    handleChange("proprietario_terra_inicial", e.target.value)
                  }
                />
              </div>
            </div>
          </div>

          {/* 7. Histórico de Propriedades */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm text-slate-700">
              7. Histórico de Propriedades Trabalhadas
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
                    <Textarea
                      placeholder="Atividades desenvolvidas"
                      value={prop.atividades}
                      onChange={(e) =>
                        atualizarPropriedade(
                          index,
                          "atividades",
                          e.target.value,
                        )
                      }
                      rows={2}
                      className="col-span-2"
                    />
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

          {/* 8. Propriedade Atual */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm text-slate-700">
              8. Propriedade Atual
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Há quanto tempo trabalha na propriedade atual?</Label>
                <Input
                  value={dados.tempo_propriedade_atual || ""}
                  onChange={(e) =>
                    handleChange("tempo_propriedade_atual", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>De quem é a terra atual?</Label>
                <Input
                  value={dados.dono_terra_atual || ""}
                  onChange={(e) =>
                    handleChange("dono_terra_atual", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Transporte para ir à roça</Label>
                <Select
                  value={dados.transporte_roca || ""}
                  onValueChange={(v) => handleChange("transporte_roca", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a_pe">A pé</SelectItem>
                    <SelectItem value="bicicleta">Bicicleta</SelectItem>
                    <SelectItem value="moto">Moto</SelectItem>
                    <SelectItem value="carro">Carro</SelectItem>
                    <SelectItem value="transporte_coletivo">
                      Transporte coletivo
                    </SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tempo de deslocamento</Label>
                <Input
                  value={dados.tempo_deslocamento || ""}
                  onChange={(e) =>
                    handleChange("tempo_deslocamento", e.target.value)
                  }
                  placeholder="Ex: 30 minutos"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Frequência de ida à roça</Label>
                <Select
                  value={dados.frequencia_ida_roca || ""}
                  onValueChange={(v) => handleChange("frequencia_ida_roca", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diariamente">Diariamente</SelectItem>
                    <SelectItem value="5_6_dias">5-6 dias/semana</SelectItem>
                    <SelectItem value="3_4_dias">3-4 dias/semana</SelectItem>
                    <SelectItem value="ocasionalmente">
                      Ocasionalmente
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 9. Atividades Agrícolas */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm text-slate-700">
              9. Atividades Agrícolas Desenvolvidas
            </h4>

            <div className="space-y-2">
              <Label>Instrumentos utilizados na lavoura</Label>
              <div className="grid grid-cols-2 gap-2">
                {INSTRUMENTOS.map((inst) => (
                  <div key={inst} className="flex items-center gap-2">
                    <Checkbox
                      checked={(dados.instrumentos_lavoura || []).includes(
                        inst,
                      )}
                      onCheckedChange={() =>
                        handleArrayToggle("instrumentos_lavoura", inst)
                      }
                    />
                    <Label className="font-normal cursor-pointer">{inst}</Label>
                  </div>
                ))}
              </div>
              {(dados.instrumentos_lavoura || []).includes("Outros") && (
                <Input
                  placeholder="Especificar outros instrumentos"
                  value={dados.instrumentos_outros || ""}
                  onChange={(e) =>
                    handleChange("instrumentos_outros", e.target.value)
                  }
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>O que planta?</Label>
              <Textarea
                value={dados.o_que_planta || ""}
                onChange={(e) => handleChange("o_que_planta", e.target.value)}
                placeholder="Listar culturas"
                rows={2}
              />
            </div>

            <div className="space-y-3">
              <Label>Cria animais?</Label>
              <RadioGroup
                value={
                  dados.cria_animais === null ? "" : String(dados.cria_animais)
                }
                onValueChange={(v) =>
                  handleChange("cria_animais", v === "true")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="anim-sim" />
                  <Label
                    htmlFor="anim-sim"
                    className="font-normal cursor-pointer"
                  >
                    Sim
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="anim-nao" />
                  <Label
                    htmlFor="anim-nao"
                    className="font-normal cursor-pointer"
                  >
                    Não
                  </Label>
                </div>
              </RadioGroup>
              {dados.cria_animais && (
                <Input
                  value={dados.quais_animais || ""}
                  onChange={(e) =>
                    handleChange("quais_animais", e.target.value)
                  }
                  placeholder="Quais animais?"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Finalidade da produção</Label>
              <RadioGroup
                value={dados.finalidade_producao || ""}
                onValueChange={(v) => handleChange("finalidade_producao", v)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="subsistencia" id="fin-sub" />
                  <Label
                    htmlFor="fin-sub"
                    className="font-normal cursor-pointer"
                  >
                    Apenas subsistência
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="subsistencia_venda" id="fin-mix" />
                  <Label
                    htmlFor="fin-mix"
                    className="font-normal cursor-pointer"
                  >
                    Subsistência + Venda de excedente
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="comercializacao" id="fin-com" />
                  <Label
                    htmlFor="fin-com"
                    className="font-normal cursor-pointer"
                  >
                    Comercialização
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Atividades que desenvolve no roçado</Label>
              <div className="grid grid-cols-2 gap-2">
                {ATIVIDADES_ROCADO.map((ativ) => (
                  <div key={ativ} className="flex items-center gap-2">
                    <Checkbox
                      checked={(dados.atividades_rocado || []).includes(ativ)}
                      onCheckedChange={() =>
                        handleArrayToggle("atividades_rocado", ativ)
                      }
                    />
                    <Label className="font-normal cursor-pointer">{ativ}</Label>
                  </div>
                ))}
              </div>
              {(dados.atividades_rocado || []).includes("Outros") && (
                <Input
                  placeholder="Especificar outras atividades"
                  value={dados.atividades_rocado_outros || ""}
                  onChange={(e) =>
                    handleChange("atividades_rocado_outros", e.target.value)
                  }
                />
              )}
            </div>
          </div>

          {/* 10. Afastamentos */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm text-slate-700">
              10. Afastamentos da Atividade Rural
            </h4>

            <div className="space-y-3">
              <Label>Já se afastou da atividade de agricultor?</Label>
              <RadioGroup
                value={
                  dados.afastou_atividade === null
                    ? ""
                    : String(dados.afastou_atividade)
                }
                onValueChange={(v) =>
                  handleChange("afastou_atividade", v === "true")
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
              {dados.afastou_atividade && (
                <>
                  <Textarea
                    value={dados.atividade_afastamento || ""}
                    onChange={(e) =>
                      handleChange("atividade_afastamento", e.target.value)
                    }
                    placeholder="Que atividade desenvolveu?"
                    rows={2}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Início do afastamento</Label>
                      <Input
                        type="month"
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
                        type="month"
                        value={dados.periodo_afastamento_fim || ""}
                        onChange={(e) =>
                          handleChange(
                            "periodo_afastamento_fim",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 11. Associações e Sindicatos */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm text-slate-700">
              11. Associações e Sindicatos
            </h4>

            <div className="space-y-3">
              <Label>É filiado a alguma associação de moradores?</Label>
              <RadioGroup
                value={
                  dados.filiado_associacao === null
                    ? ""
                    : String(dados.filiado_associacao)
                }
                onValueChange={(v) =>
                  handleChange("filiado_associacao", v === "true")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="assoc-sim" />
                  <Label
                    htmlFor="assoc-sim"
                    className="font-normal cursor-pointer"
                  >
                    Sim
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="assoc-nao" />
                  <Label
                    htmlFor="assoc-nao"
                    className="font-normal cursor-pointer"
                  >
                    Não
                  </Label>
                </div>
              </RadioGroup>
              {dados.filiado_associacao && (
                <Input
                  value={dados.nome_associacao || ""}
                  onChange={(e) =>
                    handleChange("nome_associacao", e.target.value)
                  }
                  placeholder="Qual associação?"
                />
              )}
            </div>

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
              {dados.filiado_sindicato && (
                <>
                  <div className="space-y-2">
                    <Label>Desde quando é filiado?</Label>
                    <Input
                      type="month"
                      value={dados.filiado_sindicato_desde || ""}
                      onChange={(e) =>
                        handleChange("filiado_sindicato_desde", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>Paga contribuição sindical?</Label>
                    <RadioGroup
                      value={
                        dados.paga_contribuicao_sindical === null
                          ? ""
                          : String(dados.paga_contribuicao_sindical)
                      }
                      onValueChange={(v) =>
                        handleChange("paga_contribuicao_sindical", v === "true")
                      }
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="contr-sim" />
                        <Label
                          htmlFor="contr-sim"
                          className="font-normal cursor-pointer"
                        >
                          Sim
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="contr-nao" />
                        <Label
                          htmlFor="contr-nao"
                          className="font-normal cursor-pointer"
                        >
                          Não
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO 3: DOCUMENTAÇÃO E COMPROVAÇÃO */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Documentação e Comprovação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 12. Situação Atual */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-slate-700">
              12. Situação Atual e Documentação Rural
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label>Está trabalhando atualmente?</Label>
                <RadioGroup
                  value={
                    dados.trabalhando_atualmente === null
                      ? ""
                      : String(dados.trabalhando_atualmente)
                  }
                  onValueChange={(v) =>
                    handleChange("trabalhando_atualmente", v === "true")
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="trab-sim" />
                    <Label
                      htmlFor="trab-sim"
                      className="font-normal cursor-pointer"
                    >
                      Sim
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="trab-nao" />
                    <Label
                      htmlFor="trab-nao"
                      className="font-normal cursor-pointer"
                    >
                      Não
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label>Possui documentação que comprove atividade rural?</Label>
                <RadioGroup
                  value={
                    dados.possui_doc_comprova_rural === null
                      ? ""
                      : String(dados.possui_doc_comprova_rural)
                  }
                  onValueChange={(v) =>
                    handleChange("possui_doc_comprova_rural", v === "true")
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="doc-sim" />
                    <Label
                      htmlFor="doc-sim"
                      className="font-normal cursor-pointer"
                    >
                      Sim
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="doc-nao" />
                    <Label
                      htmlFor="doc-nao"
                      className="font-normal cursor-pointer"
                    >
                      Não
                    </Label>
                  </div>
                </RadioGroup>
              </div>

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

              <div className="space-y-3">
                <Label>Já recebeu Seguro Safra?</Label>
                <RadioGroup
                  value={
                    dados.recebeu_seguro_safra === null
                      ? ""
                      : String(dados.recebeu_seguro_safra)
                  }
                  onValueChange={(v) =>
                    handleChange("recebeu_seguro_safra", v === "true")
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="seg-sim" />
                    <Label
                      htmlFor="seg-sim"
                      className="font-normal cursor-pointer"
                    >
                      Sim
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="seg-nao" />
                    <Label
                      htmlFor="seg-nao"
                      className="font-normal cursor-pointer"
                    >
                      Não
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label>Já fez algum empréstimo rural?</Label>
                <RadioGroup
                  value={
                    dados.fez_emprestimo_rural === null
                      ? ""
                      : String(dados.fez_emprestimo_rural)
                  }
                  onValueChange={(v) =>
                    handleChange("fez_emprestimo_rural", v === "true")
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="emp-rural-sim" />
                    <Label
                      htmlFor="emp-rural-sim"
                      className="font-normal cursor-pointer"
                    >
                      Sim
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="emp-rural-nao" />
                    <Label
                      htmlFor="emp-rural-nao"
                      className="font-normal cursor-pointer"
                    >
                      Não
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {dados.fez_emprestimo_rural && (
              <Textarea
                value={dados.detalhes_emprestimo || ""}
                onChange={(e) =>
                  handleChange("detalhes_emprestimo", e.target.value)
                }
                placeholder="Detalhar empréstimos rurais"
                rows={3}
              />
            )}
          </div>

          {/* 13. Detalhamento da Propriedade */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm text-slate-700">
              13. Detalhamento da Propriedade Rural
            </h4>

            <div className="space-y-2">
              <Label>Situação quanto à propriedade</Label>
              <RadioGroup
                value={dados.situacao_propriedade || ""}
                onValueChange={(v) => handleChange("situacao_propriedade", v)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="proprietario" id="sit-prop" />
                  <Label
                    htmlFor="sit-prop"
                    className="font-normal cursor-pointer"
                  >
                    Proprietário
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="arrendatario" id="sit-arr" />
                  <Label
                    htmlFor="sit-arr"
                    className="font-normal cursor-pointer"
                  >
                    Arrendatário
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="meeiro" id="sit-mei" />
                  <Label
                    htmlFor="sit-mei"
                    className="font-normal cursor-pointer"
                  >
                    Meeiro
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="posseiro" id="sit-pos" />
                  <Label
                    htmlFor="sit-pos"
                    className="font-normal cursor-pointer"
                  >
                    Posseiro
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {dados.situacao_propriedade &&
              dados.situacao_propriedade !== "proprietario" && (
                <div className="space-y-2">
                  <Label>Quem é o dono da terra?</Label>
                  <Input
                    value={dados.dono_terra_se_nao_proprietario || ""}
                    onChange={(e) =>
                      handleChange(
                        "dono_terra_se_nao_proprietario",
                        e.target.value,
                      )
                    }
                  />
                </div>
              )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label>Possui documento da terra?</Label>
                <RadioGroup
                  value={
                    dados.possui_doc_terra === null
                      ? ""
                      : String(dados.possui_doc_terra)
                  }
                  onValueChange={(v) =>
                    handleChange("possui_doc_terra", v === "true")
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="doc-terra-sim" />
                    <Label
                      htmlFor="doc-terra-sim"
                      className="font-normal cursor-pointer"
                    >
                      Sim
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="doc-terra-nao" />
                    <Label
                      htmlFor="doc-terra-nao"
                      className="font-normal cursor-pointer"
                    >
                      Não
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Tamanho da propriedade</Label>
                <Input
                  value={dados.tamanho_propriedade || ""}
                  onChange={(e) =>
                    handleChange("tamanho_propriedade", e.target.value)
                  }
                  placeholder="Ex: 5 hectares"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Localização da propriedade</Label>
                <Input
                  value={dados.localizacao_propriedade || ""}
                  onChange={(e) =>
                    handleChange("localizacao_propriedade", e.target.value)
                  }
                  placeholder="Endereço/comunidade"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>O que era cultivado?</Label>
                <Textarea
                  value={dados.o_que_cultivava || ""}
                  onChange={(e) =>
                    handleChange("o_que_cultivava", e.target.value)
                  }
                  rows={2}
                />
              </div>

              <div className="space-y-3">
                <Label>Havia empregados na propriedade?</Label>
                <RadioGroup
                  value={
                    dados.havia_empregados === null
                      ? ""
                      : String(dados.havia_empregados)
                  }
                  onValueChange={(v) =>
                    handleChange("havia_empregados", v === "true")
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="empreg-sim" />
                    <Label
                      htmlFor="empreg-sim"
                      className="font-normal cursor-pointer"
                    >
                      Sim
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="empreg-nao" />
                    <Label
                      htmlFor="empreg-nao"
                      className="font-normal cursor-pointer"
                    >
                      Não
                    </Label>
                  </div>
                </RadioGroup>
                {dados.havia_empregados && (
                  <Input
                    type="number"
                    value={dados.quantidade_empregados || ""}
                    onChange={(e) =>
                      handleChange(
                        "quantidade_empregados",
                        parseInt(e.target.value),
                      )
                    }
                    placeholder="Quantos?"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Trabalhava sozinho ou com família?</Label>
                <RadioGroup
                  value={dados.trabalha_sozinho_familia || ""}
                  onValueChange={(v) =>
                    handleChange("trabalha_sozinho_familia", v)
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sozinho" id="trab-soz" />
                    <Label
                      htmlFor="trab-soz"
                      className="font-normal cursor-pointer"
                    >
                      Sozinho
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="com_familia" id="trab-fam" />
                    <Label
                      htmlFor="trab-fam"
                      className="font-normal cursor-pointer"
                    >
                      Com a família
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>

          {/* 14. Outras Fontes de Renda */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm text-slate-700">
              14. Outras Fontes de Renda Familiar
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label>Pai ou mãe possuíam labor urbano?</Label>
                <RadioGroup
                  value={
                    dados.pais_labor_urbano === null
                      ? ""
                      : String(dados.pais_labor_urbano)
                  }
                  onValueChange={(v) =>
                    handleChange("pais_labor_urbano", v === "true")
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="pais-urb-sim" />
                    <Label
                      htmlFor="pais-urb-sim"
                      className="font-normal cursor-pointer"
                    >
                      Sim
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="pais-urb-nao" />
                    <Label
                      htmlFor="pais-urb-nao"
                      className="font-normal cursor-pointer"
                    >
                      Não
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label>Pai ou mãe tinham outras fontes de renda?</Label>
                <RadioGroup
                  value={
                    dados.pais_outras_rendas === null
                      ? ""
                      : String(dados.pais_outras_rendas)
                  }
                  onValueChange={(v) =>
                    handleChange("pais_outras_rendas", v === "true")
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="pais-renda-sim" />
                    <Label
                      htmlFor="pais-renda-sim"
                      className="font-normal cursor-pointer"
                    >
                      Sim
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="pais-renda-nao" />
                    <Label
                      htmlFor="pais-renda-nao"
                      className="font-normal cursor-pointer"
                    >
                      Não
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {dados.pais_outras_rendas && (
              <Textarea
                value={dados.detalhes_renda_pais || ""}
                onChange={(e) =>
                  handleChange("detalhes_renda_pais", e.target.value)
                }
                placeholder="Especificar outras fontes de renda dos pais"
                rows={2}
              />
            )}
          </div>

          {/* 15. Testemunhas */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm text-slate-700">
              15. Testemunhas do Labor Rural
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
                    <Input
                      type="month"
                      placeholder="Período início"
                      value={test.periodo_inicio}
                      onChange={(e) =>
                        atualizarTestemunha(
                          index,
                          "periodo_inicio",
                          e.target.value,
                        )
                      }
                    />
                    <Input
                      type="month"
                      placeholder="Período fim"
                      value={test.periodo_fim}
                      onChange={(e) =>
                        atualizarTestemunha(
                          index,
                          "periodo_fim",
                          e.target.value,
                        )
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

      {/* SEÇÃO 4: OBSERVAÇÕES */}
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
