import jsPDF from 'jspdf';

interface FiscalPeriodData {
  period_type: 'month' | 'quarter' | 'year';
  period_start: string;
  period_end: string;
  invoices_count: number;
  total_revenue: number;
  total_tax: number;
  payments_count: number;
  total_paid: number;
  net_revenue: number;
  net_tax: number;
  dentist_name: string;
  dentist_siret?: string;
  dentist_rpps?: string;
}

interface InvoicesByStatus {
  draft: number;
  sent: number;
  partial: number;
  paid: number;
  cancelled: number;
}

/**
 * Formater une période en texte lisible
 */
function formatPeriodLabel(data: FiscalPeriodData): string {
  const start = new Date(data.period_start);
  const end = new Date(data.period_end);

  switch (data.period_type) {
    case 'month':
      return start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    case 'quarter':
      const quarter = Math.floor(start.getMonth() / 3) + 1;
      return `T${quarter} ${start.getFullYear()}`;
    case 'year':
      return `Année ${start.getFullYear()}`;
    default:
      return '';
  }
}

/**
 * Générer un rapport fiscal périodique PDF
 */
export async function generateFiscalReportPDF(
  data: FiscalPeriodData,
  statusBreakdown: InvoicesByStatus,
  topPatients: Array<{ name: string; amount: number }> = []
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // En-tête
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('RAPPORT FISCAL', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(formatPeriodLabel(data), pageWidth / 2, 27, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  yPos = 50;

  // Informations du cabinet
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CABINET DENTAIRE', 15, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.dentist_name, 15, yPos);
  yPos += 5;

  if (data.dentist_siret) {
    doc.text(`SIRET: ${data.dentist_siret}`, 15, yPos);
    yPos += 5;
  }

  if (data.dentist_rpps) {
    doc.text(`RPPS: ${data.dentist_rpps}`, 15, yPos);
    yPos += 5;
  }

  yPos += 10;

  // Période
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PÉRIODE FISCALE', 15, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Du: ${new Date(data.period_start).toLocaleDateString('fr-FR')}`, 15, yPos);
  yPos += 5;
  doc.text(`Au: ${new Date(data.period_end).toLocaleDateString('fr-FR')}`, 15, yPos);
  yPos += 5;

  const periodDays = Math.ceil((new Date(data.period_end).getTime() - new Date(data.period_start).getTime()) / (1000 * 60 * 60 * 24));
  doc.text(`Durée: ${periodDays} jours`, 15, yPos);
  yPos += 15;

  // Résumé des factures
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(15, yPos, pageWidth - 30, 50, 3, 3, 'F');
  yPos += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('RÉSUMÉ DES FACTURES', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  const col1X = 20;
  const col2X = pageWidth / 2 + 10;

  doc.text(`Factures émises:`, col1X, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.invoices_count}`, col1X + 60, yPos);
  doc.setFont('helvetica', 'normal');

  doc.text(`Paiements reçus:`, col2X, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.payments_count}`, col2X + 60, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.text(`Chiffre d'affaires HT:`, col1X, yPos);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 197, 94);
  doc.text(`${data.net_revenue.toFixed(2)}€`, col1X + 60, yPos);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  doc.text(`TVA collectée:`, col2X, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.net_tax.toFixed(2)}€`, col2X + 60, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.text(`Total TTC:`, col1X, yPos);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(59, 130, 246);
  doc.setFontSize(11);
  doc.text(`${(data.net_revenue + data.net_tax).toFixed(2)}€`, col1X + 60, yPos);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  doc.setFont('helvetica', 'normal');
  doc.text(`Encaissé:`, col2X, yPos);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 197, 94);
  doc.text(`${data.total_paid.toFixed(2)}€`, col2X + 60, yPos);
  doc.setTextColor(0, 0, 0);

  yPos += 20;

  // Répartition par statut
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('RÉPARTITION PAR STATUT', 15, yPos);
  yPos += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const statusLabels: Record<keyof InvoicesByStatus, { label: string; color: [number, number, number] }> = {
    draft: { label: 'Brouillons', color: [100, 116, 139] },
    sent: { label: 'Envoyées', color: [59, 130, 246] },
    partial: { label: 'Partielles', color: [249, 115, 22] },
    paid: { label: 'Payées', color: [34, 197, 94] },
    cancelled: { label: 'Annulées', color: [239, 68, 68] }
  };

  Object.entries(statusBreakdown).forEach(([status, count]) => {
    const info = statusLabels[status as keyof InvoicesByStatus];
    doc.setFillColor(...info.color);
    doc.circle(20, yPos - 1, 2, 'F');
    doc.text(`${info.label}: ${count}`, 25, yPos);
    yPos += 6;
  });

  yPos += 10;

  // Top 5 patients
  if (topPatients.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('TOP 5 PATIENTS', 15, yPos);
    yPos += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    topPatients.slice(0, 5).forEach((patient, index) => {
      const barWidth = (patient.amount / topPatients[0].amount) * 100;

      doc.setFillColor(59, 130, 246, 0.2);
      doc.rect(15, yPos - 3, barWidth, 5, 'F');

      doc.text(`${index + 1}. ${patient.name}`, 20, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(`${patient.amount.toFixed(2)}€`, pageWidth - 30, yPos, { align: 'right' });
      doc.setFont('helvetica', 'normal');

      yPos += 8;
    });

    yPos += 5;
  }

  // Indicateurs de performance
  yPos += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('INDICATEURS DE PERFORMANCE', 15, yPos);
  yPos += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const avgInvoice = data.invoices_count > 0 ? (data.net_revenue + data.net_tax) / data.invoices_count : 0;
  const collectionRate = (data.net_revenue + data.net_tax) > 0 ? (data.total_paid / (data.net_revenue + data.net_tax)) * 100 : 0;
  const avgDaily = periodDays > 0 ? (data.net_revenue + data.net_tax) / periodDays : 0;

  doc.text(`Montant moyen par facture: ${avgInvoice.toFixed(2)}€`, 20, yPos);
  yPos += 6;
  doc.text(`Taux d'encaissement: ${collectionRate.toFixed(1)}%`, 20, yPos);
  yPos += 6;
  doc.text(`Chiffre d'affaires moyen/jour: ${avgDaily.toFixed(2)}€`, 20, yPos);

  // Pied de page
  yPos = doc.internal.pageSize.getHeight() - 30;

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Ce rapport est conforme à l\'article 286 du Code Général des Impôts', pageWidth / 2, yPos, { align: 'center' });
  yPos += 4;
  doc.text('Document généré automatiquement par DentalCloud', pageWidth / 2, yPos, { align: 'center' });
  yPos += 4;
  doc.text(`Date de génération: ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')}`, pageWidth / 2, yPos, { align: 'center' });

  return doc;
}

/**
 * Télécharger le rapport fiscal
 */
export async function downloadFiscalReport(
  data: FiscalPeriodData,
  statusBreakdown: InvoicesByStatus,
  topPatients: Array<{ name: string; amount: number }> = []
) {
  const doc = await generateFiscalReportPDF(data, statusBreakdown, topPatients);
  const filename = `rapport-fiscal-${formatPeriodLabel(data).replace(/\s+/g, '-')}.pdf`;
  doc.save(filename);
}

/**
 * Générer un récapitulatif annuel de TVA
 */
export async function generateAnnualTvaReport(
  year: number,
  quarterlyData: Array<{
    quarter: number;
    revenue: number;
    tva: number;
  }>,
  dentistName: string,
  dentistSiret?: string
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // En-tête
  doc.setFillColor(34, 197, 94);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('RÉCAPITULATIF TVA', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`Année ${year}`, pageWidth / 2, 27, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  yPos = 50;

  // Informations
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(dentistName, 15, yPos);
  yPos += 5;

  if (dentistSiret) {
    doc.setFont('helvetica', 'normal');
    doc.text(`SIRET: ${dentistSiret}`, 15, yPos);
    yPos += 10;
  }

  // Tableau trimestriel
  yPos += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DÉTAIL PAR TRIMESTRE', 15, yPos);
  yPos += 10;

  // En-têtes du tableau
  doc.setFillColor(34, 197, 94);
  doc.rect(15, yPos, pageWidth - 30, 10, 'F');

  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('Trimestre', 20, yPos + 6);
  doc.text('CA HT', 80, yPos + 6);
  doc.text('TVA Collectée', 130, yPos + 6);
  doc.text('CA TTC', 170, yPos + 6);

  yPos += 10;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  let totalRevenue = 0;
  let totalTva = 0;

  quarterlyData.forEach((q, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, yPos, pageWidth - 30, 8, 'F');
    }

    doc.text(`T${q.quarter} ${year}`, 20, yPos + 5);
    doc.text(`${q.revenue.toFixed(2)}€`, 80, yPos + 5);
    doc.text(`${q.tva.toFixed(2)}€`, 130, yPos + 5);
    doc.text(`${(q.revenue + q.tva).toFixed(2)}€`, 170, yPos + 5);

    totalRevenue += q.revenue;
    totalTva += q.tva;

    yPos += 8;
  });

  // Ligne de total
  doc.setDrawColor(0, 0, 0);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL ANNUEL', 20, yPos);
  doc.text(`${totalRevenue.toFixed(2)}€`, 80, yPos);
  doc.text(`${totalTva.toFixed(2)}€`, 130, yPos);
  doc.setTextColor(34, 197, 94);
  doc.setFontSize(11);
  doc.text(`${(totalRevenue + totalTva).toFixed(2)}€`, 170, yPos);

  // Pied de page
  yPos = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, yPos, { align: 'center' });

  return doc;
}

/**
 * Télécharger le récapitulatif TVA annuel
 */
export async function downloadAnnualTvaReport(
  year: number,
  quarterlyData: Array<{ quarter: number; revenue: number; tva: number }>,
  dentistName: string,
  dentistSiret?: string
) {
  const doc = await generateAnnualTvaReport(year, quarterlyData, dentistName, dentistSiret);
  doc.save(`tva-${year}.pdf`);
}
