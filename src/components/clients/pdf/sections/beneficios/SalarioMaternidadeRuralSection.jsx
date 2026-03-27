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

export function SalarioMaternidadeRuralSection(doc, data, y, addHeaderFn = null, headerTitle = '') {
  // ═══ INFORMAÇÕES DE MATERNIDADE ═══
  y = addSectionTitle(doc, 'Informações de Maternidade', y, PAGE_CONFIG.MARGIN_LEFT, addHeaderFn, headerTitle);
  
  if (data.maternidade) {
    const mat = data.maternidade;
    
    y = addFieldRow(doc, 'Tipo de Evento', mat.tipo_evento, 'Data do Evento/Parto', mat.data_parto_evento, y, addHeaderFn, headerTitle);
    y = addFieldRow(doc, 'Data Prevista Parto', mat.data_prevista_parto, 'Gestante Atualmente', mat.gestante_atualmente, y, addHeaderFn, headerTitle);
    
    if (mat.semanas_gestacao && mat.semanas_gestacao !== '-' && mat.semanas_gestacao !== '[NÃO INFORMADO]') {
      y = addFieldRow(doc, 'Semanas de Gestação', mat.semanas_gestacao, '', '', y, addHeaderFn, headerTitle);
    }
    
    y = addFieldRow(doc, 'Tipo de Parto', mat.tipo_parto, 'Primeiro Filho', mat.primeiro_filho, y, addHeaderFn, headerTitle);
    y = addFieldRow(doc, 'Nº Filhos', mat.numero_filhos, 'Já Recebeu Salário-Mat.', mat.ja_recebeu, y, addHeaderFn, headerTitle);
    
    if (mat.detalhes_recebimento && mat.detalhes_recebimento !== '-' && mat.detalhes_recebimento !== '[NÃO INFORMADO]') {
      y = addFieldValueOnly(doc, 'Detalhes Recebimento Anterior', mat.detalhes_recebimento, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    
    y = addFieldRow(doc, 'Complicações na Gestação', mat.complicacoes_gestacao, '', '', y, addHeaderFn, headerTitle);
    if (mat.detalhes_complicacoes && mat.detalhes_complicacoes !== '-' && mat.detalhes_complicacoes !== '[NÃO INFORMADO]') {
      y = addFieldValueOnly(doc, 'Detalhes Complicações', mat.detalhes_complicacoes, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
    
    y = addFieldRow(doc, 'Afastou Durante Gestação', mat.afastou_gestacao, 'Período Afastamento', mat.periodo_afastamento, y, addHeaderFn, headerTitle);
    y = addFieldRow(doc, 'Trabalhou Período Carência', mat.trabalha_carencia, 'Afastou Após Parto', mat.afastou_apos_parto, y, addHeaderFn, headerTitle);
    
    if (mat.data_afastamento_parto && mat.data_afastamento_parto !== '-' && mat.data_afastamento_parto !== '[NÃO INFORMADO]') {
      y = addFieldRow(doc, 'Data Afastamento Pós-Parto', mat.data_afastamento_parto, '', '', y, addHeaderFn, headerTitle);
    }
    
    if (mat.filhos_adotados && mat.filhos_adotados.length > 0) {
      y = addTable(
        doc, 
        ['Nome', 'CPF', 'Data Nasc.', 'Certidão', 'DNV'], 
        mat.filhos_adotados.map(f => [
          f.nome, 
          f.cpf, 
          f.data_nascimento, 
          f.certidao, 
          f.dnv
        ]),
        y,
        PAGE_CONFIG.MARGIN_LEFT,
        addHeaderFn,
        headerTitle
      );
    }
    
    y += SPACING.PARAGRAPH_SPACING;
  }

  // ═══ INFORMAÇÕES DO CÔNJUGE ═══
  const estimatedSpouseHeight = SPACING.SECTION_SPACING + (SPACING.FIELD_SPACING * 3);
  y = checkPageBreak(doc, y, estimatedSpouseHeight, addHeaderFn, headerTitle);
  y = addSectionTitle(doc, 'Informações do Cônjuge', y, PAGE_CONFIG.MARGIN_LEFT, addHeaderFn, headerTitle);
  
  if (data.conjuge) {
    const conj = data.conjuge;
    y = addFieldRow(doc, 'Nome', conj.nome, 'CPF', conj.cpf, y, addHeaderFn, headerTitle);
    y = addFieldRow(doc, 'Trabalha Rural', conj.trabalha_rural, 'Vínculo Urbano', conj.vinculo_urbano, y, addHeaderFn, headerTitle);
    y += SPACING.PARAGRAPH_SPACING;
  }

  // ═══ ATIVIDADE RURAL ═══
  const estimatedActivityHeight = SPACING.SECTION_SPACING + 10 + SPACING.PARAGRAPH_SPACING;
  y = checkPageBreak(doc, y, estimatedActivityHeight, addHeaderFn, headerTitle);
  y = addSectionTitle(doc, 'Atividade Rural', y, PAGE_CONFIG.MARGIN_LEFT, addHeaderFn, headerTitle);
  
  if (data.atividade_rural) {
    const atv = data.atividade_rural;
    y = addFieldRow(doc, 'Zona', atv.zona, 'Tempo no Local', atv.tempo_local, y, addHeaderFn, headerTitle);
    y = addFieldRow(doc, 'Trabalha Desde', atv.trabalha_desde, '', '', y, addHeaderFn, headerTitle);
    
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

  // ═══ GRUPO FAMILIAR ═══
  const estimatedFamilyHeight = SPACING.SECTION_SPACING + 10 + SPACING.PARAGRAPH_SPACING;
  y = checkPageBreak(doc, y, estimatedFamilyHeight, addHeaderFn, headerTitle);
  y = addSectionTitle(doc, 'Grupo Familiar', y, PAGE_CONFIG.MARGIN_LEFT, addHeaderFn, headerTitle);
  
  if (data.membros_familia && data.membros_familia.length > 0) {
    y = addTable(
      doc, 
      ['Nome', 'CPF', 'Parentesco'], 
      data.membros_familia.map(m => [
        m.nome, 
        m.cpf, 
        m.parentesco
      ]),
      y,
      PAGE_CONFIG.MARGIN_LEFT,
      addHeaderFn,
      headerTitle
    );
  } else {
    y = addField(doc, 'Nenhum membro cadastrado', '-', y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
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
