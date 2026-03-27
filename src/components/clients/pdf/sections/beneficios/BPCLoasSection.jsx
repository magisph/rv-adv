import { 
  addField, 
  addFieldValueOnly,
  addFieldRow,
  addTable, 
  addSectionTitle,
  checkPageBreak,
  PAGE_CONFIG,
  SPACING 
} from '@/utils/pdfExporter';

export function BPCLoasSection(doc, data, y, addHeaderFn = null, headerTitle = '') {
  const pageWidth = doc.internal.pageSize.getWidth();
  const availableWidth = pageWidth - PAGE_CONFIG.MARGIN_LEFT - PAGE_CONFIG.MARGIN_RIGHT;
  const halfWidth = availableWidth / 2 - 3;

  // ═══ TRIAGEM DE ELEGIBILIDADE ═══
  y = addSectionTitle(doc, 'Triagem de Elegibilidade', y);
  
  if (data.elegibilidade) {
    const elig = data.elegibilidade;
    
    y = addFieldRow(doc, 'Reside no Brasil', elig.reside_brasil || '-', 'CPF/CadÚnico', elig.cpf_cadunico || '-', y);
    y = addFieldRow(doc, 'Recebe Benefício', elig.recebe_beneficio || '-', 'Vínculo Ativo', elig.vinculo_ativo || '-', y);
    
    if (elig.diagnosticos && elig.diagnosticos !== '-') {
      y = addFieldValueOnly(doc, 'Diagnóstico (CID)', elig.diagnosticos, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    
    y = addFieldRow(doc, 'Médico Assistente', elig.medico_assistente || '-', 'Início dos Sintomas', elig.inicio_sintomas || '-', y);
    y = addFieldRow(doc, 'Impedimento 2+ Anos', elig.impedimento_2_anos || '-', 'Natureza do Impedimento', elig.natureza_impedimento || '-', y);
    
    if (elig.tipos_impedimento && elig.tipos_impedimento !== '-') {
      y = addFieldValueOnly(doc, 'Tipos de Impedimento', elig.tipos_impedimento, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    
    y += SPACING.PARAGRAPH_SPACING;
  }

  // ═══ CIF - CLASSIFICAÇÃO INTERNACIONAL DE FUNCIONALIDADE ═══
  y = checkPageBreak(doc, y, 50, addHeaderFn, headerTitle);
  y = addSectionTitle(doc, 'Classificação Internacional de Funcionalidade (CIF)', y);
  
  if (data.cif) {
    const cif = data.cif;
    
    if (cif.autocuidado && cif.autocuidado !== '-') {
      y = addFieldValueOnly(doc, 'Autocuidado', cif.autocuidado, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    if (cif.mobilidade && cif.mobilidade !== '-') {
      y = addFieldValueOnly(doc, 'Mobilidade', cif.mobilidade, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    
    y = addFieldRow(doc, 'Comunicação', cif.comunicacao || '-', 'Cognição', cif.cognicao || '-', y);
    y = addFieldRow(doc, 'Interação Social', cif.interacao_social || '-', 'Capacidade Trabalho', cif.capacidade_trabalho || '-', y);
    
    if (cif.barreiras && cif.barreiras !== '-') {
      y = addFieldValueOnly(doc, 'Barreiras', cif.barreiras, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    
    y = addFieldRow(doc, 'Necessita Cuidador', cif.necessita_cuidador || '-', '', '', y);
    
    if (cif.tratamentos && cif.tratamentos !== '-') {
      y = addFieldValueOnly(doc, 'Tratamentos em Curso', cif.tratamentos, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    if (cif.medicamentos && cif.medicamentos !== '-') {
      y = addFieldValueOnly(doc, 'Medicamentos Contínuos', cif.medicamentos, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    
    y += SPACING.PARAGRAPH_SPACING;
  }

  // ═══ GRUPO FAMILIAR ═══
  y = checkPageBreak(doc, y, 40, addHeaderFn, headerTitle);
  y = addSectionTitle(doc, 'Grupo Familiar', y);
  
  if (data.grupo_familiar && data.grupo_familiar.length > 0) {
    y = addTable(
      doc, 
      ['Nome', 'CPF', 'Parentesco', 'Nascimento', 'Renda'], 
      data.grupo_familiar.map(m => [
        m.nome || '-', 
        m.cpf || '-', 
        m.parentesco || '-', 
        m.data_nascimento || '-', 
        m.renda || '-'
      ]),
      y,
      PAGE_CONFIG.MARGIN_LEFT,
      addHeaderFn,
      headerTitle
    );
  } else {
    y = addField(doc, 'Nenhum membro cadastrado', '-', y);
  }

  // ═══ SITUAÇÃO HABITACIONAL ═══
  y = checkPageBreak(doc, y, 30, addHeaderFn, headerTitle);
  y = addSectionTitle(doc, 'Situação Habitacional', y);
  
  if (data.situacao_habitacional) {
    const hab = data.situacao_habitacional;
    y = addField(doc, 'Origem da Residência', hab.origem_residencia || '-', y);
    
    if (hab.condicoes_imovel && hab.condicoes_imovel !== '-') {
      y = addFieldValueOnly(doc, 'Condições do Imóvel', hab.condicoes_imovel, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    if (hab.observacoes && hab.observacoes !== '-') {
      y = addFieldValueOnly(doc, 'Observações', hab.observacoes, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    y += SPACING.PARAGRAPH_SPACING;
  }

  // ═══ ESTRATÉGIA ═══
  y = checkPageBreak(doc, y, 40, addHeaderFn, headerTitle);
  y = addSectionTitle(doc, 'Estratégia', y);
  
  if (data.estrategia) {
    const est = data.estrategia;
    
    y = addFieldRow(doc, 'Viabilidade Adm.', est.viabilidade_adm || '-', 'Viabilidade Judicial', est.viabilidade_jud || '-', y);
    
    if (est.proxima_etapa && est.proxima_etapa !== '-') {
      y = addFieldValueOnly(doc, 'Próxima Etapa', est.proxima_etapa, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    if (est.pendencias && est.pendencias !== '-') {
      y = addFieldValueOnly(doc, 'Pendências', est.pendencias, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    if (est.fundamentacao && est.fundamentacao !== '-') {
      y = addFieldValueOnly(doc, 'Fundamentação', est.fundamentacao, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
  }

  return y + SPACING.PARAGRAPH_SPACING;
}
