import { COLORS, FONTS, addField, addFieldMultiline, addTable } from '@/utils/pdfExporter';

export function SalarioMaternidadeRuralSection(doc, data, y) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const halfWidth = (pageWidth - 28) / 2;

  if (data.maternidade) {
    const mat = data.maternidade;
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(FONTS.section);
    doc.setFont('helvetica', 'bold');
    doc.text('Informações de Maternidade', 16, y);
    y += 6;

    y = addField(doc, 'Tipo de Evento', mat.tipo_evento || '-', y, 16, halfWidth - 5);
    y = addField(doc, 'Data do Parto', mat.data_parto || '-', y - 8, 16 + halfWidth, halfWidth - 5);
    y += 8;

    y = addField(doc, 'Gestante', mat.gestante || '-', y, 16, halfWidth - 5);
    y = addField(doc, 'Tipo de Parto', mat.tipo_parto || '-', y - 8, 16 + halfWidth, halfWidth - 5);
    y += 8;

    y = addField(doc, 'Filhos', mat.filhos || '-', y, 16, halfWidth - 5);
    if (mat.complicacoes && mat.complicacoes !== '-') {
      y = addFieldMultiline(doc, 'Complicações', mat.complicacoes, y, 16, pageWidth - 30);
    }
    y += 4;
  }

  if (data.atividade_rural) {
    const atv = data.atividade_rural;
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(FONTS.section);
    doc.setFont('helvetica', 'bold');
    doc.text('Atividade Rural', 16, y);
    y += 6;

    y = addField(doc, 'Zona', atv.zona || '-', y, 16, halfWidth - 5);
    y = addField(doc, 'Tempo no Local', atv.tempo_local || '-', y - 8, 16 + halfWidth, halfWidth - 5);
    y += 8;

    y = addField(doc, 'Trabalha Desde', atv.trabalha_desde || '-', y, 16, halfWidth - 5);

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
