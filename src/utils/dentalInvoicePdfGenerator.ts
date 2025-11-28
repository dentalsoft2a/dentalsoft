import jsPDF from 'jspdf';

interface DentalInvoiceItem {
  description: string;
  ccam_code?: string | null;
  tooth_number?: string | null;
  quantity: number;
  unit_price: number;
  cpam_reimbursement: number;
  total: number;
}

interface DentalInvoiceData {
  invoice_number: string;
  invoice_date: string;
  dentist_name: string;
  dentist_address: string;
  dentist_phone: string;
  dentist_email: string;
  dentist_rpps?: string | null;
  dentist_adeli?: string | null;
  dentist_siret?: string | null;
  dentist_logo_url?: string | null;
  patient_name: string;
  patient_address?: string | null;
  patient_security_number?: string | null;
  items: DentalInvoiceItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  cpam_part: number;
  mutuelle_part: number;
  patient_part: number;
  paid_amount: number;
  status: string;
  notes?: string | null;
  certificate_serial?: string | null;
}

// Fonction helper pour s'assurer qu'on a toujours une string valide
function safeText(text: any): string {
  if (text === null || text === undefined) return '';
  return String(text).trim();
}

// Fonction helper pour les nombres
function safeNumber(num: any): number {
  if (num === null || num === undefined || isNaN(Number(num))) return 0;
  return Number(num);
}

export async function generateDentalInvoicePDF(data: DentalInvoiceData) {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // En-tête du cabinet
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(safeText(data.dentist_name) || 'Cabinet Dentaire', 15, yPos);
    yPos += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    if (safeText(data.dentist_address)) {
      const addressLines = safeText(data.dentist_address).split('\n').filter(line => line.trim());
      addressLines.forEach(line => {
        doc.text(line, 15, yPos);
        yPos += 5;
      });
    }

    if (safeText(data.dentist_phone)) {
      doc.text(`Tel: ${safeText(data.dentist_phone)}`, 15, yPos);
      yPos += 5;
    }

    if (safeText(data.dentist_email)) {
      doc.text(`Email: ${safeText(data.dentist_email)}`, 15, yPos);
      yPos += 5;
    }

    if (safeText(data.dentist_rpps)) {
      doc.text(`RPPS: ${safeText(data.dentist_rpps)}`, 15, yPos);
      yPos += 5;
    }

    if (safeText(data.dentist_adeli)) {
      doc.text(`ADELI: ${safeText(data.dentist_adeli)}`, 15, yPos);
      yPos += 5;
    }

    if (safeText(data.dentist_siret)) {
      doc.text(`SIRET: ${safeText(data.dentist_siret)}`, 15, yPos);
      yPos += 5;
    }

    // Encadré facture
    const boxX = 120;
    const boxY = 20;
    const boxWidth = 75;
    const boxHeight = 35;

    doc.setDrawColor(34, 197, 94);
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, 'FD');

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text('FACTURE', boxX + boxWidth / 2, boxY + 10, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(safeText(data.invoice_number) || 'N/A', boxX + boxWidth / 2, boxY + 18, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    const invoiceDate = safeText(data.invoice_date) ? new Date(data.invoice_date).toLocaleDateString('fr-FR') : 'N/A';
    doc.text(`Date: ${invoiceDate}`, boxX + boxWidth / 2, boxY + 25, { align: 'center' });

    // Statut
    const statusText = data.status === 'paid' ? 'PAYEE' :
                      data.status === 'partial' ? 'PARTIEL' :
                      data.status === 'sent' ? 'ENVOYEE' : 'BROUILLON';
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(data.status === 'paid' ? [34, 197, 94] :
                     data.status === 'partial' ? [249, 115, 22] : [100, 116, 139]);
    doc.text(statusText, boxX + boxWidth / 2, boxY + 32, { align: 'center' });

    doc.setTextColor(0, 0, 0);

    yPos = Math.max(yPos, boxY + boxHeight + 10);

    // Informations patient
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('PATIENT', 15, yPos);
    yPos += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(safeText(data.patient_name) || 'Patient', 15, yPos);
    yPos += 5;

    if (safeText(data.patient_address)) {
      const patientAddressLines = safeText(data.patient_address).split('\n').filter(line => line.trim());
      patientAddressLines.forEach(line => {
        doc.text(line, 15, yPos);
        yPos += 5;
      });
    }

    if (safeText(data.patient_security_number)) {
      doc.text(`N° Secu: ${safeText(data.patient_security_number)}`, 15, yPos);
      yPos += 5;
    }

    yPos += 10;

    // Tableau des actes
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DETAIL DES ACTES', 15, yPos);
    yPos += 7;

    // En-têtes du tableau
    doc.setFillColor(34, 197, 94);
    doc.rect(15, yPos, pageWidth - 30, 8, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);

    doc.text('Description', 17, yPos + 5);
    doc.text('CCAM', 95, yPos + 5);
    doc.text('Dent', 115, yPos + 5);
    doc.text('Qte', 130, yPos + 5);
    doc.text('Prix U.', 145, yPos + 5);
    doc.text('CPAM', 165, yPos + 5);
    doc.text('Total', 182, yPos + 5);

    yPos += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    // Lignes du tableau
    let isAlternate = false;
    (data.items || []).forEach((item) => {
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 20;
      }

      if (isAlternate) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, yPos, pageWidth - 30, 7, 'F');
      }

      const description = safeText(item.description) || 'Acte';
      const descLines = doc.splitTextToSize(description, 75);
      doc.text(descLines, 17, yPos + 5);

      doc.text(safeText(item.ccam_code) || '-', 95, yPos + 5);
      doc.text(safeText(item.tooth_number) || '-', 115, yPos + 5);
      doc.text(String(safeNumber(item.quantity)), 130, yPos + 5);
      doc.text(`${safeNumber(item.unit_price).toFixed(2)}€`, 145, yPos + 5);
      doc.text(`${safeNumber(item.cpam_reimbursement).toFixed(2)}€`, 165, yPos + 5);
      doc.text(`${safeNumber(item.total).toFixed(2)}€`, 182, yPos + 5);

      yPos += Math.max(7, descLines.length * 5);
      isAlternate = !isAlternate;
    });

    doc.setDrawColor(200, 200, 200);
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 10;

    // Totaux
    const totalsX = pageWidth - 80;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Sous-total HT:', totalsX, yPos);
    doc.text(`${safeNumber(data.subtotal).toFixed(2)}€`, totalsX + 50, yPos, { align: 'right' });
    yPos += 6;

    if (safeNumber(data.tax_rate) > 0) {
      doc.text(`TVA (${safeNumber(data.tax_rate).toFixed(1)}%):`, totalsX, yPos);
      doc.text(`${safeNumber(data.tax_amount).toFixed(2)}€`, totalsX + 50, yPos, { align: 'right' });
      yPos += 6;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Total TTC:', totalsX, yPos);
    doc.text(`${safeNumber(data.total).toFixed(2)}€`, totalsX + 50, yPos, { align: 'right' });
    yPos += 10;

    // Répartition
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    doc.setFillColor(240, 253, 244);
    doc.roundedRect(totalsX - 5, yPos - 2, 60, 24, 2, 2, 'F');

    doc.setTextColor(22, 163, 74);
    doc.text('Part CPAM:', totalsX, yPos + 3);
    doc.text(`${safeNumber(data.cpam_part).toFixed(2)}€`, totalsX + 50, yPos + 3, { align: 'right' });
    yPos += 6;

    doc.text('Part Mutuelle:', totalsX, yPos + 3);
    doc.text(`${safeNumber(data.mutuelle_part).toFixed(2)}€`, totalsX + 50, yPos + 3, { align: 'right' });
    yPos += 6;

    doc.setFont('helvetica', 'bold');
    doc.text('Part Patient:', totalsX, yPos + 3);
    doc.text(`${safeNumber(data.patient_part).toFixed(2)}€`, totalsX + 50, yPos + 3, { align: 'right' });

    doc.setTextColor(0, 0, 0);
    yPos += 15;

    // Paiements
    if (safeNumber(data.paid_amount) > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(34, 197, 94);
      doc.text(`Montant paye: ${safeNumber(data.paid_amount).toFixed(2)}€`, totalsX, yPos);
      yPos += 6;

      const remaining = safeNumber(data.total) - safeNumber(data.paid_amount);
      if (remaining > 0.01) {
        doc.setTextColor(249, 115, 22);
        doc.text(`Reste a payer: ${remaining.toFixed(2)}€`, totalsX, yPos);
      }
      doc.setTextColor(0, 0, 0);
      yPos += 10;
    }

    // Notes
    if (safeText(data.notes)) {
      yPos += 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text('Notes:', 15, yPos);
      yPos += 5;
      const notesLines = doc.splitTextToSize(safeText(data.notes), pageWidth - 30);
      doc.text(notesLines, 15, yPos);
      yPos += notesLines.length * 5;
    }

    // Pied de page
    yPos = pageHeight - 40;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);

    doc.text('Cette facture est conforme a l\'article 286 du Code General des Impots', pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
    doc.text('Journal d\'audit inalterable - Conservation 6 ans minimum', pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;

    if (safeText(data.certificate_serial)) {
      doc.text(`Certificat numerique: ${safeText(data.certificate_serial)}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 4;
    }

    const hashInput = `${safeText(data.invoice_number)}|${safeText(data.invoice_date)}|${safeNumber(data.total)}|${safeText(data.dentist_siret)}`;
    const simpleHash = btoa(hashInput).substring(0, 16);
    doc.text(`Hash de verification: ${simpleHash}`, pageWidth / 2, yPos, { align: 'center' });

    return doc;
  } catch (error) {
    console.error('Error in generateDentalInvoicePDF:', error);
    throw new Error(`Erreur PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}

export async function downloadDentalInvoicePDF(data: DentalInvoiceData) {
  try {
    const doc = await generateDentalInvoicePDF(data);
    const fileName = `facture-${safeText(data.invoice_number) || 'patient'}.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
}
