import { COLORS, FONTS, addField, addFieldMultiline, addTable } from '@/utils/pdfExporter';

export function AposentadoriaRuralSection(doc, data, y) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const halfWidth = (pageWidth - 28) / 2;

  if (data.residencia) {
    const res = data.residencia;
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(FONTS.section);
    doc.setFont('helvetica', 'bold');
    doc.text('Residência', 16, y);
    y += 6;

    y = addField(doc, 'Zona', res.zona || '-', y, 16, halfWidth - 5);
    y = addField(doc, 'Tempo no Local', res.tempo_local || '-', y - 8, 16 + halfWidth, halfWidth - 5);
    y += 8;
  }

  if (data.atividade) {
    const atv = data.atividade;
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(FONTS.section);
    doc.setFont('helvetica', 'bold');
    doc.text('Atividade Rural', 16, y);
    y += 6;

    y = addField(doc, 'Trabalha Exclusivamente', atv.trabalha_exclusivo || '-', y, 16, halfWidth - 5);
    y = addField(doc, 'Trabalha Desde', atv.trabalha_desde || '-', y - 8, 16 + halfWidth, halfWidth - 5);
    y += 8;
  }

  if (data.membros_familia && data.membros_familia.length > 0) {
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(FONTS.section);
    doc.setFont('helvetica', 'bold');
    doc.text('Membros da Família', 16, y);
    y += 6;

    y = addTable(doc, ['Nome', 'CPF', 'Parentesco', 'Trabalha na Roça'],
      data.membros_familia.map(m => [m.nome, m.cpf, m.parentesco, m.trabalha_roca]),
      y
    );
    y += 6;
  }

  if (data.propriedades && data.propriedades.length > 0) {
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(FONTS.section);
    doc.setFont('helvetica', 'bold');
    doc.text('Propriedades Trabalhadas', 16, y);
    y += 6;

    y = addTable(doc, ['Nome/Localização', 'Proprietário', 'Período', 'Atividades'],
      data.propriedades.map(p => [p.nome, p.proprietario, p.periodo, p.atividades]),
      y
    );
    y += 6;
  }

  if (data.documentacao) {
    const doc_ = data.documentacao;
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(FONTS.section);
    doc.setFont('helvetica', 'bold');
    doc.text('Documentação', 16, y);
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

    y = addTable(doc, ['Nome', 'CPF', 'Telefone', 'Relação', 'Período'],
      data.testemunhas.map(t => [t.nome, t.cpf, t.telefone, t.relacao, t.periodo]),
      y
    );
  }

  return y + 4;
}
