import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { extractClientData } from '@/utils/clientDataExtractor';
import { 
  addHeader, 
  addSectionTitle, 
  addFooter,
  addFieldValueOnly,
  checkPageBreak,
  PAGE_CONFIG,
  SPACING
} from '@/utils/pdfExporter';
import { InfoPessoaisSection } from './sections/InfoPessoaisSection';
import { ContatoSection } from './sections/ContatoSection';
import { InfoPreliminaresSection } from './sections/InfoPreliminaresSection';
import { DadosCiveisSection } from './sections/DadosCiveisSection';
import { BPCLoasSection } from './sections/beneficios/BPCLoasSection';
import { AposentadoriaRuralSection } from './sections/beneficios/AposentadoriaRuralSection';
import { IncapacidadeRuralSection } from './sections/beneficios/IncapacidadeRuralSection';
import { SalarioMaternidadeRuralSection } from './sections/beneficios/SalarioMaternidadeRuralSection';
import { PensaoMorteSection } from './sections/beneficios/PensaoMorteSection';

export function generateClientPDF(client, beneficios = []) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const clientData = extractClientData(client, beneficios);
  if (!clientData) {
    throw new Error('Dados do cliente não disponíveis');
  }

  // ═══ PÁGINA 1: INFORMAÇÕES PESSOAIS ═══
  let y = addHeader(doc, clientData.client.full_name);
  y = addSectionTitle(doc, '1. Informações Pessoais', y);
  y = InfoPessoaisSection(doc, clientData.client, y);

  // ═══ PÁGINA 2: CONTATO E ENDEREÇO (+ Preliminares se não for Cível) ═══
  doc.addPage();
  y = addHeader(doc, clientData.client.full_name);
  y = addSectionTitle(doc, '2. Contato e Endereço', y);
  y = ContatoSection(doc, clientData.client, y);

  // Informações Preliminares (apenas para não-Cível)
  if (clientData.client.area_atuacao !== 'Cível') {
    y += SPACING.SECTION_SPACING;
    y = addSectionTitle(doc, '3. Informações Preliminares', y);
    y = InfoPreliminaresSection(doc, clientData.client, y);
  }

  // Dados Cíveis (apenas para Cível)
  if (clientData.client.area_atuacao === 'Cível' && clientData.client.dados_civeis) {
    doc.addPage();
    y = addHeader(doc, clientData.client.full_name);
    y = addSectionTitle(doc, '4. Dados do Processo Cível', y);
    y = DadosCiveisSection(doc, clientData.client.dados_civeis, y);
  }

  // ═══ BENEFÍCIOS (páginas 3+) ═══
  if (clientData.beneficios && clientData.beneficios.length > 0) {
    clientData.beneficios.forEach((beneficio, index) => {
      // Verificar quebra de página antes de iniciar novo benefício (evitar órfãos)
      y = checkPageBreak(doc, y, 50, addHeader, clientData.client.full_name);
      
      // Nova página para cada benefício
      doc.addPage();
      y = addHeader(doc, clientData.client.full_name);
      y = addSectionTitle(doc, `Benefício: ${beneficio.tipo_beneficio}`, y);

      // Subtítulo com status e informações usando addFieldValueOnly
      const infoLine = [
        `Status: ${beneficio.status}`,
        `NB: ${beneficio.numero_beneficio || '-'}`,
        `Criado em: ${beneficio.created_at}`
      ].join(' | ');
      
      y = addFieldValueOnly(doc, '', infoLine, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeader, clientData.client.full_name);

      // Renderizar seção específica conforme tipo
      const tipo = beneficio.tipo_beneficio_original || '';
      
      switch (tipo) {
        case 'bpc_loas_idoso':
        case 'bpc_loas_pcd':
          y = BPCLoasSection(doc, beneficio.dados, y, addHeader, clientData.client.full_name);
          break;
        case 'aposentadoria_idade_rural':
          y = AposentadoriaRuralSection(doc, beneficio.dados, y, addHeader, clientData.client.full_name);
          break;
        case 'incapacidade_rural':
          y = IncapacidadeRuralSection(doc, beneficio.dados, y, addHeader, clientData.client.full_name);
          break;
        case 'salario_maternidade_rural':
          y = SalarioMaternidadeRuralSection(doc, beneficio.dados, y, addHeader, clientData.client.full_name);
          break;
        case 'pensao_morte_rural':
        case 'pensao_morte_urbano':
          y = PensaoMorteSection(doc, beneficio.dados, y, addHeader, clientData.client.full_name);
          break;
        case 'aposentadoria_idade_urbano':
        case 'incapacidade_urbano':
        case 'salario_maternidade_urbano':
        case 'outros_urbano':
          y = addFieldValueOnly(doc, 'Informações:', beneficio.dados?.informacoes || 'Dados não disponíveis', y, PAGE_CONFIG.MARGIN_LEFT, null, addHeader, clientData.client.full_name);
          break;
        default:
          doc.setTextColor(30, 41, 59);
          doc.setFontSize(10);
          doc.text(`Tipo de benefício: ${tipo}`, PAGE_CONFIG.MARGIN_LEFT, y);
          y += 6;
          doc.text('Informações adicionais não disponíveis.', PAGE_CONFIG.MARGIN_LEFT, y);
          y += 10;
      }

      // Observações do benefício
      if (beneficio.observacoes) {
        y += 4;
        y = checkPageBreak(doc, y, 20, addHeader, clientData.client.full_name);
        y = addFieldValueOnly(doc, 'Observações:', beneficio.observacoes, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeader, clientData.client.full_name);
      }
    });
  }

  // ═══ RODAPÉ ═══
  addFooter(doc);

  // ═══ DOWNLOAD ═══
  const filename = `ficha_cliente_${clientData.client.full_name?.replace(/\s+/g, '_') || 'cliente'}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(filename);

  return doc;
}


