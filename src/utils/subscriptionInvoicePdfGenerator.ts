import jsPDF from 'jspdf';
import { supabase } from '../lib/supabase';

async function loadLogoAsBase64(): Promise<string> {
  try {
    const response = await fetch('/logo.png');
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading logo:', error);
    return '';
  }
}

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

    const logoBase64 = await loadLogoAsBase64();

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = 20;

    // Header background
    pdf.setFillColor(249, 250, 251);
    pdf.rect(0, 0, pageWidth, 50, 'F');

    // Logo
    if (logoBase64) {
      try {
        pdf.addImage(logoBase64, 'PNG', margin, yPos - 2, 12, 12);
      } catch (error) {
        console.error('Error adding logo to PDF:', error);
        pdf.setFillColor(59, 130, 246);
        pdf.roundedRect(margin, yPos, 8, 8, 2, 2, 'F');
      }
    } else {
      pdf.setFillColor(59, 130, 246);
      pdf.roundedRect(margin, yPos, 8, 8, 2, 2, 'F');
    }

    // Company name next to logo
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text(company.company_name || 'DentalCloud', margin + 15, yPos + 6);

    // Invoice title and number aligned to right
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text('FACTURE D\'ABONNEMENT', pageWidth - margin, yPos + 2, { align: 'right' });

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text(invoice.invoice_number, pageWidth - margin, yPos + 9, { align: 'right' });

    yPos = 60;

    // Invoice details card
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(229, 231, 235);
    pdf.roundedRect(margin, yPos, pageWidth - 2 * margin, 25, 3, 3, 'FD');

    yPos += 8;

    // Date
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text('Date d\'émission', margin + 5, yPos);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);
    pdf.text(new Date(invoice.issued_at).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }), margin + 5, yPos + 5);

    // Period
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text('Période de facturation', pageWidth / 2, yPos);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);
    const periodText = `${new Date(invoice.period_start).toLocaleDateString('fr-FR')} - ${new Date(invoice.period_end).toLocaleDateString('fr-FR')}`;
    pdf.text(periodText, pageWidth / 2, yPos + 5);

    yPos = 95;

    // Two columns for company and customer info
    // Left column - Company
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(107, 114, 128);
    pdf.text('DE', margin, yPos);
    yPos += 5;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text(company.company_name, margin, yPos);
    yPos += 5;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);

    const emitterLines = [
      company.company_address,
      `${company.company_postal_code} ${company.company_city}`,
      company.company_country,
      '',
      company.company_phone ? `Tél. ${company.company_phone}` : '',
      company.company_email ? company.company_email : '',
      '',
      company.company_rcs ? `RCS ${company.company_rcs}` : '',
      company.company_siret ? `SIRET ${company.company_siret}` : '',
      company.company_vat ? `N° TVA ${company.company_vat}` : ''
    ].filter(line => line !== '');

    emitterLines.forEach(line => {
      if (line === '') {
        yPos += 3;
      } else {
        pdf.text(line, margin, yPos);
        yPos += 4;
      }
    });

    // Right column - Customer
    yPos = 95;
    const rightColX = pageWidth / 2 + 5;

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(107, 114, 128);
    pdf.text('À', rightColX, yPos);
    yPos += 5;

    pdf.setFillColor(249, 250, 251);
    pdf.roundedRect(rightColX - 3, yPos - 3, (pageWidth / 2) - margin - 2, 35, 2, 2, 'F');

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text(customer.laboratory_name || 'Client', rightColX, yPos);
    yPos += 5;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);

    const clientLines = [
      customer.laboratory_address || '',
      '',
      customer.laboratory_email || '',
      customer.laboratory_phone || '',
      '',
      customer.laboratory_rcs ? `RCS ${customer.laboratory_rcs}` : ''
    ].filter(line => line !== '');

    clientLines.forEach(line => {
      if (line === '') {
        yPos += 3;
      } else {
        pdf.text(line, rightColX, yPos);
        yPos += 4;
      }
    });

    yPos = 165;

    // Services section
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text('Détails de l\'abonnement', margin, yPos);
    yPos += 8;

    // Table header
    pdf.setFillColor(249, 250, 251);
    pdf.roundedRect(margin, yPos - 2, pageWidth - 2 * margin, 8, 1, 1, 'F');

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(107, 114, 128);
    pdf.text('DESCRIPTION', margin + 3, yPos + 3);
    pdf.text('MONTANT HT', pageWidth - margin - 5, yPos + 3, { align: 'right' });
    yPos += 12;

    // Service line
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(31, 41, 55);
    pdf.text('Abonnement mensuel DentalCloud', margin + 3, yPos);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${invoice.amount_ht.toFixed(2)} €`, pageWidth - margin - 5, yPos, { align: 'right' });
    yPos += 5;

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text(`Période du ${new Date(invoice.period_start).toLocaleDateString('fr-FR')} au ${new Date(invoice.period_end).toLocaleDateString('fr-FR')}`, margin + 3, yPos);
    yPos += 15;

    // Totals section with modern card design
    const totalsX = pageWidth - margin - 70;

    // Subtotal
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    pdf.text('Sous-total HT', totalsX, yPos);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${invoice.amount_ht.toFixed(2)} €`, pageWidth - margin - 5, yPos, { align: 'right' });
    yPos += 6;

    // VAT
    pdf.setFont('helvetica', 'normal');
    const tvaAmount = invoice.amount_ttc - invoice.amount_ht;
    pdf.text(`TVA (${invoice.tax_rate}%)`, totalsX, yPos);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${tvaAmount.toFixed(2)} €`, pageWidth - margin - 5, yPos, { align: 'right' });
    yPos += 10;

    // Total with gradient background
    pdf.setFillColor(59, 130, 246);
    pdf.roundedRect(totalsX - 5, yPos - 5, 75, 12, 2, 2, 'F');

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('TOTAL TTC', totalsX, yPos + 2);
    pdf.text(`${invoice.amount_ttc.toFixed(2)} €`, pageWidth - margin - 5, yPos + 2, { align: 'right' });
    yPos += 20;

    // Payment info section if available
    if (company.company_iban || company.company_bic) {
      pdf.setFillColor(249, 250, 251);
      pdf.roundedRect(margin, yPos, pageWidth - 2 * margin, 20, 2, 2, 'F');

      yPos += 6;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(107, 114, 128);
      pdf.text('COORDONNÉES BANCAIRES', margin + 5, yPos);
      yPos += 5;

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(31, 41, 55);
      if (company.company_iban) {
        pdf.text(`IBAN: ${company.company_iban}`, margin + 5, yPos);
        yPos += 4;
      }
      if (company.company_bic) {
        pdf.text(`BIC: ${company.company_bic}`, margin + 5, yPos);
      }
    }

    // Footer
    pdf.setDrawColor(229, 231, 235);
    pdf.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);

    pdf.setFontSize(8);
    pdf.setTextColor(156, 163, 175);
    pdf.setFont('helvetica', 'normal');
    pdf.text(
      'Document généré automatiquement - Aucune signature requise',
      pageWidth / 2,
      pageHeight - 12,
      { align: 'center' }
    );
    pdf.text(
      `${company.company_name} - ${company.company_email}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );

    pdf.save(`Facture_Abonnement_${invoice.invoice_number}.pdf`);

    return { success: true };
  } catch (error) {
    console.error('Error generating subscription invoice PDF:', error);
    throw error;
  }
}
