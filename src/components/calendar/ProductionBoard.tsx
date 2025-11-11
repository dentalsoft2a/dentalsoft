import { useState, useEffect } from 'react';
import { Clock, User, AlertTriangle, Calendar as CalendarIcon, Package, CheckCircle, Play, ChevronRight, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';

type DeliveryNote = Database['public']['Tables']['delivery_notes']['Row'];
type Dentist = Database['public']['Tables']['dentists']['Row'];
type Employee = {
  id: string;
  full_name: string;
  email: string;
};

interface DeliveryWithDetails extends DeliveryNote {
  dentist: Dentist;
  assigned_employee?: Employee;
  patient_name?: string;
  items: any[];
}

interface ProductionBoardProps {
  onDeliveryClick: (delivery: DeliveryWithDetails) => void;
  selectedDate?: Date | null;
}

export default function ProductionBoard({ onDeliveryClick, selectedDate }: ProductionBoardProps) {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<DeliveryWithDetails[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [filterEmployee, setFilterEmployee] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, selectedDate]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Charger les employés
      const { data: employeesData } = await supabase
        .from('laboratory_employees')
        .select('id, full_name, email')
        .eq('laboratory_profile_id', user.id)
        .eq('is_active', true);

      setEmployees(employeesData || []);

      // Charger les livraisons
      let query = supabase
        .from('delivery_notes')
        .select(`
          *,
          dentist:dentists(*),
          assigned_employee:laboratory_employees(id, full_name, email)
        `)
        .eq('user_id', user.id)
        .order('priority', { ascending: false })
        .order('date', { ascending: true });

      // Filtrer par date si sélectionnée
      if (selectedDate) {
        const dateStr = selectedDate.toISOString().split('T')[0];
        query = query.eq('date', dateStr);
      } else {
        // Sinon, montrer les livraisons des 30 prochains jours
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + 30);

        query = query
          .gte('date', today.toISOString().split('T')[0])
          .lte('date', futureDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Enrichir avec les items
      const deliveriesWithItems = await Promise.all(
        (data || []).map(async (delivery) => {
          const items = Array.isArray(delivery.items) ? delivery.items : [];
          const enrichedItems = await Promise.all(
            items.map(async (item: any) => {
              if (item.catalog_item_id) {
                const { data: catalogItem } = await supabase
                  .from('catalog_items')
                  .select('name')
                  .eq('id', item.catalog_item_id)
                  .maybeSingle();

                return { ...item, catalog_item: catalogItem };
              }
              return item;
            })
          );

          return { ...delivery, items: enrichedItems };
        })
      );

      setDeliveries(deliveriesWithItems as DeliveryWithDetails[]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-red-500 bg-red-50';
      case 'high':
        return 'border-orange-500 bg-orange-50';
      case 'normal':
        return 'border-blue-500 bg-blue-50';
      case 'low':
        return 'border-slate-400 bg-slate-50';
      default:
        return 'border-slate-300 bg-white';
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded uppercase">Urgent</span>;
      case 'high':
        return <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded uppercase">Élevé</span>;
      case 'normal':
        return <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded uppercase">Normal</span>;
      case 'low':
        return <span className="px-2 py-0.5 bg-slate-400 text-white text-xs font-bold rounded uppercase">Faible</span>;
      default:
        return null;
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'in_progress':
        return <Play className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'in_progress':
        return 'En cours';
      case 'completed':
        return 'Terminé';
      default:
        return 'Inconnu';
    }
  };

  const getDaysUntil = (dateStr: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const deliveryDate = new Date(dateStr);
    deliveryDate.setHours(0, 0, 0, 0);
    const diffTime = deliveryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filterDeliveries = (status: string) => {
    let filtered = deliveries.filter(d => d.status === status);

    if (filterPriority) {
      filtered = filtered.filter(d => d.priority === filterPriority);
    }

    if (filterEmployee) {
      filtered = filtered.filter(d => d.assigned_employee_id === filterEmployee);
    }

    return filtered;
  };

  const pendingDeliveries = filterDeliveries('pending');
  const inProgressDeliveries = filterDeliveries('in_progress');
  const completedDeliveries = filterDeliveries('completed');

  const renderDeliveryCard = (delivery: DeliveryWithDetails) => {
    const daysUntil = getDaysUntil(delivery.date);
    const isUrgent = daysUntil <= 2 && delivery.status !== 'completed';

    return (
      <button
        key={delivery.id}
        onClick={() => onDeliveryClick(delivery)}
        className={`w-full p-3 rounded-lg border-l-4 ${getPriorityColor(delivery.priority)} shadow-sm hover:shadow-md transition-all duration-200 text-left mb-2`}
      >
        {/* En-tête */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-cyan-500 rounded flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {delivery.dentist.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-slate-900 truncate">{delivery.dentist.name}</p>
              <p className="text-xs text-slate-500">N° {delivery.delivery_number}</p>
            </div>
          </div>
          {delivery.priority && getPriorityBadge(delivery.priority)}
        </div>

        {/* Patient */}
        {delivery.patient_name && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-2">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate">{delivery.patient_name}</span>
          </div>
        )}

        {/* Items */}
        {delivery.items.length > 0 && (
          <div className="mb-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              <span>{delivery.items.length} article{delivery.items.length > 1 ? 's' : ''}</span>
            </div>
          </div>
        )}

        {/* Employé assigné */}
        {delivery.assigned_employee && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-2 bg-white/60 rounded px-2 py-1">
            <User className="w-3.5 h-3.5 text-primary-500" />
            <span className="truncate font-medium">{delivery.assigned_employee.full_name}</span>
          </div>
        )}

        {/* Progression */}
        {delivery.progress_percentage !== null && delivery.progress_percentage > 0 && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
              <span>Progression</span>
              <span className="font-bold">{delivery.progress_percentage}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-primary-500 to-cyan-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${delivery.progress_percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Pied de carte */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
            <span>{new Date(delivery.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
          </div>

          {isUrgent && delivery.status !== 'completed' && (
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
              daysUntil === 0 ? 'bg-red-500 text-white animate-pulse' :
              daysUntil === 1 ? 'bg-orange-500 text-white' :
              'bg-amber-500 text-white'
            }`}>
              <AlertTriangle className="w-3 h-3" />
              <span>{daysUntil === 0 ? "Aujourd'hui" : daysUntil === 1 ? 'Demain' : `${daysUntil}j`}</span>
            </div>
          )}
        </div>
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-slate-600">Chargement du tableau de production...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Barre de filtres */}
      <div className="mb-4 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-primary-600 transition-colors"
        >
          <Filter className="w-4 h-4" />
          <span>Filtres</span>
          <ChevronRight className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-90' : ''}`} />
        </button>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Filtre par priorité */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">Priorité</label>
              <select
                value={filterPriority || ''}
                onChange={(e) => setFilterPriority(e.target.value || null)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Toutes les priorités</option>
                <option value="urgent">Urgent</option>
                <option value="high">Élevé</option>
                <option value="normal">Normal</option>
                <option value="low">Faible</option>
              </select>
            </div>

            {/* Filtre par employé */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">Employé</label>
              <select
                value={filterEmployee || ''}
                onChange={(e) => setFilterEmployee(e.target.value || null)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Tous les employés</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl p-4 border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-600 font-medium mb-1">En attente</p>
              <p className="text-2xl font-bold text-slate-900">{pendingDeliveries.length}</p>
            </div>
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-600 font-medium mb-1">En cours</p>
              <p className="text-2xl font-bold text-slate-900">{inProgressDeliveries.length}</p>
            </div>
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Play className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl p-4 border border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-600 font-medium mb-1">Terminés</p>
              <p className="text-2xl font-bold text-slate-900">{completedDeliveries.length}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Tableau Kanban */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Colonne En attente */}
        <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl border-2 border-amber-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-slate-900">En attente</h3>
            <span className="ml-auto bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {pendingDeliveries.length}
            </span>
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {pendingDeliveries.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-amber-200 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Aucune livraison en attente</p>
              </div>
            ) : (
              pendingDeliveries.map(renderDeliveryCard)
            )}
          </div>
        </div>

        {/* Colonne En cours */}
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl border-2 border-blue-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Play className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900">En cours</h3>
            <span className="ml-auto bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {inProgressDeliveries.length}
            </span>
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {inProgressDeliveries.length === 0 ? (
              <div className="text-center py-8">
                <Play className="w-12 h-12 text-blue-200 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Aucune livraison en cours</p>
              </div>
            ) : (
              inProgressDeliveries.map(renderDeliveryCard)
            )}
          </div>
        </div>

        {/* Colonne Terminé */}
        <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl border-2 border-emerald-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900">Terminés</h3>
            <span className="ml-auto bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {completedDeliveries.length}
            </span>
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {completedDeliveries.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-emerald-200 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Aucune livraison terminée</p>
              </div>
            ) : (
              completedDeliveries.map(renderDeliveryCard)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
