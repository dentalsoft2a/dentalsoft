import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Search, FileDown, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';
import { generateInvoicePDF } from '../../utils/pdfGenerator';

type Invoice = Database['public']['Tables']['invoices']['Row'] & {
  dentists?: { name: string };
};

export default function InvoicesPage() {
  const { user, profile } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
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
      setInvoices(data || []);
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

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) return;

    try {
      const { data: invoiceProformas, error: fetchError } = await supabase
        .from('invoice_proformas')
        .select('proforma_id')
        .eq('invoice_id', id);

      if (fetchError) throw fetchError;

      const proformaIds = invoiceProformas?.map((ip) => ip.proforma_id) || [];

      const { error: deleteError } = await supabase.from('invoices').delete().eq('id', id);
      if (deleteError) throw deleteError;

      if (proformaIds.length > 0) {
        const { error: updateError } = await supabase
          .from('proformas')
          .update({ status: 'validated' })
          .in('id', proformaIds);

        if (updateError) throw updateError;
      }

      await loadInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleGeneratePDF = async (invoice: Invoice) => {
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

      await generateInvoicePDF({
        invoice_number: invoice.invoice_number,
        date: invoice.date,
        laboratory_name: profile?.laboratory_name || '',
        laboratory_address: profile?.laboratory_address || '',
        laboratory_phone: profile?.laboratory_phone || '',
        laboratory_email: profile?.laboratory_email || '',
        laboratory_logo_url: profile?.laboratory_logo_url || '',
        laboratory_iban: profile?.laboratory_iban || '',
        laboratory_bic: profile?.laboratory_bic || '',
        dentist_name: dentistData.name,
        dentist_address: dentistData.address || '',
        delivery_notes: deliveryNotes,
        tax_rate: Number(invoice.tax_rate)
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erreur lors de la génération du PDF');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-slate-100 text-slate-700',
      sent: 'bg-blue-100 text-primary-700',
      paid: 'bg-green-100 text-green-700',
      partial: 'bg-orange-100 text-orange-700',
    };
    const labels = {
      draft: 'Brouillon',
      sent: 'Envoyée',
      paid: 'Payée',
      partial: 'Partiellement payée',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
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
          <div className="overflow-x-auto">
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
                      {Number(invoice.total).toFixed(2)} €
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
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
                        <button
                          onClick={() => handleGeneratePDF(invoice)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                          title="Générer PDF"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(invoice.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    </div>
  );
}

interface GenerateInvoiceModalProps {
  onClose: () => void;
  onSave: () => void;
}

function GenerateInvoiceModal({ onClose, onSave }: GenerateInvoiceModalProps) {
  const { user } = useAuth();
  const [dentists, setDentists] = useState<Database['public']['Tables']['dentists']['Row'][]>([]);
  const [selectedDentist, setSelectedDentist] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [validatedProformas, setValidatedProformas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDentists();
  }, []);

  useEffect(() => {
    if (selectedDentist) {
      loadValidatedProformas();
    }
  }, [selectedDentist, selectedMonth, selectedYear]);

  const loadDentists = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('dentists')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setDentists(data || []);
    } catch (error) {
      console.error('Error loading dentists:', error);
    }
  };

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
      const { count } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const nextNumber = (count || 0) + 1;
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
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[calc(100vh-2rem)] flex flex-col animate-in slide-in-from-bottom-8 duration-500 border border-slate-200/50">
        <div className="relative p-8 border-b border-slate-100 bg-gradient-to-br from-white via-slate-50/30 to-cyan-50/20 z-10 rounded-t-3xl backdrop-blur-xl flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-cyan-500/5 rounded-t-3xl"></div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 via-cyan-600 to-primary-600 bg-clip-text text-transparent relative">Générer une facture mensuelle</h2>
          <p className="text-slate-500 text-sm mt-2 relative">Sélectionnez un dentiste et une période</p>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto flex-1">
          <div className="bg-gradient-to-br from-slate-50 to-white p-6 rounded-2xl border border-slate-200/50 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-gradient-to-b from-primary-500 to-cyan-500 rounded-full"></div>
              Informations de la facture
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label className="block text-sm font-bold text-slate-700 mb-3 transition-colors flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                Dentiste <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedDentist}
                onChange={(e) => setSelectedDentist(e.target.value)}
                className="w-full px-4 py-3.5 border border-primary-200 rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 outline-none transition-all duration-300 bg-gradient-to-br from-white to-slate-50/30 shadow-sm hover:shadow-md hover:border-primary-300"
              >
                <option value="">Sélectionner un dentiste</option>
                {dentists.map((dentist) => (
                  <option key={dentist.id} value={dentist.id}>
                    {dentist.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3 transition-colors flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                Mois
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-4 py-3.5 border border-cyan-200 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 outline-none transition-all duration-300 bg-gradient-to-br from-white to-slate-50/30 shadow-sm hover:shadow-md hover:border-cyan-300"
              >
                {months.map((month, index) => (
                  <option key={index} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3 transition-colors flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                Année
              </label>
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-4 py-3.5 border border-primary-200 rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 outline-none transition-all duration-300 bg-gradient-to-br from-white to-slate-50/30 shadow-sm hover:shadow-md hover:border-primary-300"
              />
            </div>
            </div>
          </div>

          {selectedDentist && (
            <div className="bg-gradient-to-br from-slate-50 to-white p-6 rounded-2xl border border-slate-200/50 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <div className="w-1.5 h-6 bg-gradient-to-b from-primary-500 to-cyan-500 rounded-full"></div>
                Proformas validés trouvés
              </h3>
              <p className="text-sm text-slate-600 font-semibold mb-4">
                {validatedProformas.length} proforma(s) validé(s) pour cette période
              </p>
              {validatedProformas.length > 0 && (
                <div className="mt-4 space-y-2 bg-white/50 rounded-xl p-4 border border-slate-200">
                  {validatedProformas.map((proforma) => (
                    <div key={proforma.id} className="text-sm text-slate-700 flex justify-between py-2">
                      <span className="font-semibold">{proforma.proforma_number}</span>
                      <span className="font-bold text-slate-900">{Number(proforma.total).toFixed(2)} €</span>
                    </div>
                  ))}
                  <div className="pt-3 mt-3 border-t-2 border-slate-300 flex justify-between text-lg font-bold">
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

        <div className="relative p-8 border-t border-slate-100 bg-gradient-to-br from-white via-slate-50/30 to-cyan-50/20 rounded-b-3xl backdrop-blur-xl z-[100] flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-cyan-500/5 rounded-b-3xl"></div>
          <div className="flex gap-4 relative">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-8 py-4 border-2 border-slate-300 text-slate-700 rounded-2xl hover:bg-white hover:border-slate-400 transition-all duration-300 font-bold hover:scale-[1.02] shadow-sm hover:shadow-md text-lg"
            >
              Annuler
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading || !selectedDentist || validatedProformas.length === 0}
              className="flex-1 px-8 py-4 bg-gradient-to-r from-primary-600 via-cyan-600 to-primary-600 text-white shadow-xl hover:shadow-2xl rounded-2xl hover:from-primary-700 hover:via-cyan-700 hover:to-primary-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold hover:scale-[1.02] text-lg bg-[length:200%_100%] hover:bg-[position:100%_0]"
            >
              {loading ? 'Génération...' : 'Générer la facture'}
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

      const totalPaid = data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const remaining = Number(invoice.total) - totalPaid;
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

    setLoading(true);
    try {
      const { error } = await supabase.from('invoice_payments').insert({
        invoice_id: invoice.id,
        amount: parseFloat(amount),
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

      const totalPaid = [...payments, { amount: parseFloat(amount) }].reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );
      const invoiceTotal = Number(invoice.total);
      const newStatus = totalPaid >= invoiceTotal ? 'paid' : totalPaid > 0 ? 'partial' : 'draft';

      await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoice.id);

      onSave();
    } catch (error) {
      console.error('Error adding payment:', error);
      alert('Erreur lors de l\'ajout du paiement');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce paiement ?')) return;

    try {
      const { error } = await supabase.from('invoice_payments').delete().eq('id', paymentId);

      if (error) throw error;

      await loadPayments();

      const remainingPayments = payments.filter(p => p.id !== paymentId);
      const totalPaid = remainingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const invoiceTotal = Number(invoice.total);
      const newStatus = totalPaid >= invoiceTotal ? 'paid' : totalPaid > 0 ? 'partial' : 'draft';

      await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoice.id);

      onSave();
    } catch (error) {
      console.error('Error deleting payment:', error);
      alert('Erreur lors de la suppression du paiement');
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Number(invoice.total) - totalPaid;

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Espèces',
      bank_transfer: 'Virement',
      check: 'Chèque',
      credit_card: 'Carte bancaire',
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
          <div className="mt-4 flex gap-6 text-sm relative">
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-semibold">Total:</span>
              <span className="font-bold text-slate-900 text-base">{Number(invoice.total).toFixed(2)} €</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-semibold">Payé:</span>
              <span className="font-bold text-green-600 text-base">{totalPaid.toFixed(2)} €</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-semibold">Restant:</span>
              <span className="font-bold text-orange-600 text-base">{remaining.toFixed(2)} €</span>
            </div>
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
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase">Actions</th>
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
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeletePayment(payment.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
