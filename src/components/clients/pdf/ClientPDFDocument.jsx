import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { extractClientData } from '@/utils/clientDataExtractor';
import { 
  COLORS, 
  FONTS, 
  addHeader, 
  addSectionTitle, 
  addField, 
  addFieldMultiline, 
  addTable,
  addFooter 
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

  const pageWidth = doc.internal.pageSize.getWidth();
  const rightMargin = pageWidth - 14;
  let y = 0;

  const clientData = extractClientData(client, beneficios);
  if (!clientData) {
    throw new Error('Dados do cliente não disponíveis');
  }

  doc.addFont('helvetica', 'normal', 'normal');
  doc.addFont('helvetica', 'bold', 'bold');

  y = addHeader(doc, clientData.client.full_name);

  y = addSectionTitle(doc, '1. Informações Pessoais', y);
  y = InfoPessoaisSection(doc, clientData.client, y);

  doc.addPage();
  y = addHeader(doc, clientData.client.full_name);

  y = addSectionTitle(doc, '2. Contato e Endereço', y);
  y = ContatoSection(doc, clientData.client, y);

  if (clientData.client.area_atuacao !== 'Cível') {
    y += 6;
    y = addSectionTitle(doc, '3. Informações Preliminares', y);
    y = InfoPreliminaresSection(doc, clientData.client, y);
  }

  if (clientData.client.area_atuacao === 'Cível' && clientData.client.dados_civeis) {
    doc.addPage();
    y = addHeader(doc, clientData.client.full_name);
    y = addSectionTitle(doc, '4. Dados do Processo Cível', y);
    y = DadosCiveisSection(doc, clientData.client.dados_civeis, y);
  }

  if (clientData.beneficios && clientData.beneficios.length > 0) {
    clientData.beneficios.forEach((beneficio, index) => {
      doc.addPage();
      y = addHeader(doc, clientData.client.full_name);
      y = addSectionTitle(doc, `4. Benefício: ${beneficio.tipo_beneficio}`, y);

      doc.setTextColor(...COLORS.textLight);
      doc.setFontSize(FONTS.small);
      doc.setFont('helvetica', 'normal');
      doc.text(`Status: ${beneficio.status} | NB: ${beneficio.numero_beneficio || '-'} | Criado em: ${beneficio.created_at}`, 16, y);
      y += 8;

      const tipo = beneficio.tipo_beneficio || '';
      switch (tipo) {
        case 'bpc_loas_idoso':
        case 'bpc_loas_pcd':
          y = BPCLoasSection(doc, beneficio.dados, y);
          break;
        case 'aposentadoria_idade_rural':
          y = AposentadoriaRuralSection(doc, beneficio.dados, y);
          break;
        case 'incapacidade_rural':
          y = IncapacidadeRuralSection(doc, beneficio.dados, y);
          break;
        case 'salario_maternidade_rural':
          y = SalarioMaternidadeRuralSection(doc, beneficio.dados, y);
          break;
        case 'pensao_morte_rural':
        case 'pensao_morte_urbano':
          y = PensaoMorteSection(doc, beneficio.dados, y);
          break;
        case 'aposentadoria_idade_urbano':
        case 'incapacidade_urbano':
        case 'salario_maternidade_urbano':
        case 'outros_urbano':
          y = addFieldMultiline(doc, 'Informações:', beneficio.dados?.informacoes || 'Dados não disponíveis', y);
          break;
        default:
          doc.setTextColor(...COLORS.text);
          doc.setFontSize(FONTS.normal);
          doc.text(`Tipo de benefício: ${tipo}`, 16, y);
          y += 6;
          doc.text('Informações adicionais não disponíveis.', 16, y);
          y += 10;
      }

      if (beneficio.observacoes) {
        y += 4;
        y = addFieldMultiline(doc, 'Observações:', beneficio.observacoes, y);
      }
    });
  }

  addFooter(doc);

  const filename = `ficha_cliente_${clientData.client.full_name?.replace(/\s+/g, '_') || 'cliente'}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(filename);

  return doc;
}
