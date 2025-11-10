import { useEffect, useState } from 'react';
import { Plus, Edit, Search, FileDown, CreditCard, Send, FileText, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLockScroll } from '../../hooks/useLockScroll';
import type { Database } from '../../lib/database.types';
import { generateInvoicePDF } from '../../utils/pdfGenerator';
import DentistSelector from '../proformas/DentistSelector';
import MonthOnlyPicker from '../common/MonthOnlyPicker';
import YearPicker from '../common/YearPicker';

type Invoice = Database['public']['Tables']['invoices']['Row'] & {
  dentists?: { name: string };
  correction_amount?: number;
  net_amount?: number;
};

type CreditNote = Database['public']['Tables']['credit_notes']['Row'];

export default function InvoicesPage() {
  const { user, profile } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCreditNoteModal, setShowCreditNoteModal] = useState(false);
  const [showCreditNotesListModal, setShowCreditNotesListModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);

  useLockScroll(showModal || showGenerateModal || showPaymentModal || showCreditNoteModal || showCreditNotesListModal);
  const [hasValidSubscription, setHasValidSubscription] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    loadInvoices();
    checkSubscription();
  }, [user]);

  const checkSubscription = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role, subscription_status, trial_ends_at, subscription_ends_at')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setIsSuperAdmin(data?.role === 'super_admin');

      if (data?.role === 'super_admin') {
        setHasValidSubscription(true);
        return;
      }

      const now = new Date();
      let validSubscription = false;

      if (data?.subscription_status === 'trial' && data.trial_ends_at) {
        const trialEnd = new Date(data.trial_ends_at);
        validSubscription = now <= trialEnd;
      } else if (data?.subscription_status === 'active' && data.subscription_ends_at) {
        const subEnd = new Date(data.subscription_ends_at);
        validSubscription = now <= subEnd;
      } else if (data?.subscription_status === 'active') {
        validSubscription = true;
      }

      setHasValidSubscription(validSubscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const loadInvoices = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, dentists(name)')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;

      // Load correction amounts for each invoice
      const invoicesWithCorrections = await Promise.all(
        (data || []).map(async (invoice) => {
          const { data: corrections } = await supabase
            .from('credit_notes')
            .select('total')
            .eq('corrects_invoice_id', invoice.id)
            .eq('type', 'correction')
            .eq('is_correction', true);

          const correction_amount = corrections?.reduce((sum, cn) => sum + Number(cn.total), 0) || 0;
          const net_amount = Number(invoice.total) - correction_amount;

          return {
            ...invoice,
            correction_amount,
            net_amount
          };
        })
      );

      setInvoices(invoicesWithCorrections);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.dentists?.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });


  const handleGeneratePDF = async (invoice: Invoice, returnBase64 = false): Promise<string | undefined> => {
    try {
      const { data: dentistData, error: dentistError } = await supabase
        .from('dentists')
        .select('*')
        .eq('id', invoice.dentist_id)
        .single();

      if (dentistError) throw dentistError;

      const { data: invoiceProformas, error: ipError } = await supabase
        .from('invoice_proformas')
        .select('proforma_id')
        .eq('invoice_id', invoice.id);

      if (ipError) throw ipError;

      if (!invoiceProformas || invoiceProformas.length === 0) {
        alert('Aucun proforma associé à cette facture');
        return;
      }

      const proformaIds = invoiceProformas.map(ip => ip.proforma_id);

      const { data: proformaItems, error: itemsError } = await supabase
        .from('proforma_items')
        .select('*')
        .in('proforma_id', proformaIds);

      if (itemsError) throw itemsError;

      const deliveryNoteIds = [...new Set(
        proformaItems
          .map(item => item.delivery_note_id)
          .filter(id => id != null)
      )];

      if (deliveryNoteIds.length === 0) {
        alert('Aucun bon de livraison associé à cette facture');
        return;
      }

      const { data: deliveryNotesData, error: notesError } = await supabase
        .from('delivery_notes')
        .select('*')
        .in('id', deliveryNoteIds)
        .order('date', { ascending: true });

      if (notesError) throw notesError;

      const deliveryNotes = deliveryNotesData.map(note => ({
        delivery_number: note.delivery_number,
        date: note.date,
        prescription_date: note.prescription_date,
        patient_name: note.patient_name || '',
        items: Array.isArray(note.items) ? note.items : []
      }));

      // Load correction credit notes for this invoice
      const { data: correctionData } = await supabase
        .from('credit_notes')
        .select('credit_note_number, date, total, reason')
        .eq('corrects_invoice_id', invoice.id)
        .eq('type', 'correction')
        .eq('is_correction', true)
        .order('date', { ascending: true });

      const correctionCreditNotes = correctionData?.map(cn => ({
        credit_note_number: cn.credit_note_number,
        date: cn.date,
        total: Number(cn.total),
        reason: cn.reason || ''
      })) || [];

      return await generateInvoicePDF({
        invoice_number: invoice.invoice_number,
        date: invoice.date,
        laboratory_name: profile?.laboratory_name || '',
        laboratory_address: profile?.laboratory_address || '',
        laboratory_phone: profile?.laboratory_phone || '',
        laboratory_email: profile?.laboratory_email || '',
        laboratory_logo_url: profile?.laboratory_logo_url || '',
        laboratory_iban: profile?.laboratory_iban || '',
        laboratory_bic: profile?.laboratory_bic || '',
        laboratory_rcs: profile?.laboratory_rcs || '',
        dentist_name: dentistData.name,
        dentist_address: dentistData.address || '',
        delivery_notes: deliveryNotes,
        tax_rate: Number(invoice.tax_rate),
        correction_credit_notes: correctionCreditNotes
      }, returnBase64);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erreur lors de la génération du PDF');
    }
  };

  const handleCreateCreditNote = async (invoice: Invoice) => {
    // Check if there's any available amount for credit note
    try {
      const { data: creditNotes, error } = await supabase
        .from('credit_notes')
        .select('total')
        .eq('source_invoice_id', invoice.id);

      if (error) throw error;

      const totalCreditNotesCreated = creditNotes?.reduce((sum, cn) => sum + Number(cn.total), 0) || 0;
      const availableAmount = Number(invoice.total) - totalCreditNotesCreated;

      if (availableAmount <= 0) {
        alert(`Impossible de créer un avoir : le montant total d'avoirs (${totalCreditNotesCreated.toFixed(2)} €) a déjà atteint ou dépassé le montant de la facture (${Number(invoice.total).toFixed(2)} €).`);
        return;
      }

      setSelectedInvoice(invoice);
      setShowCreditNoteModal(true);
    } catch (error) {
      console.error('Error checking credit notes:', error);
      alert('Erreur lors de la vérification des avoirs');
    }
  };

  const handleViewCreditNotes = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    await loadCreditNotes(invoice.dentist_id);
    setShowCreditNotesListModal(true);
  };

  const loadCreditNotes = async (dentistId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('credit_notes')
        .select('*')
        .eq('user_id', user.id)
        .eq('dentist_id', dentistId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCreditNotes(data || []);
    } catch (error) {
      console.error('Error loading credit notes:', error);
      setCreditNotes([]);
    }
  };

  const handleSendEmail = async (invoice: Invoice) => {
    try {
      const { data: dentistData, error: dentistError } = await supabase
        .from('dentists')
        .select('*')
        .eq('id', invoice.dentist_id)
        .single();

      if (dentistError) throw dentistError;

      if (!dentistData.email) {
        alert('Ce dentiste n\'a pas d\'adresse email configurée');
        return;
      }

      if (!confirm(`Envoyer la facture par email à ${dentistData.email} ?`)) return;

      const pdfBase64 = await handleGeneratePDF(invoice, true);

      if (!pdfBase64) {
        alert('Erreur lors de la génération du PDF');
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invoice-email`;
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          invoiceId: invoice.id,
          dentistEmail: dentistData.email,
          dentistName: dentistData.name,
          pdfBase64,
          invoiceNumber: invoice.invoice_number,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erreur lors de l\'envoi de l\'email');
      }

      alert('Email envoyé avec succès!');
    } catch (error) {
      console.error('Error sending email:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors de l\'envoi de l\'email');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-red-100 text-red-700',
      sent: 'bg-blue-100 text-primary-700',
      paid: 'bg-green-100 text-green-700',
      partial: 'bg-orange-100 text-orange-700',
      credit_note: 'bg-purple-100 text-purple-700',
      credit_note_paid: 'bg-gradient-to-r from-purple-100 to-green-100 text-purple-700',
    };
    const labels = {
      draft: 'Non payée',
      sent: 'Envoyée',
      paid: 'Payée',
      partial: 'Partiellement payée',
      credit_note: 'Avoir',
      credit_note_paid: 'Avoir + Payée',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles] || 'bg-slate-100 text-slate-700'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Factures</h1>
          <p className="text-slate-600 mt-2">Gérez vos factures mensuelles</p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          disabled={!hasValidSubscription && !isSuperAdmin}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-cyan-600 text-white shadow-lg hover:shadow-xl rounded-lg hover:from-primary-700 hover:to-cyan-700 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Générer une facture
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher une facture..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-600">Chargement...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-8 text-center text-slate-600">
            {searchTerm ? 'Aucune facture trouvée' : 'Aucune facture enregistrée'}
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      Numéro
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      Dentiste
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      Période
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">
                      Total TTC
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{invoice.invoice_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                        {invoice.dentists?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                        {new Date(invoice.year, invoice.month - 1).toLocaleDateString('fr-FR', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                        {new Date(invoice.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(invoice.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-slate-900">
                        <div className="flex flex-col items-end gap-1">
                          <div className={invoice.correction_amount && invoice.correction_amount > 0 ? 'text-slate-500 line-through text-sm' : ''}>
                            {Number(invoice.total).toFixed(2)} €
                          </div>
                          {invoice.correction_amount && invoice.correction_amount > 0 && (
                            <div className="text-green-600 font-bold">
                              {invoice.net_amount?.toFixed(2)} €
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {invoice.status !== 'credit_note' && invoice.status !== 'credit_note_paid' && invoice.status !== 'paid' && (
                            <button
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setShowPaymentModal(true);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                              title="Gérer les paiements"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleViewCreditNotes(invoice)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200"
                            title="Voir les avoirs"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCreateCreditNote(invoice)}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-all duration-200"
                            title="Créer un avoir"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSendEmail(invoice)}
                            className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-all duration-200"
                            title="Envoyer par email"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleGeneratePDF(invoice)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                            title="Générer PDF"
                          >
                            <FileDown className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-slate-200">
              {filteredInvoices.map((invoice) => (
                <div key={invoice.id} className="p-4 hover:bg-slate-50 transition-colors active:bg-slate-100">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-slate-900 text-sm">{invoice.invoice_number}</h3>
                        {getStatusBadge(invoice.status)}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1">
                        <CreditCard className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{invoice.dentists?.name}</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-1">
                        {new Date(invoice.year, invoice.month - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-slate-500 mb-2">
                        {new Date(invoice.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <div className="flex flex-col gap-1">
                        <p className={`text-sm font-bold ${invoice.correction_amount && invoice.correction_amount > 0 ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                          {Number(invoice.total).toFixed(2)} €
                        </p>
                        {invoice.correction_amount && invoice.correction_amount > 0 && (
                          <p className="text-sm font-bold text-green-600">
                            {invoice.net_amount?.toFixed(2)} €
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        setShowPaymentModal(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-medium transition-all active:scale-95"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Paiements
                    </button>
                    <button
                      onClick={() => handleViewCreditNotes(invoice)}
                      className="p-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition-all active:scale-95"
                      title="Voir les avoirs"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleCreateCreditNote(invoice)}
                      className="p-2 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-lg transition-all active:scale-95"
                      title="Créer un avoir"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSendEmail(invoice)}
                      className="p-2 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 rounded-lg transition-all active:scale-95"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleGeneratePDF(invoice)}
                      className="p-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-all active:scale-95"
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showGenerateModal && (
        <GenerateInvoiceModal
          onClose={() => setShowGenerateModal(false)}
          onSave={() => {
            setShowGenerateModal(false);
            loadInvoices();
          }}
        />
      )}

      {showPaymentModal && selectedInvoice && (
        <PaymentModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedInvoice(null);
          }}
          onSave={() => {
            setShowPaymentModal(false);
            setSelectedInvoice(null);
            loadInvoices();
          }}
        />
      )}

      {showCreditNoteModal && selectedInvoice && (
        <CreditNoteModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowCreditNoteModal(false);
            setSelectedInvoice(null);
          }}
          onSave={() => {
            setShowCreditNoteModal(false);
            setSelectedInvoice(null);
            loadInvoices();
          }}
        />
      )}

      {showCreditNotesListModal && selectedInvoice && (
        <CreditNotesListModal
          invoice={selectedInvoice}
          creditNotes={creditNotes}
          onClose={() => {
            setShowCreditNotesListModal(false);
            setSelectedInvoice(null);
            setCreditNotes([]);
          }}
          onRefresh={() => {
            if (selectedInvoice) {
              loadCreditNotes(selectedInvoice.dentist_id);
            }
          }}
        />
      )}
    </div>
  );
}

interface GenerateInvoiceModalProps {
  onClose: () => void;
  onSave: () => void;
}

function GenerateInvoiceModal({ onClose, onSave }: GenerateInvoiceModalProps) {
  const { user } = useAuth();
  const [selectedDentist, setSelectedDentist] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [validatedProformas, setValidatedProformas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedDentist) {
      loadValidatedProformas();
    }
  }, [selectedDentist, selectedMonth, selectedYear]);

  const loadValidatedProformas = async () => {
    if (!user || !selectedDentist) return;

    try {
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = new Date(selectedYear, selectedMonth, 0);

      const { data, error } = await supabase
        .from('proformas')
        .select('*')
        .eq('user_id', user.id)
        .eq('dentist_id', selectedDentist)
        .eq('status', 'validated')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      if (error) throw error;
      setValidatedProformas(data || []);
    } catch (error) {
      console.error('Error loading proformas:', error);
    }
  };

  const generateInvoiceNumber = async () => {
    if (!user) return '';

    try {
      // Get the last invoice number for this year to avoid duplicates
      const { data: existingInvoices, error: fetchError } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('user_id', user.id)
        .eq('year', selectedYear)
        .order('invoice_number', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      let nextNumber = 1;
      if (existingInvoices && existingInvoices.length > 0) {
        const lastNumber = existingInvoices[0].invoice_number;
        const match = lastNumber.match(/FACT-\d{4}-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      return `FACT-${selectedYear}-${String(nextNumber).padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating invoice number:', error);
      return `FACT-${selectedYear}-0001`;
    }
  };

  const handleGenerate = async () => {
    if (!user || !selectedDentist || validatedProformas.length === 0) {
      alert('Veuillez sélectionner un dentiste avec des proformas validés');
      return;
    }

    setLoading(true);
    try {
      const subtotal = validatedProformas.reduce((sum, p) => sum + Number(p.subtotal), 0);
      const taxRate = validatedProformas[0]?.tax_rate || 20;
      const taxAmount = validatedProformas.reduce((sum, p) => sum + Number(p.tax_amount), 0);
      const total = validatedProformas.reduce((sum, p) => sum + Number(p.total), 0);

      const invoiceNumber = await generateInvoiceNumber();

      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
          dentist_id: selectedDentist,
          invoice_number: invoiceNumber,
          month: selectedMonth,
          year: selectedYear,
          status: 'draft',
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const { error: linkError } = await supabase.from('invoice_proformas').insert(
        validatedProformas.map((p) => ({
          invoice_id: invoiceData.id,
          proforma_id: p.id,
        }))
      );

      if (linkError) throw linkError;

      const { error: updateError } = await supabase
        .from('proformas')
        .update({ status: 'invoiced' })
        .in(
          'id',
          validatedProformas.map((p) => p.id)
        );

      if (updateError) throw updateError;

      onSave();
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Erreur lors de la génération de la facture');
    } finally {
      setLoading(false);
    }
  };

  const months = [
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Août',
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre',
  ];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-2 md:p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl max-w-4xl w-full max-h-[calc(100vh-1rem)] md:max-h-[calc(100vh-2rem)] flex flex-col animate-in slide-in-from-bottom-8 duration-500 border border-slate-200/50">
        <div className="relative p-4 md:p-6 border-b border-slate-100 bg-gradient-to-br from-white via-slate-50/30 to-cyan-50/20 z-10 rounded-t-2xl md:rounded-t-3xl backdrop-blur-xl flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-cyan-500/5 rounded-t-2xl md:rounded-t-3xl"></div>
          <h2 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-primary-600 via-cyan-600 to-primary-600 bg-clip-text text-transparent relative">Générer une facture mensuelle</h2>
          <p className="text-slate-500 text-xs md:text-sm mt-1 md:mt-2 relative">Sélectionnez un dentiste et une période</p>
        </div>

        <div className="p-3 md:p-6 space-y-4 md:space-y-6 overflow-y-auto flex-1">
          <div className="bg-gradient-to-br from-slate-50 to-white p-3 md:p-5 rounded-xl md:rounded-2xl border border-slate-200/50 shadow-sm">
            <h3 className="text-sm md:text-base font-bold text-slate-800 mb-3 md:mb-4 flex items-center gap-2">
              <div className="w-1 h-4 md:w-1.5 md:h-6 bg-gradient-to-b from-primary-500 to-cyan-500 rounded-full"></div>
              Informations de la facture
            </h3>
            <div className="space-y-3 md:space-y-4">
            <div>
              <DentistSelector
                selectedDentistId={selectedDentist}
                onSelectDentist={setSelectedDentist}
                required={true}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <MonthOnlyPicker
                  value={selectedMonth}
                  onChange={(value) => setSelectedMonth(value)}
                  label="Mois"
                  color="cyan"
                />
              </div>

              <div>
                <YearPicker
                  value={selectedYear}
                  onChange={(value) => setSelectedYear(value)}
                  label="Année"
                  color="primary"
                />
              </div>
            </div>
            </div>
          </div>

          {selectedDentist && (
            <div className="bg-gradient-to-br from-slate-50 to-white p-3 md:p-5 rounded-xl md:rounded-2xl border border-slate-200/50 shadow-sm">
              <h3 className="text-sm md:text-base font-bold text-slate-800 mb-2 md:mb-3 flex items-center gap-2">
                <div className="w-1 h-4 md:w-1.5 md:h-6 bg-gradient-to-b from-primary-500 to-cyan-500 rounded-full"></div>
                Proformas validés trouvés
              </h3>
              <p className="text-xs md:text-sm text-slate-600 font-semibold mb-3">
                {validatedProformas.length} proforma(s) validé(s) pour cette période
              </p>
              {validatedProformas.length > 0 && (
                <div className="mt-3 space-y-1.5 bg-white/50 rounded-lg md:rounded-xl p-3 border border-slate-200">
                  {validatedProformas.map((proforma) => (
                    <div key={proforma.id} className="text-xs md:text-sm text-slate-700 flex justify-between py-1.5">
                      <span className="font-semibold truncate mr-2">{proforma.proforma_number}</span>
                      <span className="font-bold text-slate-900 flex-shrink-0">{Number(proforma.total).toFixed(2)} €</span>
                    </div>
                  ))}
                  <div className="pt-2 mt-2 border-t-2 border-slate-300 flex justify-between text-base md:text-lg font-bold">
                    <span className="bg-gradient-to-r from-primary-600 via-cyan-600 to-primary-600 bg-clip-text text-transparent">Total</span>
                    <span className="bg-gradient-to-r from-primary-600 via-cyan-600 to-primary-600 bg-clip-text text-transparent">
                      {validatedProformas.reduce((sum, p) => sum + Number(p.total), 0).toFixed(2)} €
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        <div className="relative p-3 md:p-5 border-t border-slate-100 bg-gradient-to-br from-white via-slate-50/30 to-cyan-50/20 rounded-b-2xl md:rounded-b-3xl backdrop-blur-xl z-[100] flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-cyan-500/5 rounded-b-2xl md:rounded-b-3xl"></div>
          <div className="flex gap-2 md:gap-3 relative">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 md:px-6 md:py-3 border-2 border-slate-300 text-slate-700 rounded-lg md:rounded-xl hover:bg-white hover:border-slate-400 transition-all duration-300 font-bold shadow-sm text-sm md:text-base"
            >
              Annuler
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading || !selectedDentist || validatedProformas.length === 0}
              className="flex-1 px-4 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-primary-600 via-cyan-600 to-primary-600 text-white shadow-lg rounded-lg md:rounded-xl hover:from-primary-700 hover:via-cyan-700 hover:to-primary-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm md:text-base bg-[length:200%_100%] hover:bg-[position:100%_0]"
            >
              {loading ? 'Génération...' : 'Générer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PaymentModalProps {
  invoice: Invoice;
  onClose: () => void;
  onSave: () => void;
}

function PaymentModal({ invoice, onClose, onSave }: PaymentModalProps) {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Database['public']['Tables']['invoice_payments']['Row'][]>([]);
  const [availableCreditNotes, setAvailableCreditNotes] = useState<CreditNote[]>([]);
  const [totalCreditNotes, setTotalCreditNotes] = useState(0);
  const [totalCorrections, setTotalCorrections] = useState(0);
  const [netAmount, setNetAmount] = useState(Number(invoice.total));
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'check' | 'credit_card'>('cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('invoice_payments')
        .select('*')
        .eq('invoice_id', invoice.id)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);

      // Load correction credit notes for this invoice
      const { data: correctionData } = await supabase
        .from('credit_notes')
        .select('*')
        .eq('corrects_invoice_id', invoice.id)
        .eq('type', 'correction')
        .eq('is_correction', true);

      const correctionsTotal = correctionData?.reduce((sum, cn) => sum + Number(cn.total), 0) || 0;
      setTotalCorrections(correctionsTotal);

      // Calculate net amount
      const calculatedNetAmount = Number(invoice.total) - correctionsTotal;
      setNetAmount(calculatedNetAmount);

      // Load available refund credit notes for this dentist
      const { data: creditNotesData } = await supabase
        .from('credit_notes')
        .select('*')
        .eq('dentist_id', invoice.dentist_id)
        .eq('type', 'refund')
        .eq('used', false)
        .order('created_at', { ascending: true });

      setAvailableCreditNotes(creditNotesData || []);
      const creditNotesTotal = creditNotesData?.reduce((sum, cn) => sum + Number(cn.total), 0) || 0;
      setTotalCreditNotes(creditNotesTotal);

      const totalPaid = data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const remaining = calculatedNetAmount - totalPaid;
      setAmount(remaining > 0 ? remaining.toFixed(2) : '');
    } catch (error) {
      console.error('Error loading payments:', error);
    }
  };

  const handleAddPayment = async () => {
    if (!amount || !paymentDate) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const paymentAmount = parseFloat(amount);

    // Validate payment amount doesn't exceed remaining balance
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = netAmount - totalPaid;

    if (paymentAmount <= 0) {
      alert('Le montant doit être supérieur à 0');
      return;
    }

    if (paymentAmount > remaining) {
      alert(`Le montant du paiement (${paymentAmount.toFixed(2)} €) dépasse le montant restant (${remaining.toFixed(2)} €)`);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('invoice_payments').insert({
        invoice_id: invoice.id,
        amount: paymentAmount,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        notes: reference || null,
        user_id: user!.id,
      });

      if (error) throw error;

      setAmount('');
      setReference('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      await loadPayments();

      // The trigger update_invoice_status() will automatically update the invoice status
      onSave();
    } catch (error) {
      console.error('Error adding payment:', error);
      alert('Erreur lors de l\'ajout du paiement');
    } finally {
      setLoading(false);
    }
  };


  const handleApplyCreditNote = async (creditNoteId: string) => {
    setLoading(true);
    try {
      // Get the credit note
      const { data: creditNote, error: fetchError } = await supabase
        .from('credit_notes')
        .select('*')
        .eq('id', creditNoteId)
        .single();

      if (fetchError) throw fetchError;
      if (!creditNote) throw new Error("Avoir introuvable");

      // Calculate amounts (use net amount, not gross)
      const creditNoteAmount = Number(creditNote.total);
      const creditNoteSubtotal = Number(creditNote.subtotal);
      const invoiceRemaining = netAmount - totalPaid;

      // Determine how much to apply
      const amountToApply = Math.min(creditNoteAmount, invoiceRemaining);
      const remainingCredit = creditNoteAmount - amountToApply;

      // Calculate subtotal for the amount to apply (proportional)
      const subtotalToApply = (creditNoteSubtotal / creditNoteAmount) * amountToApply;
      const remainingSubtotal = creditNoteSubtotal - subtotalToApply;

      // Confirm with user
      if (remainingCredit > 0) {
        const message = `Cette facture nécessite ${invoiceRemaining.toFixed(2)} € mais l'avoir est de ${creditNoteAmount.toFixed(2)} €.\n\n` +
          `- Montant appliqué : ${amountToApply.toFixed(2)} €\n` +
          `- Nouvel avoir créé : ${remainingCredit.toFixed(2)} €\n\n` +
          `Voulez-vous continuer ?`;
        if (!confirm(message)) {
          setLoading(false);
          return;
        }
      } else {
        if (!confirm(`Voulez-vous appliquer cet avoir de ${amountToApply.toFixed(2)} € à cette facture ?`)) {
          setLoading(false);
          return;
        }
      }

      // Create a payment for this credit note (trigger will update invoice status automatically)
      const { error: paymentError } = await supabase
        .from('invoice_payments')
        .insert({
          invoice_id: invoice.id,
          amount: amountToApply,
          payment_method: 'credit_note',
          payment_date: new Date().toISOString().split('T')[0],
          notes: `Avoir appliqué: ${creditNote.credit_note_number}`,
          user_id: user!.id,
        });

      if (paymentError) throw paymentError;

      // Mark original credit note as used
      const { error: updateError } = await supabase
        .from('credit_notes')
        .update({ used: true })
        .eq('id', creditNoteId);

      if (updateError) throw updateError;

      // If there's remaining credit, create a new credit note
      if (remainingCredit > 0.01) {
        // Get the next credit note number
        const { data: lastCreditNote } = await supabase
          .from('credit_notes')
          .select('credit_note_number')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        let nextNumber = 1;
        if (lastCreditNote?.credit_note_number) {
          const match = lastCreditNote.credit_note_number.match(/AV-(\d+)/);
          if (match) {
            nextNumber = parseInt(match[1]) + 1;
          }
        }
        const newCreditNoteNumber = `AV-${String(nextNumber).padStart(4, '0')}`;

        // Create new credit note with remaining amount
        const { error: newCreditNoteError } = await supabase
          .from('credit_notes')
          .insert({
            credit_note_number: newCreditNoteNumber,
            date: new Date().toISOString().split('T')[0],
            dentist_id: creditNote.dentist_id,
            subtotal: remainingSubtotal,
            tax_rate: creditNote.tax_rate,
            tax_amount: remainingCredit - remainingSubtotal,
            total: remainingCredit,
            reason: `Solde de l'avoir ${creditNote.credit_note_number} (montant initial: ${creditNoteAmount.toFixed(2)} €, appliqué: ${amountToApply.toFixed(2)} €)`,
            used: false,
            user_id: user!.id,
          });

        if (newCreditNoteError) throw newCreditNoteError;

        alert(`Avoir appliqué avec succès!\n\nUn nouvel avoir de ${remainingCredit.toFixed(2)} € a été créé: ${newCreditNoteNumber}`);
      } else {
        alert("Avoir appliqué avec succès!");
      }

      onSave();
    } catch (error) {
      console.error('Error applying credit note:', error);
      alert('Erreur lors de l\'application de l\'avoir');
    } finally {
      setLoading(false);
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = netAmount - totalPaid;

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Espèces',
      bank_transfer: 'Virement',
      check: 'Chèque',
      credit_card: 'Carte bancaire',
      credit_note: 'Avoir',
    };
    return labels[method] || method;
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[calc(100vh-2rem)] flex flex-col animate-in slide-in-from-bottom-8 duration-500 border border-slate-200/50">
        <div className="relative p-8 border-b border-slate-100 bg-gradient-to-br from-white via-slate-50/30 to-cyan-50/20 z-10 rounded-t-3xl backdrop-blur-xl flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-cyan-500/5 rounded-t-3xl"></div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 via-cyan-600 to-primary-600 bg-clip-text text-transparent relative">
            Paiements - {invoice.invoice_number}
          </h2>
          <div className="mt-4 space-y-3 text-sm relative">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-semibold">Total brut:</span>
                <span className="font-bold text-slate-900 text-base">{Number(invoice.total).toFixed(2)} €</span>
              </div>
              {totalCorrections > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-semibold">Corrections:</span>
                  <span className="font-bold text-blue-600 text-base">- {totalCorrections.toFixed(2)} €</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-semibold">Montant net:</span>
                <span className="font-bold text-slate-900 text-base">{netAmount.toFixed(2)} €</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-semibold">Payé:</span>
                <span className="font-bold text-green-600 text-base">{totalPaid.toFixed(2)} €</span>
              </div>
              {totalCreditNotes > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-semibold">Avoirs disponibles:</span>
                  <span className="font-bold text-purple-600 text-base">{totalCreditNotes.toFixed(2)} €</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-semibold">Restant:</span>
                <span className="font-bold text-orange-600 text-base">{remaining.toFixed(2)} €</span>
              </div>
            </div>
            {totalCorrections > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800">
                ℹ️ Cette facture a été corrigée. Le montant net à payer est de {netAmount.toFixed(2)} € au lieu de {Number(invoice.total).toFixed(2)} €.
              </div>
            )}
          </div>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto flex-1">
          <div className="bg-gradient-to-br from-slate-50 to-white p-6 rounded-2xl border border-slate-200/50 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-gradient-to-b from-primary-500 to-cyan-500 rounded-full"></div>
              Ajouter un paiement
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3 transition-colors flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                  Montant <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3.5 border border-primary-200 rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 outline-none transition-all duration-300 bg-gradient-to-br from-white to-slate-50/30 shadow-sm hover:shadow-md hover:border-primary-300"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3 transition-colors flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                  Méthode de paiement <span className="text-red-500">*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-4 py-3.5 border border-cyan-200 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 outline-none transition-all duration-300 bg-gradient-to-br from-white to-slate-50/30 shadow-sm hover:shadow-md hover:border-cyan-300"
                >
                  <option value="cash">Espèces</option>
                  <option value="bank_transfer">Virement</option>
                  <option value="check">Chèque</option>
                  <option value="credit_card">Carte bancaire</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3 transition-colors flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-4 py-3.5 border border-primary-200 rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 outline-none transition-all duration-300 bg-gradient-to-br from-white to-slate-50/30 shadow-sm hover:shadow-md hover:border-primary-300"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3 transition-colors flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                  Référence
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-4 py-3.5 border border-cyan-200 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 outline-none transition-all duration-300 bg-gradient-to-br from-white to-slate-50/30 shadow-sm hover:shadow-md hover:border-cyan-300"
                  placeholder="Numéro de chèque, référence virement..."
                />
              </div>
            </div>

            <button
              onClick={handleAddPayment}
              disabled={loading || !amount || !paymentDate}
              className="mt-6 w-full px-6 py-3.5 bg-gradient-to-r from-primary-600 via-cyan-600 to-primary-600 text-white shadow-lg hover:shadow-xl rounded-xl hover:from-primary-700 hover:via-cyan-700 hover:to-primary-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold hover:scale-[1.02] text-base bg-[length:200%_100%] hover:bg-[position:100%_0]"
            >
              {loading ? 'Ajout...' : 'Ajouter le paiement'}
            </button>
          </div>

          <div className="bg-gradient-to-br from-slate-50 to-white p-6 rounded-2xl border border-slate-200/50 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-gradient-to-b from-primary-500 to-cyan-500 rounded-full"></div>
              Historique des paiements
            </h3>
            {payments.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                Aucun paiement enregistré pour cette facture
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Méthode</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Référence</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {new Date(payment.payment_date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {getPaymentMethodLabel(payment.payment_method)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{payment.notes || '-'}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">
                          {Number(payment.amount).toFixed(2)} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {availableCreditNotes.length > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-2xl border border-purple-200/50 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                <div className="w-1.5 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                Avoirs disponibles ({availableCreditNotes.length})
              </h3>
              <div className="space-y-3">
                {availableCreditNotes.map((creditNote) => (
                  <div
                    key={creditNote.id}
                    className="bg-white border border-purple-200 rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1">
                      <div className="font-bold text-slate-900 mb-1">
                        {creditNote.credit_note_number}
                      </div>
                      <div className="text-sm text-slate-600">
                        {new Date(creditNote.date).toLocaleDateString('fr-FR')}
                      </div>
                      {creditNote.reason && (
                        <div className="text-xs text-slate-500 mt-1 italic">
                          "{creditNote.reason}"
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xl font-bold text-purple-600">
                          {Number(creditNote.total).toFixed(2)} €
                        </div>
                        <div className="text-xs text-slate-500">
                          HT: {Number(creditNote.subtotal).toFixed(2)} €
                        </div>
                      </div>
                      <button
                        onClick={() => handleApplyCreditNote(creditNote.id)}
                        disabled={loading}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50 whitespace-nowrap"
                      >
                        Appliquer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative p-8 border-t border-slate-100 bg-gradient-to-br from-white via-slate-50/30 to-cyan-50/20 rounded-b-3xl backdrop-blur-xl z-[100] flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-cyan-500/5 rounded-b-3xl"></div>
          <button
            type="button"
            onClick={onClose}
            className="w-full px-8 py-4 border-2 border-slate-300 text-slate-700 rounded-2xl hover:bg-white hover:border-slate-400 transition-all duration-300 font-bold hover:scale-[1.02] shadow-sm hover:shadow-md text-lg relative"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}


interface CreditNoteModalProps {
  invoice: Invoice;
  onClose: () => void;
  onSave: () => void;
}

function CreditNoteModal({ invoice, onClose, onSave }: CreditNoteModalProps) {
  const { user, profile } = useAuth();
  const [creditNoteNumber, setCreditNoteNumber] = useState("");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState(invoice.total.toString());
  const [loading, setLoading] = useState(false);
  const [maxAvailableAmount, setMaxAvailableAmount] = useState(Number(invoice.total));
  const [creditNoteType, setCreditNoteType] = useState<'correction' | 'refund'>('correction');

  useEffect(() => {
    generateCreditNoteNumber();
    calculateMaxAvailableAmount();
  }, []);

  const calculateMaxAvailableAmount = async () => {
    try {
      // Get all credit notes created from this specific invoice
      const { data: creditNotes, error } = await supabase
        .from('credit_notes')
        .select('total')
        .eq('source_invoice_id', invoice.id);

      if (error) throw error;

      // Calculate total credit notes already created for this invoice
      const totalCreditNotesCreated = creditNotes?.reduce((sum, cn) => sum + Number(cn.total), 0) || 0;

      // Maximum available is invoice total minus credit notes already created
      const available = Number(invoice.total) - totalCreditNotesCreated;
      setMaxAvailableAmount(Math.max(0, available));
      setAmount(available > 0 ? available.toFixed(2) : '0');
    } catch (error) {
      console.error('Error calculating max available amount:', error);
      setMaxAvailableAmount(Number(invoice.total));
    }
  };

  const generateCreditNoteNumber = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("credit_notes")
        .select("credit_note_number")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      const year = new Date().getFullYear();
      let nextNumber = 1;

      if (data && data.length > 0) {
        const lastNumber = data[0].credit_note_number;
        const match = lastNumber.match(/AV-(\d{4})-(\d+)/);
        if (match) {
          const lastYear = parseInt(match[1]);
          const lastNum = parseInt(match[2]);
          if (lastYear === year) {
            nextNumber = lastNum + 1;
          }
        }
      }

      setCreditNoteNumber(`AV-${year}-${nextNumber.toString().padStart(4, "0")}`);
    } catch (error) {
      console.error("Error generating credit note number:", error);
      const year = new Date().getFullYear();
      setCreditNoteNumber(`AV-${year}-0001`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const amountValue = parseFloat(amount);

    // Validate amount
    if (amountValue <= 0) {
      alert('Le montant doit être supérieur à 0');
      return;
    }

    if (amountValue > maxAvailableAmount) {
      alert(`Le montant ne peut pas dépasser ${maxAvailableAmount.toFixed(2)} €`);
      return;
    }

    setLoading(true);

    try {
      const taxRate = Number(invoice.tax_rate);
      const subtotal = amountValue / (1 + taxRate / 100);
      const taxAmount = amountValue - subtotal;

      const creditNoteData = {
        user_id: user.id,
        dentist_id: invoice.dentist_id,
        source_invoice_id: invoice.id,
        corrects_invoice_id: creditNoteType === 'correction' ? invoice.id : null,
        credit_note_number: creditNoteNumber,
        reason,
        subtotal: subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total: amountValue,
        date: new Date().toISOString().split('T')[0],
        type: creditNoteType,
        is_correction: creditNoteType === 'correction',
        reduces_net_amount: creditNoteType === 'correction',
        used: creditNoteType === 'correction', // Correction credit notes are automatically "used"
      };

      const { error } = await supabase.from("credit_notes").insert([creditNoteData]);

      if (error) throw error;

      // For correction type, the trigger will automatically update invoice status
      // For refund type, manually update to credit_note status
      if (creditNoteType === 'refund') {
        await supabase
          .from("invoices")
          .update({ status: "credit_note" })
          .eq("id", invoice.id);
      }

      const message = creditNoteType === 'correction'
        ? "Avoir de correction créé avec succès! Le montant net à payer de la facture a été réduit."
        : "Avoir de remboursement créé avec succès! Un crédit est maintenant disponible pour ce client.";
      alert(message);
      onSave();
    } catch (error) {
      console.error("Error creating credit note:", error);
      alert("Erreur lors de la création de l'avoir");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[calc(100vh-2rem)] flex flex-col animate-in slide-in-from-bottom-8 duration-500 border border-slate-200/50">
        <div className="relative p-8 border-b border-slate-100 bg-gradient-to-br from-white via-slate-50/30 to-orange-50/20 z-10 rounded-t-3xl backdrop-blur-xl flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-red-500/5 rounded-t-3xl"></div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 bg-clip-text text-transparent relative">
            Créer un avoir
          </h2>
          <p className="text-slate-600 mt-2 relative">Facture: {invoice.invoice_number}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Type d'avoir <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => setCreditNoteType('correction')}
                  className={`px-4 py-3 rounded-xl border-2 transition-all font-medium ${
                    creditNoteType === 'correction'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-blue-300'
                  }`}
                >
                  <div className="text-left">
                    <div className="font-bold">Correction</div>
                    <div className="text-xs mt-1">Corrige une erreur de facturation</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setCreditNoteType('refund')}
                  className={`px-4 py-3 rounded-xl border-2 transition-all font-medium ${
                    creditNoteType === 'refund'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-green-300'
                  }`}
                >
                  <div className="text-left">
                    <div className="font-bold">Remboursement</div>
                    <div className="text-xs mt-1">Crée un crédit disponible</div>
                  </div>
                </button>
              </div>
              <div className={`p-3 rounded-lg text-sm ${
                creditNoteType === 'correction' ? 'bg-blue-50 text-blue-800' : 'bg-green-50 text-green-800'
              }`}>
                {creditNoteType === 'correction' ? (
                  <><strong>Correction:</strong> Le montant net à payer de cette facture sera réduit. Utilisez ce type quand vous avez facturé un montant incorrect (ex: 1000€ au lieu de 800€).</>
                ) : (
                  <><strong>Remboursement:</strong> Un crédit sera créé et pourra être appliqué aux paiements futurs. La facture originale reste inchangée.</>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Numéro d'avoir
              </label>
              <input
                type="text"
                value={creditNoteNumber}
                disabled
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Montant <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                max={maxAvailableAmount}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-500 mt-1">
                Montant maximum disponible: {maxAvailableAmount.toFixed(2)} €
              </p>
              {maxAvailableAmount === 0 && (
                <p className="text-xs text-red-600 mt-1 font-semibold">
                  ⚠️ Le montant total d'avoirs a déjà été atteint pour cette facture
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Raison <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={4}
                placeholder="Expliquez la raison de cet avoir..."
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              />
            </div>
          </form>
        </div>

        <div className="relative p-8 border-t border-slate-100 bg-gradient-to-br from-white via-slate-50/30 to-orange-50/20 rounded-b-3xl backdrop-blur-xl z-[100] flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-red-500/5 rounded-b-3xl"></div>
          <div className="flex gap-4 relative">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-8 py-4 border-2 border-slate-300 text-slate-700 rounded-2xl hover:bg-white hover:border-slate-400 transition-all duration-300 font-bold hover:scale-[1.02] shadow-sm hover:shadow-md text-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-2xl hover:from-orange-700 hover:to-red-700 transition-all duration-300 font-bold hover:scale-[1.02] shadow-lg hover:shadow-xl text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? "Création..." : "Créer l'avoir"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


interface CreditNotesListModalProps {
  invoice: Invoice;
  creditNotes: CreditNote[];
  onClose: () => void;
  onRefresh: () => void;
}

function CreditNotesListModal({ invoice, creditNotes, onClose, onRefresh }: CreditNotesListModalProps) {
  const { user } = useAuth();

  const totalCreditNotes = creditNotes.reduce((sum, cn) => sum + Number(cn.total), 0);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[calc(100vh-2rem)] flex flex-col animate-in slide-in-from-bottom-8 duration-500 border border-slate-200/50">
        <div className="relative p-8 border-b border-slate-100 bg-gradient-to-br from-white via-slate-50/30 to-purple-50/20 z-10 rounded-t-3xl backdrop-blur-xl flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-t-3xl"></div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent relative">
            Avoirs - Facture {invoice.invoice_number}
          </h2>
          <p className="text-slate-600 mt-2 relative">
            Dentiste: {invoice.dentists?.name || "N/A"}
          </p>
          <div className="mt-4 flex items-center gap-4 relative">
            <div className="bg-white rounded-lg px-4 py-2 border border-slate-200">
              <span className="text-sm text-slate-600">Total des avoirs:</span>
              <span className="ml-2 font-bold text-purple-600">{totalCreditNotes.toFixed(2)} €</span>
            </div>
            <div className="bg-white rounded-lg px-4 py-2 border border-slate-200">
              <span className="text-sm text-slate-600">Montant facture:</span>
              <span className="ml-2 font-bold text-slate-900">{Number(invoice.total).toFixed(2)} €</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {creditNotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-600">Aucun avoir pour ce dentiste</p>
            </div>
          ) : (
            <div className="space-y-4">
              {creditNotes.map((creditNote) => (
                <div
                  key={creditNote.id}
                  className="border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow bg-gradient-to-br from-white to-slate-50/30"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-slate-900">
                          {creditNote.credit_note_number}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          creditNote.used
                            ? "bg-gray-100 text-gray-700"
                            : "bg-green-100 text-green-700"
                        }`}>
                          {creditNote.used ? "Utilisé" : "Disponible"}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">
                        Date: {new Date(creditNote.date).toLocaleDateString("fr-FR")}
                      </p>
                      {creditNote.reason && (
                        <p className="text-sm text-slate-700 mt-2 italic">
                          "{creditNote.reason}"
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-purple-600">
                        {Number(creditNote.total).toFixed(2)} €
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        HT: {Number(creditNote.subtotal).toFixed(2)} €
                      </div>
                      <div className="text-xs text-slate-500">
                        TVA ({Number(creditNote.tax_rate)}%): {Number(creditNote.tax_amount).toFixed(2)} €
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative p-8 border-t border-slate-100 bg-gradient-to-br from-white via-slate-50/30 to-purple-50/20 rounded-b-3xl backdrop-blur-xl z-[100] flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-b-3xl"></div>
          <button
            type="button"
            onClick={onClose}
            className="w-full px-8 py-4 border-2 border-slate-300 text-slate-700 rounded-2xl hover:bg-white hover:border-slate-400 transition-all duration-300 font-bold hover:scale-[1.02] shadow-sm hover:shadow-md text-lg relative"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
