import { format } from 'date-fns';

export const TIPO_BENEFICIO_LABELS = {
  bpc_loas_idoso: 'BPC/LOAS - Idoso',
  bpc_loas_pcd: 'BPC/LOAS - PCD',
  aposentadoria_idade_rural: 'Aposentadoria por Idade Rural',
  incapacidade_rural: 'Benefício por Incapacidade Rural',
  salario_maternidade_rural: 'Salário-Maternidade Rural',
  pensao_morte_rural: 'Pensão por Morte Rural',
  aposentadoria_idade_urbano: 'Aposentadoria por Idade Urbano',
  incapacidade_urbano: 'Benefício por Incapacidade Urbano',
  salario_maternidade_urbano: 'Salário-Maternidade Urbano',
  pensao_morte_urbano: 'Pensão por Morte Urbano',
  outros_urbano: 'Outros',
};

export const STATUS_LABELS = {
  em_analise: 'Em Análise',
  documentacao_pendente: 'Documentação Pendente',
  aguardando_protocolo: 'Aguardando Protocolo',
  protocolado: 'Protocolado',
  aguardando_inss: 'Aguardando INSS',
  indeferido: 'Indeferido',
  deferido: 'Deferido/Concedido',
  cancelado: 'Cancelado',
};

export const ESTADO_CIVIL_LABELS = {
  solteiro: 'Solteiro(a)',
  casado: 'Casado(a)',
  uniao_estavel: 'União Estável',
  divorciado: 'Divorciado(a)',
  viuvo: 'Viúvo(a)',
};

export const ESCOLARIDADE_LABELS = {
  analfabeto: 'Analfabeto',
  fundamental_incompleto: 'Fundamental Incompleto',
  fundamental_completo: 'Fundamental Completo',
  medio_incompleto: 'Médio Incompleto',
  medio_completo: 'Médio Completo',
  superior_incompleto: 'Superior Incompleto',
  superior_completo: 'Superior Completo',
  pos_graduacao: 'Pós-graduação',
};

export function formatDate(date) {
  if (!date) return '-';
  try {
    return format(new Date(date), 'dd/MM/yyyy');
  } catch {
    return '-';
  }
}

export function formatLabel(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^\w/, c => c.toUpperCase())
    .trim();
}

export function formatBoolean(value) {
  if (value === true || value === 'Sim' || value === 'sim' || value === 'Sim, informal (familiar)' || value === 'Sim, formal (contratado)') return 'Sim';
  if (value === false || value === 'Não' || value === 'nao') return 'Não';
  return value || '-';
}

export function formatEnum(value, labels) {
  if (!value) return '-';
  return labels[value] || value;
}

export function extractClientData(client, beneficios = [], areaAtuacao = '') {
  if (!client) return null;

  const data = {
    client: {
      id: client.id,
      full_name: client.full_name || '',
      cpf_cnpj: client.cpf_cnpj || '',
      data_nascimento: formatDate(client.data_nascimento),
      rg: client.rg || '',
      data_emissao_rg: formatDate(client.data_emissao_rg),
      orgao_expedidor: client.orgao_expedidor || '',
      estado_civil: formatEnum(client.estado_civil, ESTADO_CIVIL_LABELS),
      grau_escolaridade: formatEnum(client.grau_escolaridade, ESCOLARIDADE_LABELS),
      profissao: client.profissao || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      zip_code: client.zip_code || '',
      city: client.city || '',
      state: client.state || '',
      area_atuacao: areaAtuacao || client.area_atuacao || 'Previdenciário',
      senha_meu_inss: client.senha_meu_inss || '',
      inscrito_cadunico: formatBoolean(client.inscrito_cadunico),
      cadunico_updated_at: formatDate(client.cadunico_updated_at),
      possui_senha_gov: formatBoolean(client.possui_senha_gov),
      senha_gov: client.senha_gov || '',
      possui_biometria: formatBoolean(client.possui_biometria),
      pedido_anterior_inss: formatBoolean(client.pedido_anterior_inss),
      numero_processo_administrativo: client.numero_processo_administrativo || '',
      numero_processo_judicial: client.numero_processo_judicial || '',
      observacoes_processos_anteriores: client.observacoes_processos_anteriores || '',
      observations: client.observations || '',
      dados_civeis: client.dados_civeis || null,
      created_at: formatDate(client.created_at),
    },
    beneficios: beneficios.map(b => extractBeneficioData(b)),
  };

  return data;
}

function extractBeneficioData(beneficio) {
  if (!beneficio) return null;

  const tipo = beneficio.tipo_beneficio || '';
  const dados = beneficio.dados_especificos || {};

  const extracted = {
    id: beneficio.id,
    tipo_beneficio: TIPO_BENEFICIO_LABELS[tipo] || tipo,
    categoria: beneficio.categoria || '',
    status: STATUS_LABELS[beneficio.status] || beneficio.status || '',
    numero_beneficio: beneficio.numero_beneficio || '',
    data_protocolo: formatDate(beneficio.data_protocolo),
    observacoes: beneficio.observacoes || '',
    created_at: formatDate(beneficio.created_at),
    dados: extractDadosEspecificos(tipo, dados),
  };

  return extracted;
}

function extractDadosEspecificos(tipo, dados) {
  switch (tipo) {
    case 'bpc_loas_idoso':
    case 'bpc_loas_pcd':
      return extractBPCLoasData(dados);
    case 'aposentadoria_idade_rural':
      return extractAposentadoriaRuralData(dados);
    case 'incapacidade_rural':
      return extractIncapacidadeRuralData(dados);
    case 'salario_maternidade_rural':
      return extractSalarioMaternidadeRuralData(dados);
    case 'pensao_morte_rural':
    case 'pensao_morte_urbano':
      return extractPensaoMorteData(dados);
    case 'aposentadoria_idade_urbano':
      return extractAposentadoriaUrbanoData(dados);
    case 'incapacidade_urbano':
      return extractIncapacidadeUrbanoData(dados);
    case 'salario_maternidade_urbano':
      return extractSalarioMaternidadeUrbanoData(dados);
    default:
      return { informacoes: dados.informacoes || '' };
  }
}

function extractBPCLoasData(dados) {
  const triagem = dados.triagem_elegibilidade || {};
  const cif = dados.cif_pcd || {};
  const grupoFamiliar = dados.membros_grupo_familiar || [];
  const renda = dados.renda_detalhada || {};
  const estrategia = dados.estrategia_conclusao || {};

  return {
    elegibilidade: {
      reside_brasil: triagem.reside_brasil || '-',
      cpf_cadunico: triagem.cpf_cadunico || '-',
      recebe_beneficio: triagem.recebe_beneficio || '-',
      vinculo_ativo: triagem.vinculo_ativo || '-',
      diagnosticos: triagem.diagnosticos || '-',
      medico_assistente: triagem.medico_assistente || '-',
      inicio_sintomas: triagem.inicio_sintomas || '-',
      impedimento_2_anos: triagem.impedimento_longo_prazo || '-',
      natureza_impedimento: triagem.natureza_impedimento || '-',
      tipos_impedimento: Array.isArray(triagem.tipos_impedimento) ? triagem.tipos_impedimento.join(', ') : triagem.tipos_impedimento || '-',
    },
    cif: {
      autocuidado: cif.autocuidado || '-',
      mobilidade: cif.mobilidade || '-',
      comunicacao: cif.comunicacao || '-',
      cognicao: cif.cognicao || '-',
      interacao_social: cif.interacao_social || '-',
      capacidade_trabalho: cif.capacidade_trabalho || '-',
      barreiras: cif.barreiras || '-',
      necessita_cuidador: cif.necessita_cuidador || '-',
      tratamentos: cif.tratamentos_curso || '-',
      medicamentos: cif.medicamentos_continuos || '-',
    },
    grupo_familiar: grupoFamiliar.map(m => ({
      nome: m.nome || '-',
      cpf: m.cpf || '-',
      parentesco: m.parentesco || '-',
      data_nascimento: formatDate(m.data_nascimento),
      estado_civil: m.estado_civil || '-',
      renda: m.renda_mensal ? `R$ ${parseFloat(m.renda_mensal).toFixed(2)}` : '-',
    })),
    situacao_habitacional: {
      origem_residencia: dados.origem_residencia || '-',
      condicoes_imovel: dados.condicoes_imovel || '-',
      observacoes: dados.observacoes_patrimonio || '-',
    },
    estrategia: {
      pendencias: estrategia.pendencias || '-',
      viabilidade_adm: estrategia.viabilidade_adm || '-',
      viabilidade_jud: estrategia.viabilidade_jud || '-',
      proxima_etapa: estrategia.proxima_etapa || '-',
      fundamentacao: estrategia.fundamentacao || '-',
    },
  };
}

function extractAposentadoriaRuralData(dados) {
  const membros = dados.membros_grupo_familiar || [];
  const propriedades = dados.propriedades_trabalhadas || [];
  const testemunhas = dados.testemunhas || [];

  return {
    residencia: {
      zona: dados.reside_zona || '-',
      tempo_local: dados.tempo_residencia_local || '-',
    },
    atividade: {
      trabalha_exclusivo: formatBoolean(dados.trabalha_exclusivo_agricultura),
      trabalha_desde: dados.trabalha_agricultura_desde || '-',
      trabalha_atualmente: formatBoolean(dados.trabalha_atualmente),
    },
    membros_familia: membros.map(m => ({
      nome: m.nome || '-',
      cpf: m.cpf || '-',
      parentesco: m.parentesco || '-',
      trabalha_roca: formatBoolean(m.trabalha_roca),
    })),
    propriedades: propriedades.map(p => ({
      nome: p.nome_localizacao || '-',
      proprietario: p.proprietario || '-',
      periodo: p.periodo_inicio ? `${p.periodo_inicio} a ${p.periodo_fim || 'atual'}` : '-',
      atividades: p.atividades || '-',
    })),
    documentacao: {
      dap_caf: formatBoolean(dados.possui_dap),
      filiado_sindicato: formatBoolean(dados.filiado_sindicato),
    },
    testemunhas: testemunhas.map(t => ({
      nome: t.nome || '-',
      cpf: t.cpf || '-',
      telefone: t.telefone || '-',
      relacao: t.relacao || '-',
      periodo: t.periodo_inicio ? `${t.periodo_inicio} a ${t.periodo_fim || 'atual'}` : '-',
    })),
  };
}

function extractIncapacidadeRuralData(dados) {
  const propriedades = dados.propriedades_trabalhadas || [];
  const testemunhas = dados.testemunhas || [];
  const documentos = dados.documentos_medicos || [];

  return {
    patologia: {
      cid: dados.cid_patologia || '-',
      data_inicio: formatDate(dados.data_inicio_sintomas),
      decorreu_acidente: formatBoolean(dados.decorreu_acidente),
      detalhes_acidente: dados.detalhes_acidente || '-',
      historico: dados.historico_sintomas || '-',
      pesquisa_cid: dados.pesquisa_cid || '-',
      impacto_vida: dados.impacto_vida || '-',
      impacto_labor: dados.impacto_labor || '-',
      atividades_trabalho: dados.atividades_trabalho || '-',
      saude_dificulta: formatBoolean(dados.saude_dificulta_atividades),
      como_dificulta: dados.como_dificulta || '-',
    },
    afastamento: {
      data_afastamento: formatDate(dados.data_afastamento),
      faz_tratamento: formatBoolean(dados.faz_tratamento),
      tipos_tratamento: Array.isArray(dados.tipos_tratamento) ? dados.tipos_tratamento.join(', ') : dados.tipos_tratamento || '-',
      tratamento_outro: dados.tratamento_outro || '-',
      possui_relatorios: formatBoolean(dados.possui_relatorios_tratamento),
      toma_medicacoes: formatBoolean(dados.toma_medicacoes),
      quais_medicacoes: dados.quais_medicacoes || '-',
      medicacoes_efeitos: dados.medicacoes_efeitos_colaterais || '-',
      quais_efeitos: dados.quais_efeitos_colaterais || '-',
    },
    documentos_medicos: documentos.map(d => ({
      tipo: d.tipo || '-',
      data: formatDate(d.data),
      descricao: d.descricao || '-',
    })),
    atividade_rural: {
      zona: dados.reside_zona || '-',
      tempo_local: dados.tempo_residencia_local || '-',
      propriedades: propriedades.map(p => ({
        nome: p.nome_localizacao || '-',
        proprietario: p.proprietario || '-',
        periodo: p.periodo_inicio ? `${p.periodo_inicio} a ${p.periodo_fim || 'atual'}` : '-',
        atividades: p.atividades || '-',
      })),
    },
    documentacao: {
      dap: formatBoolean(dados.possui_dap),
      caf: formatBoolean(dados.possui_caf),
      filiado_sindicato: formatBoolean(dados.filiado_sindicato),
      filiado_desde: dados.filiado_sindicato_desde || '-',
    },
    testemunhas: testemunhas.map(t => ({
      nome: t.nome || '-',
      cpf: t.cpf || '-',
      telefone: t.telefone || '-',
      relacao: t.relacao || '-',
      periodo: t.periodo_inicio ? `${t.periodo_inicio} a ${t.periodo_fim || 'atual'}` : '-',
    })),
    observacoes: dados.observacoes_gerais || '-',
  };
}

function extractSalarioMaternidadeRuralData(dados) {
  const filhos = dados.filhos_adotados || [];
  const membros = dados.membros_grupo_familiar || [];
  const propriedades = dados.propriedades_trabalhadas || [];
  const testemunhas = dados.testemunhas || [];

  return {
    maternidade: {
      tipo_evento: dados.tipo_evento || '-',
      data_parto_evento: formatDate(dados.data_parto_evento),
      data_prevista_parto: formatDate(dados.data_prevista_parto),
      gestante_atualmente: formatBoolean(dados.gestante_atualmente),
      semanas_gestacao: dados.semanas_gestacao || '-',
      tipo_parto: dados.tipo_parto || '-',
      numero_filhos: dados.numero_filhos_parto || dados.num_filhos || '-',
      filhos_adotados: filhos.map(f => ({
        nome: f.nome || '-',
        cpf: f.cpf || '-',
        data_nascimento: formatDate(f.data_nascimento),
        certidao: f.certidao_nascimento || '-',
        dnv: f.dnv || '-',
      })),
      primeiro_filho: formatBoolean(dados.primeiro_filho),
      quantidade_filhos: dados.quantidade_filhos || '-',
      ja_recebeu: formatBoolean(dados.recebeu_salario_maternidade),
      detalhes_recebimento: dados.detalhes_salario_anterior || '-',
      complicacoes_gestacao: formatBoolean(dados.complicacoes_gestacao),
      detalhes_complicacoes: dados.detalhes_complicacoes || '-',
      afastou_gestacao: formatBoolean(dados.afastou_trabalho_gestacao),
      periodo_afastamento: dados.periodo_afastamento_inicio ? `${dados.periodo_afastamento_inicio} a ${dados.periodo_afastamento_fim || 'atual'}` : '-',
      trabalha_carencia: dados.trabalha_no_periodo_carencia || '-',
      afastou_apos_parto: formatBoolean(dados.afastou_apos_parto),
      data_afastamento_parto: formatDate(dados.data_afastamento_parto),
    },
    conjuge: {
      nome: dados.nome_conjuge || '-',
      cpf: dados.cpf_conjuge || '-',
      trabalha_rural: formatBoolean(dados.conjuge_trabalha_rural),
      vinculo_urbano: dados.conjuge_vinculo_urbano || '-',
    },
    atividade_rural: {
      zona: dados.reside_zona || '-',
      tempo_local: dados.tempo_residencia_local || '-',
      trabalha_desde: dados.trabalha_agricultura_desde || '-',
      propriedades: propriedades.map(p => ({
        nome: p.nome_localizacao || '-',
        proprietario: p.proprietario || '-',
        periodo: p.periodo_inicio ? `${p.periodo_inicio} a ${p.periodo_fim || 'atual'}` : '-',
      })),
    },
    membros_familia: membros.map(m => ({
      nome: m.nome || '-',
      cpf: m.cpf || '-',
      parentesco: m.parentesco || '-',
    })),
    documentacao: {
      dap: formatBoolean(dados.possui_dap),
      caf: formatBoolean(dados.possui_caf),
      filiado_sindicato: formatBoolean(dados.filiado_sindicato),
      filiado_desde: dados.filiado_sindicato_desde || '-',
    },
    testemunhas: testemunhas.map(t => ({
      nome: t.nome || '-',
      cpf: t.cpf || '-',
      telefone: t.telefone || '-',
      relacao: t.relacao || '-',
      periodo: t.periodo_inicio ? `${t.periodo_inicio} a ${t.periodo_fim || 'atual'}` : '-',
    })),
    observacoes: dados.observacoes_maternidade || dados.observacoes_gerais || '-',
  };
}

function extractPensaoMorteData(dados) {
  return {
    falecido: {
      nome: dados.nome_falecido || '-',
      data_obito: formatDate(dados.data_obito),
      grau_parentesco: dados.grau_parentesco || '-',
    },
  };
}

function extractAposentadoriaUrbanoData(dados) {
  return {
    idade_atual: dados.idade_atual || '-',
    tempo_contribuicao: dados.tempo_contribuicao ? `${dados.tempo_contribuicao} anos` : '-',
    periodo_atividade_rural: dados.periodo_atividade_rural || '-',
  };
}

function extractIncapacidadeUrbanoData(dados) {
  return {
    data_inicio_incapacidade: formatDate(dados.data_inicio_incapacidade),
    tipo_incapacidade: dados.tipo_incapacidade || '-',
    doenca: dados.doenca || '-',
  };
}

function extractSalarioMaternidadeUrbanoData(dados) {
  return {
    data_prevista_parto: formatDate(dados.data_prevista_parto),
    tipo_parto: dados.tipo_parto || '-',
  };
}
