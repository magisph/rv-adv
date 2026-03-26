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

    if (pat.historico && pat.historico !== '-') {
      y = addFieldMultiline(doc, 'Histórico dos Sintomas', pat.historico, y, 16, pageWidth - 30);
    }
    if (pat.impacto && pat.impacto !== '-') {
      y = addFieldMultiline(doc, 'Impacto na Vida/Labor', pat.impacto, y, 16, pageWidth - 30);
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
    if (afs.tratamentos && afs.tratamentos !== '-') {
      y = addFieldMultiline(doc, 'Tratamentos', afs.tratamentos, y, 16, pageWidth - 30);
    }
    if (afs.medicacoes && afs.medicacoes !== '-') {
      y = addFieldMultiline(doc, 'Medicações', afs.medicacoes, y, 16, pageWidth - 30);
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

    if (atv.propriedades && atv.propriedades.length > 0) {
      y += 4;
      y = addTable(doc, ['Propriedade', 'Período'],
        atv.propriedades.map(p => [p.nome, p.periodo]),
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

    y = addField(doc, 'Possui DAP/CAF', doc_.dap_caf || '-', y, 16, halfWidth - 5);
    y = addField(doc, 'Filiado ao Sindicato', doc_.filiado_sindicato || '-', y - 8, 16 + halfWidth, halfWidth - 5);
    y += 8;
  }

  if (data.testemunhas && data.testemunhas.length > 0) {
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(FONTS.section);
    doc.setFont('helvetica', 'bold');
    doc.text('Testemunhas', 16, y);
    y += 6;

    y = addTable(doc, ['Nome', 'CPF', 'Telefone', 'Relação'],
      data.testemunhas.map(t => [t.nome, t.cpf, t.telefone, t.relacao]),
      y
    );
  }

  return y + 4;
}
