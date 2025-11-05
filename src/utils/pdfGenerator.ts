import jsPDF from 'jspdf';

interface DeliveryNoteItem {
  description: string;
  quantity: number;
  unit_price: number;
  unit: string;
  shade: string;
  tooth_number: string;
}

interface DeliveryNoteData {
  delivery_number: string;
  date: string;
  prescription_date?: string;
  items: DeliveryNoteItem[];
  laboratory_name: string;
  laboratory_address: string;
  laboratory_phone: string;
  laboratory_email: string;
  laboratory_logo_url?: string;
  dentist_name: string;
  dentist_address: string;
  patient_name: string;
  compliance_text: string;
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

export async function generateDeliveryNotePDF(data: DeliveryNoteData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let yPos = 20;

  if (data.laboratory_logo_url) {
    try {
      const img = await loadImage(data.laboratory_logo_url);

      const maxWidth = 50;
      const maxHeight = 25;

      const aspectRatio = img.width / img.height;
      let logoWidth = maxWidth;
      let logoHeight = maxWidth / aspectRatio;

      if (logoHeight > maxHeight) {
        logoHeight = maxHeight;
        logoWidth = maxHeight * aspectRatio;
      }

      doc.addImage(data.laboratory_logo_url, 'PNG', 15, yPos, logoWidth, logoHeight);
      yPos += logoHeight + 5;
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
    }
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.laboratory_name, 15, yPos);
  yPos += 5;

  if (data.laboratory_address) {
    const addressLines = data.laboratory_address.split('\n');
    addressLines.forEach(line => {
      doc.text(line.trim(), 15, yPos);
      yPos += 5;
    });
  }

  if (data.laboratory_phone) {
    doc.text(data.laboratory_phone, 15, yPos);
    yPos += 5;
  }

  if (data.laboratory_email) {
    doc.text(data.laboratory_email, 15, yPos);
    yPos += 5;
  }

  const boxX = 120;
  const boxY = 20;
  const boxWidth = 75;
  const boxHeight = 35;

  doc.setFillColor(245, 245, 245);
  doc.rect(boxX, boxY, boxWidth, boxHeight, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(boxX, boxY, boxWidth, boxHeight, 'S');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(data.dentist_name, boxX + 5, boxY + 8);

  doc.setFont('helvetica', 'normal');
  if (data.dentist_address) {
    const dentistAddressLines = data.dentist_address.split('\n');
    let dentistYPos = boxY + 14;
    dentistAddressLines.forEach(line => {
      doc.text(line.trim(), boxX + 5, dentistYPos);
      dentistYPos += 5;
    });
  }

  yPos = Math.max(yPos, boxY + boxHeight) + 15;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const titleText = 'BON DE LIVRAISON';
  const titleWidth = doc.getTextWidth(titleText);
  doc.text(titleText, (pageWidth - titleWidth) / 2, yPos);

  yPos += 15;

  doc.setFillColor(128, 128, 128);
  const hasPresciption = !!data.prescription_date;
  const headerHeight = hasPresciption ? 12 : 8;
  doc.rect(15, yPos, pageWidth - 30, headerHeight, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);

  const deliveryDateText = `Bon ${data.delivery_number} - Livraison le ${new Date(data.date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })}`;

  doc.text(deliveryDateText, 17, yPos + 5);

  if (data.prescription_date) {
    const prescriptionText = `Prescription du ${new Date(data.prescription_date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })}`;
    doc.text(prescriptionText, 17, yPos + 9);
  }

  doc.setTextColor(0, 0, 0);
  yPos += headerHeight + 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');

  const col1X = 15;
  const col2X = 115;
  const col3X = 145;
  const col4X = 167;
  const col5X = pageWidth - 15;

  doc.text('Fourniture', col1X, yPos);
  doc.text('Quantité', col2X, yPos);
  doc.text('Prix HT', col3X, yPos);
  doc.text('Remise', col4X, yPos);
  doc.text('Total HT', col5X, yPos, { align: 'right' });

  yPos += 2;
  doc.setLineWidth(0.5);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'normal');

  let totalPrestation = 0;

  data.items.forEach((item, index) => {
    const itemStartY = yPos;

    let itemDescription = item.description;
    if (item.tooth_number) {
      itemDescription += ` - Dents: ${item.tooth_number}`;
    }
    if (item.shade) {
      itemDescription += ` - Teinte: ${item.shade}`;
    }

    const descLines = doc.splitTextToSize(itemDescription, 100);

    descLines.forEach((line: string, lineIndex: number) => {
      doc.text(line, col1X, yPos);
      if (lineIndex === 0) {
        const quantityText = item.unit ? `${item.quantity} ${item.unit}` : item.quantity.toString();
        doc.text(quantityText, col2X, yPos);

        if (item.unit_price > 0) {
          const itemTotal = item.quantity * item.unit_price;
          totalPrestation += itemTotal;

          doc.text(`${item.unit_price.toFixed(2)} €`, col3X, yPos);
          doc.text(`${itemTotal.toFixed(2)} €`, col5X, yPos, { align: 'right' });
        }
      }
      yPos += 4;
    });

    if (index < data.items.length - 1) {
      yPos += 2;
    }
  });

  yPos += 10;

  const totalsLabelX = col2X - 10;
  const totalsValueX = col5X;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const totalLabel = 'TOTAL PRESTATION HT';
  doc.text(totalLabel, totalsLabelX, yPos);
  doc.text(`${totalPrestation.toFixed(2)} €`, totalsValueX, yPos, { align: 'right' });

  yPos += 6;
  doc.setFont('helvetica', 'normal');
  const totalFournitureLabel = 'TOTAL FOURNITURE HT';
  doc.text(totalFournitureLabel, totalsLabelX, yPos);
  doc.text('0,00 €', totalsValueX, yPos, { align: 'right' });

  yPos += 6;
  doc.setDrawColor(0, 0, 0);
  doc.line(totalsLabelX, yPos, totalsValueX, yPos);

  yPos += 5;
  doc.setFont('helvetica', 'normal');
  const totalHTLabel = 'Total HT exonéré*';
  doc.text(totalHTLabel, totalsLabelX, yPos);
  doc.text(`${totalPrestation.toFixed(2)} €`, totalsValueX, yPos, { align: 'right' });

  yPos += 4;
  doc.setFontSize(7);
  const exonerationText = '* Exonération de TVA : Article 261-4-1° du Code Général des Impôts';
  doc.text(exonerationText, totalsLabelX, yPos);

  yPos += 6;
  doc.setDrawColor(0, 0, 0);
  doc.line(totalsLabelX, yPos - 2, totalsValueX, yPos - 2);

  yPos += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const totalTTCLabel = 'TOTAL TTC';
  doc.text(totalTTCLabel, totalsLabelX, yPos);
  doc.text(`${totalPrestation.toFixed(2)} €`, totalsValueX, yPos, { align: 'right' });

  yPos += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('Lieu de fabrication : France', (pageWidth - doc.getTextWidth('Lieu de fabrication : France')) / 2, yPos);

  const footerY = pageHeight - 20;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const footerLine1 = `${data.laboratory_name}`;
  const footerLine2 = 'RCS 919 832 287 R.C.S. Ajaccio - Département immatriculation 2A';

  doc.text(footerLine1, 15, footerY);
  doc.text(footerLine2, 15, footerY + 4);

  const pageNumber = '1/2';
  doc.text(pageNumber, pageWidth - 20, footerY + 4);

  doc.addPage();

  generateCertificatePage(doc, data);

  doc.save(`Bon_Livraison_${data.delivery_number}.pdf`);
}

interface ProformaDeliveryNote {
  delivery_number: string;
  date: string;
  prescription_date?: string;
  patient_name: string;
  items: DeliveryNoteItem[];
}

interface ProformaData {
  proforma_number: string;
  date: string;
  laboratory_name: string;
  laboratory_address: string;
  laboratory_phone: string;
  laboratory_email: string;
  laboratory_logo_url?: string;
  laboratory_iban?: string;
  laboratory_bic?: string;
  dentist_name: string;
  dentist_address: string;
  delivery_notes: ProformaDeliveryNote[];
  tax_rate: number;
}

interface InvoiceData {
  invoice_number: string;
  date: string;
  laboratory_name: string;
  laboratory_address: string;
  laboratory_phone: string;
  laboratory_email: string;
  laboratory_logo_url?: string;
  laboratory_iban?: string;
  laboratory_bic?: string;
  dentist_name: string;
  dentist_address: string;
  delivery_notes: ProformaDeliveryNote[];
  tax_rate: number;
}

export async function generateProformaPDF(data: ProformaData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let yPos = 20;

  if (data.laboratory_logo_url) {
    try {
      const img = await loadImage(data.laboratory_logo_url);

      const maxWidth = 50;
      const maxHeight = 25;

      const aspectRatio = img.width / img.height;
      let logoWidth = maxWidth;
      let logoHeight = maxWidth / aspectRatio;

      if (logoHeight > maxHeight) {
        logoHeight = maxHeight;
        logoWidth = maxHeight * aspectRatio;
      }

      doc.addImage(data.laboratory_logo_url, 'PNG', 15, yPos, logoWidth, logoHeight);
      yPos += logoHeight + 5;
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
    }
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.laboratory_name, 15, yPos);
  yPos += 5;

  if (data.laboratory_address) {
    const addressLines = data.laboratory_address.split('\n');
    addressLines.forEach(line => {
      doc.text(line.trim(), 15, yPos);
      yPos += 5;
    });
  }

  if (data.laboratory_phone) {
    doc.text(data.laboratory_phone, 15, yPos);
    yPos += 5;
  }

  if (data.laboratory_email) {
    doc.text(data.laboratory_email, 15, yPos);
    yPos += 5;
  }

  const boxX = 120;
  const boxY = 20;
  const boxWidth = 75;
  const boxHeight = 35;

  doc.setFillColor(245, 245, 245);
  doc.rect(boxX, boxY, boxWidth, boxHeight, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(boxX, boxY, boxWidth, boxHeight, 'S');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(data.dentist_name, boxX + 5, boxY + 8);

  doc.setFont('helvetica', 'normal');
  if (data.dentist_address) {
    const dentistAddressLines = data.dentist_address.split('\n');
    let dentistYPos = boxY + 14;
    dentistAddressLines.forEach(line => {
      doc.text(line.trim(), boxX + 5, dentistYPos);
      dentistYPos += 5;
    });
  }

  yPos = Math.max(yPos, boxY + boxHeight) + 15;

  if (data.laboratory_iban) {
    doc.text(`IBAN : ${data.laboratory_iban}`, 15, yPos);
    yPos += 5;
  }
  if (data.laboratory_bic) {
    doc.text(`BIC : ${data.laboratory_bic}`, 15, yPos);
    yPos += 5;
  }
  doc.setFont('helvetica', 'bold');
  doc.text(`Date de facture : ${new Date(data.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`, 15, yPos);

  yPos = Math.max(yPos, boxY + boxHeight) + 15;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const titleText = 'FACTURE PRO FORMA';
  const titleWidth = doc.getTextWidth(titleText);
  doc.text(titleText, (pageWidth - titleWidth) / 2, yPos);

  yPos += 8;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const monthText = new Date(data.date).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric'
  });
  const monthWidth = doc.getTextWidth(monthText);
  doc.text(monthText, (pageWidth - monthWidth) / 2, yPos);

  yPos += 15;

  let grandTotal = 0;

  yPos += 10;

  const col1X = 15;
  const col2X = 110;
  const col3X = 135;
  const col4X = 160;
  const col5X = pageWidth - 15;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Fourniture', col1X, yPos);
  doc.text('Quantité', col2X, yPos);
  doc.text('Prix HT', col3X, yPos);
  doc.text('Remise', col4X, yPos);
  doc.text('Total HT', col5X, yPos, { align: 'right' });

  yPos += 2;
  doc.setLineWidth(0.3);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 5;

  data.delivery_notes.forEach((note, noteIndex) => {
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(128, 128, 128);
    const hasPresciption = !!note.prescription_date;
    const headerHeight = hasPresciption ? 10 : 7;
    doc.rect(15, yPos, pageWidth - 30, headerHeight, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);

    const deliveryDateText = `Bon ${note.delivery_number} - Livraison le ${new Date(note.date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })}`;

    doc.text(deliveryDateText, 17, yPos + 4);

    const patientLabel = 'Patient';
    const patientLabelWidth = doc.getTextWidth(patientLabel);
    const patientNameWidth = doc.getTextWidth(note.patient_name);
    const totalPatientWidth = patientLabelWidth + patientNameWidth + 2;

    doc.text(patientLabel, pageWidth - 17 - totalPatientWidth, yPos + 4);
    doc.text(note.patient_name, pageWidth - 17, yPos + 4, { align: 'right' });

    if (note.prescription_date) {
      const prescriptionText = `Prescription du ${new Date(note.prescription_date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })}`;
      doc.text(prescriptionText, 17, yPos + 8);
    }

    doc.setTextColor(0, 0, 0);
    yPos += headerHeight + 3;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');

    let noteTotal = 0;

    note.items.forEach((item) => {
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
      }

      let itemDescription = item.description;
      const detailsParts = [];
      if (item.tooth_number) {
        detailsParts.push(`Dents : ${item.tooth_number}`);
      }
      if (item.shade) {
        detailsParts.push(`Teintes : ${item.shade}`);
      }

      const descLines = doc.splitTextToSize(itemDescription, 90);
      const firstLine = descLines[0];

      doc.text(firstLine, col1X, yPos);

      const quantityText = item.quantity.toFixed(3).replace(/\.?0+$/, '');
      doc.text(quantityText, col2X, yPos);

      if (item.unit_price > 0) {
        const itemTotal = item.quantity * item.unit_price;
        noteTotal += itemTotal;

        doc.text(`${item.unit_price.toFixed(2)} €`, col3X, yPos);
        doc.text(`${itemTotal.toFixed(2)} €`, col5X, yPos, { align: 'right' });
      }

      yPos += 3;

      if (detailsParts.length > 0) {
        doc.text(detailsParts.join(' '), col1X, yPos);
        yPos += 3;
      }

      for (let i = 1; i < descLines.length; i++) {
        doc.text(descLines[i], col1X, yPos);
        yPos += 3;
      }

      yPos += 1;
    });

    grandTotal += noteTotal;

    yPos += 2;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text(`Total HT du bon`, col3X + 15, yPos);
    doc.text(`${noteTotal.toFixed(2)} €`, col5X, yPos, { align: 'right' });

    yPos += 5;

    if (noteIndex < data.delivery_notes.length - 1) {
      doc.setLineWidth(0.2);
      doc.setDrawColor(200, 200, 200);
      doc.line(15, yPos, pageWidth - 15, yPos);
      yPos += 5;
    }
  });

  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = 20;
  }

  yPos += 10;

  const totalsLabelX = 120;
  const totalsValueX = pageWidth - 15;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL HT PRESTATION', totalsLabelX, yPos);
  doc.text(`${grandTotal.toFixed(2)} €`, totalsValueX, yPos, { align: 'right' });

  yPos += 4;
  doc.text('TOTAL HT FOURNITURE', totalsLabelX, yPos);
  doc.text('0,00 €', totalsValueX, yPos, { align: 'right' });

  yPos += 5;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(totalsLabelX, yPos, totalsValueX, yPos);

  yPos += 4;
  doc.text('Total HT exonoré de taxes*', totalsLabelX, yPos);
  doc.text(`${grandTotal.toFixed(2)} €`, totalsValueX, yPos, { align: 'right' });

  yPos += 3;
  doc.setFontSize(6);
  doc.text('* Exonération de TVA : Article 261-4-1° du Code Général des Impôts', totalsLabelX, yPos);

  yPos += 5;
  doc.setLineWidth(0.5);
  doc.line(totalsLabelX, yPos - 1, totalsValueX, yPos - 1);

  yPos += 4;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL TTC', totalsLabelX, yPos);
  doc.text(`${grandTotal.toFixed(2)} €`, totalsValueX, yPos, { align: 'right' });

  const footerY = pageHeight - 20;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const footerLine1 = `${data.laboratory_name}`;
  const footerLine2 = 'RCS 919 832 287 R.C.S. Ajaccio - Département immatriculation 2A';

  doc.text(footerLine1, 15, footerY);
  doc.text(footerLine2, 15, footerY + 4);

  doc.save(`Proforma_${data.proforma_number}.pdf`);
}

export async function generateProformaPDFBase64(data: ProformaData): Promise<string> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let yPos = 20;

  if (data.laboratory_logo_url) {
    try {
      const img = await loadImage(data.laboratory_logo_url);

      const maxWidth = 50;
      const maxHeight = 25;

      const aspectRatio = img.width / img.height;
      let logoWidth = maxWidth;
      let logoHeight = maxWidth / aspectRatio;

      if (logoHeight > maxHeight) {
        logoHeight = maxHeight;
        logoWidth = maxHeight * aspectRatio;
      }

      doc.addImage(data.laboratory_logo_url, 'PNG', 15, yPos, logoWidth, logoHeight);
      yPos += logoHeight + 5;
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
    }
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.laboratory_name, 15, yPos);
  yPos += 5;

  if (data.laboratory_address) {
    const addressLines = data.laboratory_address.split('\n');
    addressLines.forEach(line => {
      doc.text(line.trim(), 15, yPos);
      yPos += 5;
    });
  }

  if (data.laboratory_phone) {
    doc.text(data.laboratory_phone, 15, yPos);
    yPos += 5;
  }

  if (data.laboratory_email) {
    doc.text(data.laboratory_email, 15, yPos);
    yPos += 5;
  }

  const boxX = 120;
  const boxY = 20;
  const boxWidth = 75;
  const boxHeight = 35;

  doc.setFillColor(245, 245, 245);
  doc.rect(boxX, boxY, boxWidth, boxHeight, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(boxX, boxY, boxWidth, boxHeight, 'S');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(data.dentist_name, boxX + 5, boxY + 8);

  doc.setFont('helvetica', 'normal');
  if (data.dentist_address) {
    const dentistAddressLines = data.dentist_address.split('\n');
    let dentistYPos = boxY + 14;
    dentistAddressLines.forEach(line => {
      doc.text(line.trim(), boxX + 5, dentistYPos);
      dentistYPos += 5;
    });
  }

  yPos = Math.max(yPos, boxY + boxHeight) + 15;

  if (data.laboratory_iban) {
    doc.text(`IBAN : ${data.laboratory_iban}`, 15, yPos);
    yPos += 5;
  }
  if (data.laboratory_bic) {
    doc.text(`BIC : ${data.laboratory_bic}`, 15, yPos);
    yPos += 5;
  }
  doc.setFont('helvetica', 'bold');
  doc.text(`Date de facture : ${new Date(data.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`, 15, yPos);

  yPos = Math.max(yPos, boxY + boxHeight) + 15;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const titleText = 'FACTURE PRO FORMA';
  const titleWidth = doc.getTextWidth(titleText);
  doc.text(titleText, (pageWidth - titleWidth) / 2, yPos);

  yPos += 8;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const monthText = new Date(data.date).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric'
  });
  const monthWidth = doc.getTextWidth(monthText);
  doc.text(monthText, (pageWidth - monthWidth) / 2, yPos);

  yPos += 15;

  let grandTotal = 0;

  yPos += 10;

  const col1X = 15;
  const col2X = 110;
  const col3X = 135;
  const col4X = 160;
  const col5X = pageWidth - 15;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Fourniture', col1X, yPos);
  doc.text('Quantité', col2X, yPos);
  doc.text('Prix HT', col3X, yPos);
  doc.text('Remise', col4X, yPos);
  doc.text('Total HT', col5X, yPos, { align: 'right' });

  yPos += 2;
  doc.setLineWidth(0.3);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 5;

  data.delivery_notes.forEach((note, noteIndex) => {
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(128, 128, 128);
    const hasPresciption = !!note.prescription_date;
    const headerHeight = hasPresciption ? 10 : 7;
    doc.rect(15, yPos, pageWidth - 30, headerHeight, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);

    const deliveryDateText = `Bon ${note.delivery_number} - Livraison le ${new Date(note.date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })}`;

    doc.text(deliveryDateText, 17, yPos + 4);

    const patientLabel = 'Patient';
    const patientLabelWidth = doc.getTextWidth(patientLabel);
    const patientNameWidth = doc.getTextWidth(note.patient_name);
    const totalPatientWidth = patientLabelWidth + patientNameWidth + 2;

    doc.text(patientLabel, pageWidth - 17 - totalPatientWidth, yPos + 4);
    doc.text(note.patient_name, pageWidth - 17, yPos + 4, { align: 'right' });

    if (note.prescription_date) {
      const prescriptionText = `Prescription du ${new Date(note.prescription_date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })}`;
      doc.text(prescriptionText, 17, yPos + 8);
    }

    doc.setTextColor(0, 0, 0);
    yPos += headerHeight + 3;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');

    let noteTotal = 0;

    note.items.forEach((item) => {
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
      }

      let itemDescription = item.description;
      const detailsParts = [];
      if (item.tooth_number) {
        detailsParts.push(`Dents : ${item.tooth_number}`);
      }
      if (item.shade) {
        detailsParts.push(`Teintes : ${item.shade}`);
      }

      const descLines = doc.splitTextToSize(itemDescription, 90);
      const firstLine = descLines[0];

      doc.text(firstLine, col1X, yPos);

      const quantityText = item.quantity.toFixed(3).replace(/\.?0+$/, '');
      doc.text(quantityText, col2X, yPos);

      if (item.unit_price > 0) {
        const itemTotal = item.quantity * item.unit_price;
        noteTotal += itemTotal;

        doc.text(`${item.unit_price.toFixed(2)} €`, col3X, yPos);
        doc.text(`${itemTotal.toFixed(2)} €`, col5X, yPos, { align: 'right' });
      }

      yPos += 3;

      if (detailsParts.length > 0) {
        doc.text(detailsParts.join(' '), col1X, yPos);
        yPos += 3;
      }

      for (let i = 1; i < descLines.length; i++) {
        doc.text(descLines[i], col1X, yPos);
        yPos += 3;
      }

      yPos += 1;
    });

    grandTotal += noteTotal;

    yPos += 2;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text(`Total HT du bon`, col3X + 15, yPos);
    doc.text(`${noteTotal.toFixed(2)} €`, col5X, yPos, { align: 'right' });

    yPos += 5;

    if (noteIndex < data.delivery_notes.length - 1) {
      doc.setLineWidth(0.2);
      doc.setDrawColor(200, 200, 200);
      doc.line(15, yPos, pageWidth - 15, yPos);
      yPos += 5;
    }
  });

  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = 20;
  }

  yPos += 10;

  const totalsLabelX = 120;
  const totalsValueX = pageWidth - 15;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL HT PRESTATION', totalsLabelX, yPos);
  doc.text(`${grandTotal.toFixed(2)} €`, totalsValueX, yPos, { align: 'right' });

  yPos += 4;
  doc.text('TOTAL HT FOURNITURE', totalsLabelX, yPos);
  doc.text('0,00 €', totalsValueX, yPos, { align: 'right' });

  yPos += 5;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(totalsLabelX, yPos, totalsValueX, yPos);

  yPos += 4;
  doc.text('Total HT exonoré de taxes*', totalsLabelX, yPos);
  doc.text(`${grandTotal.toFixed(2)} €`, totalsValueX, yPos, { align: 'right' });

  yPos += 3;
  doc.setFontSize(6);
  doc.text('* Exonération de TVA : Article 261-4-1° du Code Général des Impôts', totalsLabelX, yPos);

  yPos += 5;
  doc.setLineWidth(0.5);
  doc.line(totalsLabelX, yPos - 1, totalsValueX, yPos - 1);

  yPos += 4;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL TTC', totalsLabelX, yPos);
  doc.text(`${grandTotal.toFixed(2)} €`, totalsValueX, yPos, { align: 'right' });

  const footerY = pageHeight - 20;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const footerLine1 = `${data.laboratory_name}`;
  const footerLine2 = 'RCS 919 832 287 R.C.S. Ajaccio - Département immatriculation 2A';

  doc.text(footerLine1, 15, footerY);
  doc.text(footerLine2, 15, footerY + 4);

  return doc.output('datauristring').split(',')[1];
}

export async function generateInvoicePDF(data: InvoiceData, returnBase64 = false): Promise<string | undefined> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let yPos = 20;

  if (data.laboratory_logo_url) {
    try {
      const img = await loadImage(data.laboratory_logo_url);

      const maxWidth = 50;
      const maxHeight = 25;

      const aspectRatio = img.width / img.height;
      let logoWidth = maxWidth;
      let logoHeight = maxWidth / aspectRatio;

      if (logoHeight > maxHeight) {
        logoHeight = maxHeight;
        logoWidth = maxHeight * aspectRatio;
      }

      doc.addImage(data.laboratory_logo_url, 'PNG', 15, yPos, logoWidth, logoHeight);
      yPos += logoHeight + 5;
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
    }
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.laboratory_name, 15, yPos);
  yPos += 5;

  if (data.laboratory_address) {
    const addressLines = data.laboratory_address.split('\n');
    addressLines.forEach(line => {
      doc.text(line.trim(), 15, yPos);
      yPos += 5;
    });
  }

  if (data.laboratory_phone) {
    doc.text(data.laboratory_phone, 15, yPos);
    yPos += 5;
  }

  if (data.laboratory_email) {
    doc.text(data.laboratory_email, 15, yPos);
    yPos += 5;
  }

  const boxX = 120;
  const boxY = 20;
  const boxWidth = 75;
  const boxHeight = 35;

  doc.setFillColor(245, 245, 245);
  doc.rect(boxX, boxY, boxWidth, boxHeight, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(boxX, boxY, boxWidth, boxHeight, 'S');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(data.dentist_name, boxX + 5, boxY + 8);

  doc.setFont('helvetica', 'normal');
  if (data.dentist_address) {
    const dentistAddressLines = data.dentist_address.split('\n');
    let dentistYPos = boxY + 14;
    dentistAddressLines.forEach(line => {
      doc.text(line.trim(), boxX + 5, dentistYPos);
      dentistYPos += 5;
    });
  }

  yPos = Math.max(yPos, boxY + boxHeight) + 15;

  if (data.laboratory_iban) {
    doc.text(`IBAN : ${data.laboratory_iban}`, 15, yPos);
    yPos += 5;
  }
  if (data.laboratory_bic) {
    doc.text(`BIC : ${data.laboratory_bic}`, 15, yPos);
    yPos += 5;
  }
  doc.setFont('helvetica', 'bold');
  doc.text(`Date de facture : ${new Date(data.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`, 15, yPos);

  yPos = Math.max(yPos, boxY + boxHeight) + 15;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const titleText = `FACTURE ${data.invoice_number}`;
  const titleWidth = doc.getTextWidth(titleText);
  doc.text(titleText, (pageWidth - titleWidth) / 2, yPos);

  yPos += 15;

  let grandTotal = 0;

  yPos += 10;

  const col1X = 15;
  const col2X = 110;
  const col3X = 135;
  const col4X = 160;
  const col5X = pageWidth - 15;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Fourniture', col1X, yPos);
  doc.text('Quantité', col2X, yPos);
  doc.text('Prix HT', col3X, yPos);
  doc.text('Remise', col4X, yPos);
  doc.text('Total HT', col5X, yPos, { align: 'right' });

  yPos += 2;
  doc.setLineWidth(0.3);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 5;

  data.delivery_notes.forEach((note, noteIndex) => {
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(128, 128, 128);
    const hasPresciption = !!note.prescription_date;
    const headerHeight = hasPresciption ? 10 : 7;
    doc.rect(15, yPos, pageWidth - 30, headerHeight, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);

    const deliveryDateText = `Bon ${note.delivery_number} - Livraison le ${new Date(note.date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })}`;

    doc.text(deliveryDateText, 17, yPos + 4);

    if (note.prescription_date) {
      const prescriptionText = `Prescription du ${new Date(note.prescription_date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })}`;
      doc.text(prescriptionText, 17, yPos + 8);
    }

    doc.setTextColor(0, 0, 0);
    yPos += headerHeight + 3;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');

    let noteTotal = 0;

    note.items.forEach((item) => {
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
      }

      let itemDescription = item.description;
      const detailsParts = [];
      if (item.tooth_number) {
        detailsParts.push(`Dents : ${item.tooth_number}`);
      }
      if (item.shade) {
        detailsParts.push(`Teintes : ${item.shade}`);
      }

      const descLines = doc.splitTextToSize(itemDescription, 90);
      const firstLine = descLines[0];

      doc.text(firstLine, col1X, yPos);

      const quantityText = item.quantity.toFixed(3).replace(/\.?0+$/, '');
      doc.text(quantityText, col2X, yPos);

      if (item.unit_price > 0) {
        const itemTotal = item.quantity * item.unit_price;
        noteTotal += itemTotal;

        doc.text(`${item.unit_price.toFixed(2)} €`, col3X, yPos);
        doc.text(`${itemTotal.toFixed(2)} €`, col5X, yPos, { align: 'right' });
      }

      yPos += 3;

      if (detailsParts.length > 0) {
        doc.text(detailsParts.join(' '), col1X, yPos);
        yPos += 3;
      }

      for (let i = 1; i < descLines.length; i++) {
        doc.text(descLines[i], col1X, yPos);
        yPos += 3;
      }

      yPos += 1;
    });

    grandTotal += noteTotal;

    yPos += 2;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text(`Total HT du bon`, col3X + 15, yPos);
    doc.text(`${noteTotal.toFixed(2)} €`, col5X, yPos, { align: 'right' });

    yPos += 5;

    if (noteIndex < data.delivery_notes.length - 1) {
      doc.setLineWidth(0.2);
      doc.setDrawColor(200, 200, 200);
      doc.line(15, yPos, pageWidth - 15, yPos);
      yPos += 5;
    }
  });

  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = 20;
  }

  yPos += 10;

  const totalsLabelX = 120;
  const totalsValueX = pageWidth - 15;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL HT PRESTATION', totalsLabelX, yPos);
  doc.text(`${grandTotal.toFixed(2)} €`, totalsValueX, yPos, { align: 'right' });

  yPos += 4;
  doc.text('TOTAL HT FOURNITURE', totalsLabelX, yPos);
  doc.text('0,00 €', totalsValueX, yPos, { align: 'right' });

  yPos += 5;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(totalsLabelX, yPos, totalsValueX, yPos);

  yPos += 4;
  doc.text('Total HT exonoré de taxes*', totalsLabelX, yPos);
  doc.text(`${grandTotal.toFixed(2)} €`, totalsValueX, yPos, { align: 'right' });

  yPos += 3;
  doc.setFontSize(6);
  doc.text('* Exonération de TVA : Article 261-4-1° du Code Général des Impôts', totalsLabelX, yPos);

  yPos += 5;
  doc.setLineWidth(0.5);
  doc.line(totalsLabelX, yPos - 1, totalsValueX, yPos - 1);

  yPos += 4;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL TTC', totalsLabelX, yPos);
  doc.text(`${grandTotal.toFixed(2)} €`, totalsValueX, yPos, { align: 'right' });

  const footerY = pageHeight - 20;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const footerLine1 = `${data.laboratory_name}`;
  const footerLine2 = 'RCS 919 832 287 R.C.S. Ajaccio - Département immatriculation 2A';

  doc.text(footerLine1, 15, footerY);
  doc.text(footerLine2, 15, footerY + 4);

  if (returnBase64) {
    return doc.output('datauristring').split(',')[1];
  }

  doc.save(`Facture_${data.invoice_number}.pdf`);
}

function generateCertificatePage(doc: jsPDF, data: DeliveryNoteData) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  let yPos = 30;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(15, 20, pageWidth - 30, pageHeight - 55, 'S');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const title1 = 'Déclaration de conformité CE de Dispositif Médical Sur Mesure';
  const title1Width = doc.getTextWidth(title1);
  doc.text(title1, (pageWidth - title1Width) / 2, yPos);

  yPos += 7;
  doc.setFontSize(10);
  const title2 = 'Livre II - 5ème partie du CSP';
  const title2Width = doc.getTextWidth(title2);
  doc.text(title2, (pageWidth - title2Width) / 2, yPos);

  yPos += 12;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Le laboratoire :', margin, yPos);

  yPos += 8;
  const boxX = margin + 10;
  const boxY = yPos;
  const boxWidth = pageWidth - 2 * margin - 20;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const labInfo = [
    data.laboratory_name,
    ...data.laboratory_address.split('\n'),
    'FRANCE'
  ];

  const boxHeight = labInfo.length * 5 + 10;

  doc.setFillColor(245, 245, 245);
  doc.rect(boxX, boxY, boxWidth, boxHeight, 'F');

  yPos += 8;

  labInfo.forEach(line => {
    const lineWidth = doc.getTextWidth(line);
    doc.text(line, (pageWidth - lineWidth) / 2, yPos);
    yPos += 5;
  });

  yPos = boxY + boxHeight + 8;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const declarationText = `assure et déclare sous sa seule responsabilité, que le dispositif médical sur mesure destiné à l'usage exclusif du patient ${data.patient_name}, bon de livraison n° ${data.delivery_number} mis sur le marché et fabriqué conformément à la prescription du ${data.prescription_date ? new Date(data.prescription_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '___________'} établie par`;

  const declarationLines = doc.splitTextToSize(declarationText, pageWidth - 2 * margin);
  declarationLines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(`Docteur ${data.dentist_name}`, (pageWidth - doc.getTextWidth(`Docteur ${data.dentist_name}`)) / 2, yPos);

  yPos += 10;
  doc.setFont('helvetica', 'normal');
  const conformiteText = `est conforme aux exigences générales en matière de sécurité et de performances énoncées à l'annexe I du règlement (UE) 2017/745 du Parlement européen et du Conseil du 5 avril 2017 relatif aux dispositifs médicaux et applicables à la fabrication des prothèses dentaires, modifiant la directive 2001/83/CE, le règlement (CE) n° 178/2002 et le règlement (CE) n° 1223/2009 et abrogeant les directives du Conseil 90/385/CEE et 93/42/CEE.`;

  const conformiteLines = doc.splitTextToSize(conformiteText, pageWidth - 2 * margin);
  conformiteLines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 4;
  });

  yPos += 8;
  const currentDate = new Date();
  const dateText = `Contrôlé à PORTO VECCHIO (France), le ${currentDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  doc.text(dateText, pageWidth - margin - doc.getTextWidth(dateText), yPos);
  yPos += 5;
  const signataire = 'Par Baptiste Gall';
  doc.text(signataire, pageWidth - margin - doc.getTextWidth(signataire), yPos);

  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Lieu de fabrication : France', (pageWidth - doc.getTextWidth('Lieu de fabrication : France')) / 2, yPos);

  yPos += 15;

  doc.setFillColor(230, 230, 230);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 40, 'F');
  doc.rect(margin, yPos, pageWidth - 2 * margin, 40, 'S');

  yPos += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');

  const leftColumnX = margin + 3;
  const rightColumnX = pageWidth / 2 + 10;

  doc.text(data.laboratory_name, leftColumnX, yPos);
  doc.setFontSize(7);
  doc.text('CARTE D\'IDENTIFICATION DE LA PROTHÈSE DENTAIRE', rightColumnX, yPos);
  doc.setFontSize(8);

  yPos += 4;
  doc.setFont('helvetica', 'normal');
  const labAddressLines = data.laboratory_address.split('\n');
  labAddressLines.forEach(line => {
    doc.text(line, leftColumnX, yPos);
    yPos += 4;
  });

  const cardYStart = yPos - (labAddressLines.length * 4);
  doc.setFontSize(7);
  doc.text('Dispositif Médical Sur Mesure Invasif (suivant les annexes VIII)', rightColumnX, cardYStart + 4);
  doc.setFontSize(8);
  doc.text(`Prescrit le : ${data.prescription_date ? new Date(data.prescription_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '___________'}`, rightColumnX, cardYStart + 8);
  doc.text(`Livrée le ${new Date(data.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`, rightColumnX, cardYStart + 12);

  yPos = Math.max(yPos, cardYStart + 16) + 6;

  doc.setFillColor(255, 255, 255);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
  doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'S');

  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(`Docteur ${data.dentist_name}`, leftColumnX, yPos);
  doc.text(`Patient : ${data.patient_name}`, rightColumnX, yPos);

  yPos += 8;

  data.items.forEach((item) => {
    // Calculate required height for this item
    let itemDesc = item.description;
    if (item.quantity > 1) {
      itemDesc += ` (Quantité : ${item.quantity}${item.unit ? ' ' + item.unit : ''})`;
    }

    let itemHeight = 8;
    let detailsText = '';
    if (item.tooth_number) {
      detailsText += `Dents : ${item.tooth_number}`;
    }
    if (item.shade) {
      if (detailsText) detailsText += ' / ';
      detailsText += `Teintes : ${item.shade}`;
    }
    if (detailsText) {
      itemHeight = 12; // Need extra space for details line
    }

    doc.setFillColor(200, 200, 200);
    doc.rect(margin, yPos, pageWidth - 2 * margin, itemHeight, 'F');
    doc.rect(margin, yPos, pageWidth - 2 * margin, itemHeight, 'S');

    yPos += 6;
    doc.setFont('helvetica', 'bold');

    doc.text(itemDesc, leftColumnX, yPos);
    doc.text('Origine : FRANCE', pageWidth - margin - 3 - doc.getTextWidth('Origine : FRANCE'), yPos);

    if (detailsText) {
      yPos += 4;
      doc.text(detailsText, leftColumnX, yPos);
      doc.text('Laboratoire', pageWidth - margin - 3 - doc.getTextWidth('Laboratoire'), yPos);
      yPos += 8;
    } else {
      yPos += 4;
      doc.text('Laboratoire', pageWidth - margin - 3 - doc.getTextWidth('Laboratoire'), yPos);
      yPos += 6;
    }
  });

  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Lieu de fabrication : France', (pageWidth - doc.getTextWidth('Lieu de fabrication : France')) / 2, yPos);

  const footerY = pageHeight - 20;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const footerLine1 = `${data.laboratory_name}`;
  doc.text(footerLine1, 15, footerY);

  doc.setFontSize(7);
  const footerLine2 = `${data.laboratory_name} - SAS / 2000€`;
  doc.text(footerLine2, 15, footerY + 4);

  const footerLine3 = 'RCS 919 832 287 R.C.S. Ajaccio - Département immatriculation 2A';
  doc.text(footerLine3, 15, footerY + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const patientText = data.patient_name;
  doc.text(patientText, pageWidth - 15 - doc.getTextWidth(patientText), footerY);

  doc.setFontSize(8);
  const deliveryText = `Livraison ${data.delivery_number}`;
  doc.text(deliveryText, pageWidth - 15 - doc.getTextWidth(deliveryText), footerY + 4);

  const pageNumber = '2/2';
  doc.text(pageNumber, pageWidth - 15 - doc.getTextWidth(pageNumber), footerY + 8);
}
