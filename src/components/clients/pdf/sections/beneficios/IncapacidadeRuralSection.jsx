import { 
  addField, 
  addFieldMultiline,
  addFieldRow,
  addTable, 
  addSectionTitle,
  checkPageBreak,
  PAGE_CONFIG,
  SPACING 
} from '@/utils/pdfExporter';

export function IncapacidadeRuralSection(doc, data, y, addHeaderFn = null, headerTitle = '') {
  // ═══ PATOLOGIA E CONDIÇÃO ═══
  y = addSectionTitle(doc, 'Patologia e Condição', y);
  
  if (data.patologia) {
    const pat = data.patologia;
    
    y = addFieldRow(doc, 'CID', pat.cid || '-', 'Data Início Sintomas', pat.data_inicio || '-', y);
    y = addFieldRow(doc, 'Decorreu de Acidente', pat.decorreu_acidente || '-', 'Pesquisa CID', pat.pesquisa_cid || '-', y);
    
    if (pat.detalhes_acidente && pat.detalhes_acidente !== '-') {
      y = addFieldMultiline(doc, 'Detalhes do Acidente', pat.detalhes_acidente, y);
    }
    
    if (pat.historico && pat.historico !== '-') {
      y = addFieldMultiline(doc, 'Histórico dos Sintomas', pat.historico, y);
    }
    
    if (pat.impacto_vida && pat.impacto_vida !== '-') {
      y = addFieldMultiline(doc, 'Impacto na Vida', pat.impacto_vida, y);
    }
    if (pat.impacto_labor && pat.impacto_labor !== '-') {
      y = addFieldMultiline(doc, 'Impacto no Labor', pat.impacto_labor, y);
    }
    if (pat.atividades_trabalho && pat.atividades_trabalho !== '-') {
      y = addFieldMultiline(doc, 'Atividades de Trabalho', pat.atividades_trabalho, y);
    }
    if (pat.saude_dificulta === 'Sim' && pat.como_dificulta && pat.como_dificulta !== '-') {
      y = addFieldMultiline(doc, 'Como Dificulta', pat.como_dificulta, y);
    }
    
    y += SPACING.PARAGRAPH_SPACING;
  }

  // ═══ AFASTAMENTO E TRATAMENTO ═══
  y = checkPageBreak(doc, y, 50, addHeaderFn, headerTitle);
  y = addSectionTitle(doc, 'Afastamento e Tratamento', y);
  
  if (data.afastamento) {
    const afs = data.afastamento;
    
    y = addFieldRow(doc, 'Data Afastamento', afs.data_afastamento || '-', 'Faz Tratamento', afs.faz_tratamento || '-', y);
    
    if (afs.tipos_tratamento && afs.tipos_tratamento !== '-') {
      y = addFieldMultiline(doc, 'Tipos de Tratamento', afs.tipos_tratamento, y);
    }
    if (afs.tratamento_outro && afs.tratamento_outro !== '-') {
      y = addFieldMultiline(doc, 'Outro Tratamento', afs.tratamento_outro, y);
    }
    
    y = addFieldRow(doc, 'Possui Relatórios', afs.possui_relatorios || '-', 'Toma Medicações', afs.toma_medicacoes || '-', y);
    
    if (afs.quais_medicacoes && afs.quais_medicacoes !== '-') {
      y = addFieldMultiline(doc, 'Medicações', afs.quais_medicacoes, y);
    }
    if (afs.medicacoes_efeitos === 'Sim' && afs.quais_efeitos && afs.quais_efeitos !== '-') {
      y = addFieldMultiline(doc, 'Efeitos Colaterais', afs.quais_efeitos, y);
    }
    
    y += SPACING.PARAGRAPH_SPACING;
  }

  // ═══ DOCUMENTOS MÉDICOS ═══
  y = checkPageBreak(doc, y, 40, addHeaderFn, headerTitle);
  y = addSectionTitle(doc, 'Documentos Médicos', y);
  
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
    y = addField(doc, 'Nenhum documento cadastrado', '-', y);
  }

  // ═══ ATIVIDADE RURAL ═══
  y = checkPageBreak(doc, y, 40, addHeaderFn, headerTitle);
  y = addSectionTitle(doc, 'Atividade Rural', y);
  
  if (data.atividade_rural) {
    const atv = data.atividade_rural;
    y = addFieldRow(doc, 'Zona de Residência', atv.zona || '-', 'Tempo Local', atv.tempo_local || '-', y);
    
    if (atv.propriedades && atv.propriedades.length > 0) {
      y = addTable(
        doc, 
        ['Propriedade', 'Proprietário', 'Período'], 
        atv.propriedades.map(p => [
          p.nome || '-', 
          p.proprietario || '-', 
          p.periodo || '-'
        ]),
        y,
        PAGE_CONFIG.MARGIN_LEFT,
        addHeaderFn,
        headerTitle
      );
    }
  }

  // ═══ DOCUMENTAÇÃO ═══
  y = checkPageBreak(doc, y, 30, addHeaderFn, headerTitle);
  y = addSectionTitle(doc, 'Documentação Rural', y);
  
  if (data.documentacao) {
    const doc_ = data.documentacao;
    y = addFieldRow(doc, 'Possui DAP', doc_.dap || '-', 'Possui CAF', doc_.caf || '-', y);
    y = addFieldRow(doc, 'Filiado ao Sindicato', doc_.filiado_sindicato || '-', 'Desde', doc_.filiado_desde || '-', y);
    y += SPACING.PARAGRAPH_SPACING;
  }

  // ═══ TESTEMUNHAS ═══
  y = checkPageBreak(doc, y, 30, addHeaderFn, headerTitle);
  y = addSectionTitle(doc, 'Testemunhas', y);
  
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
    y = addField(doc, 'Nenhuma testemunha cadastrada', '-', y);
  }

  // ═══ OBSERVAÇÕES ═══
  if (data.observacoes && data.observacoes !== '-') {
    y = checkPageBreak(doc, y, 20, addHeaderFn, headerTitle);
    y = addFieldMultiline(doc, 'Observações', data.observacoes, y);
  }

  return y + SPACING.PARAGRAPH_SPACING;
}
