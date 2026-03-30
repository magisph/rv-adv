import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const TIPOS_IMPEDIMENTO = ["Físico", "Mental", "Intelectual", "Sensorial"];

export default function BPCIdosoForm({ tipoBeneficio, dados, onChange }) {
  const [membros, setMembros] = useState(dados.membros_grupo_familiar || []);

  const handleChange = (field, value) => {
    if (field.includes(".")) {
      const parts = field.split(".");
      let currentData = { ...dados };
      let cursor = currentData;
      
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!cursor[part]) {
          cursor[part] = {};
        } else {
          cursor[part] = { ...cursor[part] };
        }
        cursor = cursor[part];
      }
      
      cursor[parts[parts.length - 1]] = value;
      onChange(currentData);
    } else {
      onChange({ ...dados, [field]: value });
    }
  };

  const handleArrayToggle = (field, value) => {
    if (field.includes(".")) {
      const parts = field.split(".");
      const parent = parts[0];
      const child = parts[1];
      
      const parentObj = dados[parent] || {};
      const current = parentObj[child] || [];
      
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      
      handleChange(field, updated);
    } else {
      const current = dados[field] || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      handleChange(field, updated);
    }
  };

  const calcularIdade = (dataNascimento) => {
    if (!dataNascimento) return null;
    const [ano, mes, dia] = dataNascimento.split("-").map(Number);
    const hoje = new Date();
    let idade = hoje.getFullYear() - ano;
    const mesAtual = hoje.getMonth() + 1;
    if (mesAtual < mes || (mesAtual === mes && hoje.getDate() < dia)) {
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
      estado_civil: "",
      renda_mensal: "",
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
    novosM[index] = { ...novosM[index], [field]: value };
    if (field === "data_nascimento") {
      novosM[index] = { ...novosM[index], idade: calcularIdade(value) };
    }
    setMembros(novosM);
    handleChange("membros_grupo_familiar", novosM);
  };

  const triagem = dados.triagem_elegibilidade || {};
  const cif = dados.cif_pcd || {};
  const rendaDet = dados.renda_detalhada || {};
  const estrategia = dados.estrategia_conclusao || {};

  return (
    <div className="space-y-6">
      <Tabs defaultValue="verificacao" className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-auto rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="verificacao"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-4 py-3 font-semibold"
          >
            VERIFICAÇÃO
          </TabsTrigger>
          <TabsTrigger
            value="grupo_familiar"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-4 py-3 font-semibold"
          >
            GRUPO FAMILIAR
          </TabsTrigger>
          <TabsTrigger
            value="renda"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-4 py-3 font-semibold"
          >
            RENDA
          </TabsTrigger>
          <TabsTrigger
            value="habitacional"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-4 py-3 font-semibold"
          >
            HABITACIONAL
          </TabsTrigger>
          <TabsTrigger
            value="estrategia"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-4 py-3 font-semibold"
          >
            ESTRATÉGIA
          </TabsTrigger>
        </TabsList>

        {/* VERIFICAÇÃO */}
        <TabsContent value="verificacao" className="space-y-6 pt-4">
          <p className="text-xs text-red-500 mt-1.5 flex items-start gap-1.5"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> <span>Responda SIM ou NÃO para cada item. Um NÃO pode ser impeditivo — registrar e avaliar antes de prosseguir.</span></p>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">2.1 — Requisitos comuns (Idoso e PcD)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Reside no Brasil?</Label>
                  <Select
                    value={triagem.reside_brasil || ""}
                    onValueChange={(v) => handleChange("triagem_elegibilidade.reside_brasil", v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sim">Sim</SelectItem>
                      <SelectItem value="Não">Não — INVIÁVEL (art. 6º, II, Port. 34/2025)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>CPF regular e inscrito no CadÚnico?</Label>
                  <Select
                    value={triagem.cpf_cadunico || ""}
                    onValueChange={(v) => handleChange("triagem_elegibilidade.cpf_cadunico", v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sim">Sim</SelectItem>
                      <SelectItem value="CPF regular, sem CadÚnico">CPF regular, sem CadÚnico</SelectItem>
                      <SelectItem value="CadÚnico desatualizado (>24m)">CadÚnico desatualizado (&gt;24m)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Recebe benefício da seguridade social?</Label>
                  <Input 
                    placeholder="Não ou qual benefício?" 
                    value={triagem.recebe_beneficio || ""}
                    onChange={(e) => handleChange("triagem_elegibilidade.recebe_beneficio", e.target.value)}
                  />
                  <p className="text-xs text-red-500 mt-1.5 flex items-start gap-1.5"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> <span>Se SIM: verificar se é vedado — art. 20, §4º, LOAS. Exceções: Bolsa Família, Auxílio-Gás, assistência médica</span></p>
                </div>

                <div className="space-y-2">
                  <Label>Possui vínculo empregatício ativo (CTPS/CNIS)?</Label>
                  <Select
                    value={triagem.vinculo_ativo || ""}
                    onValueChange={(v) => handleChange("triagem_elegibilidade.vinculo_ativo", v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Não">Não</SelectItem>
                      <SelectItem value="Sim">Sim</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-red-500 mt-1.5 flex items-start gap-1.5"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> <span>Vínculo ativo pode elevar a renda. Verificar CNIS de todos os membros.</span></p>
                </div>
              </div>
              
              {triagem.vinculo_ativo === "Sim" && (
                <div className="space-y-2">
                  <Label>Detalhes do Vínculo: empresa, cargo, remuneração</Label>
                  <Textarea 
                    value={triagem.detalhes_vinculo || ""}
                    onChange={(e) => handleChange("triagem_elegibilidade.detalhes_vinculo", e.target.value)}
                    rows={2}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {tipoBeneficio === "bpc_loas_idoso" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">2.2 — Requisito pessoal: IDOSO</CardTitle>
                <CardDescription>Necessário ter ≥ 65 anos na data do requerimento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Documento comprobatório da idade</Label>
                    <Input 
                      value={triagem.doc_idade || ""}
                      onChange={(e) => handleChange("triagem_elegibilidade.doc_idade", e.target.value)}
                    />
                    <p className="text-xs text-red-500 mt-1.5 flex items-start gap-1.5"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> <span>Necessário ter ≥ 65 anos na data do requerimento — art. 20, caput, LOAS</span></p>
                  </div>
                  <div className="space-y-2">
                    <Label>Tem direito a aposentadoria pelo INSS?</Label>
                    <Select
                      value={triagem.direito_aposentadoria || ""}
                      onValueChange={(v) => handleChange("triagem_elegibilidade.direito_aposentadoria", v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Não">Não</SelectItem>
                        <SelectItem value="Sim">Sim — avaliar qual é mais vantajoso</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-red-500 mt-1.5 flex items-start gap-1.5"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> <span>Se sim: comparar valor esperado da aposentadoria com o BPC (1 SM). Planejar estratégia antes do protocolo.</span></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {tipoBeneficio === "bpc_loas_pcd" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">2.3 — Requisito pessoal: PcD — Pessoa com Deficiência</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Diagnóstico(s) principal(is) — CID-10 ou CID-11</Label>
                      <Input 
                        value={triagem.diagnosticos || ""}
                        onChange={(e) => handleChange("triagem_elegibilidade.diagnosticos", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Especialidade médica e médico assistente</Label>
                      <Input 
                        value={triagem.medico_assistente || ""}
                        onChange={(e) => handleChange("triagem_elegibilidade.medico_assistente", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quando surgiram os sintomas / primeira consulta?</Label>
                      <Input 
                        value={triagem.inicio_sintomas || ""}
                        onChange={(e) => handleChange("triagem_elegibilidade.inicio_sintomas", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Existe há ≥ 2 anos ou esperado que dure ≥ 2 anos?</Label>
                      <Select
                        value={triagem.impedimento_longo_prazo || ""}
                        onValueChange={(v) => handleChange("triagem_elegibilidade.impedimento_longo_prazo", v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sim">Sim</SelectItem>
                          <SelectItem value="Não">Não</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-red-500 mt-1.5 flex items-start gap-1.5"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> <span>Impedimento de longo prazo: efeitos por ≥ 2 anos — art. 20, §10, Lei 8.742/1993</span></p>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Natureza do impedimento</Label>
                      <Input 
                        value={triagem.natureza_impedimento || ""}
                        onChange={(e) => handleChange("triagem_elegibilidade.natureza_impedimento", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Tipo do impedimento (art. 20, §2º, LOAS)</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                        {TIPOS_IMPEDIMENTO.map((tipo) => (
                          <div key={tipo} className="flex items-center gap-2">
                            <Checkbox
                              checked={(triagem.tipos_impedimento || []).includes(tipo)}
                              onCheckedChange={() => handleArrayToggle("triagem_elegibilidade.tipos_impedimento", tipo)}
                            />
                            <Label className="font-normal cursor-pointer">{tipo}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">2.4 — Impacto funcional e barreiras (BPC PcD — modelo CIF)</CardTitle>
                  <CardDescription>
                    Descrever o que o impedimento IMPEDE ou DIFICULTA — não apenas o diagnóstico.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Autocuidado (banho, vestimenta, alimentação)</Label>
                      <Textarea 
                        value={cif.autocuidado || ""}
                        onChange={(e) => handleChange("cif_pcd.autocuidado", e.target.value)}
                        placeholder="O que não consegue fazer?"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mobilidade (locomoção, transporte público)</Label>
                      <Textarea 
                        value={cif.mobilidade || ""}
                        onChange={(e) => handleChange("cif_pcd.mobilidade", e.target.value)}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Comunicação, fala, compreensão verbal</Label>
                      <Input 
                        value={cif.comunicacao || ""}
                        onChange={(e) => handleChange("cif_pcd.comunicacao", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cognição: memória, atenção, decisões</Label>
                      <Input 
                        value={cif.cognicao || ""}
                        onChange={(e) => handleChange("cif_pcd.cognicao", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Interação social, atividades comunitárias</Label>
                      <Input 
                        value={cif.interacao_social || ""}
                        onChange={(e) => handleChange("cif_pcd.interacao_social", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Capacidade de trabalhar ou frequentar escola</Label>
                      <Input 
                        value={cif.capacidade_trabalho || ""}
                        onChange={(e) => handleChange("cif_pcd.capacidade_trabalho", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Barreiras físicas, atitudinais ou de acesso a serviços</Label>
                      <Textarea 
                        value={cif.barreiras || ""}
                        onChange={(e) => handleChange("cif_pcd.barreiras", e.target.value)}
                        rows={2}
                      />
                    </div>
                    
                    <div className="space-y-2 mt-2">
                      <Label>Necessita de cuidador?</Label>
                      <Select
                        value={cif.necessita_cuidador || ""}
                        onValueChange={(v) => handleChange("cif_pcd.necessita_cuidador", v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Não">Não</SelectItem>
                          <SelectItem value="Sim, informal (familiar)">Sim, informal (familiar)</SelectItem>
                          <SelectItem value="Sim, formal (contratado)">Sim, formal (contratado)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {cif.necessita_cuidador?.includes("Sim") && (
                      <div className="space-y-2">
                        <Label>Cuidador: Frequência, atividades e custo mensal (R$)</Label>
                        <Input 
                          value={cif.detalhes_cuidador || ""}
                          onChange={(e) => handleChange("cif_pcd.detalhes_cuidador", e.target.value)}
                        />
                      </div>
                    )}
                    
                    <div className="space-y-2 md:col-span-2">
                      <Label>Tratamentos em curso: tipo, local, frequência</Label>
                      <Textarea 
                        value={cif.tratamentos_curso || ""}
                        onChange={(e) => handleChange("cif_pcd.tratamentos_curso", e.target.value)}
                        rows={2}
                      />
                    </div>
                    
                    <div className="space-y-2 md:col-span-2">
                      <Label>Medicamentos contínuos: nome, SUS ou comprado?</Label>
                      <Textarea 
                        value={cif.medicamentos_continuos || ""}
                        onChange={(e) => handleChange("cif_pcd.medicamentos_continuos", e.target.value)}
                        rows={2}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Custo mensal com medicamentos não SUS (R$)</Label>
                      <Input 
                        type="number"
                        step="0.01"
                        value={cif.custo_medicamentos || ""}
                        onChange={(e) => handleChange("cif_pcd.custo_medicamentos", parseFloat(e.target.value) || "")}
                      />
                      <p className="text-xs text-red-500 mt-1.5 flex items-start gap-1.5"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> <span>Atenção: será deduzido da renda se não fornecido pelo SUS — art. 8º, §4º, Port. 34/2025</span></p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Para crianças/adolescentes: freq. escolar, AEE, relatórios?</Label>
                      <Input 
                        value={cif.escolaridade_crianca || ""}
                        onChange={(e) => handleChange("cif_pcd.escolaridade_crianca", e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* GRUPO FAMILIAR */}
        <TabsContent value="grupo_familiar" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bloco 3 — Composição do Grupo Familiar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-red-500 mt-1.5 flex items-start gap-1.5"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> <span>Membro casado, em união estável, divorciado, separado ou viúvo NÃO integra o grupo familiar — art. 7º, §1º, II, Port. 34/2025. Cônjuge separado de fato sem divórcio também NÃO integra se não viver no mesmo teto (produzir Declaração).</span></p>

              <div className="space-y-4">
                {membros.map((membro, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Membro {index + 1}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removerMembro(index)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Nome Completo</Label>
                        <Input value={membro.nome} onChange={(e) => atualizarMembro(index, "nome", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>CPF</Label>
                        <Input value={membro.cpf} onChange={(e) => atualizarMembro(index, "cpf", e.target.value)} placeholder="000.000.000-00" />
                      </div>
                      <div className="space-y-2">
                        <Label>Parentesco</Label>
                        <Select value={membro.parentesco} onValueChange={(v) => atualizarMembro(index, "parentesco", v)}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {PARENTESCOS.map((p) => (
                              <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Data de Nascimento</Label>
                        <Input type="date" value={membro.data_nascimento} onChange={(e) => atualizarMembro(index, "data_nascimento", e.target.value)} />
                        {membro.idade !== null && <p className="text-xs text-slate-600">Idade: {membro.idade} anos</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Estado Civil</Label>
                        <Input value={membro.estado_civil || ""} onChange={(e) => atualizarMembro(index, "estado_civil", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Renda mensal (R$)</Label>
                        <Input type="number" step="0.01" value={membro.renda_mensal || ""} onChange={(e) => atualizarMembro(index, "renda_mensal", e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={adicionarMembro} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Membro no Grupo Familiar
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Membro em Instituição de Longa Permanência?</Label>
                  <Select value={dados.membro_internado || ""} onValueChange={(v) => handleChange("membro_internado", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Não">Não</SelectItem>
                      <SelectItem value="Sim">Sim (excluir do grupo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cônjuge separado de fato mora fora?</Label>
                  <Select value={dados.conjuge_separado || ""} onValueChange={(v) => handleChange("conjuge_separado", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Não se aplica">Não se aplica</SelectItem>
                      <SelectItem value="Sim">Sim (produzir Declaração)</SelectItem>
                      <SelectItem value="Não">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Observações sobre composição atípica</Label>
                  <Textarea value={dados.obs_composicao_familiar || ""} onChange={(e) => handleChange("obs_composicao_familiar", e.target.value)} rows={2} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RENDA */}
        <TabsContent value="renda" className="space-y-6 pt-4">
          <p className="text-xs text-red-500 mt-1.5 flex items-start gap-1.5"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> <span>Registrar TODAS as fontes de renda, inclusive informais. Rendas informais declaradas no CadÚnico devem ser computadas — art. 8º, §2º, Port. 34/2025. Ajuda de terceiros deve ser declarada como eventual/sazonal/pequeno valor.</span></p>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bloco 4 — Apuração da Renda Familiar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="space-y-4">
                <h4 className="font-semibold text-sm">4.1 — CadÚnico e Fontes de Renda</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-md">
                  <div className="space-y-2">
                    <Label>Cadastro Único atualizado?</Label>
                    <Select
                      value={dados.cadunico_atualizado === null ? "" : String(dados.cadunico_atualizado)}
                      onValueChange={(v) => handleChange("cadunico_atualizado", v === "true")}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Sim</SelectItem>
                        <SelectItem value="false">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Última atualização (data)</Label>
                    <Input type="date" value={rendaDet.data_cadunico || ""} onChange={(e) => handleChange("renda_detalhada.data_cadunico", e.target.value)} />
                    <p className="text-xs text-red-500 mt-1.5 flex items-start gap-1.5"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> <span>Deve ser ≤ 24 meses. Se desatualizado, providenciar ANTES do protocolo — art. 19, Port. 34/2025</span></p>
                  </div>
                  <div className="space-y-2">
                    <Label>Número de membros no CadÚnico</Label>
                    <Input type="number" value={dados.num_membros_cadunico ?? ""} onChange={(e) => handleChange("num_membros_cadunico", parseInt(e.target.value, 10))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Renda declarada no CadÚnico (R$)</Label>
                    <Input type="number" step="0.01" value={dados.renda_declarada_cadunico ?? ""} onChange={(e) => handleChange("renda_declarada_cadunico", parseFloat(e.target.value))} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Algum membro recebe BPC ou benefício prev. ≤ 1 SM (≥65 anos ou PcD)?</Label>
                  <Select value={rendaDet.exclusao_legal || ""} onValueChange={(v) => handleChange("renda_detalhada.exclusao_legal", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Não">Não</SelectItem>
                      <SelectItem value="Sim">Sim (EXCLUIR do cálculo - art. 20, §14)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-red-500 mt-1.5 flex items-start gap-1.5"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> <span>Este é um dos principais ajustes que pode viabilizar o BPC. Identificar com precisão.</span></p>
                </div>

                <div className="space-y-2">
                  <Label>Ajuda de terceiros (quem, quanto, frequência)</Label>
                  <Textarea 
                    value={rendaDet.ajuda_terceiros || ""} 
                    onChange={(e) => handleChange("renda_detalhada.ajuda_terceiros", e.target.value)} 
                    placeholder="Quem ajuda e valores"
                    rows={2} 
                  />
                  <p className="text-xs text-red-500 mt-1.5 flex items-start gap-1.5"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> <span>Declarar como eventual, sazonal e de pequeno valor. Produzir Declaração de Ajuda de Terceiros (Modelo M-02 do Manual).</span></p>
                </div>

                <div className="space-y-2">
                  <Label>Família recebe Bolsa Família ou Auxílio-Gás?</Label>
                  <Select value={rendaDet.recebe_bolsa_familia || ""} onValueChange={(v) => handleChange("renda_detalhada.recebe_bolsa_familia", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Não">Não</SelectItem>
                      <SelectItem value="Sim">Sim (Não integra renda)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-semibold text-sm">4.2 — Deduções Admitidas</h4>
                <p className="text-xs text-red-500 mt-1.5 flex items-start gap-1.5"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> <span>Se os gastos efetivos superarem os valores padrão do Anexo I, apresentar recibos dos últimos 12 meses para deduzir o valor real — art. 8º, §7º, Port. 34/2025. A negativa formal do SUS é INDISPENSÁVEL para cada categoria.</span></p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Medicamentos (Não SUS)</Label>
                    <Input type="number" placeholder="Valor R$" value={rendaDet.deducao_medicamentos || ""} onChange={(e) => handleChange("renda_detalhada.deducao_medicamentos", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Consultas/tratamentos</Label>
                    <Input type="number" placeholder="Valor R$" value={rendaDet.deducao_consultas || ""} onChange={(e) => handleChange("renda_detalhada.deducao_consultas", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fraldas</Label>
                    <Input type="number" placeholder="Valor R$" value={rendaDet.deducao_fraldas || ""} onChange={(e) => handleChange("renda_detalhada.deducao_fraldas", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Alimentação especial</Label>
                    <Input type="number" placeholder="Valor R$" value={rendaDet.deducao_alimentacao || ""} onChange={(e) => handleChange("renda_detalhada.deducao_alimentacao", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Centro-Dia</Label>
                    <Input type="number" placeholder="Valor R$" value={rendaDet.deducao_centro_dia || ""} onChange={(e) => handleChange("renda_detalhada.deducao_centro_dia", e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-semibold text-sm">4.3 — Cálculo da Renda per capita</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Renda bruta total do grupo familiar</Label>
                    <Input type="number" value={rendaDet.calc_renda_bruta || ""} onChange={(e) => handleChange("renda_detalhada.calc_renda_bruta", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>(-) Exclusões legais (R$)</Label>
                    <Input type="number" value={rendaDet.calc_exclusoes || ""} onChange={(e) => handleChange("renda_detalhada.calc_exclusoes", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>(-) Total das deduções (R$)</Label>
                    <Input type="number" value={rendaDet.calc_deducoes || ""} onChange={(e) => handleChange("renda_detalhada.calc_deducoes", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Renda líq. computável (R$)</Label>
                    <Input type="number" value={rendaDet.calc_renda_liquida || ""} onChange={(e) => handleChange("renda_detalhada.calc_renda_liquida", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Renda per capita final (R$)</Label>
                    <Input type="number" value={rendaDet.calc_renda_per_capita || ""} onChange={(e) => handleChange("renda_detalhada.calc_renda_per_capita", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Atende critério (≤ 1/4 SM)?</Label>
                    <Select value={rendaDet.atende_criterio || ""} onValueChange={(v) => handleChange("renda_detalhada.atende_criterio", v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sim">Sim</SelectItem>
                        <SelectItem value="Não">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* HABITACIONAL */}
        <TabsContent value="habitacional" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bloco 5 — Situação Habitacional e Patrimônio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Situação do Imóvel</Label>
                  <Select value={dados.origem_residencia || ""} onValueChange={(v) => handleChange("origem_residencia", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="propria">Próprio quitado</SelectItem>
                      <SelectItem value="financiado">Próprio financiado</SelectItem>
                      <SelectItem value="alugada">Alugado</SelectItem>
                      <SelectItem value="emprestada">Cedido gratuitamente</SelectItem>
                      <SelectItem value="posse">Ocupação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {dados.origem_residencia === "alugada" && (
                  <div className="space-y-2">
                    <Label>Valor do aluguel / Recibos</Label>
                    <Input value={dados.valor_aluguel || ""} onChange={(e) => handleChange("valor_aluguel", e.target.value)} placeholder="R$ ... tem contrato?" />
                    <p className="text-xs text-red-500 mt-1.5 flex items-start gap-1.5"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> <span>Solicitar recibos retroativos — comprovam despesa real e condição de miserabilidade</span></p>
                  </div>
                )}
                
                <div className="space-y-2 md:col-span-2">
                  <Label>Condições do imóvel (cômodos, água, esgoto)</Label>
                  <Textarea value={dados.condicoes_imovel || ""} onChange={(e) => handleChange("condicoes_imovel", e.target.value)} rows={2} />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label>Bens Móveis Relevantes (veículos, eletro de valor)</Label>
                  <Textarea value={dados.bens_valor || ""} onChange={(e) => handleChange("bens_valor", e.target.value)} rows={2} />
                  <p className="text-xs text-red-500 mt-1.5 flex items-start gap-1.5"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> <span>Registrar a origem de cada bem (herança, doação, compra parcelada)</span></p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Imóveis além da moradia (requerente ou cônjuge)</Label>
                  <Input value={dados.outros_imoveis || ""} onChange={(e) => handleChange("outros_imoveis", e.target.value)} />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label>Observações sobre patrimônio e condições de vida</Label>
                  <Textarea value={dados.observacoes_patrimonio || ""} onChange={(e) => handleChange("observacoes_patrimonio", e.target.value)} rows={3} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ESTRATÉGIA */}
        <TabsContent value="estrategia" className="space-y-6 pt-4">
          <p className="text-xs text-red-500 mt-1.5 flex items-start gap-1.5"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> <span>Registre aqui tudo que ainda precisa ser providenciado antes do protocolo. Cada pendência pode impactar a viabilidade ou os retroativos — Tema STJ 1.124.</span></p>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bloco 7 e 8 — Estratégia e Documentações Pendentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-sm">Documentos Pendentes e Providências</h4>
                <Textarea 
                  value={estrategia.pendencias || ""} 
                  onChange={(e) => handleChange("estrategia_conclusao.pendencias", e.target.value)} 
                  placeholder="Liste documentos a pedir ao INSS, ao cliente ou providenciar (Ex: Declaração de separação de fato)"
                  rows={4} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Viabilidade administrativa (INSS)</Label>
                  <Select value={estrategia.viabilidade_adm || ""} onValueChange={(v) => handleChange("estrategia_conclusao.viabilidade_adm", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Alta">Alta</SelectItem>
                      <SelectItem value="Média">Média</SelectItem>
                      <SelectItem value="Baixa">Baixa (ajuizar direto)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Viabilidade judicial</Label>
                  <Select value={estrategia.viabilidade_jud || ""} onValueChange={(v) => handleChange("estrategia_conclusao.viabilidade_jud", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Alta">Alta</SelectItem>
                      <SelectItem value="Média">Média</SelectItem>
                      <SelectItem value="Baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label>Próxima etapa recomendada</Label>
                  <Select value={estrategia.proxima_etapa || ""} onValueChange={(v) => handleChange("estrategia_conclusao.proxima_etapa", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ProtocoloINSS">Protocolo administrativo (INSS)</SelectItem>
                      <SelectItem value="AguardarDocumentos">Aguardar documentos pendentes</SelectItem>
                      <SelectItem value="Ajuizamento">Ajuizamento direto</SelectItem>
                      <SelectItem value="RecursoCRPS">Recurso ao CRPS (indeferimento já ocorreu)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label>Fundamentação da estratégia (pontos fortes e de atenção)</Label>
                  <Textarea value={estrategia.fundamentacao || ""} onChange={(e) => handleChange("estrategia_conclusao.fundamentacao", e.target.value)} rows={4} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
      </Tabs>
    </div>
  );
}
