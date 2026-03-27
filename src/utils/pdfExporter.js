import jsPDF from 'jspdf';
import { format } from 'date-fns';

export const COLORS = {
  primary: [30, 58, 95],
  secondary: [100, 116, 139],
  success: [22, 163, 74],
  warning: [245, 158, 11],
  danger: [220, 38, 38],
  background: [248, 250, 252],
  white: [255, 255, 255],
  border: [226, 232, 240],
  text: [30, 41, 59],
  textLight: [100, 116, 139],
};

export const FONTS = {
  title: 18,
  subtitle: 14,
  section: 12,
  normal: 10,
  small: 8,
};

export function formatDate(date) {
  if (!date) return '-';
  try {
    return format(new Date(date), 'dd/MM/yyyy');
  } catch {
    return '-';
  }
}

export function formatCPF(value) {
  if (!value) return '-';
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return value;
}

export function formatCurrency(value) {
  if (value === null || value === undefined) return '-';
  const num = parseFloat(value);
  if (isNaN(num)) return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
}

export function formatBoolean(value) {
  if (value === true || value === 'Sim' || value === 'sim') return 'Sim';
  if (value === false || value === 'Não' || value === 'nao') return 'Não';
  return value || '-';
}

export function formatLabel(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^\w/, c => c.toUpperCase())
    .trim();
}

export function wrapText(text, maxWidth, doc) {
  if (!text) return [''];
  const lines = [];
  const words = String(text).split(' ');
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = doc.getTextWidth(testLine);

    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [''];
}

export function createPDF() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  // jsPDF handles page breaks automatically
  return doc;
}

export function addHeader(doc, title) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 25, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(FONTS.subtitle);
  doc.setFont('helvetica', 'bold');
  doc.text('FICHA DO CLIENTE', 14, 10);

  doc.setFontSize(FONTS.small);
  doc.setFont('helvetica', 'normal');
  doc.text(title || '', 14, 17);

  doc.setTextColor(...COLORS.textLight);
  doc.setFontSize(FONTS.small);
  doc.text(`Emitido em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - 14, 17, { align: 'right' });

  return 25;
}

export function addSectionTitle(doc, title, y) {
  doc.setFillColor(...COLORS.background);
  doc.rect(14, y, doc.internal.pageSize.getWidth() - 28, 8, 'F');

  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(FONTS.section);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), 16, y + 5.5);

  return y + 10;
}

export function addField(doc, label, value, y, x = 14, width = 90) {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setTextColor(...COLORS.textLight);
  doc.setFontSize(FONTS.small);
  doc.setFont('helvetica', 'normal');
  doc.text(label, x, y);

  doc.setTextColor(...COLORS.text);
  doc.setFontSize(FONTS.normal);
  doc.setFont('helvetica', 'bold');
  const displayValue = value ?? '-';
  doc.text(String(displayValue).substring(0, 50), x, y + 4);

  return y + 8;
}

export function addFieldMultiline(doc, label, value, y, x = 14, width = 180) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightMargin = pageWidth - 14;

  doc.setTextColor(...COLORS.textLight);
  doc.setFontSize(FONTS.small);
  doc.setFont('helvetica', 'normal');
  doc.text(label, x, y);

  y += 4;
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(FONTS.normal);

  const text = value || '-';
  const lines = wrapText(text, width, doc);

  for (const line of lines) {
    doc.setFont('helvetica', 'normal');
    doc.text(line, x, y);
    y += 4;
  }

  return y + 4;
}

export function addTable(doc, headers, rows, y, startX = 14) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const colWidth = (pageWidth - 28) / headers.length;

  doc.setFillColor(...COLORS.primary);
  doc.rect(startX, y, pageWidth - 28, 6, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(FONTS.small);
  doc.setFont('helvetica', 'bold');

  headers.forEach((header, i) => {
    doc.text(header.substring(0, 20), startX + (i * colWidth) + 2, y + 4);
  });

  y += 6;

  rows.forEach((row, rowIndex) => {
    if (rowIndex % 2 === 0) {
      doc.setFillColor(...COLORS.background);
      doc.rect(startX, y, pageWidth - 28, 6, 'F');
    }

    doc.setTextColor(...COLORS.text);
    doc.setFontSize(FONTS.small);
    doc.setFont('helvetica', 'normal');

    row.forEach((cell, i) => {
      doc.text(String(cell || '-').substring(0, 25), startX + (i * colWidth) + 2, y + 4);
    });

    y += 6;
  });

  return y + 4;
}

export function addFooter(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setTextColor(...COLORS.textLight);
  doc.setFontSize(FONTS.small);
  doc.setFont('helvetica', 'normal');

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }
}

export async function generatePDF(data, title = 'Cliente') {
  const doc = createPDF();
  return doc;
}

export function downloadPDF(doc, filename) {
  doc.save(filename);
}
