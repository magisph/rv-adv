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

export function AposentadoriaRuralSection(doc, data, y, addHeaderFn = null, headerTitle = '') {
  // ═══ RESIDÊNCIA ═══
  y = addSectionTitle(doc, 'Residência', y, PAGE_CONFIG.MARGIN_LEFT, addHeaderFn, headerTitle);
  
  if (data.residencia) {
    const res = data.residencia;
    y = addFieldRow(doc, 'Zona', res.zona, 'Tempo no Local', res.tempo_local, y, addHeaderFn, headerTitle);
    y += SPACING.PARAGRAPH_SPACING;
  }

  // ═══ ATIVIDADE RURAL ═══
  const estimatedActivityHeight = SPACING.SECTION_SPACING + (SPACING.FIELD_SPACING * 3);
  y = checkPageBreak(doc, y, estimatedActivityHeight, addHeaderFn, headerTitle);
  y = addSectionTitle(doc, 'Atividade Rural', y, PAGE_CONFIG.MARGIN_LEFT, addHeaderFn, headerTitle);
  
  if (data.atividade) {
    const atv = data.atividade;
    y = addFieldRow(doc, 'Trabalha Exclusivamente', atv.trabalha_exclusivo, 'Trabalha Desde', atv.trabalha_desde, y, addHeaderFn, headerTitle);
    y = addFieldRow(doc, 'Trabalha Atualmente', atv.trabalha_atualmente, '', '', y, addHeaderFn, headerTitle);
    y += SPACING.PARAGRAPH_SPACING;
  }

  // ═══ MEMBROS DA FAMÍLIA ═══
  const estimatedFamilyHeight = SPACING.SECTION_SPACING + 12 + SPACING.PARAGRAPH_SPACING;
  y = checkPageBreak(doc, y, estimatedFamilyHeight, addHeaderFn, headerTitle);
  y = addSectionTitle(doc, 'Membros da Família', y, PAGE_CONFIG.MARGIN_LEFT, addHeaderFn, headerTitle);
  
  if (data.membros_familia && data.membros_familia.length > 0) {
    y = addTable(
      doc, 
      ['Nome', 'CPF', 'Parentesco', 'Trabalha Roça'], 
      data.membros_familia.map(m => [
        m.nome || '-', 
        m.cpf || '-', 
        m.parentesco || '-', 
        m.trabalha_roca || '-'
      ]),
      y,
      PAGE_CONFIG.MARGIN_LEFT,
      addHeaderFn,
      headerTitle
    );
  } else {
    y = addField(doc, 'Nenhum membro cadastrado', '-', y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
  }

  // ═══ PROPRIEDADES TRABALHADAS ═══
  const estimatedPropertiesHeight = SPACING.SECTION_SPACING + 15 + SPACING.PARAGRAPH_SPACING;
  y = checkPageBreak(doc, y, estimatedPropertiesHeight, addHeaderFn, headerTitle);
  y = addSectionTitle(doc, 'Propriedades Trabalhadas', y, PAGE_CONFIG.MARGIN_LEFT, addHeaderFn, headerTitle);
  
  if (data.propriedades && data.propriedades.length > 0) {
    y = addTable(
      doc, 
      ['Nome/Localização', 'Proprietário', 'Período', 'Atividades'], 
      data.propriedades.map(p => [
        p.nome || '-', 
        p.proprietario || '-', 
        p.periodo || '-', 
        p.atividades || '-'
      ]),
      y,
      PAGE_CONFIG.MARGIN_LEFT,
      addHeaderFn,
      headerTitle
    );
  } else {
    y = addField(doc, 'Nenhuma propriedade cadastrada', '-', y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
  }

  // ═══ DOCUMENTAÇÃO ═══
  const estimatedDocHeight = SPACING.SECTION_SPACING + (SPACING.FIELD_SPACING * 3);
  y = checkPageBreak(doc, y, estimatedDocHeight, addHeaderFn, headerTitle);
  y = addSectionTitle(doc, 'Documentação', y, PAGE_CONFIG.MARGIN_LEFT, addHeaderFn, headerTitle);
  
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
        t.nome || '-', 
        t.cpf || '-', 
        t.telefone || '-', 
        t.relacao || '-', 
        t.periodo || '-'
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
