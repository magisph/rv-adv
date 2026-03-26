import { COLORS, FONTS, addField, addFieldMultiline } from '@/utils/pdfExporter';

export function ContatoSection(doc, data, y) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const halfWidth = (pageWidth - 28) / 2;

  y = addField(doc, 'E-mail', data.email || '-', y, 16, halfWidth - 5);
  y = addField(doc, 'Telefone', data.phone || '-', y - 8, 16 + halfWidth, halfWidth - 5);
  y += 8;

  y = addFieldMultiline(doc, 'Endereço Completo', data.address || '-', y, 16, halfWidth * 2 - 5);

  y = addField(doc, 'CEP', data.zip_code || '-', y, 16, halfWidth - 5);
  y = addField(doc, 'Cidade', data.city || '-', y - 8, 16 + halfWidth, halfWidth - 5);
  y += 8;

  y = addField(doc, 'Estado', data.state || '-', y, 16, halfWidth - 5);

  return y + 4;
}
