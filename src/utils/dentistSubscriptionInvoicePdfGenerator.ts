import jsPDF from 'jspdf';

interface DentistSubscriptionInvoice {
  id: string;
  invoice_number: string;
  dentist_id: string;
  amount_ht: number;
  tax_rate: number;
  amount_ttc: number;
  period_start: string;
  period_end: string;
  payment_status: string;
  issued_at: string;
  paid_at: string | null;
  due_date: string;
  billing_details: {
    cabinet_name?: string;
    siret?: string;
    address?: string;
    postal_code?: string;
    city?: string;
    email?: string;
  };
}

interface CompanyInfo {
  company_name: string;
  legal_form: string;
  siret: string;
  address: string;
  postal_code: string;
  city: string;
  phone: string;
  email: string;
  capital?: string;
  rcs?: string;
}

export async function generateDentistSubscriptionInvoicePDF(
  invoice: DentistSubscriptionInvoice,
  companyInfo: CompanyInfo
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('FACTURE', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 3;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Abonnement Cabinet Premium', pageWidth / 2, yPosition, { align: 'center' });

  yPosition = 45;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('ÉMETTEUR', 20, yPosition);

  yPosition += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(companyInfo.company_name, 20, yPosition);

  yPosition += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(companyInfo.legal_form, 20, yPosition);

  yPosition += 5;
  doc.text(companyInfo.address, 20, yPosition);

  yPosition += 5;
  doc.text(`${companyInfo.postal_code} ${companyInfo.city}`, 20, yPosition);

  yPosition += 5;
  doc.text(`SIRET: ${companyInfo.siret}`, 20, yPosition);

  if (companyInfo.rcs) {
    yPosition += 5;
    doc.text(`RCS: ${companyInfo.rcs}`, 20, yPosition);
  }

  if (companyInfo.capital) {
    yPosition += 5;
    doc.text(`Capital: ${companyInfo.capital}`, 20, yPosition);
  }

  yPosition += 5;
  doc.text(`Tél: ${companyInfo.phone}`, 20, yPosition);

  yPosition += 5;
  doc.text(`Email: ${companyInfo.email}`, 20, yPosition);

  let rightYPosition = 45;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DESTINATAIRE', pageWidth - 20, rightYPosition, { align: 'right' });

  rightYPosition += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  if (invoice.billing_details.cabinet_name) {
    doc.text(invoice.billing_details.cabinet_name, pageWidth - 20, rightYPosition, { align: 'right' });
    rightYPosition += 5;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  if (invoice.billing_details.siret) {
    doc.text(`SIRET: ${invoice.billing_details.siret}`, pageWidth - 20, rightYPosition, { align: 'right' });
    rightYPosition += 5;
  }

  if (invoice.billing_details.address) {
    doc.text(invoice.billing_details.address, pageWidth - 20, rightYPosition, { align: 'right' });
    rightYPosition += 5;
  }

  if (invoice.billing_details.postal_code && invoice.billing_details.city) {
    doc.text(
      `${invoice.billing_details.postal_code} ${invoice.billing_details.city}`,
      pageWidth - 20,
      rightYPosition,
      { align: 'right' }
    );
    rightYPosition += 5;
  }

  if (invoice.billing_details.email) {
    doc.text(invoice.billing_details.email, pageWidth - 20, rightYPosition, { align: 'right' });
  }

  yPosition = Math.max(yPosition, rightYPosition) + 15;

  doc.setFillColor(240, 240, 240);
  doc.rect(20, yPosition, pageWidth - 40, 25, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  const infoY = yPosition + 7;
  doc.text('Facture N°:', 25, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoice_number, 55, infoY);

  doc.setFont('helvetica', 'bold');
  doc.text('Date:', 25, infoY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(invoice.issued_at).toLocaleDateString('fr-FR'), 55, infoY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Échéance:', 25, infoY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(invoice.due_date).toLocaleDateString('fr-FR'), 55, infoY + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('Période:', pageWidth - 95, infoY);
  doc.setFont('helvetica', 'normal');
  const periodText = `${new Date(invoice.period_start).toLocaleDateString('fr-FR')} - ${new Date(invoice.period_end).toLocaleDateString('fr-FR')}`;
  doc.text(periodText, pageWidth - 25, infoY, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.text('Statut:', pageWidth - 95, infoY + 6);
  doc.setFont('helvetica', 'normal');
  const statusText = invoice.payment_status === 'paid' ? 'PAYÉE' :
                     invoice.payment_status === 'pending' ? 'EN ATTENTE' : 'IMPAYÉE';
  doc.setTextColor(
    invoice.payment_status === 'paid' ? 0 : 255,
    invoice.payment_status === 'paid' ? 128 : 0,
    0
  );
  doc.text(statusText, pageWidth - 25, infoY + 6, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  yPosition += 35;

  const tableTop = yPosition;
  const col1X = 20;
  const col2X = 120;
  const col3X = 155;
  const col4X = pageWidth - 20;

  doc.setFillColor(30, 64, 175);
  doc.rect(col1X, tableTop, pageWidth - 40, 10, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Description', col1X + 3, tableTop + 7);
  doc.text('Montant HT', col2X + 3, tableTop + 7);
  doc.text('TVA', col3X + 3, tableTop + 7);
  doc.text('Montant TTC', col4X - 3, tableTop + 7, { align: 'right' });

  yPosition = tableTop + 10;

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  doc.setFillColor(250, 250, 250);
  doc.rect(col1X, yPosition, pageWidth - 40, 20, 'F');

  const description = `Abonnement Cabinet Premium\ndu ${new Date(invoice.period_start).toLocaleDateString('fr-FR')} au ${new Date(invoice.period_end).toLocaleDateString('fr-FR')}`;
  const splitDescription = doc.splitTextToSize(description, 95);
  doc.text(splitDescription, col1X + 3, yPosition + 7);

  doc.text(`${invoice.amount_ht.toFixed(2)} €`, col2X + 3, yPosition + 10);
  doc.text(`${invoice.tax_rate.toFixed(0)}%`, col3X + 3, yPosition + 10);
  doc.text(`${invoice.amount_ttc.toFixed(2)} €`, col4X - 3, yPosition + 10, { align: 'right' });

  yPosition += 25;

  doc.setDrawColor(200, 200, 200);
  doc.line(col1X, yPosition, pageWidth - 20, yPosition);

  yPosition += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Total HT:', col3X - 30, yPosition);
  doc.text(`${invoice.amount_ht.toFixed(2)} €`, col4X - 3, yPosition, { align: 'right' });

  yPosition += 7;
  doc.text(`TVA (${invoice.tax_rate.toFixed(0)}%):`, col3X - 30, yPosition);
  const tvaAmount = invoice.amount_ttc - invoice.amount_ht;
  doc.text(`${tvaAmount.toFixed(2)} €`, col4X - 3, yPosition, { align: 'right' });

  yPosition += 10;
  doc.setFillColor(30, 64, 175);
  doc.rect(col3X - 32, yPosition - 5, pageWidth - col3X + 12, 10, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text('Total TTC:', col3X - 28, yPosition + 2);
  doc.text(`${invoice.amount_ttc.toFixed(2)} €`, col4X - 3, yPosition + 2, { align: 'right' });

  doc.setTextColor(0, 0, 0);

  yPosition = pageHeight - 60;

  doc.setFillColor(245, 245, 245);
  doc.rect(20, yPosition, pageWidth - 40, 40, 'F');

  yPosition += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('CONDITIONS DE PAIEMENT', 25, yPosition);

  yPosition += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Paiement par virement bancaire ou carte bancaire.', 25, yPosition);

  yPosition += 4;
  doc.text('En cas de retard de paiement, des pénalités de 3 fois le taux d\'intérêt légal seront appliquées.', 25, yPosition);

  yPosition += 4;
  doc.text('Une indemnité forfaitaire de 40€ pour frais de recouvrement sera exigée.', 25, yPosition);

  yPosition += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('MENTIONS LÉGALES', 25, yPosition);

  yPosition += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`TVA non applicable, article 293 B du CGI. En cas de litige, compétence exclusive des tribunaux de ${companyInfo.city}.`, 25, yPosition);

  yPosition += 4;
  doc.text('Facture créée électroniquement et valable sans signature.', 25, yPosition);

  const footerY = pageHeight - 10;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `${companyInfo.company_name} - ${companyInfo.siret}${companyInfo.rcs ? ' - ' + companyInfo.rcs : ''}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  const filename = `facture_${invoice.invoice_number.replace(/\//g, '-')}.pdf`;
  doc.save(filename);
}
