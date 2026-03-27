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

export function IncapacidadeRuralSection(doc, data, y, addHeaderFn = null, headerTitle = '') {
  // ═══ PATOLOGIA E CONDIÇÃO ═══
  y = addSectionTitle(doc, 'Patologia e Condição', y, PAGE_CONFIG.MARGIN_LEFT, addHeaderFn, headerTitle);
  
  if (data.patologia) {
    const pat = data.patologia;
    
    y = addFieldRow(doc, 'CID', pat.cid, 'Data Início Sintomas', pat.data_inicio, y, addHeaderFn, headerTitle);
    y = addFieldRow(doc, 'Decorreu de Acidente', pat.decorreu_acidente, 'Pesquisa CID', pat.pesquisa_cid, y, addHeaderFn, headerTitle);
    
    if (pat.detalhes_acidente && pat.detalhes_acidente !== '-' && pat.detalhes_acidente !== '[NÃO INFORMADO]') {
      y = addFieldValueOnly(doc, 'Detalhes do Acidente', pat.detalhes_acidente, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    
    if (pat.historico && pat.historico !== '-' && pat.historico !== '[NÃO INFORMADO]') {
      y = addFieldValueOnly(doc, 'Histórico dos Sintomas', pat.historico, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    
    if (pat.impacto_vida && pat.impacto_vida !== '-' && pat.impacto_vida !== '[NÃO INFORMADO]') {
      y = addFieldValueOnly(doc, 'Impacto na Vida', pat.impacto_vida, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    if (pat.impacto_labor && pat.impacto_labor !== '-' && pat.impacto_labor !== '[NÃO INFORMADO]') {
      y = addFieldValueOnly(doc, 'Impacto no Labor', pat.impacto_labor, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    if (pat.atividades_trabalho && pat.atividades_trabalho !== '-' && pat.atividades_trabalho !== '[NÃO INFORMADO]') {
      y = addFieldValueOnly(doc, 'Atividades de Trabalho', pat.atividades_trabalho, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    if (pat.saude_dificulta === 'Sim' && pat.como_dificulta && pat.como_dificulta !== '-' && pat.como_dificulta !== '[NÃO INFORMADO]') {
      y = addFieldValueOnly(doc, 'Como Dificulta', pat.como_dificulta, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    
    y += SPACING.PARAGRAPH_SPACING;
  }

  // ═══ AFASTAMENTO E TRATAMENTO ═══
  const estimatedTreatmentHeight = SPACING.SECTION_SPACING + (SPACING.FIELD_SPACING * 7);
  y = checkPageBreak(doc, y, estimatedTreatmentHeight, addHeaderFn, headerTitle);
  y = addSectionTitle(doc, 'Afastamento e Tratamento', y, PAGE_CONFIG.MARGIN_LEFT, addHeaderFn, headerTitle);
  
  if (data.afastamento) {
    const afs = data.afastamento;
    
    y = addFieldRow(doc, 'Data Afastamento', afs.data_afastamento, 'Faz Tratamento', afs.faz_tratamento, y, addHeaderFn, headerTitle);
    
    if (afs.tipos_tratamento && afs.tipos_tratamento !== '-' && afs.tipos_tratamento !== '[NÃO INFORMADO]') {
      y = addFieldValueOnly(doc, 'Tipos de Tratamento', afs.tipos_tratamento, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    if (afs.tratamento_outro && afs.tratamento_outro !== '-' && afs.tratamento_outro !== '[NÃO INFORMADO]') {
      y = addFieldValueOnly(doc, 'Outro Tratamento', afs.tratamento_outro, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    
    y = addFieldRow(doc, 'Possui Relatórios', afs.possui_relatorios, 'Toma Medicações', afs.toma_medicacoes, y, addHeaderFn, headerTitle);
    
    if (afs.quais_medicacoes && afs.quais_medicacoes !== '-' && afs.quais_medicacoes !== '[NÃO INFORMADO]') {
      y = addFieldValueOnly(doc, 'Medicações', afs.quais_medicacoes, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    if (afs.medicacoes_efeitos === 'Sim' && afs.quais_efeitos && afs.quais_efeitos !== '-' && afs.quais_efeitos !== '[NÃO INFORMADO]') {
      y = addFieldValueOnly(doc, 'Efeitos Colaterais', afs.quais_efeitos, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    
    y += SPACING.PARAGRAPH_SPACING;
  }

  // ═══ DOCUMENTOS MÉDICOS ═══
  const estimatedDocsHeight = SPACING.SECTION_SPACING + 10 + SPACING.PARAGRAPH_SPACING;
  y = checkPageBreak(doc, y, estimatedDocsHeight, addHeaderFn, headerTitle);
  y = addSectionTitle(doc, 'Documentos Médicos', y, PAGE_CONFIG.MARGIN_LEFT, addHeaderFn, headerTitle);
  
  if (data.documentos_medicos && data.documentos_medicos.length > 0) {
    y = addTable(
      doc, 
      ['Tipo', 'Data', 'Descrição'], 
      data.documentos_medicos.map(d => [
        d.tipo || '-', 
        d.data || '-', 
        d.descricao || '-'
      ]),
      y,
      PAGE_CONFIG.MARGIN_LEFT,
      addHeaderFn,
      headerTitle
    );
  } else {
    y = addField(doc, 'Nenhum documento cadastrado', '-', y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
  }

  // ═══ ATIVIDADE RURAL ═══
  const estimatedRuralHeight = SPACING.SECTION_SPACING + 10 + SPACING.PARAGRAPH_SPACING;
  y = checkPageBreak(doc, y, estimatedRuralHeight, addHeaderFn, headerTitle);
  y = addSectionTitle(doc, 'Atividade Rural', y, PAGE_CONFIG.MARGIN_LEFT, addHeaderFn, headerTitle);
  
  if (data.atividade_rural) {
    const atv = data.atividade_rural;
    y = addFieldRow(doc, 'Zona de Residência', atv.zona, 'Tempo Local', atv.tempo_local, y, addHeaderFn, headerTitle);
    
    if (atv.propriedades && atv.propriedades.length > 0) {
      y = addTable(
        doc, 
        ['Propriedade', 'Proprietário', 'Período'], 
        atv.propriedades.map(p => [
          p.nome, 
          p.proprietario, 
          p.periodo
        ]),
        y,
        PAGE_CONFIG.MARGIN_LEFT,
        addHeaderFn,
        headerTitle
      );
    }
  }

  // ═══ DOCUMENTAÇÃO ═══
  const estimatedDocHeight = SPACING.SECTION_SPACING + (SPACING.FIELD_SPACING * 3);
  y = checkPageBreak(doc, y, estimatedDocHeight, addHeaderFn, headerTitle);
  y = addSectionTitle(doc, 'Documentação Rural', y, PAGE_CONFIG.MARGIN_LEFT, addHeaderFn, headerTitle);
  
  if (data.documentacao) {
    const doc_ = data.documentacao;
    y = addFieldRow(doc, 'Possui DAP', doc_.dap, 'Possui CAF', doc_.caf, y, addHeaderFn, headerTitle);
    y = addFieldRow(doc, 'Filiado ao Sindicato', doc_.filiado_sindicato, 'Desde', doc_.filiado_desde, y, addHeaderFn, headerTitle);
    y += SPACING.PARAGRAPH_SPACING;
  }

  // ═══ TESTEMUNHAS ═══
  const estimatedWitnessHeight = SPACING.SECTION_SPACING + 15 + SPACING.PARAGRAPH_SPACING;
  y = checkPageBreak(doc, y, estimatedWitnessHeight, addHeaderFn, headerTitle);
  y = addSectionTitle(doc, 'Testemunhas', y, PAGE_CONFIG.MARGIN_LEFT, addHeaderFn, headerTitle);
  
  if (data.testemunhas && data.testemunhas.length > 0) {
    y = addTable(
      doc, 
      ['Nome', 'CPF', 'Telefone', 'Relação', 'Período'], 
      data.testemunhas.map(t => [
        t.nome, 
        t.cpf, 
        t.telefone, 
        t.relacao, 
        t.periodo
      ]),
      y,
      PAGE_CONFIG.MARGIN_LEFT,
      addHeaderFn,
      headerTitle
    );
  } else {
    y = addField(doc, 'Nenhuma testemunha cadastrada', '-', y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
  }

  // ═══ OBSERVAÇÕES ═══
  if (data.observacoes && data.observacoes !== '-' && data.observacoes !== '[NÃO INFORMADO]') {
    y = checkPageBreak(doc, y, 20, addHeaderFn, headerTitle);
    y = addFieldValueOnly(doc, 'Observações', data.observacoes, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
  }

  return y + SPACING.PARAGRAPH_SPACING;
}
