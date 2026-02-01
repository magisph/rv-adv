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
import { Plus, Trash2, AlertCircle } from "lucide-react";

const PARENTESCOS = [
  "Cônjuge/Companheiro",
  "Pai",
  "Mãe",
  "Padrasto",
  "Madrasta",
  "Filho(a)",
  "Enteado(a)",
  "Irmão(ã) solteiro",
  "Menor tutelado",
];

const AUXILIOS = ["Bolsa Família", "Vale Gás", "Auxílio Brasil", "Outros"];

const DESPESAS = [
  "Aluguel",
  "Medicamentos",
  "Tratamento médico",
  "Transporte",
  "Alimentação especial",
  "Educação",
  "Outros",
];

const CARACTERISTICAS_IMOVEL = [
  "Cerâmica",
  "Reboco",
  "Forro",
  "Água encanada",
  "Energia elétrica",
];

const INFRAESTRUTURA = [
  "Rua pavimentada",
  "Rede de esgoto",
  "Iluminação pública",
  "Coleta de lixo",
];

const BENS_RESIDENCIA = [
  "Geladeira",
  "Fogão",
  "Micro-ondas",
  "Televisão",
  "Máquina de lavar",
  "Outros",
];

export default function BPCIdosoForm({ dados, onChange }) {
  const [membros, setMembros] = useState(dados.membros_grupo_familiar || []);
  const [veiculos, setVeiculos] = useState(dados.veiculos || []);

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

  const calcularIdade = (dataNascimento) => {
    if (!dataNascimento) return null;
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return idade;
  };

  const adicionarMembro = () => {
    const novoMembro = {
      nome: "",
      cpf: "",
      parentesco: "",
      data_nascimento: "",
      idade: null,
    };
    const novosM = [...membros, novoMembro];
    setMembros(novosM);
    handleChange("membros_grupo_familiar", novosM);
  };

  const removerMembro = (index) => {
    const novosM = membros.filter((_, i) => i !== index);
    setMembros(novosM);
    handleChange("membros_grupo_familiar", novosM);
  };

  const atualizarMembro = (index, field, value) => {
    const novosM = [...membros];
    novosM[index][field] = value;
    if (field === "data_nascimento") {
      novosM[index].idade = calcularIdade(value);
    }
    setMembros(novosM);
    handleChange("membros_grupo_familiar", novosM);
  };

  const adicionarVeiculo = () => {
    const novoV = {
      tipo: "",
      marca_modelo: "",
      ano: "",
      proprietario: "",
      finalidade: "",
    };
    const novosV = [...veiculos, novoV];
    setVeiculos(novosV);
    handleChange("veiculos", novosV);
  };

  const removerVeiculo = (index) => {
    const novosV = veiculos.filter((_, i) => i !== index);
    setVeiculos(novosV);
    handleChange("veiculos", novosV);
  };

  const atualizarVeiculo = (index, field, value) => {
    const novosV = [...veiculos];
    novosV[index][field] = value;
    setVeiculos(novosV);
    handleChange("veiculos", novosV);
  };

  return (
    <div className="space-y-6">
      {/* SEÇÃO: RENDA FAMILIAR */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Renda Familiar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cadastro Único */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-slate-700">
              1. Cadastro Único
            </h4>
            <div className="space-y-3">
              <Label>Cadastro Único atualizado?</Label>
              <RadioGroup
                value={
                  dados.cadunico_atualizado === null
                    ? ""
                    : String(dados.cadunico_atualizado)
                }
                onValueChange={(v) =>
                  handleChange("cadunico_atualizado", v === "true")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="cad-sim" />
                  <Label
                    htmlFor="cad-sim"
                    className="font-normal cursor-pointer"
                  >
                    Sim
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="cad-nao" />
                  <Label
                    htmlFor="cad-nao"
                    className="font-normal cursor-pointer"
                  >
                    Não
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número de membros no CadÚnico</Label>
                <Input
                  type="number"
                  value={dados.num_membros_cadunico || ""}
                  onChange={(e) =>
                    handleChange(
                      "num_membros_cadunico",
                      parseInt(e.target.value),
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Renda declarada no CadÚnico (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={dados.renda_declarada_cadunico || ""}
                  onChange={(e) =>
                    handleChange(
                      "renda_declarada_cadunico",
                      parseFloat(e.target.value),
                    )
                  }
                />
              </div>
            </div>
          </div>

          {/* Composição do Grupo Familiar */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-slate-700">
              2. Composição do Grupo Familiar
            </h4>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <strong>Nota Orientativa:</strong> Via judicial: considera todos
                do CadÚnico. Via administrativa: considera apenas requerente,
                cônjuge/companheiro, pais (ou padrasto/madrasta), irmãos
                solteiros, filhos e enteados solteiros, menores tutelados que
                vivam sob o mesmo teto.
              </div>
            </div>

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
                    <div className="space-y-2">
                      <Label>Nome Completo</Label>
                      <Input
                        value={membro.nome}
                        onChange={(e) =>
                          atualizarMembro(index, "nome", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>CPF</Label>
                      <Input
                        value={membro.cpf}
                        onChange={(e) =>
                          atualizarMembro(index, "cpf", e.target.value)
                        }
                        placeholder="000.000.000-00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Grau de Parentesco</Label>
                      <Select
                        value={membro.parentesco}
                        onValueChange={(v) =>
                          atualizarMembro(index, "parentesco", v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
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
                    <div className="space-y-2">
                      <Label>Data de Nascimento</Label>
                      <Input
                        type="date"
                        value={membro.data_nascimento}
                        onChange={(e) =>
                          atualizarMembro(
                            index,
                            "data_nascimento",
                            e.target.value,
                          )
                        }
                      />
                      {membro.idade !== null && (
                        <p className="text-xs text-slate-500">
                          Idade: {membro.idade} anos
                        </p>
                      )}
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
          </div>

          {/* Renda e Trabalho */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-slate-700">
              3. Renda e Trabalho
            </h4>
            <div className="space-y-2">
              <Label>Valor total da renda familiar (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={dados.valor_total_renda || ""}
                onChange={(e) =>
                  handleChange("valor_total_renda", parseFloat(e.target.value))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Origem da renda</Label>
              <Textarea
                value={dados.origem_renda || ""}
                onChange={(e) => handleChange("origem_renda", e.target.value)}
                placeholder="Descrever fontes de renda"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Alguém recebe auxílio governamental?</Label>
              <div className="space-y-2">
                {AUXILIOS.map((aux) => (
                  <div key={aux} className="flex items-center gap-2">
                    <Checkbox
                      checked={(dados.auxilios_governamentais || []).includes(
                        aux,
                      )}
                      onCheckedChange={() =>
                        handleArrayToggle("auxilios_governamentais", aux)
                      }
                    />
                    <Label className="font-normal cursor-pointer">{aux}</Label>
                  </div>
                ))}
              </div>
              {(dados.auxilios_governamentais || []).includes("Outros") && (
                <Input
                  placeholder="Especificar outros auxílios"
                  value={dados.auxilio_outros || ""}
                  onChange={(e) =>
                    handleChange("auxilio_outros", e.target.value)
                  }
                  className="mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Membros com vínculo empregatício/benefícios</Label>
              <Textarea
                value={dados.membros_vinculos || ""}
                onChange={(e) =>
                  handleChange("membros_vinculos", e.target.value)
                }
                placeholder="Informar se alguém trabalha (CTPS), contribui como facultativo, MEI, autônomo ou recebe aposentadoria, pensão, auxílio-doença, auxílio-acidente. Solicitar CNIS dos membros."
                rows={4}
              />
            </div>
          </div>

          {/* Despesas Relevantes */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-slate-700">
              4. Despesas Relevantes
            </h4>
            <div className="space-y-2">
              <Label>Possui despesas que comprometem a renda?</Label>
              <div className="space-y-2">
                {DESPESAS.map((desp) => (
                  <div key={desp} className="flex items-center gap-2">
                    <Checkbox
                      checked={(dados.despesas_relevantes || []).includes(desp)}
                      onCheckedChange={() =>
                        handleArrayToggle("despesas_relevantes", desp)
                      }
                    />
                    <Label className="font-normal cursor-pointer">{desp}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Detalhar despesas com valores mensais</Label>
              <Textarea
                value={dados.detalhar_despesas || ""}
                onChange={(e) =>
                  handleChange("detalhar_despesas", e.target.value)
                }
                rows={4}
              />
            </div>
          </div>

          {/* Outros Benefícios */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-slate-700">
              5. Outros Benefícios no Grupo Familiar
            </h4>
            <div className="space-y-3">
              <Label>
                Alguém acima de 65 anos ou PCD recebe benefício/BPC?
              </Label>
              <RadioGroup
                value={
                  dados.beneficio_outro_membro === null
                    ? ""
                    : String(dados.beneficio_outro_membro)
                }
                onValueChange={(v) =>
                  handleChange("beneficio_outro_membro", v === "true")
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
              {dados.beneficio_outro_membro && (
                <Textarea
                  value={dados.especificar_beneficio_outro || ""}
                  onChange={(e) =>
                    handleChange("especificar_beneficio_outro", e.target.value)
                  }
                  placeholder="Especificar"
                  rows={2}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO: RESIDÊNCIA E PATRIMÔNIO */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Residência e Patrimônio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Informações da Residência */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-slate-700">
              6. Informações da Residência
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Origem da residência</Label>
                <Select
                  value={dados.origem_residencia || ""}
                  onValueChange={(v) => handleChange("origem_residencia", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="propria">Própria</SelectItem>
                    <SelectItem value="alugada">Alugada</SelectItem>
                    <SelectItem value="emprestada">Emprestada</SelectItem>
                    <SelectItem value="heranca">Herança</SelectItem>
                    <SelectItem value="posse">Posse</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dados.origem_residencia === "propria" && (
                <div className="space-y-2">
                  <Label>Origem da aquisição</Label>
                  <Input
                    value={dados.origem_aquisicao || ""}
                    onChange={(e) =>
                      handleChange("origem_aquisicao", e.target.value)
                    }
                    placeholder="Como comprou, doação, herança, etc."
                  />
                </div>
              )}

              {dados.origem_residencia === "alugada" && (
                <div className="space-y-2">
                  <Label>Valor mensal do aluguel (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={dados.valor_aluguel || ""}
                    onChange={(e) =>
                      handleChange("valor_aluguel", parseFloat(e.target.value))
                    }
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Número de cômodos</Label>
                <Input
                  type="number"
                  value={dados.num_comodos || ""}
                  onChange={(e) =>
                    handleChange("num_comodos", parseInt(e.target.value))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Estado de conservação</Label>
                <Select
                  value={dados.estado_conservacao || ""}
                  onValueChange={(v) => handleChange("estado_conservacao", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excelente">Excelente</SelectItem>
                    <SelectItem value="bom">Bom</SelectItem>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="precario">Precário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Características do imóvel</Label>
              <div className="grid grid-cols-2 gap-2">
                {CARACTERISTICAS_IMOVEL.map((car) => (
                  <div key={car} className="flex items-center gap-2">
                    <Checkbox
                      checked={(dados.caracteristicas_imovel || []).includes(
                        car,
                      )}
                      onCheckedChange={() =>
                        handleArrayToggle("caracteristicas_imovel", car)
                      }
                    />
                    <Label className="font-normal cursor-pointer">{car}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Infraestrutura da rua</Label>
              <div className="grid grid-cols-2 gap-2">
                {INFRAESTRUTURA.map((inf) => (
                  <div key={inf} className="flex items-center gap-2">
                    <Checkbox
                      checked={(dados.infraestrutura_rua || []).includes(inf)}
                      onCheckedChange={() =>
                        handleArrayToggle("infraestrutura_rua", inf)
                      }
                    />
                    <Label className="font-normal cursor-pointer">{inf}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição detalhada do imóvel</Label>
              <Textarea
                value={dados.descricao_imovel || ""}
                onChange={(e) =>
                  handleChange("descricao_imovel", e.target.value)
                }
                rows={4}
              />
            </div>
          </div>

          {/* Bens e Patrimônio */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-slate-700">
              7. Bens e Patrimônio
            </h4>
            <div className="space-y-2">
              <Label>Bens na residência</Label>
              <div className="grid grid-cols-2 gap-2">
                {BENS_RESIDENCIA.map((bem) => (
                  <div key={bem} className="flex items-center gap-2">
                    <Checkbox
                      checked={(dados.bens_residencia || []).includes(bem)}
                      onCheckedChange={() =>
                        handleArrayToggle("bens_residencia", bem)
                      }
                    />
                    <Label className="font-normal cursor-pointer">{bem}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bens de valor</Label>
              <Textarea
                value={dados.bens_valor || ""}
                onChange={(e) => handleChange("bens_valor", e.target.value)}
                placeholder="Descrever e informar origem"
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <Label>Veículos no núcleo familiar</Label>
              <RadioGroup
                value={
                  dados.possui_veiculos === null
                    ? ""
                    : String(dados.possui_veiculos)
                }
                onValueChange={(v) =>
                  handleChange("possui_veiculos", v === "true")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="veic-sim" />
                  <Label
                    htmlFor="veic-sim"
                    className="font-normal cursor-pointer"
                  >
                    Sim
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="veic-nao" />
                  <Label
                    htmlFor="veic-nao"
                    className="font-normal cursor-pointer"
                  >
                    Não
                  </Label>
                </div>
              </RadioGroup>

              {dados.possui_veiculos && (
                <div className="space-y-3">
                  {veiculos.map((veiculo, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 space-y-3 bg-slate-50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">
                          Veículo {index + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removerVeiculo(index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          placeholder="Tipo"
                          value={veiculo.tipo}
                          onChange={(e) =>
                            atualizarVeiculo(index, "tipo", e.target.value)
                          }
                        />
                        <Input
                          placeholder="Marca/Modelo"
                          value={veiculo.marca_modelo}
                          onChange={(e) =>
                            atualizarVeiculo(
                              index,
                              "marca_modelo",
                              e.target.value,
                            )
                          }
                        />
                        <Input
                          type="number"
                          placeholder="Ano"
                          value={veiculo.ano}
                          onChange={(e) =>
                            atualizarVeiculo(
                              index,
                              "ano",
                              parseInt(e.target.value),
                            )
                          }
                        />
                        <Input
                          placeholder="Proprietário"
                          value={veiculo.proprietario}
                          onChange={(e) =>
                            atualizarVeiculo(
                              index,
                              "proprietario",
                              e.target.value,
                            )
                          }
                        />
                        <Input
                          placeholder="Finalidade"
                          value={veiculo.finalidade}
                          onChange={(e) =>
                            atualizarVeiculo(
                              index,
                              "finalidade",
                              e.target.value,
                            )
                          }
                          className="col-span-2"
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={adicionarVeiculo}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Veículo
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Apoio Financeiro Externo */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-slate-700">
              8. Apoio Financeiro Externo
            </h4>
            <div className="space-y-3">
              <Label>Recebe apoio financeiro de terceiros?</Label>
              <RadioGroup
                value={
                  dados.apoio_financeiro_externo === null
                    ? ""
                    : String(dados.apoio_financeiro_externo)
                }
                onValueChange={(v) =>
                  handleChange("apoio_financeiro_externo", v === "true")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="apoio-sim" />
                  <Label
                    htmlFor="apoio-sim"
                    className="font-normal cursor-pointer"
                  >
                    Sim
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="apoio-nao" />
                  <Label
                    htmlFor="apoio-nao"
                    className="font-normal cursor-pointer"
                  >
                    Não
                  </Label>
                </div>
              </RadioGroup>
              {dados.apoio_financeiro_externo && (
                <Textarea
                  value={dados.detalhar_apoio || ""}
                  onChange={(e) =>
                    handleChange("detalhar_apoio", e.target.value)
                  }
                  placeholder="Especificar quem ajuda, frequência e valores. Destacar que ajuda é eventual e de pequeno valor."
                  rows={4}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO: OBSERVAÇÕES */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observações e Orientações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-slate-700">
              10. Atualização CadÚnico
            </h4>
            <div className="space-y-3">
              <Label>Dados do CadÚnico precisam atualização?</Label>
              <RadioGroup
                value={
                  dados.precisa_atualizacao_cadunico === null
                    ? ""
                    : String(dados.precisa_atualizacao_cadunico)
                }
                onValueChange={(v) =>
                  handleChange("precisa_atualizacao_cadunico", v === "true")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="atu-sim" />
                  <Label
                    htmlFor="atu-sim"
                    className="font-normal cursor-pointer"
                  >
                    Sim
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="atu-nao" />
                  <Label
                    htmlFor="atu-nao"
                    className="font-normal cursor-pointer"
                  >
                    Não
                  </Label>
                </div>
              </RadioGroup>
              {dados.precisa_atualizacao_cadunico && (
                <Textarea
                  value={dados.especificar_atualizacao || ""}
                  onChange={(e) =>
                    handleChange("especificar_atualizacao", e.target.value)
                  }
                  placeholder="Especificar atualizações necessárias"
                  rows={2}
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações Gerais do Caso</Label>
            <Textarea
              value={dados.observacoes_gerais || ""}
              onChange={(e) =>
                handleChange("observacoes_gerais", e.target.value)
              }
              placeholder="Estratégias processuais, pontos de atenção, informações sobre ajuda de terceiros, orientações dadas ao cliente"
              rows={6}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
