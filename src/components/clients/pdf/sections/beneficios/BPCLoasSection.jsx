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

  // ═══ TRIAGEM DE ELEGIBILIDADE ═══
  y = addSectionTitle(doc, 'Triagem de Elegibilidade', y, PAGE_CONFIG.MARGIN_LEFT, addHeaderFn, headerTitle);
  
  if (data.elegibilidade) {
    const elig = data.elegibilidade;
    
    // [FIX: Quebra de Página + Espaçamento] Passar addHeaderFn/headerTitle para addFieldRow
    y = addFieldRow(doc, 'Reside no Brasil', elig.reside_brasil, 'CPF/CadÚnico', elig.cpf_cadunico, y, addHeaderFn, headerTitle);
    y = addFieldRow(doc, 'Recebe Benefício', elig.recebe_beneficio, 'Vínculo Ativo', elig.vinculo_ativo, y, addHeaderFn, headerTitle);
    
    if (elig.diagnosticos && elig.diagnosticos !== '-' && elig.diagnosticos !== '[NÃO INFORMADO]') {
      y = addFieldValueOnly(doc, 'Diagnóstico (CID)', elig.diagnosticos, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    
    y = addFieldRow(doc, 'Médico Assistente', elig.medico_assistente, 'Início dos Sintomas', elig.inicio_sintomas, y, addHeaderFn, headerTitle);
    y = addFieldRow(doc, 'Impedimento 2+ Anos', elig.impedimento_2_anos, 'Natureza do Impedimento', elig.natureza_impedimento, y, addHeaderFn, headerTitle);
    
    if (elig.tipos_impedimento && elig.tipos_impedimento !== '-' && elig.tipos_impedimento !== '[NÃO INFORMADO]') {
      y = addFieldValueOnly(doc, 'Tipos de Impedimento', elig.tipos_impedimento, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    
    y += SPACING.PARAGRAPH_SPACING;
  }

  // ═══ CIF - CLASSIFICAÇÃO INTERNACIONAL DE FUNCIONALIDADE ═══
  // [FIX: Quebra de Página] Estimar altura da seção CIF (título + ~7 campos)
  const estimatedCifHeight = SPACING.SECTION_SPACING + (SPACING.FIELD_SPACING * 7);
  y = checkPageBreak(doc, y, estimatedCifHeight, addHeaderFn, headerTitle);
  y = addSectionTitle(doc, 'Classificação Internacional de Funcionalidade (CIF)', y, PAGE_CONFIG.MARGIN_LEFT, addHeaderFn, headerTitle);
  
  if (data.cif) {
    const cif = data.cif;
    
    if (cif.autocuidado && cif.autocuidado !== '-' && cif.autocuidado !== '[NÃO INFORMADO]') {
      y = addFieldValueOnly(doc, 'Autocuidado', cif.autocuidado, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    if (cif.mobilidade && cif.mobilidade !== '-' && cif.mobilidade !== '[NÃO INFORMADO]') {
      y = addFieldValueOnly(doc, 'Mobilidade', cif.mobilidade, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    
    // [FIX: Overflow/Truncamento + Quebra de Página] Passar addHeaderFn para addFieldRow
    // Campos CIF como Comunicação e Interação Social podem ter textos longos
    y = addFieldRow(doc, 'Comunicação', cif.comunicacao, 'Cognição', cif.cognicao, y, addHeaderFn, headerTitle);
    y = addFieldRow(doc, 'Interação Social', cif.interacao_social, 'Capacidade Trabalho', cif.capacidade_trabalho, y, addHeaderFn, headerTitle);
    
    if (cif.barreiras && cif.barreiras !== '-' && cif.barreiras !== '[NÃO INFORMADO]') {
      y = addFieldValueOnly(doc, 'Barreiras', cif.barreiras, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    
    y = addFieldRow(doc, 'Necessita Cuidador', cif.necessita_cuidador, '', '', y, addHeaderFn, headerTitle);
    
    if (cif.tratamentos && cif.tratamentos !== '-' && cif.tratamentos !== '[NÃO INFORMADO]') {
      y = addFieldValueOnly(doc, 'Tratamentos em Curso', cif.tratamentos, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    if (cif.medicamentos && cif.medicamentos !== '-' && cif.medicamentos !== '[NÃO INFORMADO]') {
      y = addFieldValueOnly(doc, 'Medicamentos Contínuos', cif.medicamentos, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    
    y += SPACING.PARAGRAPH_SPACING;
  }

  // ═══ GRUPO FAMILIAR ═══
  // [FIX: Quebra de Página] Estimar altura da seção Grupo Familiar
  const estimatedFamilyHeight = SPACING.SECTION_SPACING + 12 + SPACING.PARAGRAPH_SPACING;
  y = checkPageBreak(doc, y, estimatedFamilyHeight, addHeaderFn, headerTitle);
  y = addSectionTitle(doc, 'Grupo Familiar', y, PAGE_CONFIG.MARGIN_LEFT, addHeaderFn, headerTitle);
  
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
    y = addField(doc, 'Nenhum membro cadastrado', '-', y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
  }

  // ═══ SITUAÇÃO HABITACIONAL ═══
  // [FIX: Quebra de Página] Estimar altura da seção Situação Habitacional
  const estimatedHousingHeight = SPACING.SECTION_SPACING + (SPACING.FIELD_SPACING * 3);
  y = checkPageBreak(doc, y, estimatedHousingHeight, addHeaderFn, headerTitle);
  y = addSectionTitle(doc, 'Situação Habitacional', y, PAGE_CONFIG.MARGIN_LEFT, addHeaderFn, headerTitle);
  
  if (data.situacao_habitacional) {
    const hab = data.situacao_habitacional;
    y = addFieldRow(doc, 'Origem da Residência', hab.origem_residencia, '', '', y, addHeaderFn, headerTitle);
    
    if (hab.condicoes_imovel && hab.condicoes_imovel !== '-' && hab.condicoes_imovel !== '[NÃO INFORMADO]') {
      y = addFieldValueOnly(doc, 'Condições do Imóvel', hab.condicoes_imovel, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    if (hab.observacoes && hab.observacoes !== '-' && hab.observacoes !== '[NÃO INFORMADO]') {
      y = addFieldValueOnly(doc, 'Observações', hab.observacoes, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    y += SPACING.PARAGRAPH_SPACING;
  }

  // ═══ ESTRATÉGIA ═══
  // [FIX: Quebra de Página] Estimar altura da seção Estratégia
  const estimatedStrategyHeight = SPACING.SECTION_SPACING + (SPACING.FIELD_SPACING * 5);
  y = checkPageBreak(doc, y, estimatedStrategyHeight, addHeaderFn, headerTitle);
  y = addSectionTitle(doc, 'Estratégia', y, PAGE_CONFIG.MARGIN_LEFT, addHeaderFn, headerTitle);
  
  if (data.estrategia) {
    const est = data.estrategia;
    
    y = addFieldRow(doc, 'Viabilidade Adm.', est.viabilidade_adm, 'Viabilidade Judicial', est.viabilidade_jud, y, addHeaderFn, headerTitle);
    
    if (est.proxima_etapa && est.proxima_etapa !== '-' && est.proxima_etapa !== '[NÃO INFORMADO]') {
      y = addFieldValueOnly(doc, 'Próxima Etapa', est.proxima_etapa, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    if (est.pendencias && est.pendencias !== '-' && est.pendencias !== '[NÃO INFORMADO]') {
      y = addFieldValueOnly(doc, 'Pendências', est.pendencias, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    if (est.fundamentacao && est.fundamentacao !== '-' && est.fundamentacao !== '[NÃO INFORMADO]') {
      y = addFieldValueOnly(doc, 'Fundamentação', est.fundamentacao, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
  }

  return y + SPACING.PARAGRAPH_SPACING;
}
