import jsPDF from 'jspdf';
import { supabase } from '../lib/supabase';

interface CompanyInfo {
  company_name: string;
  company_address: string;
  company_postal_code: string;
  company_city: string;
  company_country: string;
  company_phone: string;
  company_email: string;
  company_rcs: string;
  company_siret: string;
  company_vat: string;
  company_iban: string;
  company_bic: string;
}

interface CustomerInfo {
  laboratory_name: string;
  laboratory_address: string;
  laboratory_email: string;
  laboratory_phone: string;
  laboratory_rcs: string;
}

interface InvoiceData {
  invoice_number: string;
  issued_at: string;
  period_start: string;
  period_end: string;
  amount_ht: number;
  tax_rate: number;
  amount_ttc: number;
}

export async function generateSubscriptionInvoicePDF(invoiceId: string) {
  try {
    const invoiceRes = await supabase
      .from('subscription_invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceRes.error || !invoiceRes.data) {
      throw new Error('Facture introuvable');
    }

    const [profileRes, companyRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('laboratory_name, laboratory_address, laboratory_email, laboratory_phone, laboratory_rcs')
        .eq('id', invoiceRes.data.user_id)
        .single(),
      supabase
        .from('company_settings')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single()
    ]);

    if (companyRes.error || !companyRes.data) {
      throw new Error('Informations entreprise introuvables');
    }

    const invoice: InvoiceData = {
      invoice_number: invoiceRes.data.invoice_number,
      issued_at: invoiceRes.data.issued_at,
      period_start: invoiceRes.data.period_start,
      period_end: invoiceRes.data.period_end,
      amount_ht: parseFloat(invoiceRes.data.amount_ht),
      tax_rate: parseFloat(invoiceRes.data.tax_rate),
      amount_ttc: parseFloat(invoiceRes.data.amount_ttc)
    };

    const company: CompanyInfo = companyRes.data;
    const customer: CustomerInfo = profileRes.data || {
      laboratory_name: 'N/A',
      laboratory_address: 'N/A',
      laboratory_email: 'N/A',
      laboratory_phone: 'N/A',
      laboratory_rcs: 'N/A'
    };

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 20;

    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(37, 99, 235);
    pdf.text('FACTURE D\'ABONNEMENT', margin, yPos);
    yPos += 15;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text(`N° ${invoice.invoice_number}`, margin, yPos);
    yPos += 5;
    pdf.text(`Date: ${new Date(invoice.issued_at).toLocaleDateString('fr-FR')}`, margin, yPos);
    yPos += 15;

    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text('ÉMETTEUR', margin, yPos);

    pdf.text('CLIENT', pageWidth / 2 + 10, yPos);
    yPos += 7;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(71, 85, 105);

    const emitterLines = [
      company.company_name,
      company.company_address,
      `${company.company_postal_code} ${company.company_city}`,
      company.company_country,
      `Tél: ${company.company_phone || 'N/A'}`,
      `Email: ${company.company_email || 'N/A'}`,
      company.company_rcs ? `RCS: ${company.company_rcs}` : '',
      company.company_siret ? `SIRET: ${company.company_siret}` : '',
      company.company_vat ? `TVA: ${company.company_vat}` : ''
    ].filter(line => line);

    emitterLines.forEach(line => {
      pdf.text(line, margin, yPos);
      yPos += 5;
    });

    yPos = 75;
    const clientLines = [
      customer.laboratory_name || 'N/A',
      customer.laboratory_address || 'N/A',
      customer.laboratory_email || 'N/A',
      customer.laboratory_phone || 'N/A',
      customer.laboratory_rcs ? `RCS: ${customer.laboratory_rcs}` : ''
    ].filter(line => line);

    clientLines.forEach(line => {
      pdf.text(line, pageWidth / 2 + 10, yPos);
      yPos += 5;
    });

    yPos = Math.max(yPos, 130);

    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text('DÉTAILS DE L\'ABONNEMENT', margin, yPos);
    yPos += 10;

    pdf.setFillColor(241, 245, 249);
    pdf.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Description', margin + 2, yPos);
    pdf.text('Période', pageWidth / 2, yPos);
    pdf.text('Montant HT', pageWidth - margin - 30, yPos, { align: 'right' });
    yPos += 10;

    pdf.setFont('helvetica', 'normal');
    pdf.text('Abonnement mensuel DentalCloud', margin + 2, yPos);
    pdf.text(
      `${new Date(invoice.period_start).toLocaleDateString('fr-FR')} - ${new Date(invoice.period_end).toLocaleDateString('fr-FR')}`,
      pageWidth / 2,
      yPos
    );
    pdf.text(`${invoice.amount_ht.toFixed(2)} €`, pageWidth - margin - 30, yPos, { align: 'right' });
    yPos += 15;

    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    pdf.setFont('helvetica', 'normal');
    pdf.text('Total HT', pageWidth - margin - 50, yPos);
    pdf.text(`${invoice.amount_ht.toFixed(2)} €`, pageWidth - margin - 10, yPos, { align: 'right' });
    yPos += 7;

    pdf.text(`TVA (${invoice.tax_rate}%)`, pageWidth - margin - 50, yPos);
    const tvaAmount = invoice.amount_ttc - invoice.amount_ht;
    pdf.text(`${tvaAmount.toFixed(2)} €`, pageWidth - margin - 10, yPos, { align: 'right' });
    yPos += 10;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setFillColor(37, 99, 235);
    pdf.rect(pageWidth - margin - 60, yPos - 6, 60, 10, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.text('TOTAL TTC', pageWidth - margin - 50, yPos);
    pdf.text(`${invoice.amount_ttc.toFixed(2)} €`, pageWidth - margin - 10, yPos, { align: 'right' });
    yPos += 20;

    if (company.company_iban || company.company_bic) {
      pdf.setTextColor(71, 85, 105);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('INFORMATIONS BANCAIRES', margin, yPos);
      yPos += 7;
      pdf.setFont('helvetica', 'normal');
      if (company.company_iban) {
        pdf.text(`IBAN: ${company.company_iban}`, margin, yPos);
        yPos += 5;
      }
      if (company.company_bic) {
        pdf.text(`BIC: ${company.company_bic}`, margin, yPos);
        yPos += 10;
      }
    }

    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text('Facture générée automatiquement par DentalCloud', margin, pdf.internal.pageSize.getHeight() - 10);

    pdf.save(`Facture_Abonnement_${invoice.invoice_number}.pdf`);

    return { success: true };
  } catch (error) {
    console.error('Error generating subscription invoice PDF:', error);
    throw error;
  }
}
