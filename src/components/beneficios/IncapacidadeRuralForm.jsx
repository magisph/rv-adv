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
import { Plus, Trash2, AlertCircle, Upload } from "lucide-react";
import { base44 } from "@/lib/adapters/legacyBase44";

const TIPOS_TRATAMENTO = [
  "Fisioterapia",
  "Fonoaudiologia",
  "Terapia Ocupacional",
  "Psicoterapia",
  "Tratamento medicamentoso",
  "Outro",
];

const TIPOS_DOCUMENTO_MEDICO = [
  "Laudo",
  "Atestado",
  "Exame com laudo",
  "Documento hospitalar",
  "Receita",
  "Relatório",
];

const PARENTESCOS = [
  "Cônjuge/Companheiro",
  "Pai",
  "Mãe",
  "Filho(a)",
  "Irmão(ã)",
  "Outro",
];

export default function IncapacidadeRuralForm({ dados, onChange }) {
  const [documentosMedicos, setDocumentosMedicos] = useState(
    dados.documentos_medicos || [],
  );
  const [membros, setMembros] = useState(dados.membros_grupo_familiar || []);
  const [propriedades, setPropriedades] = useState(
    dados.propriedades_trabalhadas || [],
  );
  const [testemunhas, setTestemunhas] = useState(dados.testemunhas || []);
  const [uploading, setUploading] = useState(false);

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

  // Documentos Médicos
  const adicionarDocumentoMedico = () => {
    const novo = {
      tipo: "",
      data: "",
      descricao: "",
      arquivo_url: "",
    };
    const novos = [...documentosMedicos, novo];
    setDocumentosMedicos(novos);
    handleChange("documentos_medicos", novos);
  };

  const removerDocumentoMedico = (index) => {
    const novos = documentosMedicos.filter((_, i) => i !== index);
    setDocumentosMedicos(novos);
    handleChange("documentos_medicos", novos);
  };

  const atualizarDocumentoMedico = (index, field, value) => {
    const novos = [...documentosMedicos];
    novos[index][field] = value;
    setDocumentosMedicos(novos);
    handleChange("documentos_medicos", novos);
  };

  const handleFileUpload = async (index, file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      atualizarDocumentoMedico(index, "arquivo_url", file_url);
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
    } finally {
      setUploading(false);
    }
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
    novas[index][field] = value;
    setTestemunhas(novas);
    handleChange("testemunhas", novas);
  };

  // Ordenar documentos médicos por data
  const documentosOrdenados = [...documentosMedicos].sort((a, b) => {
    if (!a.data) return 1;
    if (!b.data) return -1;
    return new Date(a.data) - new Date(b.data);
  });

  return (
    <div className="space-y-6">
      {/* SEÇÃO 1: QUESTIONÁRIO SOBRE A INCAPACIDADE */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Questionário sobre a Incapacidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 1. Patologia e Diagnóstico */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-slate-700">
              1. Patologia e Diagnóstico
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Patologia/Deficiência - CID</Label>
                <Input
                  value={dados.cid_patologia || ""}
                  onChange={(e) =>
                    handleChange("cid_patologia", e.target.value)
                  }
                  placeholder="Ex: M54.5 - Lombalgia"
                />
              </div>
              <div className="space-y-2">
                <Label>Quando começou a sentir os sintomas?</Label>
                <Input
                  type="date"
                  value={dados.data_inicio_sintomas || ""}
                  onChange={(e) =>
                    handleChange("data_inicio_sintomas", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Decorreu de algum acidente?</Label>
              <RadioGroup
                value={
                  dados.decorreu_acidente === null
                    ? ""
                    : String(dados.decorreu_acidente)
                }
                onValueChange={(v) =>
                  handleChange("decorreu_acidente", v === "true")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="acid-sim" />
                  <Label
                    htmlFor="acid-sim"
                    className="font-normal cursor-pointer"
                  >
                    Sim
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="acid-nao" />
                  <Label
                    htmlFor="acid-nao"
                    className="font-normal cursor-pointer"
                  >
                    Não
                  </Label>
                </div>
              </RadioGroup>
              {dados.decorreu_acidente && (
                <Textarea
                  value={dados.detalhes_acidente || ""}
                  onChange={(e) =>
                    handleChange("detalhes_acidente", e.target.value)
                  }
                  placeholder="Detalhar o acidente"
                  rows={3}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Histórico detalhado dos sintomas desde o início</Label>
              <Textarea
                value={dados.historico_sintomas || ""}
                onChange={(e) =>
                  handleChange("historico_sintomas", e.target.value)
                }
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Pesquisa/informações sobre o CID</Label>
              <Textarea
                value={dados.pesquisa_cid || ""}
                onChange={(e) => handleChange("pesquisa_cid", e.target.value)}
                placeholder="Para o advogado preencher"
                rows={3}
              />
            </div>
          </div>

          {/* 2. Impactos da Incapacidade */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm text-slate-700">
              2. Impactos da Incapacidade
            </h4>

            <div className="space-y-2">
              <Label>Como os sintomas afetam a vida do requerente?</Label>
              <Textarea
                value={dados.impacto_vida || ""}
                onChange={(e) => handleChange("impacto_vida", e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>
                Como os sintomas afetam o exercício do labor habitual?
              </Label>
              <Textarea
                value={dados.impacto_labor || ""}
                onChange={(e) => handleChange("impacto_labor", e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Quais atividades executa(va) no trabalho?</Label>
              <Textarea
                value={dados.atividades_trabalho || ""}
                onChange={(e) =>
                  handleChange("atividades_trabalho", e.target.value)
                }
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <Label>
                Os problemas de saúde dificultam o exercício dessas atividades?
              </Label>
              <RadioGroup
                value={
                  dados.saude_dificulta_atividades === null
                    ? ""
                    : String(dados.saude_dificulta_atividades)
                }
                onValueChange={(v) =>
                  handleChange("saude_dificulta_atividades", v === "true")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="dif-sim" />
                  <Label
                    htmlFor="dif-sim"
                    className="font-normal cursor-pointer"
                  >
                    Sim
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="dif-nao" />
                  <Label
                    htmlFor="dif-nao"
                    className="font-normal cursor-pointer"
                  >
                    Não
                  </Label>
                </div>
              </RadioGroup>
              {dados.saude_dificulta_atividades && (
                <Textarea
                  value={dados.como_dificulta || ""}
                  onChange={(e) =>
                    handleChange("como_dificulta", e.target.value)
                  }
                  placeholder="Como dificultam?"
                  rows={2}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Data de afastamento das atividades laborais</Label>
              <Input
                type="date"
                value={dados.data_afastamento || ""}
                onChange={(e) =>
                  handleChange("data_afastamento", e.target.value)
                }
              />
            </div>
          </div>

          {/* 3. Tratamento e Medicações */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm text-slate-700">
              3. Tratamento e Medicações
            </h4>

            <div className="space-y-3">
              <Label>Faz algum tipo de tratamento?</Label>
              <RadioGroup
                value={
                  dados.faz_tratamento === null
                    ? ""
                    : String(dados.faz_tratamento)
                }
                onValueChange={(v) =>
                  handleChange("faz_tratamento", v === "true")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="trat-sim" />
                  <Label
                    htmlFor="trat-sim"
                    className="font-normal cursor-pointer"
                  >
                    Sim
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="trat-nao" />
                  <Label
                    htmlFor="trat-nao"
                    className="font-normal cursor-pointer"
                  >
                    Não
                  </Label>
                </div>
              </RadioGroup>
              {dados.faz_tratamento && (
                <div className="space-y-2">
                  {TIPOS_TRATAMENTO.map((tipo) => (
                    <div key={tipo} className="flex items-center gap-2">
                      <Checkbox
                        checked={(dados.tipos_tratamento || []).includes(tipo)}
                        onCheckedChange={() =>
                          handleArrayToggle("tipos_tratamento", tipo)
                        }
                      />
                      <Label className="font-normal cursor-pointer">
                        {tipo}
                      </Label>
                    </div>
                  ))}
                  {(dados.tipos_tratamento || []).includes("Outro") && (
                    <Input
                      placeholder="Especificar outro tratamento"
                      value={dados.tratamento_outro || ""}
                      onChange={(e) =>
                        handleChange("tratamento_outro", e.target.value)
                      }
                    />
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label>Possui relatórios ou atestados do tratamento?</Label>
              <RadioGroup
                value={
                  dados.possui_relatorios_tratamento === null
                    ? ""
                    : String(dados.possui_relatorios_tratamento)
                }
                onValueChange={(v) =>
                  handleChange("possui_relatorios_tratamento", v === "true")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="rel-sim" />
                  <Label
                    htmlFor="rel-sim"
                    className="font-normal cursor-pointer"
                  >
                    Sim
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="rel-nao" />
                  <Label
                    htmlFor="rel-nao"
                    className="font-normal cursor-pointer"
                  >
                    Não
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label>Toma medicações?</Label>
              <RadioGroup
                value={
                  dados.toma_medicacoes === null
                    ? ""
                    : String(dados.toma_medicacoes)
                }
                onValueChange={(v) =>
                  handleChange("toma_medicacoes", v === "true")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="med-sim" />
                  <Label
                    htmlFor="med-sim"
                    className="font-normal cursor-pointer"
                  >
                    Sim
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="med-nao" />
                  <Label
                    htmlFor="med-nao"
                    className="font-normal cursor-pointer"
                  >
                    Não
                  </Label>
                </div>
              </RadioGroup>
              {dados.toma_medicacoes && (
                <Textarea
                  value={dados.quais_medicacoes || ""}
                  onChange={(e) =>
                    handleChange("quais_medicacoes", e.target.value)
                  }
                  placeholder="Quais medicações?"
                  rows={2}
                />
              )}
            </div>

            {dados.toma_medicacoes && (
              <div className="space-y-3">
                <Label>As medicações têm efeitos colaterais?</Label>
                <RadioGroup
                  value={
                    dados.medicacoes_efeitos_colaterais === null
                      ? ""
                      : String(dados.medicacoes_efeitos_colaterais)
                  }
                  onValueChange={(v) =>
                    handleChange("medicacoes_efeitos_colaterais", v === "true")
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="efeit-sim" />
                    <Label
                      htmlFor="efeit-sim"
                      className="font-normal cursor-pointer"
                    >
                      Sim
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="efeit-nao" />
                    <Label
                      htmlFor="efeit-nao"
                      className="font-normal cursor-pointer"
                    >
                      Não
                    </Label>
                  </div>
                </RadioGroup>
                {dados.medicacoes_efeitos_colaterais && (
                  <Textarea
                    value={dados.quais_efeitos_colaterais || ""}
                    onChange={(e) =>
                      handleChange("quais_efeitos_colaterais", e.target.value)
                    }
                    placeholder="Quais efeitos?"
                    rows={2}
                  />
                )}
              </div>
            )}
          </div>

          {/* 4. Documentação Médica Disponível */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm text-slate-700">
              4. Documentação Médica Disponível
            </h4>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <strong>Nota Orientativa:</strong> Organizar documentos médicos
                em ordem cronológica: Laudos, Atestados, Exames (tomografias,
                raio-x, ultrassom), Documentos Hospitalares (ficha de
                internação, relatório de alta), Receitas, Relatórios
                (fisioterapia, psicologia, fonoaudiologia, psicopedagogia).
              </div>
            </div>

            <div className="space-y-3">
              {documentosOrdenados.map((doc, index) => {
                const originalIndex = documentosMedicos.indexOf(doc);
                return (
                  <div
                    key={originalIndex}
                    className="border rounded-lg p-4 space-y-3 bg-slate-50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">
                        Documento Médico {originalIndex + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removerDocumentoMedico(originalIndex)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Select
                        value={doc.tipo}
                        onValueChange={(v) =>
                          atualizarDocumentoMedico(originalIndex, "tipo", v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tipo de documento" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPOS_DOCUMENTO_MEDICO.map((tipo) => (
                            <SelectItem key={tipo} value={tipo}>
                              {tipo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="date"
                        value={doc.data}
                        onChange={(e) =>
                          atualizarDocumentoMedico(
                            originalIndex,
                            "data",
                            e.target.value,
                          )
                        }
                        placeholder="Data"
                      />
                      <Textarea
                        placeholder="Descrição/Observações"
                        value={doc.descricao}
                        onChange={(e) =>
                          atualizarDocumentoMedico(
                            originalIndex,
                            "descricao",
                            e.target.value,
                          )
                        }
                        rows={2}
                        className="col-span-2"
                      />
                      <div className="col-span-2">
                        <Label className="mb-2 block text-sm">
                          Upload do arquivo
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) handleFileUpload(originalIndex, file);
                            }}
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            disabled={uploading}
                          />
                          {doc.arquivo_url && (
                            <a
                              href={doc.arquivo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              Ver arquivo
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <Button
                type="button"
                variant="outline"
                onClick={adicionarDocumentoMedico}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Documento Médico
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO 2: QUESTIONÁRIO SOBRE ATIVIDADE AGRÍCOLA (Resumido) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Questionário sobre Atividade Agrícola
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Campos principais da atividade rural */}
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
              Composição do Grupo Familiar
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

          {/* Histórico de Propriedades */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm text-slate-700">
              Histórico de Propriedades Trabalhadas
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

          {/* Sindicato */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm text-slate-700">
              Associações e Sindicatos
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
            </div>

            <div className="grid grid-cols-2 gap-4">
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

      {/* SEÇÃO 3: OBSERVAÇÕES */}
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
