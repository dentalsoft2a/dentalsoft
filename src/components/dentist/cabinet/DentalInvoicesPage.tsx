import { useState, useEffect } from 'react';
import { Plus, FileText, Calendar, Edit, Trash2, CreditCard, Download, Eye, FileDown, Receipt } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import DentalInvoiceModal from './DentalInvoiceModal';
import PaymentModal from './PaymentModal';
import DentalCreditNoteModal from './DentalCreditNoteModal';
import { downloadDentalInvoicePDF } from '../../../utils/dentalInvoicePdfGenerator';
import { useDentistLegalInfo } from '../../../hooks/useDentistLegalInfo';

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  patient_id: string;
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
  patient?: {
    first_name: string;
    last_name: string;
    address?: string;
    postal_code?: string;
    city?: string;
    social_security_number?: string;
  };
}

export default function DentalInvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | undefined>();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCreditNoteModal, setShowCreditNoteModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const { info: dentistInfo } = useDentistLegalInfo();
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadInvoices();
    }
  }, [user]);

  const loadInvoices = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('dental_invoices')
        .select(`
          *,
          patient:dental_patients(
            first_name,
            last_name,
            address,
            postal_code,
            city,
            social_security_number
          )
        `)
        .eq('dentist_id', user.id)
        .order('invoice_date', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      draft: { label: 'Brouillon', className: 'bg-slate-100 text-slate-700' },
      sent: { label: 'Envoyée', className: 'bg-blue-100 text-blue-700' },
      partial: { label: 'Partiel', className: 'bg-orange-100 text-orange-700' },
      paid: { label: 'Payée', className: 'bg-green-100 text-green-700' },
      cancelled: { label: 'Annulée', className: 'bg-red-100 text-red-700' },
    };

    const badge = badges[status] || badges.draft;
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoiceId(invoice.id);
    setShowInvoiceModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette facture ?')) return;

    try {
      const { error } = await supabase
        .from('dental_invoices')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
      loadInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handlePayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const handleCreateCreditNote = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowCreditNoteModal(true);
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    if (!user || downloadingPdf) return;

    try {
      setDownloadingPdf(invoice.id);

      // Charger les items de la facture
      const { data: items, error: itemsError } = await supabase
        .from('dental_invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id);

      if (itemsError) throw itemsError;

      // Charger les informations légales du dentiste
      const { data: legalInfo } = await supabase
        .from('dentist_legal_info')
        .select('*')
        .eq('dentist_id', user.id)
        .maybeSingle();

      // Charger le compte dentiste
      const { data: dentistAccount } = await supabase
        .from('dentist_accounts')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      // Charger les informations du certificat
      const { data: certificate } = await supabase
        .from('dentist_digital_certificates')
        .select('serial_number')
        .eq('dentist_id', user.id)
        .eq('is_revoked', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const patientAddress = invoice.patient?.address
        ? `${invoice.patient.address}\n${invoice.patient.postal_code || ''} ${invoice.patient.city || ''}`.trim()
        : undefined;

      await downloadDentalInvoicePDF({
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date,
        dentist_name: legalInfo?.company_name || dentistAccount?.name || 'Cabinet Dentaire',
        dentist_address: legalInfo?.cabinet_address
          ? `${legalInfo.cabinet_address}\n${legalInfo.cabinet_postal_code || ''} ${legalInfo.cabinet_city || ''}`.trim()
          : '',
        dentist_phone: legalInfo?.cabinet_phone || '',
        dentist_email: legalInfo?.cabinet_email || dentistAccount?.email || '',
        dentist_rpps: legalInfo?.rpps_number || undefined,
        dentist_adeli: legalInfo?.adeli_number || undefined,
        dentist_siret: legalInfo?.siret_number || undefined,
        patient_name: `${invoice.patient?.first_name || ''} ${invoice.patient?.last_name || ''}`.trim(),
        patient_address: patientAddress,
        patient_security_number: invoice.patient?.social_security_number || undefined,
        items: items || [],
        subtotal: invoice.subtotal || 0,
        tax_rate: invoice.tax_rate || 0,
        tax_amount: invoice.tax_amount || 0,
        total: invoice.total,
        cpam_part: invoice.cpam_part,
        mutuelle_part: invoice.mutuelle_part,
        patient_part: invoice.patient_part,
        paid_amount: invoice.paid_amount,
        status: invoice.status,
        notes: invoice.notes,
        certificate_serial: certificate?.serial_number
      });
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      alert(`Erreur lors de la génération du PDF: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setDownloadingPdf(null);
    }
  };

  const handleCloseInvoiceModal = () => {
    setShowInvoiceModal(false);
    setEditingInvoiceId(undefined);
  };

  const filteredInvoices = invoices.filter(inv => {
    if (filterStatus === 'all') return inv.status !== 'cancelled';
    return inv.status === filterStatus;
  });

  const totalRevenue = invoices.filter(inv => inv.status !== 'cancelled').reduce((sum, inv) => sum + inv.total, 0);
  const totalPaid = invoices.filter(inv => inv.status !== 'cancelled').reduce((sum, inv) => sum + inv.paid_amount, 0);
  const pending = totalRevenue - totalPaid;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Facturation Patients</h1>
          <p className="text-slate-600 mt-1">{invoices.length} factures</p>
        </div>
        <button
          onClick={() => setShowInvoiceModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition"
        >
          <Plus className="w-5 h-5" />
          Nouvelle Facture
        </button>
      </div>

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filterStatus === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Toutes
        </button>
        <button
          onClick={() => setFilterStatus('draft')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filterStatus === 'draft'
              ? 'bg-slate-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Brouillons
        </button>
        <button
          onClick={() => setFilterStatus('sent')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filterStatus === 'sent'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Envoyées
        </button>
        <button
          onClick={() => setFilterStatus('partial')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filterStatus === 'partial'
              ? 'bg-orange-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          En attente
        </button>
        <button
          onClick={() => setFilterStatus('paid')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filterStatus === 'paid'
              ? 'bg-green-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Payées
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-slate-900">Total Facturé</h3>
          </div>
          <p className="text-2xl font-bold text-blue-700">{totalRevenue.toFixed(2)}€</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-slate-900">Encaissé</h3>
          </div>
          <p className="text-2xl font-bold text-green-700">{totalPaid.toFixed(2)}€</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-slate-900">En attente</h3>
          </div>
          <p className="text-2xl font-bold text-orange-700">{pending.toFixed(2)}€</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Chargement...</div>
      ) : (
        <div className="grid gap-4">
          {filteredInvoices.map(invoice => {
            const remainingAmount = invoice.total - invoice.paid_amount;
            const paymentProgress = invoice.total > 0 ? (invoice.paid_amount / invoice.total) * 100 : 0;

            return (
            <div key={invoice.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-lg transition">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900 text-lg">
                        Facture {invoice.invoice_number}
                      </h3>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <p className="text-sm text-slate-600 mb-2">
                      Patient: {invoice.patient?.first_name} {invoice.patient?.last_name}
                    </p>
                    <div className="flex items-center gap-4 text-sm mb-3">
                      <span className="flex items-center gap-1 text-slate-600">
                        <Calendar className="w-4 h-4" />
                        {new Date(invoice.invoice_date).toLocaleDateString('fr-FR')}
                      </span>
                      <span className="text-slate-600">
                        Total: <span className="font-semibold text-slate-900">{invoice.total.toFixed(2)}€</span>
                      </span>
                      <span className="text-green-600">
                        CPAM: {invoice.cpam_part.toFixed(2)}€
                      </span>
                      <span className="text-blue-600">
                        Mutuelle: {invoice.mutuelle_part.toFixed(2)}€
                      </span>
                      <span className="text-orange-600">
                        Patient: {invoice.patient_part.toFixed(2)}€
                      </span>
                    </div>
                    {invoice.status !== 'draft' && invoice.status !== 'paid' && (
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-600">Payé: {invoice.paid_amount.toFixed(2)}€</span>
                          <span className="text-slate-600">Reste: {remainingAmount.toFixed(2)}€</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-teal-500 transition-all"
                            style={{ width: `${paymentProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {invoice.status !== 'draft' && invoice.status !== 'cancelled' && (
                    <button
                      onClick={() => handleDownloadPDF(invoice)}
                      disabled={downloadingPdf === invoice.id}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                      title="Télécharger PDF"
                    >
                      {downloadingPdf === invoice.id ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      ) : (
                        <FileDown className="w-5 h-5" />
                      )}
                    </button>
                  )}
                  {invoice.status !== 'draft' && invoice.status !== 'cancelled' && (
                    <button
                      onClick={() => handleCreateCreditNote(invoice)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Créer un avoir"
                    >
                      <Receipt className="w-5 h-5" />
                    </button>
                  )}
                  {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                    <button
                      onClick={() => handlePayment(invoice)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                      title="Enregistrer un paiement"
                    >
                      <CreditCard className="w-5 h-5" />
                    </button>
                  )}
                  {invoice.status === 'draft' && (
                    <button
                      onClick={() => handleEdit(invoice)}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                      title="Modifier"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                  )}
                  {invoice.status !== 'cancelled' && (
                    <button
                      onClick={() => handleDelete(invoice.id)}
                      className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition"
                      title="Annuler"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            );
          })}

          {filteredInvoices.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="font-medium">Aucune facture</p>
              <p className="text-sm">
                {filterStatus === 'all'
                  ? 'Créez votre première facture patient'
                  : 'Aucune facture avec ce statut'}
              </p>
            </div>
          )}
        </div>
      )}

      {showInvoiceModal && (
        <DentalInvoiceModal
          invoiceId={editingInvoiceId}
          onClose={handleCloseInvoiceModal}
          onSuccess={loadInvoices}
        />
      )}

      {showPaymentModal && selectedInvoice && (
        <PaymentModal
          invoiceId={selectedInvoice.id}
          invoiceNumber={selectedInvoice.invoice_number}
          totalAmount={selectedInvoice.total}
          paidAmount={selectedInvoice.paid_amount}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedInvoice(null);
          }}
          onSuccess={loadInvoices}
        />
      )}

      {showCreditNoteModal && selectedInvoice && (
        <DentalCreditNoteModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowCreditNoteModal(false);
            setSelectedInvoice(null);
          }}
          onSuccess={loadInvoices}
        />
      )}
    </div>
  );
}
