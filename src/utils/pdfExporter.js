import jsPDF from 'jspdf';
import { format } from 'date-fns';

// ═══════════════════════════════════════════════════════════════════════════════
//                              CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

export const PAGE_CONFIG = {
  WIDTH: 210,           // A4 width em mm
  HEIGHT: 297,           // A4 height em mm
  MARGIN_TOP: 20,
  MARGIN_BOTTOM: 20,
  MARGIN_LEFT: 14,
  MARGIN_RIGHT: 14,
  CONTENT_WIDTH: 210 - 14 - 14, // = 182mm
  HEADER_HEIGHT: 25,
  FOOTER_HEIGHT: 10,
};

export const COLORS = {
  PRIMARY: [41, 98, 255],    // Azul
  SECONDARY: [69, 90, 100],  // Cinza azulado
  TABLE_HEADER: [241, 245, 249],
  TABLE_BORDER: [203, 213, 225],
  WHITE: [255, 255, 255],
  TEXT: [30, 41, 59],
  TEXT_LIGHT: [100, 116, 139],
  BACKGROUND: [248, 250, 252],
};

/**
 * [FIX: Padronização Tipográfica]
 * Fonte única de verdade para estilos tipográficos.
 * - font-family: helvetica (uniforme em todo o documento)
 * - line-height: SPACING.LINE_HEIGHT (equivalente a ~1.5 em 10pt)
 * - font-size base: BODY.size = 10pt
 * - Pesos: SUBTITLE/TITLE = bold (rótulos de seção), BODY = normal (valores)
 */
export const FONTS = {
  TITLE: { size: 14, style: 'bold' },
  SUBTITLE: { size: 11, style: 'bold' },
  BODY: { size: 10, style: 'normal' },
  SMALL: { size: 8, style: 'normal' }
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
 * [FIX: Quebra de Página (Paging)]
 * Verifica se o bloco de conteúdo cabe na página atual.
 * Se não couber, adiciona nova página e redesenha o header.
 * Equivale a `break-inside: avoid` / `page-break-inside: avoid` do CSS.
 *
 * @param {jsPDF} doc - Instância do documento
 * @param {number} y - Posição Y atual
 * @param {number} neededSpace - Altura exata do bloco que será renderizado (em mm)
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
 * [FIX: Gestão de Overflow e Truncamento]
 * Quebra texto em múltiplas linhas baseado na largura máxima.
 * Equivale a `white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word`.
 * Garante que o texto nunca seja cortado — sempre flui para novas linhas.
 */
export function wrapText(text, maxWidth, doc) {
  const str = String(text || '').trim();
  if (!str) return [''];

  const lines = [];
  const words = str.split(/\s+/);
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
 * [FIX: Gestão de Overflow e Truncamento]
 * Trunca texto com reticências — uso restrito a cabeçalhos de tabela
 * onde o espaço é fixo. Para campos de texto longo, usar wrapText.
 */
export function truncateText(text, maxWidth, doc) {
  const str = String(text || '').trim();
  if (!str) return '';

  const fullWidth = doc.getTextWidth(str);

  if (fullWidth <= maxWidth) {
    return str;
  }

  if (maxWidth < doc.getTextWidth('...')) {
    return '';
  }

  let low = 0;
  let high = str.length;
  let bestFit = '';

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const testStr = str.substring(0, mid);
    const testWidth = doc.getTextWidth(testStr + '...');

    if (testWidth <= maxWidth) {
      bestFit = testStr;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return bestFit + '...';
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
  doc.setFillColor(COLORS.PRIMARY[0], COLORS.PRIMARY[1], COLORS.PRIMARY[2]);
  doc.rect(0, 0, pageWidth, PAGE_CONFIG.HEADER_HEIGHT, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(FONTS.SUBTITLE.size);
  doc.setFont('helvetica', FONTS.SUBTITLE.style);
  doc.text('FICHA DO CLIENTE', PAGE_CONFIG.MARGIN_LEFT, 10);

  // Client name
  doc.setFontSize(FONTS.SMALL.size);
  doc.setFont('helvetica', FONTS.SMALL.style);
  doc.text(title || '', PAGE_CONFIG.MARGIN_LEFT, 17);

  // Date
  doc.setTextColor(COLORS.WHITE[0], COLORS.WHITE[1], COLORS.WHITE[2]);
  doc.setFontSize(FONTS.SMALL.size);
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

/**
 * [FIX: Quebra de Página]
 * Adiciona título de seção com barra de fundo.
 * Usa checkPageBreak com espaço suficiente para o título + primeiras linhas
 * do conteúdo seguinte, evitando títulos órfãos no fim da página.
 */
export function addSectionTitle(doc, title, y, x = PAGE_CONFIG.MARGIN_LEFT, addHeaderFn = null, headerTitle = '') {
  // Garantir que o título + pelo menos 2 campos caibam na página
  const minBlockHeight = SPACING.SECTION_SPACING + (SPACING.FIELD_SPACING * 2);
  y = checkPageBreak(doc, y, minBlockHeight, addHeaderFn, headerTitle);

  const pageWidth = doc.internal.pageSize.getWidth();

  // Background bar
  doc.setFillColor(COLORS.PRIMARY[0], COLORS.PRIMARY[1], COLORS.PRIMARY[2]);
  doc.rect(x, y, pageWidth - x - PAGE_CONFIG.MARGIN_RIGHT, 6, 'F');

  // Title text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(FONTS.SUBTITLE.size);
  doc.setFont('helvetica', FONTS.SUBTITLE.style);
  doc.text(title.toUpperCase(), x + 2, y + 4.5);

  return y + SPACING.SECTION_SPACING;
}

export function addSubSectionTitle(doc, title, y) {
  doc.setTextColor(COLORS.PRIMARY[0], COLORS.PRIMARY[1], COLORS.PRIMARY[2]);
  doc.setFontSize(FONTS.SUBTITLE.size);
  doc.setFont('helvetica', FONTS.SUBTITLE.style);
  doc.text(title, PAGE_CONFIG.MARGIN_LEFT, y);
  return y + SPACING.PARAGRAPH_SPACING;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              FIELDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * [FIX: Gestão de Overflow — substituição de truncateText por wrapText]
 * [FIX: Padronização Tipográfica — valores usam font-weight normal]
 * [FIX: Espaçamento e Layout — altura dinâmica baseada no número de linhas]
 *
 * Adiciona campo simples (label + valor) com quebra de linha automática.
 * Anteriormente usava truncateText que cortava o texto com "...".
 * Agora usa wrapText para garantir que todo o conteúdo seja exibido.
 *
 * @param {jsPDF} doc - Instância do documento
 * @param {string} label - Rótulo do campo
 * @param {*} value - Valor do campo
 * @param {number} y - Posição Y atual
 * @param {number} x - Posição X (margem)
 * @param {number} width - Largura máxima
 * @param {Function} addHeaderFn - Função de header para nova página
 * @param {string} headerTitle - Título do header
 * @returns {number} Nova posição Y após o campo
 */
export function addField(doc, label, value, y, x = PAGE_CONFIG.MARGIN_LEFT, width = null, addHeaderFn = null, headerTitle = '') {
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = width || (pageWidth - PAGE_CONFIG.MARGIN_LEFT - PAGE_CONFIG.MARGIN_RIGHT);

  // Label — fonte pequena, cor clara (rótulo)
  doc.setTextColor(...COLORS.TEXT_LIGHT);
  doc.setFontSize(FONTS.SMALL.size);
  doc.setFont('helvetica', FONTS.SMALL.style);
  doc.text(label, x, y);

  // Value — fonte normal, cor escura (valor)
  // [FIX: Padronização Tipográfica] Alterado de 'bold' para 'normal'
  // para manter consistência: rótulos de seção = bold, valores = normal
  doc.setTextColor(COLORS.TEXT[0], COLORS.TEXT[1], COLORS.TEXT[2]);
  doc.setFontSize(FONTS.BODY.size);
  doc.setFont('helvetica', 'normal');

  const displayValue = (value === null || value === undefined || String(value).trim() === '') ? '-' : String(value);

  // [FIX: Gestão de Overflow] Substituído truncateText por wrapText
  // O texto agora flui para novas linhas em vez de ser cortado com "..."
  const lines = wrapText(displayValue, maxWidth - 2, doc);

  let currentY = y + SPACING.LINE_HEIGHT;

  for (const line of lines) {
    // [FIX: Quebra de Página] Verifica quebra de página para cada linha
    currentY = checkPageBreak(doc, currentY, SPACING.LINE_HEIGHT, addHeaderFn, headerTitle);
    doc.text(line, x, currentY);
    currentY += SPACING.LINE_HEIGHT;
  }

  // [FIX: Espaçamento] Retorna posição Y dinâmica baseada no conteúdo real
  return currentY + SPACING.PARAGRAPH_SPACING;
}

/**
 * [FIX: Padronização Tipográfica — valores usam font-weight normal]
 *
 * Adiciona campo simples (label + valor) - SEM truncamento para textos longos.
 * Ideal para diagnósticos, CIF, descrições médicas, etc.
 */
export function addFieldValueOnly(doc, label, value, y, x = PAGE_CONFIG.MARGIN_LEFT, width = null, headerFn = null, headerTitle = '') {
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = width || (pageWidth - PAGE_CONFIG.MARGIN_LEFT - PAGE_CONFIG.MARGIN_RIGHT);

  // Não polui visualmente se estiver vazio
  if (!value || String(value).trim() === '' || value === '[NÃO INFORMADO]') {
    value = '-';
  }

  // Label
  doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
  doc.setFontSize(FONTS.SMALL.size);
  doc.setFont('helvetica', FONTS.SMALL.style);
  doc.text(label, x, y);

  // Value - sem truncamento
  // [FIX: Padronização Tipográfica] Alterado de 'bold' para 'normal'
  doc.setTextColor(COLORS.TEXT[0], COLORS.TEXT[1], COLORS.TEXT[2]);
  doc.setFontSize(FONTS.BODY.size);
  doc.setFont('helvetica', 'normal');

  const displayValue = value;
  const lines = wrapText(displayValue, maxWidth - 2, doc);

  let currentY = y + SPACING.LINE_HEIGHT;

  for (const line of lines) {
    currentY = checkPageBreak(doc, currentY, SPACING.LINE_HEIGHT, headerFn, headerTitle);
    doc.text(line, x, currentY);
    currentY += SPACING.LINE_HEIGHT;
  }

  return currentY + SPACING.PARAGRAPH_SPACING;
}

/**
 * [FIX: Espaçamento e Layout — cálculo de altura dinâmica para duas colunas]
 * [FIX: Quebra de Página — verifica se o bloco inteiro cabe antes de renderizar]
 *
 * Adiciona dois campos lado a lado (duas colunas).
 * Calcula previamente a altura de ambos os campos e usa o maior valor
 * para verificar a quebra de página, evitando sobreposição.
 *
 * @param {jsPDF} doc - Instância do documento
 * @param {string} leftLabel - Rótulo do campo esquerdo
 * @param {*} leftValue - Valor do campo esquerdo
 * @param {string} rightLabel - Rótulo do campo direito
 * @param {*} rightValue - Valor do campo direito
 * @param {number} y - Posição Y atual
 * @param {Function} addHeaderFn - Função de header para nova página
 * @param {string} headerTitle - Título do header
 * @returns {number} Nova posição Y após os campos
 */
export function addFieldRow(doc, leftLabel, leftValue, rightLabel, rightValue, y, addHeaderFn = null, headerTitle = '') {
  const pageWidth = doc.internal.pageSize.getWidth();
  const availableWidth = pageWidth - PAGE_CONFIG.MARGIN_LEFT - PAGE_CONFIG.MARGIN_RIGHT;
  const colWidth = availableWidth / 2 - 3;

  // [FIX: Espaçamento] Pré-calcular a altura de cada coluna para evitar sobreposição
  // Simula a renderização para determinar quantas linhas cada campo ocupará
  doc.setFontSize(FONTS.BODY.size);
  doc.setFont('helvetica', 'normal');
  const linesLeft = wrapText(String(leftValue || '-'), colWidth - 2, doc);
  const linesRight = wrapText(String(rightValue || '-'), colWidth - 2, doc);

  // Altura = label (LINE_HEIGHT) + valor (n linhas * LINE_HEIGHT) + espaçamento
  const heightLeft = SPACING.LINE_HEIGHT + (linesLeft.length * SPACING.LINE_HEIGHT) + SPACING.PARAGRAPH_SPACING;
  const heightRight = SPACING.LINE_HEIGHT + (linesRight.length * SPACING.LINE_HEIGHT) + SPACING.PARAGRAPH_SPACING;
  const neededSpace = Math.max(heightLeft, heightRight);

  // [FIX: Quebra de Página] Verifica se o bloco inteiro cabe antes de renderizar
  y = checkPageBreak(doc, y, neededSpace, addHeaderFn, headerTitle);

  // Renderizar os campos usando addField (já com wrapText e altura dinâmica)
  const finalYLeft = addField(doc, leftLabel, leftValue, y, PAGE_CONFIG.MARGIN_LEFT, colWidth, addHeaderFn, headerTitle);
  const finalYRight = addField(doc, rightLabel, rightValue, y, PAGE_CONFIG.MARGIN_LEFT + colWidth + 6, colWidth, addHeaderFn, headerTitle);

  return Math.max(finalYLeft, finalYRight);
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

  // Limpeza de campos vazios ou poluídos
  if (!value || String(value).trim() === '' || value === '[NÃO INFORMADO]') {
    value = '-';
  }

  // Label
  doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
  doc.setFontSize(FONTS.SMALL.size);
  doc.setFont('helvetica', FONTS.SMALL.style);
  doc.text(label, x, y);

  y += 4;

  // Value
  doc.setTextColor(COLORS.TEXT[0], COLORS.TEXT[1], COLORS.TEXT[2]);
  doc.setFontSize(FONTS.BODY.size);
  doc.setFont('helvetica', 'normal');

  const text = value;
  const lines = wrapText(text, maxWidth, doc);

  let currentY = y;

  for (const line of lines) {
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
 * Adiciona tabela com headers e linhas.
 * Nota: truncateText é mantido apenas para cabeçalhos de tabela onde o espaço
 * é fixo e limitado. Para dados de célula, usa-se truncateText por limitação
 * de espaço em colunas fixas.
 */
export function addTable(doc, headers, rows, y, startX = PAGE_CONFIG.MARGIN_LEFT, headerFn = null, headerTitle = '') {
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = pageWidth - startX - PAGE_CONFIG.MARGIN_RIGHT;
  const colWidth = tableWidth / headers.length;
  const rowHeight = 6;

  // Header row
  doc.setFillColor(COLORS.PRIMARY[0], COLORS.PRIMARY[1], COLORS.PRIMARY[2]);
  doc.rect(startX, y, tableWidth, rowHeight, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(FONTS.SMALL.size);
  doc.setFont('helvetica', 'bold');

  headers.forEach((header, i) => {
    const truncated = truncateText(header, colWidth - 4, doc);
    doc.text(truncated, startX + (i * colWidth) + 2, y + 4);
  });

  y += rowHeight;

  // Data rows
  doc.setTextColor(COLORS.TEXT[0], COLORS.TEXT[1], COLORS.TEXT[2]);
  doc.setFontSize(FONTS.SMALL.size);
  doc.setFont('helvetica', 'normal');

  rows.forEach((row, rowIndex) => {
    // Check page break before drawing row
    y = checkPageBreak(doc, y, rowHeight, headerFn, headerTitle);

    // Alternating row background
    if (rowIndex % 2 === 0) {
      doc.setFillColor(COLORS.BACKGROUND[0], COLORS.BACKGROUND[1], COLORS.BACKGROUND[2]);
      doc.rect(startX, y, tableWidth, rowHeight, 'F');
    }

    doc.setTextColor(COLORS.TEXT[0], COLORS.TEXT[1], COLORS.TEXT[2]);

    row.forEach((cell, i) => {
      const val = (cell === null || cell === undefined || String(cell).trim() === '') ? '-' : cell;
      const truncated = truncateText(String(val), colWidth - 4, doc);
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

  doc.setTextColor(COLORS.TEXT_LIGHT[0], COLORS.TEXT_LIGHT[1], COLORS.TEXT_LIGHT[2]);
  doc.setFontSize(FONTS.SMALL.size);
  doc.setFont('helvetica', 'normal');

  const pageCount = doc.getNumberOfPages();
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
