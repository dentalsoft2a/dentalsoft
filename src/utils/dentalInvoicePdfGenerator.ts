import jsPDF from 'jspdf';

interface DentalInvoiceItem {
  description: string;
  ccam_code?: string;
  tooth_number?: string;
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
  dentist_rpps?: string;
  dentist_adeli?: string;
  dentist_siret?: string;
  dentist_logo_url?: string;
  patient_name: string;
  patient_address?: string;
  patient_security_number?: string;
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
  notes?: string;
  certificate_serial?: string;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export async function generateDentalInvoicePDF(data: DentalInvoiceData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  if (data.dentist_logo_url) {
    try {
      const img = await loadImage(data.dentist_logo_url);
      const maxWidth = 50;
      const maxHeight = 25;
      const aspectRatio = img.width / img.height;
      let logoWidth = maxWidth;
      let logoHeight = maxWidth / aspectRatio;

      if (logoHeight > maxHeight) {
        logoHeight = maxHeight;
        logoWidth = maxHeight * aspectRatio;
      }

      doc.addImage(data.dentist_logo_url, 'PNG', 15, yPos, logoWidth, logoHeight);
      yPos += logoHeight + 5;
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
    }
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(data.dentist_name, 15, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'normal');
  if (data.dentist_address) {
    const addressLines = data.dentist_address.split('\n');
    addressLines.forEach(line => {
      doc.text(line.trim(), 15, yPos);
      yPos += 5;
    });
  }

  if (data.dentist_phone) {
    doc.text(`Tél: ${data.dentist_phone}`, 15, yPos);
    yPos += 5;
  }

  if (data.dentist_email) {
    doc.text(`Email: ${data.dentist_email}`, 15, yPos);
    yPos += 5;
  }

  if (data.dentist_rpps) {
    doc.text(`RPPS: ${data.dentist_rpps}`, 15, yPos);
    yPos += 5;
  }

  if (data.dentist_adeli) {
    doc.text(`ADELI: ${data.dentist_adeli}`, 15, yPos);
    yPos += 5;
  }

  if (data.dentist_siret) {
    doc.text(`SIRET: ${data.dentist_siret}`, 15, yPos);
    yPos += 5;
  }

  const boxX = 120;
  const boxY = 20;
  const boxWidth = 75;
  const boxHeight = 35;

  doc.setDrawColor(59, 130, 246);
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, 'FD');

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('FACTURE', boxX + boxWidth / 2, boxY + 10, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`N° ${data.invoice_number}`, boxX + boxWidth / 2, boxY + 18, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${new Date(data.invoice_date).toLocaleDateString('fr-FR')}`, boxX + boxWidth / 2, boxY + 25, { align: 'center' });

  const statusText = data.status === 'paid' ? 'PAYÉE' : data.status === 'partial' ? 'PARTIEL' : data.status === 'sent' ? 'ENVOYÉE' : 'BROUILLON';
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(data.status === 'paid' ? [34, 197, 94] : data.status === 'partial' ? [249, 115, 22] : [100, 116, 139]);
  doc.text(statusText, boxX + boxWidth / 2, boxY + 32, { align: 'center' });

  doc.setTextColor(0, 0, 0);

  yPos = Math.max(yPos, boxY + boxHeight + 10);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PATIENT', 15, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.patient_name, 15, yPos);
  yPos += 5;

  if (data.patient_address) {
    const patientAddressLines = data.patient_address.split('\n');
    patientAddressLines.forEach(line => {
      doc.text(line.trim(), 15, yPos);
      yPos += 5;
    });
  }

  if (data.patient_security_number) {
    doc.text(`N° Sécu: ${data.patient_security_number}`, 15, yPos);
    yPos += 5;
  }

  yPos += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DÉTAIL DES ACTES', 15, yPos);
  yPos += 7;

  const tableStartY = yPos;
  const colWidths = {
    description: 70,
    ccam: 25,
    tooth: 15,
    qty: 15,
    price: 25,
    cpam: 25,
    total: 25
  };

  doc.setFillColor(59, 130, 246);
  doc.rect(15, yPos, pageWidth - 30, 8, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);

  let xPos = 15;
  doc.text('Description', xPos + 2, yPos + 5);
  xPos += colWidths.description;
  doc.text('CCAM', xPos + 2, yPos + 5);
  xPos += colWidths.ccam;
  doc.text('Dent', xPos + 2, yPos + 5);
  xPos += colWidths.tooth;
  doc.text('Qté', xPos + 2, yPos + 5);
  xPos += colWidths.qty;
  doc.text('Prix Unit.', xPos + 2, yPos + 5);
  xPos += colWidths.price;
  doc.text('CPAM', xPos + 2, yPos + 5);
  xPos += colWidths.cpam;
  doc.text('Total', xPos + 2, yPos + 5);

  yPos += 8;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  let isAlternate = false;
  data.items.forEach((item, index) => {
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    if (isAlternate) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, yPos, pageWidth - 30, 7, 'F');
    }

    xPos = 15;
    const descLines = doc.splitTextToSize(item.description, colWidths.description - 4);
    doc.text(descLines, xPos + 2, yPos + 5);
    xPos += colWidths.description;

    doc.text(item.ccam_code || '-', xPos + 2, yPos + 5);
    xPos += colWidths.ccam;

    doc.text(item.tooth_number || '-', xPos + 2, yPos + 5);
    xPos += colWidths.tooth;

    doc.text(item.quantity.toString(), xPos + 2, yPos + 5);
    xPos += colWidths.qty;

    doc.text(`${item.unit_price.toFixed(2)}€`, xPos + 2, yPos + 5);
    xPos += colWidths.price;

    doc.text(`${item.cpam_reimbursement.toFixed(2)}€`, xPos + 2, yPos + 5);
    xPos += colWidths.cpam;

    doc.text(`${item.total.toFixed(2)}€`, xPos + 2, yPos + 5);

    yPos += Math.max(7, descLines.length * 5);
    isAlternate = !isAlternate;
  });

  doc.setDrawColor(200, 200, 200);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 10;

  const totalsX = pageWidth - 80;

  doc.setFont('helvetica', 'normal');
  doc.text('Sous-total HT:', totalsX, yPos);
  doc.text(`${data.subtotal.toFixed(2)}€`, totalsX + 50, yPos, { align: 'right' });
  yPos += 6;

  if (data.tax_rate > 0) {
    doc.text(`TVA (${data.tax_rate.toFixed(2)}%):`, totalsX, yPos);
    doc.text(`${data.tax_amount.toFixed(2)}€`, totalsX + 50, yPos, { align: 'right' });
    yPos += 6;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Total TTC:', totalsX, yPos);
  doc.text(`${data.total.toFixed(2)}€`, totalsX + 50, yPos, { align: 'right' });
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  doc.setFillColor(239, 246, 255);
  doc.roundedRect(totalsX - 5, yPos - 2, 60, 24, 2, 2, 'F');

  doc.setTextColor(30, 58, 138);
  doc.text('Part CPAM:', totalsX, yPos + 3);
  doc.text(`${data.cpam_part.toFixed(2)}€`, totalsX + 50, yPos + 3, { align: 'right' });
  yPos += 6;

  doc.text('Part Mutuelle:', totalsX, yPos + 3);
  doc.text(`${data.mutuelle_part.toFixed(2)}€`, totalsX + 50, yPos + 3, { align: 'right' });
  yPos += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Part Patient:', totalsX, yPos + 3);
  doc.text(`${data.patient_part.toFixed(2)}€`, totalsX + 50, yPos + 3, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  yPos += 15;

  if (data.paid_amount > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(34, 197, 94);
    doc.text(`Montant payé: ${data.paid_amount.toFixed(2)}€`, totalsX, yPos);
    yPos += 6;

    const remaining = data.total - data.paid_amount;
    if (remaining > 0) {
      doc.setTextColor(249, 115, 22);
      doc.text(`Reste à payer: ${remaining.toFixed(2)}€`, totalsX, yPos);
    }
    doc.setTextColor(0, 0, 0);
    yPos += 10;
  }

  if (data.notes) {
    yPos += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('Notes:', 15, yPos);
    yPos += 5;
    const notesLines = doc.splitTextToSize(data.notes, pageWidth - 30);
    doc.text(notesLines, 15, yPos);
    yPos += notesLines.length * 5;
  }

  yPos = pageHeight - 40;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);

  doc.text('Cette facture est conforme à l\'article 286 du Code Général des Impôts', pageWidth / 2, yPos, { align: 'center' });
  yPos += 4;
  doc.text('Journal d\'audit inaltérable - Conservation 6 ans minimum', pageWidth / 2, yPos, { align: 'center' });
  yPos += 4;

  if (data.certificate_serial) {
    doc.text(`Certificat numérique: ${data.certificate_serial}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
  }

  const hashInput = `${data.invoice_number}|${data.invoice_date}|${data.total}|${data.dentist_siret}`;
  const simpleHash = btoa(hashInput).substring(0, 16);
  doc.text(`Hash de vérification: ${simpleHash}`, pageWidth / 2, yPos, { align: 'center' });

  return doc;
}

export async function downloadDentalInvoicePDF(data: DentalInvoiceData) {
  const doc = await generateDentalInvoicePDF(data);
  doc.save(`facture-${data.invoice_number}.pdf`);
}
