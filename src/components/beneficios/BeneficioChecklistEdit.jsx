import React, { useState } from "react";
import { aiService } from "@/services/aiService";

import { useMutation } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  MessageSquare,
  Upload,
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  ExternalLink,
  X,
} from "lucide-react";

const CHECKLISTS = {
  bpc_loas_idoso: [
    {
      id: "rg_cpf_cliente",
      label: "RG e CPF do Cliente",
      categoria: "Documentos do Cliente",
    },
    {
      id: "comprovante_residencia",
      label: "Comprovante de residência (ou declaração se não titular)",
      categoria: "Documentos do Cliente",
    },
    {
      id: "procuracao",
      label:
        "Procuração (normal / à rogo se analfabeto / com representação se menor)",
      categoria: "Documentos do Cliente",
    },
    {
      id: "contrato_assinado",
      label: "Contrato assinado",
      categoria: "Documentos do Cliente",
    },
    {
      id: "cadunico",
      label: "Cadastro Único (CadÚnico) - Verificar no Meu CadÚnico",
      categoria: "Documentos do Cliente",
    },
    {
      id: "comprovante_programas",
      label: "Comprovante Bolsa Família / Vale Gás / Outros programas sociais",
      categoria: "Documentos do Cliente",
    },
    {
      id: "comprovante_biometria",
      label:
        "Comprovante de biometria (Certidão TRE / 2ª via Título Eleitoral / Carteira de identidade)",
      categoria: "Documentos do Cliente",
    },
    {
      id: "ctps_cliente",
      label:
        "CTPS (comprovar ausência de anotação, encerrar vínculos, demonstrar atividades anteriores)",
      categoria: "Documentos do Cliente",
    },

    {
      id: "docs_membros",
      label: "Documentos pessoais de todos os membros (RG e CPF)",
      categoria: "Documentos do Grupo Familiar",
    },
    {
      id: "cnis_membros",
      label: "CNIS dos membros do grupo familiar",
      categoria: "Documentos do Grupo Familiar",
    },
    {
      id: "declaracao_familiar",
      label: "Declaração de composição familiar",
      categoria: "Documentos do Grupo Familiar",
    },
    {
      id: "certidao_divorcio",
      label:
        "Se separado: Certidão de divórcio ou Declaração de separação de fato",
      categoria: "Documentos do Grupo Familiar",
    },

    {
      id: "desp_alimentacao",
      label: "Alimentação",
      categoria: "Comprovantes de Despesas",
    },
    {
      id: "desp_educacao",
      label: "Educação (reforço escolar, escola particular)",
      categoria: "Comprovantes de Despesas",
    },
    {
      id: "desp_transporte",
      label: "Transporte (área rural, tratamentos médicos)",
      categoria: "Comprovantes de Despesas",
    },
    {
      id: "desp_vestuario",
      label: "Vestuário",
      categoria: "Comprovantes de Despesas",
    },
    {
      id: "desp_higiene",
      label: "Higiene pessoal (fraldas, produtos de higiene)",
      categoria: "Comprovantes de Despesas",
    },
    {
      id: "desp_tratamento",
      label: "Tratamento médico (terapias, exames, consultas)",
      categoria: "Comprovantes de Despesas",
    },
    {
      id: "desp_medicamentos",
      label: "Medicamentos (receitas e orçamentos)",
      categoria: "Comprovantes de Despesas",
    },
    {
      id: "desp_alimentacao_especial",
      label: "Alimentação especial",
      categoria: "Comprovantes de Despesas",
    },

    {
      id: "fotos_residencia",
      label: "Fotos da residência",
      categoria: "Outros Documentos",
    },
    {
      id: "contrato_aluguel",
      label: "Contrato de aluguel (se aplicável)",
      categoria: "Outros Documentos",
    },
    {
      id: "recibos_retroativos",
      label: "Recibos de despesas retroativos",
      categoria: "Outros Documentos",
    },
  ],
  bpc_loas_pcd: [
    { id: "doc_identificacao", label: "Documento de Identificação (RG/CPF)" },
    { id: "laudo_medico", label: "Laudo Médico Atualizado" },
    { id: "comprovante_residencia", label: "Comprovante de Residência" },
    { id: "inscricao_cadunico", label: "Inscrição no CadÚnico" },
    { id: "comprovantes_renda", label: "Comprovantes de Renda Familiar" },
    { id: "exames_complementares", label: "Exames Complementares" },
  ],
  aposentadoria_idade_rural: [
    { id: "rg", label: "RG", categoria: "Documentos Pessoais" },
    { id: "cpf", label: "CPF", categoria: "Documentos Pessoais" },
    { id: "cnh", label: "CNH (se possuir)", categoria: "Documentos Pessoais" },
    {
      id: "comprovante_residencia",
      label: "Comprovante de residência (ou declaração se não titular)",
      categoria: "Documentos Pessoais",
    },
    { id: "procuracao", label: "Procuração", categoria: "Documentos Pessoais" },
    {
      id: "termo_representacao",
      label: "Termo de Representação",
      categoria: "Documentos Pessoais",
    },
    {
      id: "contrato_assinado",
      label: "Contrato assinado",
      categoria: "Documentos Pessoais",
    },

    {
      id: "cadunico",
      label: "Cadastro Único (CadÚnico) atualizado",
      categoria: "Documentos Familiares",
    },
    {
      id: "docs_grupo_familiar",
      label: "Documentos do grupo familiar (CPF/RG/Certidão de Nascimento)",
      categoria: "Documentos Familiares",
    },
    {
      id: "certidao_casamento",
      label: "Certidão de Casamento",
      categoria: "Documentos Familiares",
    },
    {
      id: "certidao_divorcio",
      label:
        "Se separado: Certidão de divórcio ou Declaração de separação de fato",
      categoria: "Documentos Familiares",
    },

    {
      id: "ctps",
      label:
        "CTPS (demonstrar ausência de vínculos urbanos ou vínculos encerrados)",
      categoria: "Documentos Rurais",
    },
    {
      id: "doc_terra",
      label: "Documento da terra (escritura, contrato de arrendamento, etc.)",
      categoria: "Documentos Rurais",
    },
    {
      id: "dap",
      label: "DAP (Declaração de Aptidão ao Pronaf)",
      categoria: "Documentos Rurais",
    },
    {
      id: "caf",
      label: "CAF (Cadastro de Atividade Rural)",
      categoria: "Documentos Rurais",
    },
    {
      id: "seguro_safra",
      label: "Comprovante de Seguro Safra",
      categoria: "Documentos Rurais",
    },
    {
      id: "emprestimo_rural",
      label: "Comprovante de empréstimo rural",
      categoria: "Documentos Rurais",
    },
    {
      id: "notas_fiscais",
      label: "Notas fiscais de produtor rural",
      categoria: "Documentos Rurais",
    },
    {
      id: "itr",
      label: "Comprovante de pagamento de ITR",
      categoria: "Documentos Rurais",
    },
    {
      id: "contrato_arrendamento",
      label: "Contrato de arrendamento/parceria/meação",
      categoria: "Documentos Rurais",
    },
    {
      id: "certidao_imovel_rural",
      label: "Certidão de Imóvel Rural",
      categoria: "Documentos Rurais",
    },
    {
      id: "declaracao_sindicato",
      label: "Declaração do Sindicato dos Trabalhadores Rurais",
      categoria: "Documentos Rurais",
    },
    {
      id: "carteira_sindical",
      label: "Carteira de filiação sindical",
      categoria: "Documentos Rurais",
    },
    {
      id: "contrib_sindical",
      label: "Comprovante de pagamento de contribuição sindical",
      categoria: "Documentos Rurais",
    },
    {
      id: "declaracao_vizinhos",
      label: "Declaração de vizinhos/proprietários de terra",
      categoria: "Documentos Rurais",
    },

    {
      id: "beneficio_conjuge",
      label: "Comprovante de benefício previdenciário do cônjuge",
      categoria: "Documentos do Cônjuge",
    },
    {
      id: "ctps_conjuge",
      label: "CTPS do cônjuge",
      categoria: "Documentos do Cônjuge",
    },
    {
      id: "cnis_conjuge",
      label: "CNIS do cônjuge",
      categoria: "Documentos do Cônjuge",
    },
  ],
  aposentadoria_idade_urbano: [
    { id: "doc_identificacao", label: "Documento de Identificação (RG/CPF)" },
    { id: "ctps", label: "Carteira de Trabalho (todas as páginas)" },
    { id: "cnis", label: "CNIS Atualizado" },
    { id: "carnês_contribuicao", label: "Carnês de Contribuição (se houver)" },
    { id: "certidao_casamento", label: "Certidão de Casamento/Nascimento" },
  ],
  incapacidade_rural: [
    { id: "rg", label: "RG", categoria: "Documentos Pessoais" },
    { id: "cpf", label: "CPF", categoria: "Documentos Pessoais" },
    {
      id: "comprovante_residencia",
      label: "Comprovante de residência (ou declaração se não titular)",
      categoria: "Documentos Pessoais",
    },
    {
      id: "procuracao",
      label: "Procuração (normal / à rogo se analfabeto)",
      categoria: "Documentos Pessoais",
    },
    {
      id: "contrato_assinado",
      label: "Contrato assinado",
      categoria: "Documentos Pessoais",
    },

    {
      id: "cadunico",
      label: "Cadastro Único (CadÚnico) - Analisar vulnerabilidade social",
      categoria: "Documentos Sociais",
    },
    {
      id: "ctps_sem_anotacao",
      label: "CTPS (comprovar ausência de anotação, encerrar vínculos)",
      categoria: "Documentos Sociais",
    },
    {
      id: "seguro_desemprego",
      label: "Comprovante de recebimento de Seguro-Desemprego (se houver)",
      categoria: "Documentos Sociais",
    },

    {
      id: "laudo_atual",
      label: "Laudo médico atual",
      categoria: "Laudos e Atestados",
    },
    {
      id: "laudos_anteriores",
      label: "Laudos médicos anteriores (listar datas)",
      categoria: "Laudos e Atestados",
    },
    {
      id: "atestados",
      label: "Atestados médicos",
      categoria: "Laudos e Atestados",
    },

    {
      id: "exames_imagem",
      label: "Exames de imagem (raio-x, tomografia, ressonância, ultrassom)",
      categoria: "Exames (com Laudos)",
    },
    {
      id: "exames_laboratoriais",
      label: "Exames laboratoriais",
      categoria: "Exames (com Laudos)",
    },
    {
      id: "exames_especificos",
      label: "Outros exames específicos",
      categoria: "Exames (com Laudos)",
    },

    {
      id: "ficha_internacao",
      label: "Ficha de internação",
      categoria: "Documentos Hospitalares",
    },
    {
      id: "relatorio_alta",
      label: "Relatório de alta hospitalar",
      categoria: "Documentos Hospitalares",
    },
    {
      id: "ficha_emergencial",
      label: "Ficha de atendimento emergencial",
      categoria: "Documentos Hospitalares",
    },
    {
      id: "prontuarios",
      label: "Prontuários hospitalares",
      categoria: "Documentos Hospitalares",
    },

    {
      id: "receitas_atuais",
      label: "Receitas atuais",
      categoria: "Receitas Médicas",
    },
    {
      id: "receitas_antigas",
      label: "Receitas antigas (demonstrar continuidade)",
      categoria: "Receitas Médicas",
    },

    {
      id: "rel_fisio",
      label: "Relatório de fisioterapia",
      categoria: "Relatórios de Acompanhamento",
    },
    {
      id: "rel_psico",
      label: "Relatório de psicólogo/psiquiatra",
      categoria: "Relatórios de Acompanhamento",
    },
    {
      id: "rel_fono",
      label: "Relatório de fonoaudiólogo",
      categoria: "Relatórios de Acompanhamento",
    },
    {
      id: "rel_to",
      label: "Relatório de terapeuta ocupacional",
      categoria: "Relatórios de Acompanhamento",
    },
    {
      id: "rel_psicopedagogo",
      label: "Relatório de psicopedagogo",
      categoria: "Relatórios de Acompanhamento",
    },
    {
      id: "rel_escolar",
      label: "Relatório escolar (se aplicável - PCD)",
      categoria: "Relatórios de Acompanhamento",
    },

    {
      id: "docs_grupo_familiar",
      label: "Documentos do grupo familiar (CPF/RG/Certidão de Nascimento)",
      categoria: "Documentos Familiares",
    },
    {
      id: "certidao_casamento",
      label: "Certidão de Casamento",
      categoria: "Documentos Familiares",
    },
    {
      id: "certidao_divorcio",
      label:
        "Se separado: Certidão de divórcio ou Declaração de separação de fato",
      categoria: "Documentos Familiares",
    },

    {
      id: "ctps_rural",
      label: "CTPS (evidenciar vínculos rurais e ausência de vínculos urbanos)",
      categoria: "Documentos Rurais",
    },
    {
      id: "doc_terra",
      label: "Documento da terra ou documento do proprietário da terra",
      categoria: "Documentos Rurais",
    },
    {
      id: "emprestimo_rural",
      label: "Comprovante de empréstimo rural",
      categoria: "Documentos Rurais",
    },
    {
      id: "caf",
      label: "CAF (Cadastro de Atividade Rural)",
      categoria: "Documentos Rurais",
    },
    {
      id: "dap",
      label: "DAP (Declaração de Aptidão ao Pronaf)",
      categoria: "Documentos Rurais",
    },
    {
      id: "seguro_safra",
      label: "Comprovante de Seguro Safra",
      categoria: "Documentos Rurais",
    },
    {
      id: "beneficio_conjuge",
      label: "Comprovante de benefício previdenciário do cônjuge (se houver)",
      categoria: "Documentos Rurais",
    },
    {
      id: "ctps_conjuge",
      label: "CTPS do cônjuge",
      categoria: "Documentos Rurais",
    },
    {
      id: "cnis_conjuge",
      label: "CNIS do cônjuge",
      categoria: "Documentos Rurais",
    },
  ],
  incapacidade_urbano: [
    { id: "doc_identificacao", label: "Documento de Identificação (RG/CPF)" },
    { id: "laudos_medicos", label: "Laudos Médicos" },
    { id: "receitas_exames", label: "Receitas e Exames" },
    { id: "cat", label: "CAT (se acidente de trabalho)" },
    { id: "ctps", label: "Carteira de Trabalho" },
    { id: "cnis", label: "CNIS Atualizado" },
  ],
  salario_maternidade_rural: [
    { id: "rg", label: "RG", categoria: "Documentos Pessoais da Requerente" },
    { id: "cpf", label: "CPF", categoria: "Documentos Pessoais da Requerente" },
    {
      id: "comprovante_residencia",
      label: "Comprovante de residência (ou declaração se não titular)",
      categoria: "Documentos Pessoais da Requerente",
    },
    {
      id: "procuracao",
      label: "Procuração (à rogo se analfabeta)",
      categoria: "Documentos Pessoais da Requerente",
    },
    {
      id: "termo_representacao",
      label: "Termo de Representação",
      categoria: "Documentos Pessoais da Requerente",
    },
    {
      id: "contrato_assinado",
      label: "Contrato assinado",
      categoria: "Documentos Pessoais da Requerente",
    },

    {
      id: "certidao_nascimento",
      label: "Certidão de Nascimento do(s) filho(s)",
      categoria: "Documentos da Maternidade",
    },
    {
      id: "dnv",
      label: "DNV - Declaração de Nascido Vivo (emitida pela maternidade)",
      categoria: "Documentos da Maternidade",
    },
    {
      id: "cartao_pre_natal",
      label: "Cartão pré-natal (com registro de consultas)",
      categoria: "Documentos da Maternidade",
    },
    {
      id: "ultrassom",
      label: "Exames de ultrassom da gestação",
      categoria: "Documentos da Maternidade",
    },
    {
      id: "atestado_gestacao",
      label: "Atestado médico de gestação (se aplicável)",
      categoria: "Documentos da Maternidade",
    },
    {
      id: "laudo_complicacoes",
      label: "Laudo médico (se houve complicações)",
      categoria: "Documentos da Maternidade",
    },
    {
      id: "termo_guarda",
      label: "Termo de guarda judicial (se adoção/guarda)",
      categoria: "Documentos da Maternidade",
    },
    {
      id: "certidao_adocao",
      label: "Certidão/Sentença de adoção (se adoção)",
      categoria: "Documentos da Maternidade",
    },
    {
      id: "atestado_aborto",
      label: "Atestado médico de aborto não criminoso (se aplicável)",
      categoria: "Documentos da Maternidade",
    },
    {
      id: "comprovante_internacao",
      label: "Comprovante de internação hospitalar (parto/complicações)",
      categoria: "Documentos da Maternidade",
    },

    {
      id: "rg_conjuge",
      label: "RG e CPF do cônjuge",
      categoria: "Documentos do Cônjuge",
    },
    {
      id: "certidao_casamento",
      label: "Certidão de Casamento (se casada)",
      categoria: "Documentos do Cônjuge",
    },
    {
      id: "declaracao_uniao",
      label: "Declaração de União Estável (se união estável)",
      categoria: "Documentos do Cônjuge",
    },
    {
      id: "ctps_conjuge",
      label: "CTPS do cônjuge (comprovar atividade rural ou urbana)",
      categoria: "Documentos do Cônjuge",
    },
    {
      id: "cnis_conjuge",
      label: "CNIS do cônjuge",
      categoria: "Documentos do Cônjuge",
    },

    {
      id: "cadunico",
      label: "CadÚnico atualizado",
      categoria: "Documentos Familiares",
    },
    {
      id: "docs_grupo_familiar",
      label: "Documentos do grupo familiar (CPF/RG)",
      categoria: "Documentos Familiares",
    },

    {
      id: "ctps",
      label:
        "CTPS (demonstrar ausência de vínculos urbanos ou vínculos encerrados)",
      categoria: "Documentos Rurais",
    },
    {
      id: "doc_terra",
      label: "Documento da terra (escritura, contrato de arrendamento, posse)",
      categoria: "Documentos Rurais",
    },
    {
      id: "dap",
      label: "DAP (Declaração de Aptidão ao Pronaf)",
      categoria: "Documentos Rurais",
    },
    {
      id: "caf",
      label: "CAF (Cadastro de Atividade Rural)",
      categoria: "Documentos Rurais",
    },
    {
      id: "seguro_safra",
      label: "Comprovante de Seguro Safra",
      categoria: "Documentos Rurais",
    },
    {
      id: "emprestimo_rural",
      label: "Comprovante de empréstimo rural",
      categoria: "Documentos Rurais",
    },
    {
      id: "notas_fiscais",
      label: "Notas fiscais de produtor rural",
      categoria: "Documentos Rurais",
    },
    {
      id: "itr",
      label: "Comprovante de pagamento de ITR",
      categoria: "Documentos Rurais",
    },
    {
      id: "contrato_arrendamento",
      label: "Contrato de arrendamento/parceria/meação",
      categoria: "Documentos Rurais",
    },
    {
      id: "certidao_imovel",
      label: "Certidão de Imóvel Rural",
      categoria: "Documentos Rurais",
    },
    {
      id: "declaracao_sindicato",
      label: "Declaração do Sindicato dos Trabalhadores Rurais",
      categoria: "Documentos Rurais",
    },
    {
      id: "carteira_sindical",
      label: "Carteira de filiação sindical",
      categoria: "Documentos Rurais",
    },
    {
      id: "contrib_sindical",
      label: "Comprovante de pagamento de contribuição sindical",
      categoria: "Documentos Rurais",
    },
    {
      id: "declaracao_vizinhos",
      label: "Declaração de vizinhos/proprietários",
      categoria: "Documentos Rurais",
    },
    {
      id: "venda_producao",
      label: "Comprovante de venda de produção rural",
      categoria: "Documentos Rurais",
    },

    {
      id: "docs_10_meses",
      label:
        "Documentos que comprovem trabalho rural nos 10 meses anteriores ao parto",
      categoria: "Comprovantes de Exercício Rural",
    },
    {
      id: "fotos_roca",
      label: "Fotos da requerente trabalhando na roça (se houver)",
      categoria: "Comprovantes de Exercício Rural",
    },
    {
      id: "declaracoes_terceiros",
      label: "Declarações de terceiros sobre trabalho rural durante gestação",
      categoria: "Comprovantes de Exercício Rural",
    },
  ],
  salario_maternidade_urbano: [
    { id: "doc_identificacao", label: "Documento de Identificação (RG/CPF)" },
    {
      id: "certidao_nascimento_crianca",
      label: "Certidão de Nascimento da Criança",
    },
    { id: "atestado_medico", label: "Atestado Médico/Declaração do Hospital" },
    { id: "ctps", label: "Carteira de Trabalho" },
    { id: "cnis", label: "CNIS Atualizado" },
  ],
  pensao_morte_rural: [
    { id: "doc_identificacao", label: "Documento de Identificação (RG/CPF)" },
    { id: "certidao_obito", label: "Certidão de Óbito" },
    { id: "certidao_casamento", label: "Certidão de Casamento/União Estável" },
    {
      id: "autodeclaracao_rural",
      label: "Autodeclaração de Atividade Rural do Falecido",
    },
    { id: "cnis_falecido", label: "CNIS do Falecido" },
  ],
  pensao_morte_urbano: [
    { id: "doc_identificacao", label: "Documento de Identificação (RG/CPF)" },
    { id: "certidao_obito", label: "Certidão de Óbito" },
    { id: "certidao_casamento", label: "Certidão de Casamento/União Estável" },
    { id: "ctps_falecido", label: "Carteira de Trabalho do Falecido" },
    { id: "cnis_falecido", label: "CNIS do Falecido" },
  ],
};

export default function BeneficioChecklistEdit({
  categoria,
  tipoBeneficio,
  checklist,
  onChange,
  clientId,
  beneficioId,
}) {
  const [expandedItems, setExpandedItems] = useState({});
  const [uploadingItem, setUploadingItem] = useState(null);

  const documentos = CHECKLISTS[tipoBeneficio] || [];

  const uploadMutation = useMutation({
    mutationFn: async ({ file, docId }) => {
      const { file_url } = await aiService.uploadFile({ file });
      return { file_url, docId };
    },
    onSuccess: ({ file_url, docId }) => {
      const currentItem = checklist[docId] || {};
      onChange({
        ...checklist,
        [docId]: {
          ...currentItem,
          checked: true,
          file_url,
        },
      });
      setUploadingItem(null);
    },
    onError: (error) => {
      console.error("Erro no upload do arquivo:", error);
      setUploadingItem(null);
    },
  });

  const handleToggle = (docId, checked) => {
    const currentItem = checklist[docId] || {};
    onChange({
      ...checklist,
      [docId]: {
        ...currentItem,
        checked: checked === true,
      },
    });
  };

  const handleObservationChange = (docId, observation) => {
    const currentItem = checklist[docId] || {};
    onChange({
      ...checklist,
      [docId]: {
        ...currentItem,
        observation,
      },
    });
  };

  const handleFileUpload = async (docId, file) => {
    setUploadingItem(docId);
    uploadMutation.mutate({ file, docId });
  };

  const handleRemoveFile = (docId) => {
    const currentItem = checklist[docId] || {};
    onChange({
      ...checklist,
      [docId]: {
        ...currentItem,
        file_url: null,
      },
    });
  };

  const toggleExpand = (docId) => {
    setExpandedItems((prev) => ({
      ...prev,
      [docId]: !prev[docId],
    }));
  };

  const getItemStatus = (docId) => {
    const item = checklist[docId] || {};
    if (item.checked && item.file_url) return "complete";
    if (item.checked || item.file_url) return "partial";
    return "pending";
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "complete":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "partial":
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      default:
        return <Circle className="w-5 h-5 text-slate-300" />;
    }
  };

  const completedDocs = documentos.filter(
    (doc) => getItemStatus(doc.id) === "complete",
  ).length;
  const partialDocs = documentos.filter(
    (doc) => getItemStatus(doc.id) === "partial",
  ).length;
  const totalDocs = documentos.length;
  const progressPercent = totalDocs > 0 ? (completedDocs / totalDocs) * 100 : 0;

  // Agrupar por categoria
  const categorias = [
    ...new Set(documentos.map((d) => d.categoria || "Geral")),
  ];
  const docsPorCategoria = categorias.map((cat) => ({
    categoria: cat,
    docs: documentos.filter((d) => (d.categoria || "Geral") === cat),
  }));

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="space-y-1">
              <h3 className="font-medium text-slate-800">
                Progresso do Checklist
              </h3>
              <p className="text-sm text-slate-600">
                {completedDocs} completos, {partialDocs} parciais,{" "}
                {totalDocs - completedDocs - partialDocs} pendentes
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-legal-blue">
                {Math.round(progressPercent)}%
              </span>
            </div>
          </div>
          <Progress value={progressPercent} className="h-3" />

          {/* Legenda */}
          <div className="flex items-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-slate-600">Completo</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="text-slate-600">Pendente</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-500" />
              <span className="text-slate-600">Com observação</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist Items */}
      <div className="space-y-6">
        {docsPorCategoria.map(({ categoria, docs }) => (
          <Card key={categoria}>
            <CardContent className="pt-6">
              <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-legal-blue" />
                {categoria}
              </h4>
              <div className="space-y-3">
                {docs.map((doc) => {
                  const item = checklist[doc.id] || {};
                  const status = getItemStatus(doc.id);
                  const isExpanded = expandedItems[doc.id];

                  return (
                    <div
                      key={doc.id}
                      className={`
                        border rounded-lg transition-all
                        ${status === "complete" ? "border-green-200 bg-green-50/50" : ""}
                        ${status === "partial" ? "border-amber-200 bg-amber-50/50" : ""}
                        ${status === "pending" ? "border-slate-200 bg-white" : ""}
                      `}
                    >
                      {/* Item Header */}
                      <div className="flex items-center gap-3 p-4">
                        <Checkbox
                          id={doc.id}
                          checked={item.checked || false}
                          onCheckedChange={(checked) =>
                            handleToggle(doc.id, checked)
                          }
                        />

                        <div className="flex-1 min-w-0">
                          <Label
                            htmlFor={doc.id}
                            className={`cursor-pointer font-medium ${
                              item.checked ? "text-green-700" : "text-slate-700"
                            }`}
                          >
                            {doc.label}
                          </Label>

                          {/* Status indicators */}
                          <div className="flex items-center gap-2 mt-1">
                            {item.file_url && (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                Arquivo anexado
                              </span>
                            )}
                            {item.observation && (
                              <span className="text-xs text-blue-600 flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                Com observação
                              </span>
                            )}
                          </div>
                        </div>

                        {getStatusIcon(status)}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(doc.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-4 border-t pt-4">
                          {/* Upload Area */}
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-600">
                              Arquivo
                            </Label>
                            {item.file_url ? (
                              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                <FileText className="w-5 h-5 text-green-600" />
                                <a
                                  href={item.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 text-sm text-green-700 hover:underline truncate"
                                >
                                  Visualizar documento
                                  <ExternalLink className="w-3 h-3 inline ml-1" />
                                </a>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveFile(doc.id)}
                                  className="h-8 w-8 text-red-500 hover:bg-red-50"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="relative">
                                <input
                                  type="file"
                                  id={`file-${doc.id}`}
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFileUpload(doc.id, file);
                                  }}
                                />
                                <label
                                  htmlFor={`file-${doc.id}`}
                                  className={`
                                    flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer
                                    ${
                                      uploadingItem === doc.id
                                        ? "border-blue-300 bg-blue-50"
                                        : "border-slate-300 hover:border-legal-blue hover:bg-slate-50"
                                    }
                                  `}
                                >
                                  {uploadingItem === doc.id ? (
                                    <>
                                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                                      <span className="text-sm text-blue-600">
                                        Enviando...
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-5 h-5 text-slate-600" />
                                      <span className="text-sm text-slate-600">
                                        Clique para fazer upload
                                      </span>
                                    </>
                                  )}
                                </label>
                              </div>
                            )}
                          </div>

                          {/* Observation */}
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-600">
                              Observação
                            </Label>
                            <Textarea
                              value={item.observation || ""}
                              onChange={(e) =>
                                handleObservationChange(doc.id, e.target.value)
                              }
                              placeholder="Adicionar observação sobre este documento..."
                              rows={2}
                              className="resize-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        {totalDocs === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-slate-600">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>
                Nenhum documento específico definido para este tipo de
                benefício.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
