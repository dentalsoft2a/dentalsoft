import { useState, useEffect } from 'react';
import { Search, FileDown, Package, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { generateDeliveryNotePDF } from '../../utils/pdfGenerator';

interface DeliveryNote {
  id: string;
  delivery_number: string;
  date: string;
  status: string;
  items: any[];
  patient_name: string | null;
  prescription_date: string | null;
  compliance_text: string | null;
  created_by_dentist: boolean;
  created_at: string;
  updated_at: string;
  dentist_id: string;
  dentist_name: string;
  laboratory_name: string;
  laboratory_address: string | null;
  laboratory_phone: string | null;
  laboratory_email: string | null;
  laboratory_id: string;
}

export default function DentistDeliveryTracking() {
  const { user } = useAuth();
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (user) {
      loadDeliveryNotes();
    }
  }, [user]);

  const loadDeliveryNotes = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('dentist_delivery_notes_view')
        .select('*')
        .eq('linked_dentist_account_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeliveryNotes(data || []);
    } catch (error) {
      console.error('Error loading delivery notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredNotes = deliveryNotes.filter((note) => {
    const matchesSearch =
      note.delivery_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.laboratory_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || note.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleDownloadPDF = async (note: DeliveryNote) => {
    try {
      const items = Array.isArray(note.items) ? note.items : [];

      await generateDeliveryNotePDF({
        delivery_number: note.delivery_number,
        date: note.date,
        prescription_date: note.prescription_date,
        items: items as any,
        laboratory_name: note.laboratory_name || '',
        laboratory_address: note.laboratory_address || '',
        laboratory_phone: note.laboratory_phone || '',
        laboratory_email: note.laboratory_email || '',
        laboratory_logo_url: '',
        laboratory_rcs: '',
        dentist_name: note.dentist_name,
        dentist_address: '',
        patient_name: note.patient_name || note.dentist_name,
        compliance_text: note.compliance_text || '',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erreur lors de la génération du PDF');
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          label: 'Terminé',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle,
          iconColor: 'text-green-600'
        };
      case 'in_progress':
        return {
          label: 'En cours',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: Package,
          iconColor: 'text-blue-600'
        };
      case 'pending_approval':
        return {
          label: 'En attente validation',
          color: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: AlertCircle,
          iconColor: 'text-amber-600'
        };
      case 'refused':
        return {
          label: 'Refusé',
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: XCircle,
          iconColor: 'text-red-600'
        };
      default:
        return {
          label: 'En attente',
          color: 'bg-slate-100 text-slate-800 border-slate-200',
          icon: Clock,
          iconColor: 'text-slate-600'
        };
    }
  };

  const statusCounts = {
    all: deliveryNotes.length,
    pending_approval: deliveryNotes.filter(n => n.status === 'pending_approval').length,
    in_progress: deliveryNotes.filter(n => n.status === 'in_progress').length,
    completed: deliveryNotes.filter(n => n.status === 'completed').length,
    refused: deliveryNotes.filter(n => n.status === 'refused').length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Mes Commandes</h1>
        <p className="text-slate-600 mt-2">Suivez l'avancement de vos bons de livraison</p>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par numéro, patient ou laboratoire..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              statusFilter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Tous ({statusCounts.all})
          </button>
          {statusCounts.pending_approval > 0 && (
            <button
              onClick={() => setStatusFilter('pending_approval')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                statusFilter === 'pending_approval'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              En validation ({statusCounts.pending_approval})
            </button>
          )}
          {statusCounts.in_progress > 0 && (
            <button
              onClick={() => setStatusFilter('in_progress')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                statusFilter === 'in_progress'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              En cours ({statusCounts.in_progress})
            </button>
          )}
          {statusCounts.completed > 0 && (
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                statusFilter === 'completed'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              Terminés ({statusCounts.completed})
            </button>
          )}
          {statusCounts.refused > 0 && (
            <button
              onClick={() => setStatusFilter('refused')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                statusFilter === 'refused'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Refusés ({statusCounts.refused})
            </button>
          )}
        </div>
      </div>

      {/* Delivery Notes List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            <span className="text-slate-600 font-medium">Chargement...</span>
          </div>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-slate-200">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 text-lg">
            {searchTerm || statusFilter !== 'all'
              ? 'Aucun bon de livraison trouvé'
              : 'Aucun bon de livraison'}
          </p>
          <p className="text-slate-500 text-sm mt-2">
            Les bons de livraison apparaîtront ici
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map((note) => {
            const statusConfig = getStatusConfig(note.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={note.id}
                className="bg-white rounded-2xl shadow-md border border-slate-200 hover:shadow-xl transition-all duration-300 overflow-hidden group"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-slate-900 mb-1">
                        {note.delivery_number}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {note.laboratory_name}
                      </p>
                    </div>
                    <StatusIcon className={`w-6 h-6 ${statusConfig.iconColor}`} />
                  </div>

                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${statusConfig.color} mb-4`}>
                    {statusConfig.label}
                  </div>

                  <div className="space-y-2 mb-4">
                    {note.patient_name && (
                      <div className="text-sm">
                        <span className="text-slate-500">Patient:</span>
                        <span className="ml-2 text-slate-900 font-medium">{note.patient_name}</span>
                      </div>
                    )}
                    <div className="text-sm">
                      <span className="text-slate-500">Date:</span>
                      <span className="ml-2 text-slate-900 font-medium">
                        {new Date(note.date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    {note.items && Array.isArray(note.items) && (
                      <div className="text-sm">
                        <span className="text-slate-500">Articles:</span>
                        <span className="ml-2 text-slate-900 font-medium">
                          {note.items.length} {note.items.length > 1 ? 'articles' : 'article'}
                        </span>
                      </div>
                    )}
                  </div>

                  {note.status === 'completed' && (
                    <button
                      onClick={() => handleDownloadPDF(note)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all duration-200 font-medium"
                    >
                      <FileDown className="w-4 h-4" />
                      Télécharger le PDF
                    </button>
                  )}

                  {note.created_by_dentist && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-xs text-slate-500 text-center">
                        Commande créée par vous
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
