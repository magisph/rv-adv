import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { User, Save, X, MapPin, Shield } from "lucide-react";

const ESTADOS_CIVIS = {
  solteiro: "Solteiro(a)",
  casado: "Casado(a)",
  uniao_estavel: "União Estável",
  divorciado: "Divorciado(a)",
  viuvo: "Viúvo(a)",
};

const ESCOLARIDADE = {
  analfabeto: "Analfabeto",
  fundamental_incompleto: "Fundamental Incompleto",
  fundamental_completo: "Fundamental Completo",
  medio_incompleto: "Médio Incompleto",
  medio_completo: "Médio Completo",
  superior_incompleto: "Superior Incompleto",
  superior_completo: "Superior Completo",
  pos_graduacao: "Pós-graduação",
};

const ESTADOS_BR = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

export default function ClientForm({ client, onSave, onCancel, isSaving }) {
  const [formData, setFormData] = useState({
    full_name: "",
    cpf_cnpj: "",
    data_nascimento: "",
    rg: "",
    data_emissao_rg: "",
    orgao_expedidor: "",
    estado_civil: "",
    grau_escolaridade: "",
    profissao: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    senha_meu_inss: "",
    inscrito_cadunico: null,
    possui_senha_gov: null,
    possui_biometria: null,
    pedido_anterior_inss: null,
    area: "",
    observations: "",
    status: "ativo",
    ...client,
  });

  const [activeTab, setActiveTab] = useState("pessoais");

  useEffect(() => {
    if (client) {
      setFormData({ ...formData, ...client });
    }
  }, [client]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const formatCPF = (value) => {
    let v = value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    return v;
  };

  const handleCPFChange = (e) => {
    handleChange("cpf_cnpj", formatCPF(e.target.value));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Saneamento de dados antes do save (prevenir 400 Bad Request)
    const payload = { ...formData };

    // Remover campos de controle/leitura ou inexistentes no schema
    delete payload.id;
    delete payload.created_date; // Campo legado
    delete payload.created_at;
    delete payload.updated_at;
    delete payload.created_by; // DB preenche com auth.uid()

    // Garantir status padrão se vazio
    if (!payload.status) payload.status = "ativo";

    // Tratar strings vazias para colunas de data ou com constraints (CHECK)
    const fieldsToNull = [
      "data_nascimento",
      "data_emissao_rg",
      "estado_civil",
      "grau_escolaridade",
      "area",
      "benefit_type"
    ];

    fieldsToNull.forEach(field => {
      if (payload[field] === "") {
        payload[field] = null;
      }
    });

    onSave(payload);
  };

  const calcularIdade = () => {
    if (!formData.data_nascimento) return null;
    const hoje = new Date();
    const nascimento = new Date(formData.data_nascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return idade;
  };

  const idade = calcularIdade();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pessoais" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Dados Pessoais
          </TabsTrigger>
          <TabsTrigger value="endereco" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Endereço
          </TabsTrigger>
          <TabsTrigger
            value="previdenciario"
            className="flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            Preliminares
          </TabsTrigger>
        </TabsList>

        {/* Tab: Dados Pessoais */}
        <TabsContent value="pessoais" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identificação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="full_name">Nome Completo *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleChange("full_name", e.target.value)}
                    required
                    placeholder="Digite o nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf_cnpj">CPF *</Label>
                  <Input
                    id="cpf_cnpj"
                    value={formData.cpf_cnpj}
                    onChange={handleCPFChange}
                    required
                    maxLength={14}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_nascimento">Data de Nascimento *</Label>
                  <Input
                    id="data_nascimento"
                    type="date"
                    value={formData.data_nascimento}
                    onChange={(e) =>
                      handleChange("data_nascimento", e.target.value)
                    }
                    required
                  />
                  {idade !== null && (
                    <p className="text-xs text-slate-500">
                      Idade: {idade} anos
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rg">RG</Label>
                  <Input
                    id="rg"
                    value={formData.rg}
                    onChange={(e) => handleChange("rg", e.target.value)}
                    placeholder="00.000.000-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_emissao_rg">Data de Emissão RG</Label>
                  <Input
                    id="data_emissao_rg"
                    type="date"
                    value={formData.data_emissao_rg}
                    onChange={(e) =>
                      handleChange("data_emissao_rg", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgao_expedidor">Órgão Expedidor</Label>
                  <Input
                    id="orgao_expedidor"
                    value={formData.orgao_expedidor}
                    onChange={(e) =>
                      handleChange("orgao_expedidor", e.target.value)
                    }
                    placeholder="Ex: SSP/SP"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações Pessoais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estado_civil">Estado Civil *</Label>
                  <Select
                    value={formData.estado_civil}
                    onValueChange={(v) => handleChange("estado_civil", v)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o estado civil" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ESTADOS_CIVIS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grau_escolaridade">
                    Grau de Escolaridade
                  </Label>
                  <Select
                    value={formData.grau_escolaridade}
                    onValueChange={(v) => handleChange("grau_escolaridade", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a escolaridade" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ESCOLARIDADE).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profissao">Profissão</Label>
                  <Input
                    id="profissao"
                    value={formData.profissao}
                    onChange={(e) => handleChange("profissao", e.target.value)}
                    placeholder="Digite a profissão"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contato</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    required
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Endereço */}
        <TabsContent value="endereco" className="space-y-6 mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Endereço Completo *</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    required
                    placeholder="Rua, número, complemento"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip_code">CEP</Label>
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => handleChange("zip_code", e.target.value)}
                    placeholder="00000-000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    placeholder="Digite a cidade"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(v) => handleChange("state", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS_BR.map((uf) => (
                        <SelectItem key={uf} value={uf}>
                          {uf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Previdenciário */}
        <TabsContent value="previdenciario" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Informações Preliminares
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="senha_meu_inss">Senha do MEU INSS</Label>
                  <Input
                    id="senha_meu_inss"
                    value={formData.senha_meu_inss}
                    onChange={(e) =>
                      handleChange("senha_meu_inss", e.target.value)
                    }
                    placeholder="Digite a senha do MEU INSS"
                  />
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-3">
                    <Label>É inscrito no Cadastro Único? *</Label>
                    <RadioGroup
                      value={
                        formData.inscrito_cadunico === null
                          ? ""
                          : String(formData.inscrito_cadunico)
                      }
                      onValueChange={(v) =>
                        handleChange("inscrito_cadunico", v === "true")
                      }
                      required
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="cadunico-sim" />
                        <Label
                          htmlFor="cadunico-sim"
                          className="font-normal cursor-pointer"
                        >
                          Sim
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="cadunico-nao" />
                        <Label
                          htmlFor="cadunico-nao"
                          className="font-normal cursor-pointer"
                        >
                          Não
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <Label>Possui a senha GOV? *</Label>
                    <RadioGroup
                      value={
                        formData.possui_senha_gov === null
                          ? ""
                          : String(formData.possui_senha_gov)
                      }
                      onValueChange={(v) =>
                        handleChange("possui_senha_gov", v === "true")
                      }
                      required
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="gov-sim" />
                        <Label
                          htmlFor="gov-sim"
                          className="font-normal cursor-pointer"
                        >
                          Sim
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="gov-nao" />
                        <Label
                          htmlFor="gov-nao"
                          className="font-normal cursor-pointer"
                        >
                          Não
                        </Label>
                      </div>
                    </RadioGroup>
                    {formData.possui_senha_gov && (
                      <div className="space-y-2 mt-3">
                        <Label htmlFor="senha_gov">Senha GOV</Label>
                        <Input
                          id="senha_gov"
                          type="password"
                          value={formData.senha_gov || ""}
                          onChange={(e) =>
                            handleChange("senha_gov", e.target.value)
                          }
                          placeholder="Digite a senha GOV"
                          maxLength={100}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label>Já possui biometria? *</Label>
                    <RadioGroup
                      value={
                        formData.possui_biometria === null
                          ? ""
                          : String(formData.possui_biometria)
                      }
                      onValueChange={(v) =>
                        handleChange("possui_biometria", v === "true")
                      }
                      required
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="bio-sim" />
                        <Label
                          htmlFor="bio-sim"
                          className="font-normal cursor-pointer"
                        >
                          Sim
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="bio-nao" />
                        <Label
                          htmlFor="bio-nao"
                          className="font-normal cursor-pointer"
                        >
                          Não
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <Label>
                      Já ingressou com algum pedido perante o INSS ou na via
                      judicial? *
                    </Label>
                    <RadioGroup
                      value={
                        formData.pedido_anterior_inss === null
                          ? ""
                          : String(formData.pedido_anterior_inss)
                      }
                      onValueChange={(v) =>
                        handleChange("pedido_anterior_inss", v === "true")
                      }
                      required
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="pedido-sim" />
                        <Label
                          htmlFor="pedido-sim"
                          className="font-normal cursor-pointer"
                        >
                          Sim
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="pedido-nao" />
                        <Label
                          htmlFor="pedido-nao"
                          className="font-normal cursor-pointer"
                        >
                          Não
                        </Label>
                      </div>
                    </RadioGroup>
                    {formData.pedido_anterior_inss && (
                      <div className="space-y-3 mt-3">
                        <div className="space-y-2">
                          <Label htmlFor="num_proc_admin">
                            Número do Processo Administrativo (NB)
                          </Label>
                          <Input
                            id="num_proc_admin"
                            value={
                              formData.numero_processo_administrativo || ""
                            }
                            onChange={(e) =>
                              handleChange(
                                "numero_processo_administrativo",
                                e.target.value,
                              )
                            }
                            placeholder="Ex: 123.456.789-0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="num_proc_judicial">
                            Número do Processo Judicial
                          </Label>
                          <Input
                            id="num_proc_judicial"
                            value={formData.numero_processo_judicial || ""}
                            onChange={(e) =>
                              handleChange(
                                "numero_processo_judicial",
                                e.target.value,
                              )
                            }
                            placeholder="Ex: 0000000-00.0000.0.00.0000"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="obs_proc_ant">
                            Observações sobre processos anteriores
                          </Label>
                          <Textarea
                            id="obs_proc_ant"
                            value={
                              formData.observacoes_processos_anteriores || ""
                            }
                            onChange={(e) =>
                              handleChange(
                                "observacoes_processos_anteriores",
                                e.target.value,
                              )
                            }
                            placeholder="Detalhe o andamento, situação atual, resultado, etc."
                            rows={3}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status e Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status do Cliente</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => handleChange("status", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                      <SelectItem value="processo_andamento">
                        Processo em Andamento
                      </SelectItem>
                      <SelectItem value="processo_concluido">
                        Processo Concluído
                      </SelectItem>
                      <SelectItem value="prospecto">Prospecto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observations">Observações</Label>
                  <Textarea
                    id="observations"
                    value={formData.observations}
                    onChange={(e) =>
                      handleChange("observations", e.target.value)
                    }
                    placeholder="Informações adicionais sobre o cliente"
                    rows={4}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t">
        {activeTab === "pessoais" && (
          <>
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
              onClick={() => setActiveTab("endereco")}
            >
              Avançar
            </Button>
          </>
        )}
        {activeTab === "endereco" && (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveTab("pessoais")}
            >
              Voltar
            </Button>
            <Button
              type="button"
              className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
              onClick={() => setActiveTab("previdenciario")}
            >
              Avançar
            </Button>
          </>
        )}
        {activeTab === "previdenciario" && (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveTab("endereco")}
            >
              Voltar
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Salvando..." : "Salvar Cliente"}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
