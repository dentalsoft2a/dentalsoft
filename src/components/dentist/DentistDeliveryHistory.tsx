import { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, XCircle, RefreshCw, FileText, Package, FileQuestion, Search, Calendar, Stethoscope, Palette, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLockScroll } from '../../hooks/useLockScroll';

interface DeliveryRequest {
  id: string;
  delivery_number: string;
  patient_name: string;
  work_description: string;
  tooth_numbers?: string;
  shade?: string;
  notes?: string;
  prescription_date?: string;
  date: string;
  status: string;
  created_at: string;
  converted_bl_number?: string;
  rejection_reason?: string;
  laboratory_name: string;
  type: 'delivery' | 'quote';
  estimated_price?: number;
}

interface DentistDeliveryHistoryProps {
  onClose: () => void;
}

export default function DentistDeliveryHistory({ onClose }: DentistDeliveryHistoryProps) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DeliveryRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useLockScroll(!!selectedRequest);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    if (!user) return;

    try {
      console.log('🔍 Loading requests for user:', user.id);

      // First get all dentist profiles linked to this dentist account
      const { data: dentistProfiles, error: dentistProfileError } = await supabase
        .from('dentists')
        .select('id, user_id')
        .eq('linked_dentist_account_id', user.id);

      console.log('👥 Dentist profiles found:', dentistProfiles);

      if (dentistProfileError) {
        console.error('❌ Error loading dentist profiles:', dentistProfileError);
        throw dentistProfileError;
      }

      if (!dentistProfiles || dentistProfiles.length === 0) {
        console.log('⚠️ No dentist profiles found for this account');
        setRequests([]);
        setLoading(false);
        return;
      }

      // Get dentist IDs to filter delivery notes
      const dentistIds = dentistProfiles.map(d => d.id);
      console.log('🎯 Dentist IDs to filter:', dentistIds);

      // Load ALL delivery notes for this dentist (both DENT- requests and approved BL-)
      const { data: deliveryData, error: deliveryError } = await supabase
        .from('delivery_notes')
        .select('*, dentists(name, user_id)')
        .in('dentist_id', dentistIds)
        .order('created_at', { ascending: false });

      console.log('📦 Delivery notes found:', deliveryData);

      if (deliveryError) {
        console.error('❌ Error loading delivery notes:', deliveryError);
        throw deliveryError;
      }

      // Load quote requests
      const { data: quoteData, error: quoteError } = await supabase
        .from('quote_requests')
        .select('*')
        .eq('dentist_account_id', user.id)
        .order('created_at', { ascending: false });

      console.log('💰 Quote requests found:', quoteData);

      if (quoteError) {
        console.error('❌ Error loading quote requests:', quoteError);
        throw quoteError;
      }

      // Get laboratory names from delivery notes
      const labIds = [
        ...new Set([
          ...(deliveryData || []).map((d: any) => d.dentists?.user_id).filter(Boolean),
          ...(quoteData || []).map((q: any) => q.laboratory_id)
        ])
      ];

      const { data: labData, error: labError } = await supabase
        .from('profiles')
        .select('id, laboratory_name')
        .in('id', labIds);

      if (labError) throw labError;

      const labMap = new Map(labData?.map(lab => [lab.id, lab.laboratory_name]) || []);

      // Format delivery notes
      const formattedDeliveries: DeliveryRequest[] = (deliveryData || []).map((item: any) => ({
        id: item.id,
        delivery_number: item.delivery_number,
        patient_name: item.patient_name || '',
        work_description: item.work_description || '',
        tooth_numbers: item.tooth_numbers || '',
        shade: item.shade || '',
        notes: item.notes || '',
        prescription_date: item.prescription_date || '',
        date: item.date,
        status: item.status,
        created_at: item.created_at,
        laboratory_name: labMap.get(item.dentists?.user_id) || 'Laboratoire inconnu',
        type: 'delivery' as const
      }));

      // Format quote requests
      const formattedQuotes: DeliveryRequest[] = (quoteData || []).map((item: any) => ({
        id: item.id,
        delivery_number: `DEVIS-${item.id.substring(0, 8)}`,
        patient_name: item.patient_name || '',
        work_description: item.work_description || '',
        tooth_numbers: item.tooth_numbers || '',
        shade: item.shade || '',
        notes: item.notes || '',
        prescription_date: item.prescription_date || '',
        date: item.requested_delivery_date || item.created_at,
        status: item.status,
        created_at: item.created_at,
        rejection_reason: item.rejection_reason,
        estimated_price: item.estimated_price,
        laboratory_name: labMap.get(item.laboratory_id) || 'Laboratoire inconnu',
        type: 'quote' as const
      }));

      // Combine and sort by creation date
      const combined = [...formattedDeliveries, ...formattedQuotes].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      console.log('✅ Total requests combined:', combined.length);
      console.log('📋 Combined requests:', combined);

      setRequests(combined);
    } catch (error) {
      console.error('❌ Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string, type: 'delivery' | 'quote') => {
    if (type === 'quote') {
      switch (status) {
        case 'pending':
          return {
            badge: (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                <Clock className="w-4 h-4" />
                En attente de devis
              </span>
            ),
            description: 'Votre demande de devis est en cours de traitement par le laboratoire'
          };
        case 'approved':
          return {
            badge: (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                Devis approuvé
              </span>
            ),
            description: 'Le laboratoire a approuvé votre demande et fourni un prix estimatif'
          };
        case 'rejected':
          return {
            badge: (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                <XCircle className="w-4 h-4" />
                Devis refusé
              </span>
            ),
            description: 'Le laboratoire ne peut pas réaliser ce travail'
          };
        case 'converted':
          return {
            badge: (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                <Package className="w-4 h-4" />
                Converti en commande
              </span>
            ),
            description: 'Le devis a été converti en commande de production'
          };
        default:
          return { badge: null, description: '' };
      }
    } else {
      switch (status) {
        case 'pending_approval':
          return {
            badge: (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                <Clock className="w-4 h-4" />
                En attente d'approbation
              </span>
            ),
            description: 'Votre demande est en cours d\'examen par le laboratoire'
          };
        case 'pending':
          return {
            badge: (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                Approuvé - En attente de fabrication
              </span>
            ),
            description: 'Votre demande a été approuvée et convertie en bon de livraison. Le travail va commencer prochainement.'
          };
        case 'in_progress':
          return {
            badge: (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full text-sm font-medium">
                <Package className="w-4 h-4" />
                En cours de fabrication
              </span>
            ),
            description: 'Le laboratoire travaille actuellement sur votre commande'
          };
        case 'completed':
          return {
            badge: (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                Terminé
              </span>
            ),
            description: 'Le travail est terminé et prêt pour la livraison'
          };
        default:
          return { badge: null, description: '' };
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch =
      request.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.delivery_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.work_description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pending' && (request.status === 'pending_approval' || request.status === 'pending')) ||
      (statusFilter === 'approved' && (request.status === 'approved' || request.status === 'in_progress' || request.status === 'completed')) ||
      (statusFilter === 'rejected' && request.status === 'rejected');

    return matchesSearch && matchesStatus;
  });

  const pendingCount = requests.filter(r => r.status === 'pending_approval' || r.status === 'pending').length;
  const approvedCount = requests.filter(r => ['approved', 'in_progress', 'completed', 'converted'].includes(r.status)).length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
      <div className="bg-white w-full h-full md:rounded-2xl md:shadow-2xl md:max-w-6xl md:h-[90vh] flex flex-col">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 px-4 md:px-6 py-4 md:py-5 flex items-center justify-between md:rounded-t-2xl shadow-lg">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg md:text-2xl font-bold text-white truncate">Historique des demandes</h2>
            <p className="text-blue-100 text-xs md:text-sm mt-1 hidden sm:block">Suivez l'état de vos demandes et commandes</p>
          </div>
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-white/20 rounded-lg transition disabled:opacity-50 backdrop-blur-sm touch-manipulation"
              title="Actualiser"
            >
              <RefreshCw className={`w-5 h-5 md:w-6 md:h-6 text-white ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition backdrop-blur-sm touch-manipulation"
            >
              <X className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6 border-b border-slate-200 bg-slate-50">
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 md:pl-10 pr-4 py-2.5 md:py-3 text-sm md:text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-1.5 md:gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 md:px-4 py-2 rounded-lg font-medium text-xs md:text-sm whitespace-nowrap transition touch-manipulation ${
                  statusFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                }`}
              >
                Toutes <span className="hidden sm:inline">({requests.length})</span>
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 md:px-4 py-2 rounded-lg font-medium text-xs md:text-sm whitespace-nowrap transition touch-manipulation ${
                  statusFilter === 'pending'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                }`}
              >
                En attente <span className="hidden sm:inline">({pendingCount})</span>
              </button>
              <button
                onClick={() => setStatusFilter('approved')}
                className={`px-3 md:px-4 py-2 rounded-lg font-medium text-xs md:text-sm whitespace-nowrap transition touch-manipulation ${
                  statusFilter === 'approved'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                }`}
              >
                Approuvées <span className="hidden sm:inline">({approvedCount})</span>
              </button>
              <button
                onClick={() => setStatusFilter('rejected')}
                className={`px-3 md:px-4 py-2 rounded-lg font-medium text-xs md:text-sm whitespace-nowrap transition touch-manipulation ${
                  statusFilter === 'rejected'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                }`}
              >
                Refusées <span className="hidden sm:inline">({rejectedCount})</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">
                {searchTerm || statusFilter !== 'all'
                  ? 'Aucune demande ne correspond à vos critères'
                  : 'Aucune demande envoyée pour le moment'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => {
                const statusInfo = getStatusInfo(request.status, request.type);
                return (
                  <div
                    key={request.id}
                    className="bg-white rounded-xl p-4 md:p-5 border-2 border-slate-200 hover:border-blue-300 active:border-blue-400 transition cursor-pointer shadow-sm hover:shadow-md touch-manipulation"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {request.type === 'quote' ? (
                            <FileQuestion className="w-4 h-4 md:w-5 md:h-5 text-cyan-600 flex-shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 md:w-5 md:h-5 text-blue-600 flex-shrink-0" />
                          )}
                          <h3 className="font-bold text-slate-900 text-base md:text-lg">
                            {request.delivery_number}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            request.delivery_number.startsWith('DENT-')
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {request.type === 'quote'
                              ? 'Devis'
                              : request.delivery_number.startsWith('DENT-')
                                ? 'Demande'
                                : 'Commande'
                            }
                          </span>
                        </div>
                        <p className="text-xs md:text-sm text-slate-600 mb-1">
                          Patient: <span className="font-semibold text-slate-900">{request.patient_name}</span>
                        </p>
                        <p className="text-xs md:text-sm text-slate-600 truncate">
                          Labo: <span className="font-medium">{request.laboratory_name}</span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="transform scale-90 md:scale-100 origin-top-right">
                          {statusInfo.badge}
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 hidden sm:block" />
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-2.5 md:p-3 mb-3">
                      <p className="text-xs md:text-sm text-slate-700 line-clamp-2">{request.work_description}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500">
                      <span>Demandé le {formatDate(request.created_at)}</span>
                      {request.estimated_price && (
                        <span className="font-semibold text-green-700">Prix: {request.estimated_price.toFixed(2)} €</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[60] p-0 md:p-4" onClick={() => setSelectedRequest(null)}>
          <div className="bg-white w-full h-full md:rounded-2xl md:shadow-2xl md:max-w-3xl md:w-full md:max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 px-4 md:px-6 py-4 md:py-5 flex items-center justify-between md:rounded-t-2xl shadow-lg z-10">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg md:text-2xl font-bold text-white truncate">{selectedRequest.delivery_number}</h2>
                <p className="text-blue-100 text-xs md:text-sm mt-1">Détails de la demande</p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-2 hover:bg-white/20 rounded-lg transition backdrop-blur-sm touch-manipulation flex-shrink-0"
              >
                <X className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </button>
            </div>

            <div className="p-4 md:p-6 space-y-4 md:space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 md:p-5 border border-blue-200">
                <div className="flex items-center gap-2.5 md:gap-3 mb-3">
                  {selectedRequest.type === 'quote' ? (
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileQuestion className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 text-base md:text-xl">
                      {selectedRequest.type === 'quote'
                        ? 'Demande de devis'
                        : selectedRequest.delivery_number.startsWith('DENT-')
                          ? 'Demande en attente d\'approbation'
                          : 'Commande approuvée'
                      }
                    </h3>
                    <p className="text-slate-600 text-xs md:text-sm">Statut de votre demande</p>
                  </div>
                </div>
                <div className="mt-4">
                  {getStatusInfo(selectedRequest.status, selectedRequest.type).badge}
                  <p className="text-sm text-slate-700 mt-2">
                    {getStatusInfo(selectedRequest.status, selectedRequest.type).description}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div className="bg-white rounded-lg p-3 md:p-4 border border-slate-200">
                  <label className="block text-xs md:text-sm font-semibold text-slate-700 mb-1.5 md:mb-2">Patient</label>
                  <p className="text-base md:text-lg font-bold text-slate-900">{selectedRequest.patient_name}</p>
                </div>

                <div className="bg-white rounded-lg p-3 md:p-4 border border-slate-200">
                  <label className="block text-xs md:text-sm font-semibold text-slate-700 mb-1.5 md:mb-2">Laboratoire</label>
                  <p className="text-base md:text-lg font-medium text-slate-900 break-words">{selectedRequest.laboratory_name}</p>
                </div>

                {selectedRequest.prescription_date && (
                  <div className="bg-white rounded-lg p-3 md:p-4 border border-slate-200">
                    <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                      <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600" />
                      <label className="block text-xs md:text-sm font-semibold text-slate-700">Date de prescription</label>
                    </div>
                    <p className="text-sm md:text-base text-slate-900">
                      {new Date(selectedRequest.prescription_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}

                <div className="bg-white rounded-lg p-3 md:p-4 border border-slate-200">
                  <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                    <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-cyan-600" />
                    <label className="block text-xs md:text-sm font-semibold text-slate-700">Date de demande</label>
                  </div>
                  <p className="text-sm md:text-base text-slate-900">{formatDate(selectedRequest.created_at)}</p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-3 md:p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600" />
                  <label className="block text-xs md:text-sm font-semibold text-slate-700">Description du travail</label>
                </div>
                <p className="text-sm md:text-base text-slate-900 whitespace-pre-wrap break-words">{selectedRequest.work_description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {selectedRequest.tooth_numbers && (
                  <div className="bg-white rounded-lg p-3 md:p-4 border border-slate-200">
                    <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                      <Stethoscope className="w-3.5 h-3.5 md:w-4 md:h-4 text-cyan-600" />
                      <label className="block text-xs md:text-sm font-semibold text-slate-700">Numéros de dents</label>
                    </div>
                    <p className="text-sm md:text-base text-slate-900 font-medium">{selectedRequest.tooth_numbers}</p>
                  </div>
                )}

                {selectedRequest.shade && (
                  <div className="bg-white rounded-lg p-3 md:p-4 border border-slate-200">
                    <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                      <Palette className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-600" />
                      <label className="block text-xs md:text-sm font-semibold text-slate-700">Teinte</label>
                    </div>
                    <p className="text-sm md:text-base text-slate-900 font-medium">{selectedRequest.shade}</p>
                  </div>
                )}
              </div>

              {selectedRequest.notes && (
                <div className="bg-slate-50 rounded-lg p-3 md:p-4 border border-slate-200">
                  <label className="block text-xs md:text-sm font-semibold text-slate-700 mb-2">Vos notes</label>
                  <p className="text-sm md:text-base text-slate-900 whitespace-pre-wrap break-words">{selectedRequest.notes}</p>
                </div>
              )}

              {selectedRequest.estimated_price && (
                <div className="bg-green-50 rounded-lg p-4 md:p-5 border border-green-200">
                  <label className="block text-xs md:text-sm font-semibold text-green-800 mb-2">Prix estimatif</label>
                  <p className="text-2xl md:text-3xl font-bold text-green-700">{selectedRequest.estimated_price.toFixed(2)} €</p>
                </div>
              )}

              {selectedRequest.rejection_reason && (
                <div className="bg-red-50 rounded-lg p-3 md:p-4 border border-red-200">
                  <label className="block text-xs md:text-sm font-semibold text-red-800 mb-2">Raison du refus</label>
                  <p className="text-sm md:text-base text-red-900 break-words">{selectedRequest.rejection_reason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
