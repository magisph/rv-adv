import { COLORS, FONTS, addField } from '@/utils/pdfExporter';

export function PensaoMorteSection(doc, data, y) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const halfWidth = (pageWidth - 28) / 2;

  if (data.falecido) {
    const fal = data.falecido;
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(FONTS.section);
    doc.setFont('helvetica', 'bold');
    doc.text('Dados do Falecido', 16, y);
    y += 6;

    y = addField(doc, 'Nome', fal.nome || '-', y, 16, pageWidth - 30);
    y = addField(doc, 'Data do Óbito', fal.data_obito || '-', y, 16, halfWidth - 5);
    y = addField(doc, 'Grau de Parentesco', fal.grau_parentesco || '-', y - 8, 16 + halfWidth, halfWidth - 5);
    y += 8;
  }

  return y + 4;
}
