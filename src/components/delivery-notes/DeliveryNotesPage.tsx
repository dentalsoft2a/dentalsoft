import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Search, FileDown, User, CheckCircle, Play, Clock, ThumbsUp, ThumbsDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLockScroll } from '../../hooks/useLockScroll';
import type { Database } from '../../lib/database.types';
import { generateDeliveryNotePDF } from '../../utils/pdfGenerator';
import { deductStockForDeliveryNote, restoreStockForDeliveryNote } from '../../utils/stockManager';
import CatalogItemSelector from './CatalogItemSelector';
import ResourceVariantSelector from './ResourceVariantSelector';
import DatePicker from '../common/DatePicker';
import CustomSelect from '../common/CustomSelect';
import DeliveryNoteDetail from './DeliveryNoteDetail';

type DeliveryNote = Database['public']['Tables']['delivery_notes']['Row'] & {
  dentists?: { name: string };
};

export default function DeliveryNotesPage() {
  const { user, profile } = useAuth();
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [hasValidSubscription, setHasValidSubscription] = useState(false);

  useLockScroll(showModal);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    loadDeliveryNotes();
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

  const loadDeliveryNotes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('delivery_notes')
        .select('*, dentists(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeliveryNotes(data || []);
    } catch (error) {
      console.error('Error loading delivery notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (noteId: string) => {
    if (!confirm('Approuver cette demande et commencer le travail ?')) return;

    try {
      const { data: note, error: fetchError } = await supabase
        .from('delivery_notes')
        .select('*')
        .eq('id', noteId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!note) throw new Error('Bon de livraison introuvable');

      const noteData = note as any;
      let items = noteData.items || [];

      if (items.length === 0 && noteData.work_description) {
        items = [{
          description: noteData.work_description,
          tooth_number: noteData.tooth_numbers || '',
          shade: noteData.shade || '',
          quantity: 1,
          unit: 'unité',
          unit_price: 0,
          catalog_item_id: null,
          resource_variants: {}
        }];
      } else if (items.length > 0) {
        items = items.map((item: any, index: number) => ({
          ...item,
          description: index === 0 && noteData.work_description ? noteData.work_description : item.description,
          tooth_number: index === 0 && noteData.tooth_numbers ? noteData.tooth_numbers : item.tooth_number
        }));
      }

      const { error } = await supabase
        .from('delivery_notes')
        .update({
          status: 'pending',
          items: items
        })
        .eq('id', noteId);

      if (error) throw error;
      loadDeliveryNotes();
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Erreur lors de l\'approbation de la demande');
    }
  };

  const handleRejectRequest = async (noteId: string) => {
    const reason = prompt('Raison du refus (optionnel):');
    if (reason === null) return;

    if (!confirm('Rejeter cette demande ? Elle sera supprimée.')) return;

    try {
      const { error } = await supabase
        .from('delivery_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
      loadDeliveryNotes();
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Erreur lors du rejet de la demande');
    }
  };

  const pendingApprovalNotes = deliveryNotes.filter(note => note.status === 'pending_approval');
  const activeNotes = deliveryNotes.filter(note => note.status !== 'pending_approval');

  const filteredNotes = activeNotes.filter((note) => {
    const matchesSearch =
      note.delivery_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.dentists?.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleStartWork = async (note: DeliveryNote) => {
    if (!confirm('Démarrer ce travail ?')) return;

    try {
      const { error } = await supabase
        .from('delivery_notes')
        .update({ status: 'in_progress' })
        .eq('id', note.id);

      if (error) throw error;
      await loadDeliveryNotes();
    } catch (error) {
      console.error('Error starting work:', error);
      alert('Erreur lors du démarrage du travail');
    }
  };

  const handleCompleteWork = async (note: DeliveryNote) => {
    if (!confirm('Marquer ce bon de livraison comme terminé ?')) return;

    try {
      const { error } = await supabase
        .from('delivery_notes')
        .update({ status: 'completed' })
        .eq('id', note.id);

      if (error) throw error;
      await loadDeliveryNotes();
    } catch (error) {
      console.error('Error completing work:', error);
      alert('Erreur lors de la mise à jour du statut');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce bon de livraison ? Le stock sera automatiquement restauré.')) return;

    try {
      if (user) {
        const stockResult = await restoreStockForDeliveryNote(id, user.id);
        if (!stockResult.success) {
          console.warn('Stock restoration warning:', stockResult.error);
        }
      }

      const { error } = await supabase.from('delivery_notes').delete().eq('id', id);
      if (error) throw error;
      await loadDeliveryNotes();
    } catch (error) {
      console.error('Error deleting delivery note:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleDownloadPDF = async (note: DeliveryNote) => {
    try {
      const { data: dentistData, error: dentistError } = await supabase
        .from('dentists')
        .select('*')
        .eq('id', note.dentist_id)
        .single();

      if (dentistError) throw dentistError;

      const patientName = (note as any).patient_name || dentistData.name;

      const items = Array.isArray(note.items) ? note.items : [];

      await generateDeliveryNotePDF({
        delivery_number: note.delivery_number,
        date: note.date,
        prescription_date: (note as any).prescription_date,
        items: items as any,
        laboratory_name: profile?.laboratory_name || '',
        laboratory_address: profile?.laboratory_address || '',
        laboratory_phone: profile?.laboratory_phone || '',
        laboratory_email: profile?.laboratory_email || '',
        laboratory_logo_url: profile?.laboratory_logo_url || '',
        laboratory_rcs: profile?.laboratory_rcs || '',
        dentist_name: dentistData.name,
        dentist_address: dentistData.address || '',
        patient_name: patientName,
        compliance_text: note.compliance_text || '',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erreur lors de la génération du PDF');
    }
  };

  return (
    <div>
      <div className="mb-6 md:mb-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Bons de livraison</h1>
            <p className="text-slate-600 mt-1 md:mt-2 text-sm md:text-base">Gérez vos bons de livraison et certificats de conformité</p>
          </div>
          <button
            onClick={() => {
              setEditingNote(null);
              setShowModal(true);
            }}
            disabled={!hasValidSubscription && !isSuperAdmin}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 md:py-3 bg-gradient-to-r from-primary-600 to-cyan-600 text-white shadow-lg hover:shadow-xl rounded-lg md:rounded-xl hover:from-primary-700 hover:to-cyan-700 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg disabled:hover:scale-100 text-sm md:text-base font-medium"
          >
            <Plus className="w-5 h-5 flex-shrink-0" />
            <span>Nouveau bon de livraison</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un bon de livraison..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {pendingApprovalNotes.length > 0 && (
          <div className="px-3 py-3 sm:px-4 sm:py-4 border-b border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-amber-900 text-sm sm:text-base">Demandes en attente d'approbation</h3>
                <p className="text-xs text-amber-700">{pendingApprovalNotes.length} demande(s) de dentiste(s) en attente</p>
              </div>
            </div>
            <div className="space-y-2">
              {pendingApprovalNotes.map((note) => (
                <div key={note.id} className="bg-white rounded-lg border border-amber-200 p-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-semibold text-slate-900 text-sm truncate">{note.delivery_number}</span>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full font-medium whitespace-nowrap">
                        En attente
                      </span>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleApproveRequest(note.id)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-all"
                        title="Approuver"
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRejectRequest(note.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-all"
                        title="Rejeter"
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingNote(note.id);
                          setShowModal(true);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-all"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-slate-600 mb-2">
                    <span className="truncate">👨‍⚕️ {note.dentists?.name}</span>
                    {(note as any).patient_name && (
                      <span className="truncate">🦷 {(note as any).patient_name}</span>
                    )}
                  </div>
                  <DeliveryNoteDetail note={note as any} compact={true} />
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-slate-600">Chargement...</div>
        ) : filteredNotes.length === 0 && pendingApprovalNotes.length === 0 ? (
          <div className="p-8 text-center text-slate-600">
            {searchTerm ? 'Aucun bon de livraison trouvé' : 'Aucun bon de livraison enregistré'}
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
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredNotes.map((note) => (
                    <tr key={note.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{note.delivery_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                        {note.dentists?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                        {new Date(note.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          note.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : note.status === 'in_progress'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {note.status === 'completed' ? 'Terminé' : note.status === 'in_progress' ? 'En cours' : 'En attente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {note.status === 'pending' && (
                            <button
                              onClick={() => handleStartWork(note)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                              title="Démarrer le travail"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          {note.status === 'in_progress' && (
                            <button
                              onClick={() => handleCompleteWork(note)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                              title="Marquer comme terminé"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDownloadPDF(note)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                            title="Télécharger PDF"
                          >
                            <FileDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingNote(note.id);
                              setShowModal(true);
                            }}
                            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(note.id)}
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

            <div className="md:hidden divide-y divide-slate-200">
              {filteredNotes.map((note) => (
                <div key={note.id} className="p-4 hover:bg-slate-50 transition-colors active:bg-slate-100">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 text-sm truncate">{note.delivery_number}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                          note.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : note.status === 'in_progress'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {note.status === 'completed' ? 'Terminé' : note.status === 'in_progress' ? 'En cours' : 'En attente'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1">
                        <User className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{note.dentists?.name}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {new Date(note.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    {note.status === 'pending' && (
                      <button
                        onClick={() => handleStartWork(note)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-medium transition-all active:scale-95"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Démarrer
                      </button>
                    )}
                    {note.status === 'in_progress' && (
                      <button
                        onClick={() => handleCompleteWork(note)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-medium transition-all active:scale-95"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Terminer
                      </button>
                    )}
                    <button
                      onClick={() => handleDownloadPDF(note)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-medium transition-all active:scale-95"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      PDF
                    </button>
                    <button
                      onClick={() => {
                        setEditingNote(note.id);
                        setShowModal(true);
                      }}
                      className="p-2 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg transition-all active:scale-95"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-all active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showModal && (
        <DeliveryNoteModal
          noteId={editingNote}
          onClose={() => {
            setShowModal(false);
            setEditingNote(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingNote(null);
            loadDeliveryNotes();
          }}
        />
      )}
    </div>
  );
}

interface DeliveryNoteModalProps {
  noteId: string | null;
  onClose: () => void;
  onSave: () => void;
}

function DeliveryNoteModal({ noteId, onClose, onSave }: DeliveryNoteModalProps) {
  const { user } = useAuth();
  const [dentists, setDentists] = useState<Database['public']['Tables']['dentists']['Row'][]>([]);
  const [formData, setFormData] = useState({
    dentist_id: '',
    patient_name: '',
    delivery_number: '',
    date: new Date().toISOString().split('T')[0],
    prescription_date: new Date().toISOString().split('T')[0],
    compliance_text: 'Je soussigné certifie que les prothèses dentaires ci-dessus ont été réalisées conformément aux normes en vigueur et aux spécifications du praticien.',
    work_description: '',
    tooth_numbers: '',
    shade: '',
  });
  const [items, setItems] = useState<Array<{
    description: string;
    quantity: number;
    unit_price: number;
    unit: string;
    shade: string;
    tooth_number: string;
    catalog_item_id?: string;
    resource_variants?: Record<string, string>;
  }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDentists();
    if (noteId) {
      loadDeliveryNote();
    } else {
      generateDeliveryNumber();
    }
  }, [noteId]);

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

  const generateDeliveryNumber = async () => {
    if (!user) return;

    try {
      const year = new Date().getFullYear();
      const prefix = `BL-${year}-`;

      const { data, error } = await supabase
        .from('delivery_notes')
        .select('delivery_number')
        .eq('user_id', user.id)
        .like('delivery_number', `${prefix}%`)
        .order('delivery_number', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastNumber = data[0].delivery_number.split('-').pop();
        nextNumber = parseInt(lastNumber || '0', 10) + 1;
      }

      setFormData((prev) => ({
        ...prev,
        delivery_number: `${prefix}${String(nextNumber).padStart(4, '0')}`,
      }));
    } catch (error) {
      console.error('Error generating delivery number:', error);
    }
  };

  const loadDeliveryNote = async () => {
    if (!noteId) return;

    try {
      const { data, error } = await supabase
        .from('delivery_notes')
        .select('*')
        .eq('id', noteId)
        .single();

      if (error) throw error;

      setFormData({
        dentist_id: data.dentist_id,
        patient_name: (data as any).patient_name || '',
        delivery_number: data.delivery_number,
        date: data.date,
        prescription_date: data.prescription_date || '',
        compliance_text: data.compliance_text || '',
        work_description: (data as any).work_description || '',
        tooth_numbers: (data as any).tooth_numbers || '',
        shade: (data as any).shade || '',
      });

      const itemsData = Array.isArray(data.items) ? data.items : [];
      setItems(
        itemsData.length > 0
          ? itemsData
          : [{ description: '', quantity: 1, unit_price: 0, unit: '', shade: '', tooth_number: '', catalog_item_id: undefined, resource_variants: {} }]
      );
    } catch (error) {
      console.error('Error loading delivery note:', error);
    }
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0, unit: '', shade: '', tooth_number: '', catalog_item_id: undefined, resource_variants: {} }]);
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
    if (!user || !formData.dentist_id) return;

    setLoading(true);
    try {
      if (noteId) {
        const { error } = await supabase
          .from('delivery_notes')
          .update({
            dentist_id: formData.dentist_id,
            patient_name: formData.patient_name || null,
            delivery_number: formData.delivery_number,
            date: formData.date,
            prescription_date: formData.prescription_date || null,
            items: items as any,
            compliance_text: formData.compliance_text,
            work_description: formData.work_description || null,
            tooth_numbers: formData.tooth_numbers || null,
            shade: formData.shade || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', noteId);

        if (error) throw error;
      } else {
        const { data: newNote, error } = await supabase.from('delivery_notes').insert({
          user_id: user.id,
          dentist_id: formData.dentist_id,
          patient_name: formData.patient_name || null,
          delivery_number: formData.delivery_number,
          date: formData.date,
          prescription_date: formData.prescription_date || null,
          items: items as any,
          compliance_text: formData.compliance_text,
        }).select().single();

        if (error) throw error;

        const stockItems = items
          .filter((item: any) => item.catalog_item_id)
          .map((item: any) => ({
            catalogItemId: item.catalog_item_id,
            quantity: item.quantity,
            resourceVariants: item.resource_variants || {}
          }));

        console.log('🚀 Stock items to process:', stockItems);

        if (stockItems.length > 0) {
          console.log('📦 Calling deductStockForDeliveryNote with:', newNote.id, stockItems, user.id);
          const stockResult = await deductStockForDeliveryNote(
            newNote.id,
            stockItems,
            user.id
          );
          console.log('📦 Stock deduction result:', stockResult);

          if (!stockResult.success) {
            await supabase.from('delivery_notes').delete().eq('id', newNote.id);
            alert(stockResult.error || 'Erreur lors de la gestion du stock');
            setLoading(false);
            return;
          }
        }
      }

      onSave();
    } catch (error) {
      console.error('Error saving delivery note:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-2 md:p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl max-w-4xl w-full max-h-[calc(100vh-1rem)] md:max-h-[calc(100vh-2rem)] flex flex-col animate-in slide-in-from-bottom-8 duration-500 border border-slate-200/50">
        <div className="relative p-4 md:p-6 border-b border-slate-100 bg-gradient-to-br from-white via-slate-50/30 to-cyan-50/20 z-10 rounded-t-2xl md:rounded-t-3xl backdrop-blur-xl flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-cyan-500/5 rounded-t-2xl md:rounded-t-3xl"></div>
          <h2 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-primary-600 via-cyan-600 to-primary-600 bg-clip-text text-transparent relative">
            {noteId ? 'Modifier le bon de livraison' : 'Nouveau bon de livraison'}
          </h2>
          <p className="text-slate-500 text-xs md:text-sm mt-1 md:mt-2 relative">Remplissez les informations du bon de livraison</p>
        </div>

        <form onSubmit={handleSubmit} className="p-3 md:p-6 space-y-4 md:space-y-6 overflow-y-auto flex-1">
          <div className="space-y-4 md:space-y-6">
            <div className="bg-gradient-to-br from-slate-50 to-white p-3 md:p-5 rounded-xl md:rounded-2xl border border-slate-200/50 shadow-sm">
              <h3 className="text-sm md:text-base font-bold text-slate-800 mb-3 md:mb-4 flex items-center gap-2">
                <div className="w-1 h-4 md:w-1.5 md:h-6 bg-gradient-to-b from-primary-500 to-cyan-500 rounded-full"></div>
                Informations générales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <CustomSelect
                  value={formData.dentist_id}
                  onChange={(value) => setFormData({ ...formData, dentist_id: value })}
                  options={dentists.map(d => ({ value: d.id, label: d.name }))}
                  label="Dentiste"
                  placeholder="Sélectionner un dentiste"
                  required
                  icon={<User className="w-5 h-5" />}
                  color="primary"
                />

                <div className="group">
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2 transition-colors group-focus-within:text-primary-600 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 group-focus-within:scale-150 transition-transform"></span>
                    Patient
                  </label>
                  <input
                    type="text"
                    value={formData.patient_name}
                    onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                    placeholder="Nom du patient"
                    className="w-full px-3 py-2 md:px-4 md:py-3 text-sm border border-slate-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 outline-none transition-all duration-300 hover:border-primary-300 placeholder:text-slate-400 bg-white shadow-sm"
                  />
                </div>
              </div>
            </div>

            {(formData.work_description || formData.tooth_numbers || formData.shade) && (
              <div className="bg-gradient-to-br from-blue-50/50 to-cyan-50/50 p-3 md:p-5 rounded-xl md:rounded-2xl border border-blue-200/50 shadow-sm">
                <h3 className="text-sm md:text-base font-bold text-slate-800 mb-3 md:mb-4 flex items-center gap-2">
                  <div className="w-1 h-4 md:w-1.5 md:h-6 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
                  Informations de la demande du dentiste
                </h3>
                <div className="grid grid-cols-1 gap-3 md:gap-4">
                  {formData.work_description && (
                    <div className="group">
                      <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2 transition-colors group-focus-within:text-blue-600 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-focus-within:scale-150 transition-transform"></span>
                        Description du travail
                      </label>
                      <textarea
                        value={formData.work_description}
                        onChange={(e) => setFormData({ ...formData, work_description: e.target.value })}
                        placeholder="Description du travail demandé"
                        rows={3}
                        className="w-full px-3 py-2 md:px-4 md:py-3 text-sm border border-slate-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 outline-none transition-all duration-300 hover:border-blue-300 placeholder:text-slate-400 bg-white shadow-sm"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {formData.tooth_numbers && (
                      <div className="group">
                        <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2 transition-colors group-focus-within:text-cyan-600 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 group-focus-within:scale-150 transition-transform"></span>
                          Numéros de dents
                        </label>
                        <input
                          type="text"
                          value={formData.tooth_numbers}
                          onChange={(e) => setFormData({ ...formData, tooth_numbers: e.target.value })}
                          placeholder="Ex: 11, 12, 13"
                          className="w-full px-3 py-2 md:px-4 md:py-3 text-sm border border-slate-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 outline-none transition-all duration-300 hover:border-cyan-300 placeholder:text-slate-400 bg-white shadow-sm"
                        />
                      </div>
                    )}

                    {formData.shade && (
                      <div className="group">
                        <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2 transition-colors group-focus-within:text-blue-600 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-focus-within:scale-150 transition-transform"></span>
                          Teinte
                        </label>
                        <input
                          type="text"
                          value={formData.shade}
                          onChange={(e) => setFormData({ ...formData, shade: e.target.value })}
                          placeholder="Ex: A2"
                          className="w-full px-3 py-2 md:px-4 md:py-3 text-sm border border-slate-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 outline-none transition-all duration-300 hover:border-blue-300 placeholder:text-slate-400 bg-white shadow-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-br from-cyan-50/50 to-white p-3 md:p-5 rounded-xl md:rounded-2xl border border-slate-200/50 shadow-sm">
              <h3 className="text-sm md:text-base font-bold text-slate-800 mb-3 md:mb-4 flex items-center gap-2">
                <div className="w-1 h-4 md:w-1.5 md:h-6 bg-gradient-to-b from-cyan-500 to-primary-500 rounded-full"></div>
                Dates et numérotation
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="group">
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2 transition-colors group-focus-within:text-primary-600 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500 group-focus-within:scale-150 transition-transform"></span>
                    Numéro <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.delivery_number}
                    onChange={(e) => setFormData({ ...formData, delivery_number: e.target.value })}
                    className="w-full px-3 py-2 md:px-4 md:py-3 text-sm border border-slate-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 outline-none transition-all duration-300 hover:border-primary-300 bg-white shadow-sm"
                  />
                </div>

                <DatePicker
                  value={formData.prescription_date}
                  onChange={(value) => setFormData({ ...formData, prescription_date: value })}
                  label="Date de prescription"
                  color="cyan"
                />

                <div className="md:col-span-2">
                  <DatePicker
                    value={formData.date}
                    onChange={(value) => setFormData({ ...formData, date: value })}
                    label="Date de livraison"
                    required
                    color="primary"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary-50/30 to-cyan-50/30 p-3 md:p-5 rounded-xl md:rounded-2xl border border-primary-200/50 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 md:w-1.5 md:h-6 bg-gradient-to-b from-primary-500 to-cyan-500 rounded-full"></div>
                <div>
                  <h3 className="text-sm md:text-base font-bold text-slate-800">
                    Articles <span className="text-red-500">*</span>
                  </h3>
                  <p className="text-xs text-slate-500">Liste des prothèses</p>
                </div>
              </div>
              <button
                type="button"
                onClick={addItem}
                className="w-full md:w-auto text-xs md:text-sm px-3 py-2 md:px-4 md:py-2.5 bg-gradient-to-r from-primary-500 to-cyan-500 text-white hover:from-primary-600 hover:to-cyan-600 font-bold rounded-lg md:rounded-xl transition-all duration-300 shadow-md flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                Ajouter
              </button>
            </div>

            <CatalogItemSelector
              onSelect={(item) => {
                const newItem = {
                  catalog_item_id: item.catalog_item_id,
                  description: item.description,
                  quantity: 1,
                  unit_price: item.unit_price,
                  unit: item.unit,
                  shade: '',
                  tooth_number: '',
                  resource_variants: {},
                };
                setItems([...items, newItem]);
              }}
            />

            <div className="space-y-3 mt-3">
              {items.map((item, index) => (
                <div key={index} className="relative border border-slate-200/80 rounded-xl md:rounded-2xl p-3 md:p-4 space-y-3 md:space-y-4 bg-white hover:border-primary-200 transition-all duration-300 shadow group overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 md:w-32 md:h-32 bg-gradient-to-br from-primary-100/20 to-cyan-100/20 rounded-bl-[60px] md:rounded-bl-[100px] -z-0"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-1.5 md:gap-2 mb-3">
                      <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs md:text-sm shadow-md">
                        {index + 1}
                      </div>
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Article</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2 group/item">
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 transition-colors group-focus-within/item:text-primary-600 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-primary-500 group-focus-within/item:scale-150 transition-transform"></span>
                          Description <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Couronne céramique"
                          required
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 outline-none transition-all hover:border-primary-300 bg-white/80 shadow-sm"
                        />
                      </div>
                      <div className="group/item">
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 transition-colors group-focus-within/item:text-primary-600 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-cyan-500 group-focus-within/item:scale-150 transition-transform"></span>
                          Qte <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          placeholder="1"
                          required
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 outline-none transition-all hover:border-primary-300 bg-white/80 shadow-sm"
                        />
                      </div>
                      <div className="group/item">
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 transition-colors group-focus-within/item:text-primary-600 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-primary-500 group-focus-within/item:scale-150 transition-transform"></span>
                          Prix HT (€)
                        </label>
                        <input
                          type="number"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          value={item.unit_price || ''}
                          onChange={(e) => updateItem(index, 'unit_price', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 outline-none transition-all hover:border-primary-300 bg-white/80 shadow-sm"
                        />
                      </div>
                      <div className="group/item">
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 transition-colors group-focus-within/item:text-primary-600 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-cyan-500 group-focus-within/item:scale-150 transition-transform"></span>
                          Unité
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: unité, set"
                          value={item.unit}
                          onChange={(e) => updateItem(index, 'unit', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 outline-none transition-all hover:border-primary-300 bg-white/80 shadow-sm"
                        />
                      </div>
                      <div className="group/item">
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 transition-colors group-focus-within/item:text-primary-600 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-primary-500 group-focus-within/item:scale-150 transition-transform"></span>
                          Teinte
                        </label>
                        <select
                          value={item.shade}
                          onChange={(e) => updateItem(index, 'shade', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 outline-none transition-all hover:border-primary-300 bg-white/80 shadow-sm"
                        >
                        <option value="">Sélectionner une teinte</option>
                        <optgroup label="Teintes A (Rougeâtre-brunâtre)">
                          <option value="A1">A1</option>
                          <option value="A2">A2</option>
                          <option value="A3">A3</option>
                          <option value="A3.5">A3.5</option>
                          <option value="A4">A4</option>
                        </optgroup>
                        <optgroup label="Teintes B (Jaunâtre-rougeâtre)">
                          <option value="B1">B1</option>
                          <option value="B2">B2</option>
                          <option value="B3">B3</option>
                          <option value="B4">B4</option>
                        </optgroup>
                        <optgroup label="Teintes C (Grisâtre)">
                          <option value="C1">C1</option>
                          <option value="C2">C2</option>
                          <option value="C3">C3</option>
                          <option value="C4">C4</option>
                        </optgroup>
                        <optgroup label="Teintes D (Brun-grisâtre)">
                          <option value="D2">D2</option>
                          <option value="D3">D3</option>
                          <option value="D4">D4</option>
                        </optgroup>
                        <optgroup label="Teintes Blanchiment">
                          <option value="BL1">BL1 (Blanchiment léger)</option>
                          <option value="BL2">BL2 (Blanchiment moyen)</option>
                          <option value="BL3">BL3 (Blanchiment intense)</option>
                          <option value="BL4">BL4 (Blanchiment très intense)</option>
                        </optgroup>
                        <optgroup label="3D Master - Niveau 1 (Clair)">
                          <option value="1M1">1M1</option>
                          <option value="1M2">1M2</option>
                          <option value="2L1.5">2L1.5</option>
                          <option value="2L2.5">2L2.5</option>
                          <option value="2M1">2M1</option>
                          <option value="2M2">2M2</option>
                          <option value="2M3">2M3</option>
                          <option value="2R1.5">2R1.5</option>
                          <option value="2R2.5">2R2.5</option>
                        </optgroup>
                        <optgroup label="3D Master - Niveau 2 (Moyen)">
                          <option value="3L1.5">3L1.5</option>
                          <option value="3L2.5">3L2.5</option>
                          <option value="3M1">3M1</option>
                          <option value="3M2">3M2</option>
                          <option value="3M3">3M3</option>
                          <option value="3R1.5">3R1.5</option>
                          <option value="3R2.5">3R2.5</option>
                        </optgroup>
                        <optgroup label="3D Master - Niveau 3 (Moyen-Foncé)">
                          <option value="4L1.5">4L1.5</option>
                          <option value="4L2.5">4L2.5</option>
                          <option value="4M1">4M1</option>
                          <option value="4M2">4M2</option>
                          <option value="4M3">4M3</option>
                          <option value="4R1.5">4R1.5</option>
                          <option value="4R2.5">4R2.5</option>
                        </optgroup>
                        <optgroup label="3D Master - Niveau 4 (Foncé)">
                          <option value="5M1">5M1</option>
                          <option value="5M2">5M2</option>
                          <option value="5M3">5M3</option>
                        </optgroup>
                      </select>
                    </div>
                    <div className="group/item">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 transition-colors group-focus-within/item:text-primary-600 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-cyan-500 group-focus-within/item:scale-150 transition-transform"></span>
                        N° dent
                      </label>
                      <select
                        value={item.tooth_number}
                        onChange={(e) => updateItem(index, 'tooth_number', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400 outline-none transition-all hover:border-primary-300 bg-white/80 shadow-sm"
                      >
                        <option value="">Sélectionner un numéro</option>
                        <optgroup label="Maxillaire droit (adulte)">
                          <option value="11">11 (Incisive centrale supérieure droite)</option>
                          <option value="12">12 (Incisive latérale supérieure droite)</option>
                          <option value="13">13 (Canine supérieure droite)</option>
                          <option value="14">14 (Première prémolaire supérieure droite)</option>
                          <option value="15">15 (Deuxième prémolaire supérieure droite)</option>
                          <option value="16">16 (Première molaire supérieure droite)</option>
                          <option value="17">17 (Deuxième molaire supérieure droite)</option>
                          <option value="18">18 (Troisième molaire supérieure droite)</option>
                        </optgroup>
                        <optgroup label="Maxillaire gauche (adulte)">
                          <option value="21">21 (Incisive centrale supérieure gauche)</option>
                          <option value="22">22 (Incisive latérale supérieure gauche)</option>
                          <option value="23">23 (Canine supérieure gauche)</option>
                          <option value="24">24 (Première prémolaire supérieure gauche)</option>
                          <option value="25">25 (Deuxième prémolaire supérieure gauche)</option>
                          <option value="26">26 (Première molaire supérieure gauche)</option>
                          <option value="27">27 (Deuxième molaire supérieure gauche)</option>
                          <option value="28">28 (Troisième molaire supérieure gauche)</option>
                        </optgroup>
                        <optgroup label="Mandibulaire gauche (adulte)">
                          <option value="31">31 (Incisive centrale inférieure gauche)</option>
                          <option value="32">32 (Incisive latérale inférieure gauche)</option>
                          <option value="33">33 (Canine inférieure gauche)</option>
                          <option value="34">34 (Première prémolaire inférieure gauche)</option>
                          <option value="35">35 (Deuxième prémolaire inférieure gauche)</option>
                          <option value="36">36 (Première molaire inférieure gauche)</option>
                          <option value="37">37 (Deuxième molaire inférieure gauche)</option>
                          <option value="38">38 (Troisième molaire inférieure gauche)</option>
                        </optgroup>
                        <optgroup label="Mandibulaire droit (adulte)">
                          <option value="41">41 (Incisive centrale inférieure droite)</option>
                          <option value="42">42 (Incisive latérale inférieure droite)</option>
                          <option value="43">43 (Canine inférieure droite)</option>
                          <option value="44">44 (Première prémolaire inférieure droite)</option>
                          <option value="45">45 (Deuxième prémolaire inférieure droite)</option>
                          <option value="46">46 (Première molaire inférieure droite)</option>
                          <option value="47">47 (Deuxième molaire inférieure droite)</option>
                          <option value="48">48 (Troisième molaire inférieure droite)</option>
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  {item.catalog_item_id && (
                    <div className="mt-4">
                      <ResourceVariantSelector
                        catalogItemId={item.catalog_item_id}
                        selectedVariants={item.resource_variants}
                        onSelect={(variants) => {
                          console.log('🎨 Variants selected:', variants);
                          const newItems = [...items];
                          newItems[index] = {
                            ...newItems[index],
                            resource_variants: variants
                          };
                          console.log('📝 Updated item:', newItems[index]);
                          setItems(newItems);
                        }}
                      />
                    </div>
                  )}

                  {items.length > 1 && (
                    <div className="flex justify-end pt-2 md:pt-3 mt-2 md:mt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm text-white bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 rounded-lg md:rounded-xl transition-all duration-300 font-semibold shadow-md"
                      >
                        <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        Supprimer
                      </button>
                    </div>
                  )}
                  </div>
                </div>
              ))}
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
