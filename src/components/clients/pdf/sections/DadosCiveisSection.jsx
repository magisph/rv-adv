import { COLORS, FONTS, addField, addFieldMultiline, addSectionTitle } from '@/utils/pdfExporter';

export function DadosCiveisSection(doc, dados, y) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const halfWidth = (pageWidth - 28) / 2;

  if (dados.parteAdversa) {
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(FONTS.section);
    doc.setFont('helvetica', 'bold');
    doc.text('Parte Adversa', 16, y);
    y += 6;

    y = addField(doc, 'Nome', dados.parteAdversa.nome || '-', y, 16, halfWidth - 5);
    y = addField(doc, 'CPF/CNPJ', dados.parteAdversa.cpfCnpj || '-', y - 8, 16 + halfWidth, halfWidth - 5);
    y += 8;

    y = addFieldMultiline(doc, 'Endereço', dados.parteAdversa.endereco || '-', y, 16, pageWidth - 30);
    y += 4;
  }

  if (dados.fatosCronologia) {
    y = addFieldMultiline(doc, 'Fatos e Cronologia', dados.fatosCronologia, y, 16, pageWidth - 30);
    y += 4;
  }

  if (dados.expectativaPedido) {
    y = addFieldMultiline(doc, 'Expectativa/Pedido', dados.expectativaPedido, y, 16, pageWidth - 30);
    y += 4;
  }

  if (dados.urgenciasRiscos) {
    y = addFieldMultiline(doc, 'Urgências e Riscos', dados.urgenciasRiscos, y, 16, pageWidth - 30);
    y += 4;
  }

  return y + 4;
}
