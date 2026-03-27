import jsPDF from 'jspdf';
import { format } from 'date-fns';

// ═══════════════════════════════════════════════════════════════════════════════
//                              CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

export const PAGE_CONFIG = {
  WIDTH: 210, // A4 width in mm
  HEIGHT: 297, // A4 height in mm
  MARGIN_LEFT: 14,
  MARGIN_RIGHT: 14,
  MARGIN_TOP: 30, // After header
  MARGIN_BOTTOM: 20,
  HEADER_HEIGHT: 25,
  FOOTER_HEIGHT: 10,
  AVAILABLE_HEIGHT: 297 - 30 - 20 - 25, // ~242mm per page
};

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
  section: 11,
  normal: 10,
  small: 8,
};

export const SPACING = {
  LINE_HEIGHT: 5,
  FIELD_SPACING: 7,
  SECTION_SPACING: 12,
  PARAGRAPH_SPACING: 6,
};

// ═══════════════════════════════════════════════════════════════════════════════
//                              HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
//                              PAGE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verifica se precisa de quebra de página e a executa se necessário
 * @param {jsPDF} doc - Instância do documento
 * @param {number} y - Posição Y atual
 * @param {number} neededSpace - Espaço necessário em mm
 * @param {Function} headerFn - Função para adicionar header na nova página
 * @param {string} headerTitle - Título para o header
 * @returns {number} Nova posição Y após quebra (se houver)
 */
export function checkPageBreak(doc, y, neededSpace = 20, headerFn = null, headerTitle = '') {
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxY = pageHeight - PAGE_CONFIG.MARGIN_BOTTOM;
  
  if (y + neededSpace > maxY) {
    doc.addPage();
    if (headerFn) {
      return headerFn(doc, headerTitle);
    }
    return PAGE_CONFIG.MARGIN_TOP;
  }
  return y;
}

/**
 * Quebra página explicitamente
 */
export function newPage(doc, headerFn = null, headerTitle = '') {
  doc.addPage();
  if (headerFn) {
    return headerFn(doc, headerTitle);
  }
  return PAGE_CONFIG.MARGIN_TOP;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              TEXT UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Quebra texto em linhas baseado na largura máxima
 */
export function wrapText(text, maxWidth, doc) {
  if (!text) return [''];
  
  const lines = [];
  const words = String(text).split(/\s+/);
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

/**
 * Trunca texto com ellipsis se necessário
 */
export function truncateText(text, maxWidth, doc) {
  if (!text) return '-';
  
  const str = String(text);
  const fullWidth = doc.getTextWidth(str);
  
  if (fullWidth <= maxWidth) {
    return str;
  }
  
  // Binary search for max chars
  let low = 0;
  let high = str.length;
  
  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    const testStr = str.substring(0, mid) + '...';
    if (doc.getTextWidth(testStr) <= maxWidth) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  
  return str.substring(0, low) + '...';
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              PDF CREATION
// ═══════════════════════════════════════════════════════════════════════════════

export function createPDF() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });
  return doc;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              HEADER & FOOTER
// ═══════════════════════════════════════════════════════════════════════════════

export function addHeader(doc, title) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header background
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, PAGE_CONFIG.HEADER_HEIGHT, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(FONTS.subtitle);
  doc.setFont('helvetica', 'bold');
  doc.text('FICHA DO CLIENTE', PAGE_CONFIG.MARGIN_LEFT, 10);

  // Client name
  doc.setFontSize(FONTS.small);
  doc.setFont('helvetica', 'normal');
  doc.text(title || '', PAGE_CONFIG.MARGIN_LEFT, 17);

  // Date
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(FONTS.small);
  doc.text(
    `Emitido em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 
    pageWidth - PAGE_CONFIG.MARGIN_RIGHT, 
    17, 
    { align: 'right' }
  );

  return PAGE_CONFIG.HEADER_HEIGHT + 5;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              SECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function addSectionTitle(doc, title, y) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Background bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(PAGE_CONFIG.MARGIN_LEFT, y, pageWidth - PAGE_CONFIG.MARGIN_LEFT - PAGE_CONFIG.MARGIN_RIGHT, 6, 'F');

  // Title text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(FONTS.section);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), PAGE_CONFIG.MARGIN_LEFT + 2, y + 4.5);

  return y + SPACING.SECTION_SPACING;
}

export function addSubSectionTitle(doc, title, y) {
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(FONTS.section);
  doc.setFont('helvetica', 'bold');
  doc.text(title, PAGE_CONFIG.MARGIN_LEFT, y);
  return y + SPACING.PARAGRAPH_SPACING;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              FIELDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Adiciona campo simples (label + valor) - COM truncamento
 */
export function addField(doc, label, value, y, x = PAGE_CONFIG.MARGIN_LEFT, width = null) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = width || (pageWidth - PAGE_CONFIG.MARGIN_LEFT - PAGE_CONFIG.MARGIN_RIGHT);
  
  // Label
  doc.setTextColor(...COLORS.textLight);
  doc.setFontSize(FONTS.small);
  doc.setFont('helvetica', 'normal');
  doc.text(label, x, y);

  // Value
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(FONTS.normal);
  doc.setFont('helvetica', 'bold');
  
  const displayValue = value ?? '-';
  const textWidth = maxWidth - 2;
  const truncated = truncateText(displayValue, textWidth, doc);
  doc.text(truncated, x, y + SPACING.LINE_HEIGHT);

  return y + SPACING.FIELD_SPACING;
}

/**
 * Adiciona campo simples (label + valor) - SEM truncamento para textos longos
 * Ideal para diagnósticos, CIF, descrições médicas, etc.
 */
export function addFieldValueOnly(doc, label, value, y, x = PAGE_CONFIG.MARGIN_LEFT, width = null, headerFn = null, headerTitle = '') {
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = width || (pageWidth - PAGE_CONFIG.MARGIN_LEFT - PAGE_CONFIG.MARGIN_RIGHT);
  
  // Label
  doc.setTextColor(...COLORS.textLight);
  doc.setFontSize(FONTS.small);
  doc.setFont('helvetica', 'normal');
  doc.text(label, x, y);

  // Value - sem truncamento
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(FONTS.normal);
  doc.setFont('helvetica', 'bold');
  
  const displayValue = value ?? '-';
  const lines = wrapText(displayValue, maxWidth - 2, doc);
  
  // Calcular espaço necessário para todas as linhas
  const neededSpace = lines.length * SPACING.LINE_HEIGHT + SPACING.FIELD_SPACING;
  y = checkPageBreak(doc, y, neededSpace, headerFn, headerTitle);
  
  let currentY = y + SPACING.LINE_HEIGHT;
  for (const line of lines) {
    doc.text(line, x, currentY);
    currentY += SPACING.LINE_HEIGHT;
  }

  return currentY + SPACING.PARAGRAPH_SPACING;
}

/**
 * Adiciona dois campos lado a lado (duas colunas)
 */
export function addFieldRow(doc, leftLabel, leftValue, rightLabel, rightValue, y) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const availableWidth = pageWidth - PAGE_CONFIG.MARGIN_LEFT - PAGE_CONFIG.MARGIN_RIGHT;
  const colWidth = availableWidth / 2 - 3;
  
  // Left field
  let y1 = addField(doc, leftLabel, leftValue, y, PAGE_CONFIG.MARGIN_LEFT, colWidth);
  
  // Right field
  let y2 = addField(doc, rightLabel, rightValue, y, PAGE_CONFIG.MARGIN_LEFT + colWidth + 6, colWidth);
  
  return Math.max(y1, y2);
}

/**
 * Adiciona campo multilinha (label + texto longo) com quebra de página automática
 * @param {jsPDF} doc - Instância do documento
 * @param {string} label - Rótulo do campo
 * @param {string} value - Valor do campo
 * @param {number} y - Posição Y atual
 * @param {number} x - Posição X (margem)
 * @param {number} width - Largura máxima do texto
 * @param {Function} headerFn - Função de header para nova página
 * @param {string} headerTitle - Título do header
 * @returns {number} Nova posição Y
 */
export function addFieldMultiline(doc, label, value, y, x = PAGE_CONFIG.MARGIN_LEFT, width = null, headerFn = null, headerTitle = '') {
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = width || (pageWidth - PAGE_CONFIG.MARGIN_LEFT - PAGE_CONFIG.MARGIN_RIGHT);
  
  // Label
  doc.setTextColor(...COLORS.textLight);
  doc.setFontSize(FONTS.small);
  doc.setFont('helvetica', 'normal');
  doc.text(label, x, y);
  
  y += 4;
  
  // Value
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(FONTS.normal);
  doc.setFont('helvetica', 'normal');
  
  const text = value || '-';
  const lines = wrapText(text, maxWidth, doc);
  
  // Verificar espaço total antes de desenhar
  const neededSpace = lines.length * SPACING.LINE_HEIGHT + SPACING.PARAGRAPH_SPACING;
  y = checkPageBreak(doc, y, neededSpace, headerFn, headerTitle);
  
  // Recalcular após possível quebra de página
  let currentY = y;
  
  for (const line of lines) {
    // Verificar quebra de página para cada linha
    currentY = checkPageBreak(doc, currentY, SPACING.LINE_HEIGHT, headerFn, headerTitle);
    doc.text(line, x, currentY);
    currentY += SPACING.LINE_HEIGHT;
  }
  
  return currentY + SPACING.PARAGRAPH_SPACING;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              TABLES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Adiciona tabela com headers e linhas
 */
export function addTable(doc, headers, rows, y, startX = PAGE_CONFIG.MARGIN_LEFT, headerFn = null, headerTitle = '') {
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = pageWidth - startX - PAGE_CONFIG.MARGIN_RIGHT;
  const colWidth = tableWidth / headers.length;
  const rowHeight = 6;
  
  // Header row
  doc.setFillColor(...COLORS.primary);
  doc.rect(startX, y, tableWidth, rowHeight, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(FONTS.small);
  doc.setFont('helvetica', 'bold');

  headers.forEach((header, i) => {
    const truncated = truncateText(header, colWidth - 4, doc);
    doc.text(truncated, startX + (i * colWidth) + 2, y + 4);
  });

  y += rowHeight;

  // Data rows
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(FONTS.small);
  doc.setFont('helvetica', 'normal');

  rows.forEach((row, rowIndex) => {
    // Check page break before drawing row
    y = checkPageBreak(doc, y, rowHeight, headerFn, headerTitle);
    
    // Alternating row background
    if (rowIndex % 2 === 0) {
      doc.setFillColor(...COLORS.background);
      doc.rect(startX, y, tableWidth, rowHeight, 'F');
    }

    doc.setTextColor(...COLORS.text);
    
    row.forEach((cell, i) => {
      const truncated = truncateText(String(cell || '-'), colWidth - 4, doc);
      doc.text(truncated, startX + (i * colWidth) + 2, y + 4);
    });

    y += rowHeight;
  });

  return y + SPACING.PARAGRAPH_SPACING;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              FOOTER / PAGINATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Adiciona numeração de páginas (rodapé) a todas as páginas do documento
 * @param {jsPDF} doc - Instância do documento
 */
export function addFooter(doc) {
  finalizeDocument(doc);
}

/**
 * Finaliza o documento adicionando rodapé com numeração de páginas
 * Deve ser chamado após todo o conteúdo ser adicionado
 * @param {jsPDF} doc - Instância do documento
 */
export function finalizeDocument(doc) {
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
      pageHeight - PAGE_CONFIG.FOOTER_HEIGHT,
      { align: 'center' }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

export function addSpacing(doc, y, space = SPACING.SECTION_SPACING) {
  return y + space;
}

export async function generatePDF(data, title = 'Cliente') {
  const doc = createPDF();
  return doc;
}

export function downloadPDF(doc, filename) {
  doc.save(filename);
}
