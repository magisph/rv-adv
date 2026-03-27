import { COLORS, FONTS, addField, addFieldMultiline, addTable } from '@/utils/pdfExporter';

export function IncapacidadeRuralSection(doc, data, y) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const halfWidth = (pageWidth - 28) / 2;

  if (data.patologia) {
    const pat = data.patologia;
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(FONTS.section);
    doc.setFont('helvetica', 'bold');
    doc.text('Patologia e Condição', 16, y);
    y += 6;

    y = addField(doc, 'CID', pat.cid || '-', y, 16, halfWidth - 5);
    y = addField(doc, 'Data Início Sintomas', pat.data_inicio || '-', y - 8, 16 + halfWidth, halfWidth - 5);
    y += 8;

    y = addField(doc, 'Decorreu de Acidente', pat.decorreu_acidente || '-', y, 16, halfWidth - 5);
    y = addField(doc, 'Pesquisa CID', pat.pesquisa_cid || '-', y - 8, 16 + halfWidth, halfWidth - 5);
    y += 8;

    if (pat.detalhes_acidente && pat.detalhes_acidente !== '-') {
      y = addFieldMultiline(doc, 'Detalhes do Acidente', pat.detalhes_acidente, y, 16, pageWidth - 30);
    }
    if (pat.historico && pat.historico !== '-') {
      y = addFieldMultiline(doc, 'Histórico dos Sintomas', pat.historico, y, 16, pageWidth - 30);
    }
    if (pat.impacto_vida && pat.impacto_vida !== '-') {
      y = addFieldMultiline(doc, 'Impacto na Vida', pat.impacto_vida, y, 16, pageWidth - 30);
    }
    if (pat.impacto_labor && pat.impacto_labor !== '-') {
      y = addFieldMultiline(doc, 'Impacto no Labor', pat.impacto_labor, y, 16, pageWidth - 30);
    }
    if (pat.atividades_trabalho && pat.atividades_trabalho !== '-') {
      y = addFieldMultiline(doc, 'Atividades de Trabalho', pat.atividades_trabalho, y, 16, pageWidth - 30);
    }
    if (pat.saude_dificulta && pat.saude_dificulta !== '-' && pat.saude_dificulta === 'Sim') {
      y = addFieldMultiline(doc, 'Como Dificulta', pat.como_dificulta || '-', y, 16, pageWidth - 30);
    }
    y += 4;
  }

  if (data.afastamento) {
    const afs = data.afastamento;
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(FONTS.section);
    doc.setFont('helvetica', 'bold');
    doc.text('Afastamento e Tratamento', 16, y);
    y += 6;

    y = addField(doc, 'Data Afastamento', afs.data_afastamento || '-', y, 16, halfWidth - 5);
    y = addField(doc, 'Faz Tratamento', afs.faz_tratamento || '-', y - 8, 16 + halfWidth, halfWidth - 5);
    y += 8;

    if (afs.tipos_tratamento && afs.tipos_tratamento !== '-') {
      y = addFieldMultiline(doc, 'Tipos de Tratamento', afs.tipos_tratamento, y, 16, pageWidth - 30);
    }
    if (afs.tratamento_outro && afs.tratamento_outro !== '-') {
      y = addFieldMultiline(doc, 'Outro Tratamento', afs.tratamento_outro, y, 16, pageWidth - 30);
    }
    y = addField(doc, 'Possui Relatórios', afs.possui_relatorios || '-', y, 16, halfWidth - 5);
    y = addField(doc, 'Toma Medicações', afs.toma_medicacoes || '-', y - 8, 16 + halfWidth, halfWidth - 5);
    y += 8;

    if (afs.quais_medicacoes && afs.quais_medicacoes !== '-') {
      y = addFieldMultiline(doc, 'Medicações', afs.quais_medicacoes, y, 16, pageWidth - 30);
    }
    if (afs.medicacoes_efeitos === 'Sim' && afs.quais_efeitos && afs.quais_efeitos !== '-') {
      y = addFieldMultiline(doc, 'Efeitos Colaterais', afs.quais_efeitos, y, 16, pageWidth - 30);
    }
    y += 4;
  }

  if (data.documentos_medicos && data.documentos_medicos.length > 0) {
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(FONTS.section);
    doc.setFont('helvetica', 'bold');
    doc.text('Documentos Médicos', 16, y);
    y += 6;

    y = addTable(doc, ['Tipo', 'Data', 'Descrição'],
      data.documentos_medicos.map(d => [d.tipo, d.data, d.descricao]),
      y
    );
    y += 6;
  }

  if (data.atividade_rural) {
    const atv = data.atividade_rural;
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(FONTS.section);
    doc.setFont('helvetica', 'bold');
    doc.text('Atividade Rural', 16, y);
    y += 6;

    y = addField(doc, 'Zona de Residência', atv.zona || '-', y, 16, halfWidth - 5);
    y = addField(doc, 'Tempo Local', atv.tempo_local || '-', y - 8, 16 + halfWidth, halfWidth - 5);
    y += 8;

    if (atv.propriedades && atv.propriedades.length > 0) {
      y = addTable(doc, ['Propriedade', 'Proprietário', 'Período'],
        atv.propriedades.map(p => [p.nome, p.proprietario, p.periodo]),
        y
      );
    }
    y += 4;
  }

  if (data.documentacao) {
    const doc_ = data.documentacao;
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(FONTS.section);
    doc.setFont('helvetica', 'bold');
    doc.text('Documentação Rural', 16, y);
    y += 6;

    y = addField(doc, 'Possui DAP', doc_.dap || '-', y, 16, halfWidth - 5);
    y = addField(doc, 'Possui CAF', doc_.caf || '-', y - 8, 16 + halfWidth, halfWidth - 5);
    y += 8;
    y = addField(doc, 'Filiado ao Sindicato', doc_.filiado_sindicato || '-', y, 16, halfWidth - 5);
    y = addField(doc, 'Filiação Desde', doc_.filiado_desde || '-', y - 8, 16 + halfWidth, halfWidth - 5);
    y += 8;
  }

  if (data.testemunhas && data.testemunhas.length > 0) {
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(FONTS.section);
    doc.setFont('helvetica', 'bold');
    doc.text('Testemunhas', 16, y);
    y += 6;

    y = addTable(doc, ['Nome', 'CPF', 'Telefone', 'Relação', 'Período'],
      data.testemunhas.map(t => [t.nome, t.cpf, t.telefone, t.relacao, t.periodo]),
      y
    );
  }

  if (data.observacoes && data.observacoes !== '-') {
    y += 4;
    y = addFieldMultiline(doc, 'Observações', data.observacoes, y, 16, pageWidth - 30);
  }

  return y + 4;
}
