/**
 * Export FEC (Fichier des Écritures Comptables)
 * Conforme à l'article A47 A-1 du Livre des procédures fiscales
 * Format: CSV avec séparateur pipe (|) ou tabulation
 */

interface FecLine {
  JournalCode: string;           // Code journal
  JournalLib: string;             // Libellé journal
  EcritureNum: string;            // Numéro d'écriture (unique)
  EcritureDate: string;           // Date d'écriture (YYYYMMDD)
  CompteNum: string;              // Numéro de compte
  CompteLib: string;              // Libellé du compte
  CompAuxNum: string;             // Numéro de compte auxiliaire (patient)
  CompAuxLib: string;             // Libellé compte auxiliaire
  PieceRef: string;               // Référence de la pièce (N° facture)
  PieceDate: string;              // Date de la pièce (YYYYMMDD)
  EcritureLib: string;            // Libellé de l'écriture
  Debit: string;                  // Montant au débit
  Credit: string;                 // Montant au crédit
  EcritureLet: string;            // Lettrage (optionnel)
  DateLet: string;                // Date de lettrage (YYYYMMDD)
  ValidDate: string;              // Date de validation (YYYYMMDD)
  Montantdevise: string;          // Montant en devise
  Idevise: string;                // Identifiant devise (EUR)
}

interface DentalInvoiceForFec {
  id: string;
  invoice_number: string;
  invoice_date: string;
  patient_id: string;
  patient_name: string;
  total: number;
  cpam_part: number;
  mutuelle_part: number;
  patient_part: number;
  tax_amount: number;
  subtotal: number;
  status: string;
}

interface DentalPaymentForFec {
  id: string;
  invoice_id: string;
  invoice_number: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  payment_source: string;
  patient_id: string;
  patient_name: string;
}

interface DentalCreditNoteForFec {
  id: string;
  credit_note_number: string;
  credit_note_date: string;
  invoice_number: string;
  patient_id: string;
  patient_name: string;
  total: number;
  cpam_part: number;
  mutuelle_part: number;
  patient_part: number;
  tax_amount: number;
  subtotal: number;
}

/**
 * Formater une date au format YYYYMMDD
 */
function formatDateFec(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Formater un montant en string avec 2 décimales, séparateur virgule
 */
function formatAmountFec(amount: number): string {
  return amount.toFixed(2).replace('.', ',');
}

/**
 * Générer le numéro de compte auxiliaire patient (format: 411XXXXX)
 */
function generatePatientAccountNumber(patientId: string): string {
  // Utiliser les 5 premiers caractères de l'ID patient
  const shortId = patientId.replace(/-/g, '').substring(0, 5).toUpperCase();
  return `411${shortId}`;
}

/**
 * Générer les écritures comptables pour une facture patient
 */
function generateInvoiceFecLines(invoice: DentalInvoiceForFec): FecLine[] {
  const lines: FecLine[] = [];
  const invoiceDate = formatDateFec(invoice.invoice_date);
  const patientAccount = generatePatientAccountNumber(invoice.patient_id);

  // Écriture au débit : Compte client 411XXX (Patient)
  lines.push({
    JournalCode: 'VTE',
    JournalLib: 'Journal des ventes',
    EcritureNum: invoice.invoice_number,
    EcritureDate: invoiceDate,
    CompteNum: '411000',
    CompteLib: 'Clients',
    CompAuxNum: patientAccount,
    CompAuxLib: invoice.patient_name,
    PieceRef: invoice.invoice_number,
    PieceDate: invoiceDate,
    EcritureLib: `Facture patient ${invoice.invoice_number}`,
    Debit: formatAmountFec(invoice.total),
    Credit: '0,00',
    EcritureLet: '',
    DateLet: '',
    ValidDate: invoiceDate,
    Montantdevise: formatAmountFec(invoice.total),
    Idevise: 'EUR'
  });

  // Écriture au crédit : Compte de produit 706000 (Prestations de services)
  if (invoice.subtotal > 0) {
    lines.push({
      JournalCode: 'VTE',
      JournalLib: 'Journal des ventes',
      EcritureNum: invoice.invoice_number,
      EcritureDate: invoiceDate,
      CompteNum: '706000',
      CompteLib: 'Prestations de services',
      CompAuxNum: '',
      CompAuxLib: '',
      PieceRef: invoice.invoice_number,
      PieceDate: invoiceDate,
      EcritureLib: `Facture patient ${invoice.invoice_number}`,
      Debit: '0,00',
      Credit: formatAmountFec(invoice.subtotal),
      EcritureLet: '',
      DateLet: '',
      ValidDate: invoiceDate,
      Montantdevise: formatAmountFec(invoice.subtotal),
      Idevise: 'EUR'
    });
  }

  // Écriture au crédit : Compte de TVA 445710 (TVA collectée)
  if (invoice.tax_amount > 0) {
    lines.push({
      JournalCode: 'VTE',
      JournalLib: 'Journal des ventes',
      EcritureNum: invoice.invoice_number,
      EcritureDate: invoiceDate,
      CompteNum: '445710',
      CompteLib: 'TVA collectée',
      CompAuxNum: '',
      CompAuxLib: '',
      PieceRef: invoice.invoice_number,
      PieceDate: invoiceDate,
      EcritureLib: `TVA facture ${invoice.invoice_number}`,
      Debit: '0,00',
      Credit: formatAmountFec(invoice.tax_amount),
      EcritureLet: '',
      DateLet: '',
      ValidDate: invoiceDate,
      Montantdevise: formatAmountFec(invoice.tax_amount),
      Idevise: 'EUR'
    });
  }

  return lines;
}

/**
 * Générer les écritures comptables pour un paiement
 */
function generatePaymentFecLines(payment: DentalPaymentForFec): FecLine[] {
  const lines: FecLine[] = [];
  const paymentDate = formatDateFec(payment.payment_date);
  const patientAccount = generatePatientAccountNumber(payment.patient_id);

  // Déterminer le compte de trésorerie selon le mode de paiement
  let treasuryAccount = '512000'; // Par défaut: Banque
  let treasuryLabel = 'Banque';

  switch (payment.payment_method) {
    case 'cash':
      treasuryAccount = '530000';
      treasuryLabel = 'Caisse';
      break;
    case 'check':
      treasuryAccount = '512000';
      treasuryLabel = 'Banque - Chèques';
      break;
    case 'card':
      treasuryAccount = '512100';
      treasuryLabel = 'Banque - Cartes bancaires';
      break;
    case 'transfer':
      treasuryAccount = '512000';
      treasuryLabel = 'Banque - Virements';
      break;
    case 'cpam':
      treasuryAccount = '512200';
      treasuryLabel = 'Banque - CPAM';
      break;
    case 'mutuelle':
      treasuryAccount = '512300';
      treasuryLabel = 'Banque - Mutuelle';
      break;
  }

  // Écriture au débit : Compte de trésorerie
  lines.push({
    JournalCode: 'BNQ',
    JournalLib: 'Journal de banque',
    EcritureNum: `PAY-${payment.id.substring(0, 8)}`,
    EcritureDate: paymentDate,
    CompteNum: treasuryAccount,
    CompteLib: treasuryLabel,
    CompAuxNum: '',
    CompAuxLib: '',
    PieceRef: payment.invoice_number,
    PieceDate: paymentDate,
    EcritureLib: `Règlement facture ${payment.invoice_number} - ${payment.payment_source}`,
    Debit: formatAmountFec(payment.amount),
    Credit: '0,00',
    EcritureLet: payment.invoice_number,
    DateLet: paymentDate,
    ValidDate: paymentDate,
    Montantdevise: formatAmountFec(payment.amount),
    Idevise: 'EUR'
  });

  // Écriture au crédit : Compte client 411XXX
  lines.push({
    JournalCode: 'BNQ',
    JournalLib: 'Journal de banque',
    EcritureNum: `PAY-${payment.id.substring(0, 8)}`,
    EcritureDate: paymentDate,
    CompteNum: '411000',
    CompteLib: 'Clients',
    CompAuxNum: patientAccount,
    CompAuxLib: payment.patient_name,
    PieceRef: payment.invoice_number,
    PieceDate: paymentDate,
    EcritureLib: `Règlement facture ${payment.invoice_number}`,
    Debit: '0,00',
    Credit: formatAmountFec(payment.amount),
    EcritureLet: payment.invoice_number,
    DateLet: paymentDate,
    ValidDate: paymentDate,
    Montantdevise: formatAmountFec(payment.amount),
    Idevise: 'EUR'
  });

  return lines;
}

/**
 * Générer les écritures comptables pour un avoir
 */
function generateCreditNoteFecLines(creditNote: DentalCreditNoteForFec): FecLine[] {
  const lines: FecLine[] = [];
  const creditDate = formatDateFec(creditNote.credit_note_date);
  const patientAccount = generatePatientAccountNumber(creditNote.patient_id);

  // Écriture au crédit : Compte client 411XXX (diminution de la créance)
  lines.push({
    JournalCode: 'VTE',
    JournalLib: 'Journal des ventes',
    EcritureNum: creditNote.credit_note_number,
    EcritureDate: creditDate,
    CompteNum: '411000',
    CompteLib: 'Clients',
    CompAuxNum: patientAccount,
    CompAuxLib: creditNote.patient_name,
    PieceRef: creditNote.credit_note_number,
    PieceDate: creditDate,
    EcritureLib: `Avoir ${creditNote.credit_note_number} sur facture ${creditNote.invoice_number}`,
    Debit: '0,00',
    Credit: formatAmountFec(creditNote.total),
    EcritureLet: '',
    DateLet: '',
    ValidDate: creditDate,
    Montantdevise: formatAmountFec(creditNote.total),
    Idevise: 'EUR'
  });

  // Écriture au débit : Compte de produit 706000 (annulation de produit)
  if (creditNote.subtotal > 0) {
    lines.push({
      JournalCode: 'VTE',
      JournalLib: 'Journal des ventes',
      EcritureNum: creditNote.credit_note_number,
      EcritureDate: creditDate,
      CompteNum: '706000',
      CompteLib: 'Prestations de services',
      CompAuxNum: '',
      CompAuxLib: '',
      PieceRef: creditNote.credit_note_number,
      PieceDate: creditDate,
      EcritureLib: `Avoir ${creditNote.credit_note_number}`,
      Debit: formatAmountFec(creditNote.subtotal),
      Credit: '0,00',
      EcritureLet: '',
      DateLet: '',
      ValidDate: creditDate,
      Montantdevise: formatAmountFec(creditNote.subtotal),
      Idevise: 'EUR'
    });
  }

  // Écriture au débit : Compte de TVA 445710 (annulation de TVA)
  if (creditNote.tax_amount > 0) {
    lines.push({
      JournalCode: 'VTE',
      JournalLib: 'Journal des ventes',
      EcritureNum: creditNote.credit_note_number,
      EcritureDate: creditDate,
      CompteNum: '445710',
      CompteLib: 'TVA collectée',
      CompAuxNum: '',
      CompAuxLib: '',
      PieceRef: creditNote.credit_note_number,
      PieceDate: creditDate,
      EcritureLib: `TVA avoir ${creditNote.credit_note_number}`,
      Debit: formatAmountFec(creditNote.tax_amount),
      Credit: '0,00',
      EcritureLet: '',
      DateLet: '',
      ValidDate: creditDate,
      Montantdevise: formatAmountFec(creditNote.tax_amount),
      Idevise: 'EUR'
    });
  }

  return lines;
}

/**
 * Générer le fichier FEC complet
 */
export function generateFecFile(
  invoices: DentalInvoiceForFec[],
  payments: DentalPaymentForFec[],
  creditNotes: DentalCreditNoteForFec[],
  siret: string,
  startDate: string,
  endDate: string
): string {
  const allLines: FecLine[] = [];

  // Ajouter les écritures de factures
  invoices.forEach(invoice => {
    if (invoice.status !== 'draft' && invoice.status !== 'cancelled') {
      allLines.push(...generateInvoiceFecLines(invoice));
    }
  });

  // Ajouter les écritures de paiements
  payments.forEach(payment => {
    allLines.push(...generatePaymentFecLines(payment));
  });

  // Ajouter les écritures d'avoirs
  creditNotes.forEach(creditNote => {
    allLines.push(...generateCreditNoteFecLines(creditNote));
  });

  // Trier par date puis par numéro d'écriture
  allLines.sort((a, b) => {
    if (a.EcritureDate !== b.EcritureDate) {
      return a.EcritureDate.localeCompare(b.EcritureDate);
    }
    return a.EcritureNum.localeCompare(b.EcritureNum);
  });

  // Générer le CSV avec pipe comme séparateur
  const headers = [
    'JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate',
    'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib',
    'PieceRef', 'PieceDate', 'EcritureLib',
    'Debit', 'Credit', 'EcritureLet', 'DateLet', 'ValidDate',
    'Montantdevise', 'Idevise'
  ];

  let csvContent = headers.join('|') + '\n';

  allLines.forEach(line => {
    const row = [
      line.JournalCode,
      line.JournalLib,
      line.EcritureNum,
      line.EcritureDate,
      line.CompteNum,
      line.CompteLib,
      line.CompAuxNum,
      line.CompAuxLib,
      line.PieceRef,
      line.PieceDate,
      line.EcritureLib,
      line.Debit,
      line.Credit,
      line.EcritureLet,
      line.DateLet,
      line.ValidDate,
      line.Montantdevise,
      line.Idevise
    ];

    csvContent += row.join('|') + '\n';
  });

  return csvContent;
}

/**
 * Télécharger le fichier FEC
 */
export function downloadFecFile(
  csvContent: string,
  siret: string,
  startDate: string,
  endDate: string
) {
  // Format du nom : SIREN + FEC + Date de clôture (AAAAMMJJ)
  const siren = siret.substring(0, 9);
  const endDateFormatted = formatDateFec(endDate);
  const filename = `${siren}FEC${endDateFormatted}.txt`;

  const blob = new Blob([csvContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
