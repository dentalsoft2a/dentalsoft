import { useEffect, useState } from 'react';
import { Plus, Eye, CreditCard as Edit, Trash2, Search, FileDown, Receipt, Mail, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLockScroll } from '../../hooks/useLockScroll';
import type { Database } from '../../lib/database.types';
import { generateProformaPDF, generateProformaPDFBase64 } from '../../utils/pdfGenerator';
import DentistSelector from './DentistSelector';
import DatePicker from '../common/DatePicker';
import MonthPicker from '../common/MonthPicker';

type Proforma = Database['public']['Tables']['proformas']['Row'] & {
  dentists?: { name: string };
};

export default function ProformasPage() {
  const { user, profile } = useAuth();
  const [proformas, setProformas] = useState<Proforma[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingProforma, setEditingProforma] = useState<string | null>(null);
  const [showBulkCreateModal, setShowBulkCreateModal] = useState(false);

  useLockScroll(showModal || showBulkCreateModal);
  const [hasValidSubscription, setHasValidSubscription] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    loadProformas();
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

  const loadProformas = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('proformas')
        .select('*, dentists(name)')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setProformas(data || []);
    } catch (error) {
      console.error('Error loading proformas:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProformas = proformas.filter((proforma) => {
    const matchesSearch =
      proforma.proforma_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proforma.dentists?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || proforma.status === statusFilter;
    const notInvoiced = proforma.status !== 'invoiced';
    return matchesSearch && matchesStatus && notInvoiced;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce proforma ?')) return;

    try {
      // Get all proforma items to find associated delivery notes
      const { data: proformaItems, error: itemsError } = await supabase
        .from('proforma_items')
        .select('delivery_note_id')
        .eq('proforma_id', id);

      if (itemsError) throw itemsError;

      // Get unique delivery note IDs
      const deliveryNoteIds = [...new Set(
        proformaItems
          ?.map(item => item.delivery_note_id)
          .filter(id => id != null) || []
      )];

      // Delete the proforma
      const { error } = await supabase.from('proformas').delete().eq('id', id);
      if (error) throw error;

      // Reset delivery notes status back to 'in_progress'
      if (deliveryNoteIds.length > 0) {
        const { error: updateError } = await supabase
          .from('delivery_notes')
          .update({ status: 'in_progress' })
          .in('id', deliveryNoteIds);

        if (updateError) console.error('Error updating delivery notes status:', updateError);
      }

      await loadProformas();
    } catch (error) {
      console.error('Error deleting proforma:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleConvertToInvoice = async (proforma: Proforma) => {
    if (!confirm('Êtes-vous sûr de vouloir convertir ce proforma en facture ?')) return;

    try {
      const proformaDate = new Date(proforma.date);
      const month = proformaDate.getMonth() + 1;
      const year = proformaDate.getFullYear();

      // Use PostgreSQL function to generate next invoice number (bypasses RLS)
      const { data: invoiceNumber, error: rpcError } = await supabase
        .rpc('generate_next_invoice_number');

      if (rpcError) throw rpcError;

      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          user_id: user!.id,
          dentist_id: proforma.dentist_id,
          invoice_number: invoiceNumber as string,
          date: new Date().toISOString().split('T')[0],
          month: month,
          year: year,
          status: 'draft',
          notes: proforma.notes,
          subtotal: proforma.subtotal,
          tax_rate: proforma.tax_rate,
          tax_amount: proforma.tax_amount,
          total: proforma.total,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const { error: linkError } = await supabase
        .from('invoice_proformas')
        .insert({
          invoice_id: invoiceData.id,
          proforma_id: proforma.id,
        });

      if (linkError) throw linkError;

      const { error: updateError } = await supabase
        .from('proformas')
        .update({ status: 'invoiced' })
        .eq('id', proforma.id);

      if (updateError) throw updateError;

      alert(`Facture ${invoiceNumber} créée avec succès!`);
      await loadProformas();
    } catch (error) {
      console.error('Error converting to invoice:', error);
      alert('Erreur lors de la conversion en facture');
    }
  };

  const handleGeneratePDF = async (proforma: Proforma, returnPdfData = false) => {
    try {
      const { data: dentistData, error: dentistError } = await supabase
        .from('dentists')
        .select('*')
        .eq('id', proforma.dentist_id)
        .single();

      if (dentistError) throw dentistError;

      const { data: proformaItems, error: itemsError } = await supabase
        .from('proforma_items')
        .select('*')
        .eq('proforma_id', proforma.id);

      if (itemsError) throw itemsError;

      const deliveryNoteIds = [...new Set(
        proformaItems
          .map(item => item.delivery_note_id)
          .filter(id => id != null)
      )];

      if (deliveryNoteIds.length === 0) {
        alert('Aucun bon de livraison associé à ce proforma');
        return null;
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
        patient_code: (note as any).patient_code || '',
        items: Array.isArray(note.items) ? note.items : []
      }));

      const pdfData = {
        proforma_number: proforma.proforma_number,
        date: proforma.date,
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
        tax_rate: Number(proforma.tax_rate)
      };

      if (returnPdfData) {
        return await generateProformaPDFBase64(pdfData);
      } else {
        await generateProformaPDF(pdfData);
        return null;
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erreur lors de la génération du PDF');
      return null;
    }
  };

  const handleSendEmail = async (proforma: Proforma) => {
    try {
      const { data: dentistData, error: dentistError } = await supabase
        .from('dentists')
        .select('*')
        .eq('id', proforma.dentist_id)
        .single();

      if (dentistError) throw dentistError;

      if (!dentistData.email) {
        alert('Ce dentiste n\'a pas d\'adresse email configurée');
        return;
      }

      if (!confirm(`Envoyer le proforma par email à ${dentistData.email} ?`)) return;

      const pdfBase64 = await handleGeneratePDF(proforma, true);

      if (!pdfBase64) {
        alert('Erreur lors de la génération du PDF');
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-proforma-email`;
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          proformaId: proforma.id,
          dentistEmail: dentistData.email,
          dentistName: dentistData.name,
          pdfBase64,
          proformaNumber: proforma.proforma_number,
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
      pending: 'bg-orange-100 text-orange-700',
      validated: 'bg-green-100 text-green-700',
      invoiced: 'bg-blue-100 text-primary-700',
    };
    const labels = {
      pending: 'En attente',
      validated: 'Validé',
      invoiced: 'Facturé',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const totalTTC = filteredProformas.reduce((sum, proforma) => sum + Number(proforma.total), 0);
  const totalPendingTTC = proformas
    .filter(proforma => proforma.status === 'pending')
    .reduce((sum, proforma) => sum + Number(proforma.total), 0);

  return (
    <div>
      <div className="mb-6 md:mb-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Proformas</h1>
            <p className="text-slate-600 mt-1 md:mt-2 text-sm md:text-base">Gérez vos devis et proformas</p>
          </div>
          <div className="flex gap-2 md:gap-3">
            <button
              onClick={() => setShowBulkCreateModal(true)}
              disabled={!hasValidSubscription && !isSuperAdmin}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 md:py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:shadow-xl rounded-lg md:rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg disabled:hover:scale-100 text-sm md:text-base font-medium"
            >
              <Receipt className="w-5 h-5 flex-shrink-0" />
              <span>Création en lot</span>
            </button>
            <button
              onClick={() => {
                setEditingProforma(null);
                setShowModal(true);
              }}
              disabled={!hasValidSubscription && !isSuperAdmin}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 md:py-3 bg-gradient-to-r from-primary-600 to-cyan-600 text-white shadow-lg hover:shadow-xl rounded-lg md:rounded-xl hover:from-primary-700 hover:to-cyan-700 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg disabled:hover:scale-100 text-sm md:text-base font-medium"
            >
              <Plus className="w-5 h-5 flex-shrink-0" />
              <span>Nouveau</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un proforma..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="validated">Validé</option>
            </select>
          </div>
          <div className="relative bg-gradient-to-br from-orange-50/80 to-amber-50/80 border border-orange-200/50 rounded-xl p-4 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-amber-500/5"></div>
            <div className="relative flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Total TTC en attente</span>
              <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                {totalPendingTTC.toFixed(2)} €
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 relative">
              {proformas.filter(p => p.status === 'pending').length} proforma{proformas.filter(p => p.status === 'pending').length > 1 ? 's' : ''} en attente
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-600">Chargement...</div>
        ) : filteredProformas.length === 0 ? (
          <div className="p-8 text-center text-slate-600">
            {searchTerm || statusFilter !== 'all' ? 'Aucun proforma trouvé' : 'Aucun proforma enregistré'}
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
                  {filteredProformas.map((proforma) => (
                    <tr key={proforma.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{proforma.proforma_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                        {proforma.dentists?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                        {new Date(proforma.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(proforma.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-slate-900">
                        {Number(proforma.total).toFixed(2)} €
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {proforma.status !== 'invoiced' && (
                            <button
                              onClick={() => handleConvertToInvoice(proforma)}
                              className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-all duration-200"
                              title="Facturer"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleGeneratePDF(proforma, false)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                            title="Générer PDF"
                          >
                            <FileDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSendEmail(proforma)}
                            className="p-2 text-violet-600 hover:bg-violet-50 rounded-lg transition-all duration-200"
                            title="Envoyer par email"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          {proforma.status !== 'invoiced' && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingProforma(proforma.id);
                                  setShowModal(true);
                                }}
                                className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200"
                                title="Modifier"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(proforma.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-slate-200">
              {filteredProformas.map((proforma) => (
                <div key={proforma.id} className="p-4 hover:bg-slate-50 transition-colors active:bg-slate-100">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-slate-900 text-sm">{proforma.proforma_number}</h3>
                        {getStatusBadge(proforma.status)}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1">
                        <Eye className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{proforma.dentists?.name}</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">
                        {new Date(proforma.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {Number(proforma.total).toFixed(2)} €
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      {proforma.status !== 'invoiced' && (
                        <button
                          onClick={() => handleConvertToInvoice(proforma)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 rounded-lg text-xs font-medium transition-all active:scale-95"
                        >
                          <Receipt className="w-4 h-4" />
                          Facturer
                        </button>
                      )}
                      <button
                        onClick={() => handleGeneratePDF(proforma, false)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-medium transition-all active:scale-95"
                      >
                        <FileDown className="w-4 h-4" />
                        PDF
                      </button>
                      <button
                        onClick={() => handleSendEmail(proforma)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-violet-50 text-violet-700 hover:bg-violet-100 rounded-lg text-xs font-medium transition-all active:scale-95"
                      >
                        <Send className="w-4 h-4" />
                        Email
                      </button>
                    </div>
                    {proforma.status !== 'invoiced' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingProforma(proforma.id);
                            setShowModal(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg text-xs font-medium transition-all active:scale-95"
                        >
                          <Edit className="w-4 h-4" />
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(proforma.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-medium transition-all active:scale-95"
                        >
                          <Trash2 className="w-4 h-4" />
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showModal && (
        <ProformaModal
          proformaId={editingProforma}
          onClose={() => {
            setShowModal(false);
            setEditingProforma(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingProforma(null);
            loadProformas();
          }}
        />
      )}

      {showBulkCreateModal && (
        <BulkCreateProformasModal
          onClose={() => setShowBulkCreateModal(false)}
          onSave={() => {
            setShowBulkCreateModal(false);
            loadProformas();
          }}
        />
      )}
    </div>
  );
}

interface ProformaModalProps {
  proformaId: string | null;
  onClose: () => void;
  onSave: () => void;
}

function ProformaModal({ proformaId, onClose, onSave }: ProformaModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    dentist_id: '',
    proforma_number: '',
    date: new Date().toISOString().split('T')[0],
    status: 'pending' as 'pending' | 'validated' | 'invoiced',
    notes: '',
    tax_rate: 0,
  });
  const [items, setItems] = useState<Array<{
    id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    delivery_note_id?: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [deliveryNotes, setDeliveryNotes] = useState<any[]>([]);
  const [loadingDeliveryNotes, setLoadingDeliveryNotes] = useState(false);

  useEffect(() => {
    if (proformaId) {
      loadProforma();
    } else {
      generateProformaNumber();
    }
  }, [proformaId]);

  useEffect(() => {
    if (formData.dentist_id || selectedMonth) {
      loadDeliveryNotes();
    }
  }, [formData.dentist_id, selectedMonth]);

  const generateProformaNumber = async () => {
    if (!user) return;

    try {
      // Use PostgreSQL function to generate next number (bypasses RLS)
      const { data: nextNumber, error } = await supabase
        .rpc('generate_next_proforma_number');

      if (error) throw error;

      setFormData((prev) => ({
        ...prev,
        proforma_number: nextNumber as string,
      }));
    } catch (error) {
      console.error('Error generating proforma number:', error);
      // Fallback to timestamp-based number in case of error
      const year = new Date().getFullYear();
      const timestamp = Date.now() % 10000;
      setFormData((prev) => ({
        ...prev,
        proforma_number: `PRO-${year}-${String(timestamp).padStart(4, '0')}`,
      }));
    }
  };

  const loadProforma = async () => {
    if (!proformaId) return;

    try {
      const { data: proformaData, error: proformaError } = await supabase
        .from('proformas')
        .select('*')
        .eq('id', proformaId)
        .single();

      if (proformaError) throw proformaError;

      setFormData({
        dentist_id: proformaData.dentist_id,
        proforma_number: proformaData.proforma_number,
        date: proformaData.date,
        status: proformaData.status,
        notes: proformaData.notes || '',
        tax_rate: Number(proformaData.tax_rate),
      });

      const { data: itemsData, error: itemsError } = await supabase
        .from('proforma_items')
        .select('*')
        .eq('proforma_id', proformaId);

      if (itemsError) throw itemsError;

      setItems(
        itemsData.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: Number(item.unit_price),
          delivery_note_id: item.delivery_note_id || undefined,
        }))
      );
    } catch (error) {
      console.error('Error loading proforma:', error);
    }
  };

  const loadDeliveryNotes = async () => {
    if (!user) return;

    setLoadingDeliveryNotes(true);
    try {
      // First, get all delivery note IDs that are already used in proforma_items
      const { data: usedDeliveryNotes, error: usedError } = await supabase
        .from('proforma_items')
        .select('delivery_note_id')
        .not('delivery_note_id', 'is', null);

      if (usedError) throw usedError;

      // Extract unique delivery note IDs that are already used
      const usedDeliveryNoteIds = [...new Set(
        usedDeliveryNotes
          ?.map(item => item.delivery_note_id)
          .filter(id => id != null) || []
      )];

      // Build the query for available delivery notes
      // Include pending_approval for dentist-created BL that need to be converted to proforma
      let query = supabase
        .from('delivery_notes')
        .select('*, dentists(name)')
        .eq('user_id', user.id)
        .in('status', ['pending', 'in_progress', 'completed', 'pending_approval']);

      // Exclude delivery notes that are already used in proformas
      if (usedDeliveryNoteIds.length > 0) {
        query = query.not('id', 'in', `(${usedDeliveryNoteIds.join(',')})`);
      }

      if (formData.dentist_id) {
        query = query.eq('dentist_id', formData.dentist_id);
      }

      if (selectedMonth) {
        const startDate = `${selectedMonth}-01`;
        const endDate = new Date(selectedMonth + '-01');
        endDate.setMonth(endDate.getMonth() + 1);
        const endDateStr = endDate.toISOString().split('T')[0];

        query = query.gte('date', startDate).lt('date', endDateStr);
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) throw error;

      // Filter out notes without valid items (safety check)
      const filteredNotes = (data || []).filter(note => {
        const hasValidItems = Array.isArray(note.items) &&
          note.items.length > 0 &&
          note.items.some((item: any) => item.unit_price > 0);
        return hasValidItems;
      });

      setDeliveryNotes(filteredNotes);
    } catch (error) {
      console.error('Error loading delivery notes:', error);
    } finally {
      setLoadingDeliveryNotes(false);
    }
  };

  const importDeliveryNote = (note: any) => {
    const noteItems = Array.isArray(note.items) ? note.items : [];
    const newItems = noteItems.map((item: any) => ({
      description: item.description || '',
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0,
      delivery_note_id: note.id,
    }));

    if (newItems.length > 0) {
      setItems(prevItems => [...prevItems, ...newItems]);
    }
  };

  const importAllDeliveryNotes = () => {
    // Get IDs of already imported delivery notes
    const importedDeliveryNoteIds = new Set(
      items.map(item => item.delivery_note_id).filter(id => id != null)
    );

    const allItems: Array<{
      description: string;
      quantity: number;
      unit_price: number;
      delivery_note_id: string;
    }> = [];

    deliveryNotes.forEach((note) => {
      // Skip if already imported
      if (importedDeliveryNoteIds.has(note.id)) {
        return;
      }

      const noteItems = Array.isArray(note.items) ? note.items : [];
      noteItems.forEach((item: any) => {
        allItems.push({
          description: item.description || '',
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          delivery_note_id: note.id,
        });
      });
    });

    if (allItems.length > 0) {
      setItems(prevItems => [...prevItems, ...allItems]);
    } else {
      alert('Tous les bons de livraison disponibles ont déjà été importés');
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const tax_amount = subtotal * (formData.tax_rate / 100);
    const total = subtotal + tax_amount;
    return { subtotal, tax_amount, total };
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.dentist_id) {
      alert('Veuillez sélectionner un dentiste');
      return;
    }

    setLoading(true);
    try {
      const { subtotal, tax_amount, total } = calculateTotals();

      if (proformaId) {
        const { error: proformaError } = await supabase
          .from('proformas')
          .update({
            dentist_id: formData.dentist_id,
            proforma_number: formData.proforma_number,
            date: formData.date,
            status: formData.status,
            notes: formData.notes,
            tax_rate: formData.tax_rate,
            subtotal,
            tax_amount,
            total,
            updated_at: new Date().toISOString(),
          })
          .eq('id', proformaId);

        if (proformaError) throw proformaError;

        await supabase.from('proforma_items').delete().eq('proforma_id', proformaId);

        const { error: itemsError } = await supabase.from('proforma_items').insert(
          items.map((item) => ({
            proforma_id: proformaId,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.quantity * item.unit_price,
            delivery_note_id: item.delivery_note_id || null,
          }))
        );

        if (itemsError) throw itemsError;

        // For updates, also mark delivery notes as completed
        const updateDeliveryNoteIds = items
          .filter(item => item.delivery_note_id)
          .map(item => item.delivery_note_id);

        if (updateDeliveryNoteIds.length > 0) {
          const { error: updateError } = await supabase
            .from('delivery_notes')
            .update({ status: 'completed' })
            .in('id', updateDeliveryNoteIds);

          if (updateError) console.error('Error updating delivery notes status:', updateError);
        }
      } else {
        // Re-generate proforma number just before insert to avoid duplicates with retry logic
        let proformaData = null;
        let attempts = 0;
        const maxAttempts = 5;

        while (!proformaData && attempts < maxAttempts) {
          attempts++;

          // Add random delay to avoid race conditions (except first attempt)
          if (attempts > 1) {
            await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
          }

          // Use PostgreSQL function to generate next number (bypasses RLS)
          const { data: nextNumberData, error: rpcError } = await supabase
            .rpc('generate_next_proforma_number');

          if (rpcError) {
            console.error('Error generating proforma number:', rpcError);
            throw rpcError;
          }

          const finalProformaNumber = nextNumberData as string;
          console.log(`[Attempt ${attempts}] Generated proforma number: ${finalProformaNumber}`);

          // Try to insert
          const { data: insertedProforma, error: proformaError } = await supabase
            .from('proformas')
            .insert({
              user_id: user.id,
              dentist_id: formData.dentist_id,
              proforma_number: finalProformaNumber,
              date: formData.date,
              status: formData.status,
              notes: formData.notes,
              tax_rate: formData.tax_rate,
              subtotal,
              tax_amount,
              total,
            })
            .select()
            .single();

          if (proformaError) {
            if (proformaError.code === '23505') {
              // Duplicate key, retry
              console.log(`Duplicate key error for ${finalProformaNumber}, retrying...`);
              continue;
            } else {
              throw proformaError;
            }
          }

          proformaData = insertedProforma;
        }

        if (!proformaData) {
          throw new Error('Impossible de générer un numéro de proforma unique après plusieurs tentatives');
        }

        const { error: itemsError } = await supabase.from('proforma_items').insert(
          items.map((item) => ({
            proforma_id: proformaData.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.quantity * item.unit_price,
            delivery_note_id: item.delivery_note_id || null,
          }))
        );

        if (itemsError) throw itemsError;

        // Mark all imported delivery notes as completed
        const deliveryNoteIds = items
          .filter(item => item.delivery_note_id)
          .map(item => item.delivery_note_id);

        if (deliveryNoteIds.length > 0) {
          const { error: updateError } = await supabase
            .from('delivery_notes')
            .update({ status: 'completed' })
            .in('id', deliveryNoteIds);

          if (updateError) console.error('Error updating delivery notes status:', updateError);
        }
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving proforma:', error);
      if (error.code === '23505') {
        alert('Ce numéro de proforma existe déjà. Veuillez réessayer.');
        // Force reload to get fresh data
        await loadProformas();
        onCancel();
      } else {
        alert('Erreur lors de la sauvegarde');
      }
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, tax_amount, total } = calculateTotals();

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-2 md:p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl max-w-4xl w-full max-h-[calc(100vh-1rem)] md:max-h-[calc(100vh-2rem)] flex flex-col animate-in slide-in-from-bottom-8 duration-500 border border-slate-200/50">
        <div className="relative p-4 md:p-6 border-b border-slate-100 bg-gradient-to-br from-white via-slate-50/30 to-cyan-50/20 z-10 rounded-t-2xl md:rounded-t-3xl backdrop-blur-xl flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-cyan-500/5 rounded-t-2xl md:rounded-t-3xl"></div>
          <h2 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-primary-600 via-cyan-600 to-primary-600 bg-clip-text text-transparent relative">
            {proformaId ? 'Modifier le proforma' : 'Nouveau proforma'}
          </h2>
          <p className="text-slate-500 text-xs md:text-sm mt-1 md:mt-2 relative">Gérez vos devis et proformas</p>
        </div>

        <form onSubmit={handleSubmit} className="p-3 md:p-6 space-y-4 md:space-y-6 overflow-y-auto flex-1">
          <div className="bg-gradient-to-br from-slate-50 to-white p-3 md:p-5 rounded-xl md:rounded-2xl border border-slate-200/50 shadow-sm">
            <h3 className="text-sm md:text-base font-bold text-slate-800 mb-3 md:mb-4 flex items-center gap-2">
              <div className="w-1 h-4 md:w-1.5 md:h-6 bg-gradient-to-b from-primary-500 to-cyan-500 rounded-full"></div>
              Informations générales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <DentistSelector
                selectedDentistId={formData.dentist_id}
                onSelectDentist={(dentistId) => setFormData({ ...formData, dentist_id: dentistId })}
                required
              />
            </div>

            <div>
              <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2 transition-colors flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                Numéro <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.proforma_number}
                onChange={(e) => setFormData({ ...formData, proforma_number: e.target.value })}
                className="w-full px-3 py-2 md:px-4 md:py-3 text-sm border border-cyan-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 outline-none transition-all bg-gradient-to-br from-white to-slate-50/30 shadow-sm"
              />
            </div>

            <div>
              <DatePicker
                value={formData.date}
                onChange={(value) => setFormData({ ...formData, date: value })}
                label="Date"
                required
                color="primary"
              />
            </div>

            <div>
              <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2 transition-colors flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                Statut
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as 'pending' | 'validated' | 'invoiced' })
                }
                className="w-full px-3 py-2 md:px-4 md:py-3 text-sm border border-cyan-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 outline-none transition-all bg-gradient-to-br from-white to-slate-50/30 shadow-sm"
              >
                <option value="pending">En attente</option>
                <option value="validated">Validé</option>
                <option value="invoiced">Facturé</option>
              </select>
            </div>

            <div>
              <MonthPicker
                value={selectedMonth}
                onChange={(value) => setSelectedMonth(value)}
                label="Mois"
                color="cyan"
              />
            </div>
            </div>
          </div>

          {formData.dentist_id && deliveryNotes.length > 0 && (
            <div className="bg-gradient-to-br from-slate-50 to-white p-3 md:p-5 rounded-xl md:rounded-2xl border border-slate-200/50 shadow-sm">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:justify-between mb-3">
                <h3 className="text-sm md:text-base font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-1 h-4 md:w-1.5 md:h-6 bg-gradient-to-b from-primary-500 to-cyan-500 rounded-full"></div>
                  Bons de livraison ({deliveryNotes.length})
                </h3>
                <button
                  type="button"
                  onClick={importAllDeliveryNotes}
                  className="w-full md:w-auto px-3 py-2 text-xs md:text-sm bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg md:rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 font-semibold shadow-md"
                >
                  Tout importer
                </button>
              </div>
              <div className="max-h-48 md:max-h-64 overflow-y-auto border border-slate-200 rounded-xl md:rounded-2xl shadow-sm">
                {loadingDeliveryNotes ? (
                  <div className="p-4 text-center text-slate-600">Chargement...</div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {deliveryNotes.map((note) => {
                      const isImported = items.some(item => item.delivery_note_id === note.id);
                      return (
                        <div
                          key={note.id}
                          className="p-3 hover:bg-gradient-to-r hover:from-primary-50/50 hover:to-cyan-50/50 flex justify-between items-center gap-2 transition-all duration-200 group"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-sm text-slate-900 group-hover:text-primary-600 transition-colors truncate">{note.delivery_number}</div>
                            <div className="text-xs text-slate-600 mt-0.5 truncate">
                              {note.dentists?.name} - {new Date(note.date).toLocaleDateString('fr-FR')}
                              {note.patient_name && ` - ${note.patient_name}`}
                            </div>
                          </div>
                          {isImported ? (
                            <div className="flex-shrink-0 px-3 py-1.5 text-xs md:text-sm bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 rounded-lg md:rounded-xl font-semibold border border-green-200">
                              ✓ Importé
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => importDeliveryNote(note)}
                              className="flex-shrink-0 px-3 py-1.5 text-xs md:text-sm bg-gradient-to-r from-primary-600 to-cyan-600 text-white rounded-lg md:rounded-xl hover:from-primary-700 hover:to-cyan-700 transition-all duration-300 font-semibold shadow-md"
                            >
                              Importer
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-gradient-to-br from-slate-50 to-white p-3 md:p-5 rounded-xl md:rounded-2xl border border-slate-200/50 shadow-sm">
            <h3 className="text-sm md:text-base font-bold text-slate-800 mb-3 md:mb-4 flex items-center gap-2">
              <div className="w-1 h-4 md:w-1.5 md:h-6 bg-gradient-to-b from-primary-500 to-cyan-500 rounded-full"></div>
              Récapitulatif
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs md:text-sm">
                <span className="text-slate-600 font-semibold">Sous-total HT</span>
                <span className="font-bold text-slate-900">{subtotal.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-xs md:text-sm">
                <span className="text-slate-600 font-semibold">TVA ({formData.tax_rate}%)</span>
                <span className="font-bold text-slate-900">{tax_amount.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-base md:text-lg font-bold pt-2 border-t-2 border-slate-200">
                <span className="bg-gradient-to-r from-primary-600 via-cyan-600 to-primary-600 bg-clip-text text-transparent">Total TTC</span>
                <span className="bg-gradient-to-r from-primary-600 via-cyan-600 to-primary-600 bg-clip-text text-transparent">{total.toFixed(2)} €</span>
              </div>
            </div>
          </div>

        </form>

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
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-4 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-primary-600 via-cyan-600 to-primary-600 text-white shadow-lg rounded-lg md:rounded-xl hover:from-primary-700 hover:via-cyan-700 hover:to-primary-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm md:text-base bg-[length:200%_100%] hover:bg-[position:100%_0]"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BulkCreateProformasModalProps {
  onClose: () => void;
  onSave: () => void;
}

function BulkCreateProformasModal({ onClose, onSave }: BulkCreateProformasModalProps) {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Array<{
    dentist: { id: string; name: string };
    deliveryNotes: any[];
    totalAmount: number;
  }>>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    loadPreview();
  }, [selectedMonth]);

  const loadPreview = async () => {
    if (!user) return;
    setLoadingPreview(true);

    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      // Get all delivery notes for the selected month
      // Include pending_approval for dentist-created BL that need to be converted to proforma
      const { data: deliveryNotes, error: notesError } = await supabase
        .from('delivery_notes')
        .select('*, dentists(id, name)')
        .eq('user_id', user.id)
        .in('status', ['pending', 'in_progress', 'completed', 'pending_approval'])
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('dentist_id')
        .order('date');

      if (notesError) throw notesError;

      // Get all delivery note IDs that are already in proforma_items
      const { data: usedDeliveryNotes, error: usedError } = await supabase
        .from('proforma_items')
        .select('delivery_note_id')
        .not('delivery_note_id', 'is', null);

      if (usedError) throw usedError;

      // Create a Set of used delivery note IDs for fast lookup
      const usedDeliveryNoteIds = new Set(
        usedDeliveryNotes?.map(item => item.delivery_note_id).filter(Boolean) || []
      );

      // Filter out delivery notes that are already used in proformas
      // Also filter out notes without valid items (safety check)
      const availableDeliveryNotes = deliveryNotes?.filter(note => {
        if (usedDeliveryNoteIds.has(note.id)) return false;

        // Ensure note has items with prices
        const hasValidItems = Array.isArray(note.items) &&
          note.items.length > 0 &&
          note.items.some((item: any) => item.unit_price > 0);

        return hasValidItems;
      }) || [];

      // Group by dentist
      const groupedByDentist = new Map<string, {
        dentist: { id: string; name: string };
        deliveryNotes: any[];
        totalAmount: number;
      }>();

      availableDeliveryNotes.forEach(note => {
        if (!note.dentists) return;

        const dentistId = note.dentist_id;
        if (!groupedByDentist.has(dentistId)) {
          groupedByDentist.set(dentistId, {
            dentist: { id: note.dentists.id, name: note.dentists.name },
            deliveryNotes: [],
            totalAmount: 0
          });
        }

        const group = groupedByDentist.get(dentistId)!;
        group.deliveryNotes.push(note);

        // Calculate total from items
        const noteTotal = Array.isArray(note.items)
          ? note.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0)
          : 0;
        group.totalAmount += noteTotal;
      });

      setPreview(Array.from(groupedByDentist.values()));
    } catch (error) {
      console.error('Error loading preview:', error);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleBulkCreate = async () => {
    if (!user || preview.length === 0) return;

    if (!confirm(`Créer ${preview.length} proforma(s) pour le mois sélectionné ?`)) return;

    setLoading(true);
    try {
      // Get last proforma number to generate sequential numbers
      const { data: lastProforma } = await supabase
        .from('proformas')
        .select('proforma_number')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const year = new Date().getFullYear();
      let nextNumber = 1;

      if (lastProforma && lastProforma.length > 0) {
        const lastNumber = lastProforma[0].proforma_number;
        const match = lastNumber.match(/PRO-(\d{4})-(\d+)/);
        if (match) {
          const lastYear = parseInt(match[1]);
          const lastNum = parseInt(match[2]);
          if (lastYear === year) {
            nextNumber = lastNum + 1;
          }
        }
      }

      let createdCount = 0;

      for (const group of preview) {
        const proformaNumber = `PRO-${year}-${String(nextNumber).padStart(4, '0')}`;
        nextNumber++;

        // Calculate totals
        const items = group.deliveryNotes.flatMap(note =>
          Array.isArray(note.items) ? note.items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            delivery_note_id: note.id
          })) : []
        );

        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const tax_rate = 20; // Default TVA
        const tax_amount = subtotal * (tax_rate / 100);
        const total = subtotal + tax_amount;

        // Create proforma
        const { data: proformaData, error: proformaError } = await supabase
          .from('proformas')
          .insert({
            user_id: user.id,
            dentist_id: group.dentist.id,
            proforma_number: proformaNumber,
            date: new Date().toISOString().split('T')[0],
            status: 'pending',
            notes: `Proforma créé automatiquement pour ${selectedMonth}`,
            tax_rate,
            subtotal,
            tax_amount,
            total,
          })
          .select()
          .single();

        if (proformaError) throw proformaError;

        // Insert items
        const { error: itemsError } = await supabase.from('proforma_items').insert(
          items.map((item) => ({
            proforma_id: proformaData.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.quantity * item.unit_price,
            delivery_note_id: item.delivery_note_id,
          }))
        );

        if (itemsError) throw itemsError;

        // Mark delivery notes as completed
        const deliveryNoteIds = group.deliveryNotes.map(note => note.id);
        const { error: updateError } = await supabase
          .from('delivery_notes')
          .update({ status: 'completed' })
          .in('id', deliveryNoteIds);

        if (updateError) console.error('Error updating delivery notes status:', updateError);

        createdCount++;
      }

      alert(`${createdCount} proforma(s) créé(s) avec succès`);
      onSave();
    } catch (error) {
      console.error('Error creating proformas:', error);
      alert('Erreur lors de la création des proformas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[calc(100vh-2rem)] flex flex-col animate-in slide-in-from-bottom-8 duration-500 border border-slate-200/50">
        <div className="relative p-6 border-b border-slate-100 bg-gradient-to-br from-white via-slate-50/30 to-emerald-50/20 z-10 rounded-t-3xl backdrop-blur-xl flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5 rounded-t-3xl"></div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 bg-clip-text text-transparent relative">
            Création en lot de proformas
          </h2>
          <p className="text-slate-500 text-sm mt-2 relative">
            Créez automatiquement des proformas pour tous les dentistes avec des bons de livraison non terminés
          </p>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <div className="bg-gradient-to-br from-slate-50 to-white p-5 rounded-2xl border border-slate-200/50 shadow-sm">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Sélectionner le mois
            </label>
            <MonthPicker
              value={selectedMonth}
              onChange={setSelectedMonth}
            />
          </div>

          {loadingPreview ? (
            <div className="text-center py-8 text-slate-600">
              Chargement de l'aperçu...
            </div>
          ) : preview.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
              <p className="text-yellow-800 font-medium">
                Aucun bon de livraison non terminé pour ce mois
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">
                Aperçu ({preview.length} proforma{preview.length > 1 ? 's' : ''})
              </h3>
              <div className="max-h-96 overflow-y-auto space-y-3 border border-slate-200 rounded-xl p-4">
                {preview.map((group) => (
                  <div
                    key={group.dentist.id}
                    className="bg-gradient-to-br from-white to-slate-50 p-4 rounded-xl border border-slate-200 hover:border-emerald-300 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-slate-900">{group.dentist.name}</h4>
                      <span className="text-sm font-bold text-emerald-600">
                        {group.totalAmount.toFixed(2)} €
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      {group.deliveryNotes.length} bon{group.deliveryNotes.length > 1 ? 's' : ''} de livraison
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {group.deliveryNotes.map(note => (
                        <span
                          key={note.id}
                          className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded"
                        >
                          {note.delivery_number}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50 rounded-b-3xl flex-shrink-0">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-sm"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleBulkCreate}
              disabled={loading || preview.length === 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 text-white shadow-lg rounded-xl hover:from-green-700 hover:via-emerald-700 hover:to-green-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold bg-[length:200%_100%] hover:bg-[position:100%_0]"
            >
              {loading ? 'Création en cours...' : `Créer ${preview.length} proforma${preview.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
