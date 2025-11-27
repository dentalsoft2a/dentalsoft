import { useEffect, useState } from 'react';
import { Search, Package, Clock, CheckCircle, XCircle, Eye, Calendar, User, Building2, AlertCircle, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import { usePagination } from '../../hooks/usePagination';
import PaginationControls from '../common/PaginationControls';

interface DeliveryNote {
  id: string;
  delivery_number: string;
  patient_name: string;
  status: string;
  created_at: string;
  prescription_date: string | null;
  tooth_numbers: string[] | null;
  shade: string | null;
  notes: string | null;
  laboratory?: {
    laboratory_name: string;
    laboratory_email: string;
  };
}

export default function DentistOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<DeliveryNote | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('delivery_notes')
        .select(`
          id,
          delivery_number,
          patient_name,
          status,
          created_at,
          prescription_date,
          tooth_numbers,
          shade,
          notes,
          user_id
        `)
        .eq('dentist_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ordersWithLab = await Promise.all(
        (data || []).map(async (order) => {
          const { data: labData } = await supabase
            .from('profiles')
            .select('laboratory_name, laboratory_email')
            .eq('id', order.user_id)
            .maybeSingle();

          return {
            ...order,
            laboratory: labData || undefined,
          };
        })
      );

      setOrders(ordersWithLab);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'delivered':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'refused':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return AlertCircle;
      case 'in_progress':
        return Clock;
      case 'completed':
        return CheckCircle;
      case 'delivered':
        return Package;
      case 'refused':
        return XCircle;
      default:
        return Clock;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'in_progress':
        return 'En cours';
      case 'completed':
        return 'Terminé';
      case 'delivered':
        return 'Livré';
      case 'refused':
        return 'Refusé';
      default:
        return status;
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.delivery_number.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      order.patient_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      order.laboratory?.laboratory_name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pagination = usePagination(filteredOrders, { initialPageSize: 15 });
  const paginatedOrders = pagination.paginatedItems;

  return (
    <div>
      <div className="mb-6 md:mb-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Mes Commandes</h1>
            <p className="text-slate-600 mt-1 md:mt-2 text-sm md:text-base">Suivez vos commandes et livraisons</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:gap-4 mb-4 md:mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par BL, patient ou laboratoire..."
            className="w-full pl-9 md:pl-10 pr-4 py-2 text-sm md:text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 px-3 md:px-4 py-2 text-sm md:text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="in_progress">En cours</option>
            <option value="completed">Terminé</option>
            <option value="delivered">Livré</option>
            <option value="refused">Refusé</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-600 bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="animate-pulse">Chargement...</div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 text-center bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-sm border border-slate-200">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 text-lg">
            {searchTerm || statusFilter !== 'all' ? 'Aucune commande trouvée' : 'Aucune commande pour le moment'}
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <p className="text-slate-500 text-sm mt-2">
              Vos commandes apparaîtront ici
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {paginatedOrders.map((order) => {
              const StatusIcon = getStatusIcon(order.status);
              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl shadow-md border border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all duration-300 overflow-hidden group cursor-pointer"
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0">
                            <Package className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-bold text-lg text-slate-900">BL {order.delivery_number}</h3>
                              <span className={`px-2 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1 ${getStatusColor(order.status)}`}>
                                <StatusIcon className="w-3 h-3" />
                                {getStatusLabel(order.status)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <User className="w-4 h-4" />
                              <span className="font-medium">{order.patient_name}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {order.laboratory && (
                            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-2">
                              <Building2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                              <span className="truncate">{order.laboratory.laboratory_name}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-2">
                            <Calendar className="w-4 h-4 text-purple-500 flex-shrink-0" />
                            <span>
                              {new Date(order.created_at).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          </div>

                          {order.tooth_numbers && order.tooth_numbers.length > 0 && (
                            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-2">
                              <span className="font-medium">Dents:</span>
                              <span>{order.tooth_numbers.join(', ')}</span>
                            </div>
                          )}

                          {order.shade && (
                            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-2">
                              <span className="font-medium">Teinte:</span>
                              <span>{order.shade}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                        }}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Voir détails</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredOrders.length > 0 && (
            <PaginationControls
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              startIndex={pagination.startIndex}
              endIndex={pagination.endIndex}
              hasNextPage={pagination.hasNextPage}
              hasPrevPage={pagination.hasPrevPage}
              onNextPage={pagination.nextPage}
              onPrevPage={pagination.prevPage}
              onGoToPage={pagination.goToPage}
              onPageSizeChange={pagination.setPageSize}
              pageSizeOptions={[15, 30, 50]}
            />
          )}
        </>
      )}

      {selectedOrder && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Détails de la commande</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-white/20 rounded-lg transition"
              >
                <XCircle className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-900">BL {selectedOrder.delivery_number}</h3>
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${getStatusColor(selectedOrder.status)}`}>
                    {getStatusLabel(selectedOrder.status)}
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  Créé le {new Date(selectedOrder.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              {selectedOrder.laboratory && (
                <div>
                  <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-500" />
                    Laboratoire
                  </h3>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="font-semibold text-slate-900">{selectedOrder.laboratory.laboratory_name}</p>
                    <p className="text-sm text-slate-600 mt-1">{selectedOrder.laboratory.laboratory_email}</p>
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-500" />
                  Patient
                </h3>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="font-semibold text-slate-900">{selectedOrder.patient_name}</p>
                </div>
              </div>

              {selectedOrder.tooth_numbers && selectedOrder.tooth_numbers.length > 0 && (
                <div>
                  <h3 className="font-bold text-slate-900 mb-3">Dents concernées</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedOrder.tooth_numbers.map((tooth) => (
                      <span key={tooth} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold">
                        {tooth}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedOrder.shade && (
                <div>
                  <h3 className="font-bold text-slate-900 mb-3">Teinte</h3>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="font-semibold text-slate-900">{selectedOrder.shade}</p>
                  </div>
                </div>
              )}

              {selectedOrder.notes && (
                <div>
                  <h3 className="font-bold text-slate-900 mb-3">Notes</h3>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-slate-700">{selectedOrder.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
