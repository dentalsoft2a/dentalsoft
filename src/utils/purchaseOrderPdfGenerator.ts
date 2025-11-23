import jsPDF from 'jspdf';

interface PurchaseOrderItem {
  type: 'catalog' | 'resource' | 'variant';
  name: string;
  description: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  unit: string;
  order_quantity: number;
  category?: string;
  subcategory?: string;
  variantName?: string;
}

interface PurchaseOrderData {
  items: PurchaseOrderItem[];
  laboratoryName: string;
  laboratoryAddress: string;
  laboratoryPhone: string;
  laboratoryEmail: string;
  laboratoryLogo?: string;
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

export async function generatePurchaseOrderPDF(data: PurchaseOrderData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  const date = new Date();
  const orderNumber = `BC-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;

  if (data.laboratoryLogo) {
    try {
      const logo = await loadImage(data.laboratoryLogo);
      const logoWidth = 30;
      const logoHeight = (logo.height / logo.width) * logoWidth;
      doc.addImage(logo, 'PNG', margin, yPos, logoWidth, logoHeight);
      yPos += logoHeight + 5;
    } catch (error) {
      console.error('Error loading logo:', error);
    }
  }

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('BON DE COMMANDE', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`N° ${orderNumber}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 4;
  doc.text(`Date: ${date.toLocaleDateString('fr-FR')}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Laboratoire:', margin, yPos);
  yPos += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.laboratoryName, margin, yPos);
  yPos += 5;

  if (data.laboratoryAddress) {
    const addressLines = doc.splitTextToSize(data.laboratoryAddress, 80);
    doc.text(addressLines, margin, yPos);
    yPos += addressLines.length * 5;
  }

  if (data.laboratoryPhone) {
    doc.text(`Tél: ${data.laboratoryPhone}`, margin, yPos);
    yPos += 5;
  }

  if (data.laboratoryEmail) {
    doc.text(`Email: ${data.laboratoryEmail}`, margin, yPos);
    yPos += 5;
  }

  yPos += 10;

  const catalogItems = data.items.filter(item => item.type === 'catalog');
  const resourceItems = data.items.filter(item => item.type === 'resource');
  const variantItems = data.items.filter(item => item.type === 'variant');

  const renderSection = (title: string, items: PurchaseOrderItem[]) => {
    if (items.length === 0) return;

    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(title, margin + 2, yPos + 5.5);
    yPos += 12;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);

    const colWidths = {
      name: 70,
      stock: 25,
      threshold: 25,
      quantity: 25,
      unit: 20
    };

    const startX = margin + 2;
    doc.text('Désignation', startX, yPos);
    doc.text('Stock', startX + colWidths.name, yPos);
    doc.text('Seuil', startX + colWidths.name + colWidths.stock, yPos);
    doc.text('Quantité', startX + colWidths.name + colWidths.stock + colWidths.threshold, yPos);
    doc.text('Unité', startX + colWidths.name + colWidths.stock + colWidths.threshold + colWidths.quantity, yPos);

    yPos += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    items.forEach((item, index) => {
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = margin;
      }

      const isUrgent = item.stock_quantity === 0;

      if (isUrgent) {
        doc.setFillColor(254, 202, 202);
        doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 8, 'F');
      } else if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 8, 'F');
      }

      let itemName = item.name;
      if (item.variantName) {
        itemName += ` - ${item.variantName}`;
        if (item.subcategory) {
          itemName += ` (${item.subcategory})`;
        }
      } else if (item.subcategory) {
        itemName += ` - ${item.subcategory}`;
      } else if (item.category) {
        itemName += ` (${item.category})`;
      }

      const nameLines = doc.splitTextToSize(itemName, colWidths.name - 5);
      const lineHeight = 5;
      const cellHeight = Math.max(8, nameLines.length * lineHeight);

      doc.text(nameLines, startX, yPos);
      doc.text(item.stock_quantity.toString(), startX + colWidths.name, yPos);
      doc.text(item.low_stock_threshold.toString(), startX + colWidths.name + colWidths.stock, yPos);

      doc.setFont('helvetica', 'bold');
      if (isUrgent) {
        doc.setTextColor(220, 38, 38);
      } else {
        doc.setTextColor(234, 88, 12);
      }
      doc.text(item.order_quantity.toString(), startX + colWidths.name + colWidths.stock + colWidths.threshold, yPos);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(item.unit, startX + colWidths.name + colWidths.stock + colWidths.threshold + colWidths.quantity, yPos);

      yPos += Math.max(6, nameLines.length * lineHeight);

      if (item.description && nameLines.length === 1) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        const descLines = doc.splitTextToSize(item.description, colWidths.name + colWidths.stock - 5);
        doc.text(descLines.slice(0, 1), startX, yPos);
        yPos += 4;
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
      }

      yPos += 2;
    });

    yPos += 8;
  };

  if (catalogItems.length > 0) {
    renderSection('ARTICLES CATALOGUE', catalogItems);
  }

  if (resourceItems.length > 0) {
    renderSection('RESSOURCES', resourceItems);
  }

  if (variantItems.length > 0) {
    renderSection('VARIANTES DE RESSOURCES', variantItems);
  }

  yPos += 5;

  if (yPos > pageHeight - 30) {
    doc.addPage();
    yPos = margin;
  }

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('RÉCAPITULATIF', margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  if (catalogItems.length > 0) {
    doc.text(`Articles catalogue: ${catalogItems.length}`, margin + 5, yPos);
    yPos += 6;
  }

  if (resourceItems.length > 0) {
    doc.text(`Ressources: ${resourceItems.length}`, margin + 5, yPos);
    yPos += 6;
  }

  if (variantItems.length > 0) {
    doc.text(`Variantes: ${variantItems.length}`, margin + 5, yPos);
    yPos += 6;
  }

  yPos += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Total: ${data.items.length} élément${data.items.length > 1 ? 's' : ''} à commander`, margin + 5, yPos);

  const footerY = pageHeight - 15;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Document généré le ${date.toLocaleDateString('fr-FR')} à ${date.toLocaleTimeString('fr-FR')}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  doc.save(`Bon_Commande_${orderNumber}.pdf`);
}
