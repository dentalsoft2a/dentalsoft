import { useState, useEffect } from 'react';
import { Plus, FileText, Send, Clock, CheckCircle, XCircle, Camera, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLockScroll } from '../../hooks/useLockScroll';
import DatePicker from '../common/DatePicker';

interface Laboratory {
  laboratory_id: string;
  laboratory_name: string;
  allow_orders: boolean;
  allow_quotes: boolean;
  portal_message: string | null;
}

interface QuoteRequest {
  id: string;
  patient_name: string;
  work_description: string;
  tooth_numbers: string | null;
  shade: string | null;
  requested_delivery_date: string | null;
  notes: string | null;
  status: string;
  laboratory_response: string | null;
  quoted_amount: number | null;
  created_at: string;
  laboratory_id: string;
  laboratory?: {
    laboratory_name: string;
  };
}

interface DentistQuoteRequestProps {
  laboratories: Laboratory[];
}

export default function DentistQuoteRequest({ laboratories }: DentistQuoteRequestProps) {
  const { user } = useAuth();
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    laboratory_id: '',
    patient_name: '',
    work_description: '',
    tooth_numbers: '',
    shade: '',
    requested_delivery_date: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useLockScroll(showModal);

  const availableLabs = laboratories.filter(lab => lab.allow_quotes);

  useEffect(() => {
    if (user) {
      loadQuoteRequests();
    }
  }, [user]);

  const loadQuoteRequests = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('dentist_quote_requests')
        .select(`
          *,
          laboratory:user_profiles!laboratory_id(laboratory_name)
        `)
        .eq('dentist_account_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuoteRequests(data || []);
    } catch (error) {
      console.error('Error loading quote requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('dentist_quote_requests')
        .insert({
          dentist_account_id: user.id,
          laboratory_id: formData.laboratory_id,
          patient_name: formData.patient_name,
          work_description: formData.work_description,
          tooth_numbers: formData.tooth_numbers || null,
          shade: formData.shade || null,
          requested_delivery_date: formData.requested_delivery_date || null,
          notes: formData.notes || null,
          status: 'pending'
        });

      if (error) throw error;

      alert('Demande de devis envoyée avec succès !');
      setShowModal(false);
      resetForm();
      loadQuoteRequests();
    } catch (error) {
      console.error('Error submitting quote request:', error);
      alert('Erreur lors de l\'envoi de la demande');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      laboratory_id: '',
      patient_name: '',
      work_description: '',
      tooth_numbers: '',
      shade: '',
      requested_delivery_date: '',
      notes: ''
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'quoted':
        return {
          label: 'Devis reçu',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle,
          iconColor: 'text-green-600'
        };
      case 'accepted':
        return {
          label: 'Accepté',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: CheckCircle,
          iconColor: 'text-blue-600'
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
          color: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: Clock,
          iconColor: 'text-amber-600'
        };
    }
  };

  if (availableLabs.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-slate-200">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 text-lg font-medium mb-2">
            Demandes de devis non disponibles
          </p>
          <p className="text-slate-500 text-sm">
            Aucun de vos laboratoires n'a activé cette fonctionnalité
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Demandes de Devis</h1>
          <p className="text-slate-600 mt-2">Demandez des devis à vos laboratoires</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-primary-600 to-cyan-600 text-white shadow-lg hover:shadow-xl rounded-xl hover:from-primary-700 hover:to-cyan-700 transition-all duration-200 font-medium"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden md:inline">Nouvelle demande</span>
          <span className="md:hidden">Nouveau</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            <span className="text-slate-600 font-medium">Chargement...</span>
          </div>
        </div>
      ) : quoteRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-slate-200">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 text-lg">Aucune demande de devis</p>
          <p className="text-slate-500 text-sm mt-2">
            Créez votre première demande pour recevoir un devis
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quoteRequests.map((request) => {
            const statusConfig = getStatusConfig(request.status);
            const StatusIcon = statusConfig.icon;
            const labName = (request.laboratory as any)?.laboratory_name || 'Laboratoire';

            return (
              <div
                key={request.id}
                className="bg-white rounded-2xl shadow-md border border-slate-200 hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-slate-900 mb-1">
                        {request.patient_name}
                      </h3>
                      <p className="text-sm text-slate-600">{labName}</p>
                    </div>
                    <StatusIcon className={`w-6 h-6 ${statusConfig.iconColor}`} />
                  </div>

                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${statusConfig.color} mb-4`}>
                    {statusConfig.label}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="text-sm">
                      <span className="text-slate-500">Travail:</span>
                      <p className="mt-1 text-slate-900">{request.work_description}</p>
                    </div>
                    {request.tooth_numbers && (
                      <div className="text-sm">
                        <span className="text-slate-500">Dents:</span>
                        <span className="ml-2 text-slate-900 font-medium">{request.tooth_numbers}</span>
                      </div>
                    )}
                    {request.shade && (
                      <div className="text-sm">
                        <span className="text-slate-500">Teinte:</span>
                        <span className="ml-2 text-slate-900 font-medium">{request.shade}</span>
                      </div>
                    )}
                    <div className="text-sm">
                      <span className="text-slate-500">Demandé le:</span>
                      <span className="ml-2 text-slate-900 font-medium">
                        {new Date(request.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>

                  {request.status === 'quoted' && request.quoted_amount && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                      <div className="text-center">
                        <p className="text-sm text-green-600 font-medium mb-1">Montant devisé</p>
                        <p className="text-2xl font-bold text-green-900">
                          {request.quoted_amount.toFixed(2)} €
                        </p>
                      </div>
                      {request.laboratory_response && (
                        <p className="text-sm text-green-700 mt-3 pt-3 border-t border-green-200">
                          {request.laboratory_response}
                        </p>
                      )}
                    </div>
                  )}

                  {request.status === 'refused' && request.laboratory_response && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-sm text-red-700">{request.laboratory_response}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">Nouvelle demande de devis</h2>
              <p className="text-slate-600 text-sm mt-1">Remplissez les informations du travail souhaité</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Laboratoire <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.laboratory_id}
                  onChange={(e) => setFormData({ ...formData, laboratory_id: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                >
                  <option value="">Sélectionner un laboratoire</option>
                  {availableLabs.map((lab) => (
                    <option key={lab.laboratory_id} value={lab.laboratory_id}>
                      {lab.laboratory_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Patient <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.patient_name}
                  onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                  placeholder="Nom du patient"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description du travail <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.work_description}
                  onChange={(e) => setFormData({ ...formData, work_description: e.target.value })}
                  placeholder="Ex: Couronne céramo-métallique sur 16, Bridge 3 éléments 14-15-16..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Numéros de dents
                  </label>
                  <input
                    type="text"
                    value={formData.tooth_numbers}
                    onChange={(e) => setFormData({ ...formData, tooth_numbers: e.target.value })}
                    placeholder="Ex: 16, 17, 18"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Teinte
                  </label>
                  <input
                    type="text"
                    value={formData.shade}
                    onChange={(e) => setFormData({ ...formData, shade: e.target.value })}
                    placeholder="Ex: A2"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <DatePicker
                value={formData.requested_delivery_date}
                onChange={(value) => setFormData({ ...formData, requested_delivery_date: value })}
                label="Date de livraison souhaitée"
                color="primary"
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes complémentaires
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Informations supplémentaires..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-cyan-600 text-white shadow-lg rounded-lg hover:from-primary-700 hover:to-cyan-700 transition disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Envoi...' : 'Envoyer la demande'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
