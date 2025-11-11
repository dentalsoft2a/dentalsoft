import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Package, User, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface DeliveryNote {
  id: string;
  delivery_number: string;
  date: string;
  status: string;
  priority?: string;
  patient_name?: string;
  dentist: {
    name: string;
  };
  items: any[];
}

interface WeekViewProps {
  onDeliveryClick: (delivery: any) => void;
}

export default function WeekView({ onDeliveryClick }: WeekViewProps) {
  const { user } = useAuth();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  const [deliveries, setDeliveries] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDeliveries();
    }
  }, [user, currentWeekStart]);

  const loadDeliveries = async () => {
    if (!user) return;

    try {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(currentWeekStart.getDate() + 6);

      const { data, error } = await supabase
        .from('delivery_notes')
        .select(`
          *,
          dentist:dentists(*)
        `)
        .eq('user_id', user.id)
        .gte('date', currentWeekStart.toISOString().split('T')[0])
        .lte('date', weekEnd.toISOString().split('T')[0])
        .order('date');

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

      setDeliveries(deliveriesWithItems as DeliveryNote[]);
    } catch (error) {
      console.error('Error loading deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const previousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentWeekStart);
      day.setDate(currentWeekStart.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getDeliveriesForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return deliveries.filter(d => d.date === dateStr);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50';
      case 'high':
        return 'border-l-orange-500 bg-orange-50';
      case 'normal':
        return 'border-l-blue-500 bg-blue-50';
      case 'low':
        return 'border-l-slate-400 bg-slate-50';
      default:
        return 'border-l-slate-300 bg-white';
    }
  };

  const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const weekDays = getWeekDays();

  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(currentWeekStart.getDate() + 6);

  return (
    <div>
      {/* En-tête */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 mb-6 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={previousWeek}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <h2 className="text-lg font-bold text-slate-900">
              {currentWeekStart.getDate()} {monthNames[currentWeekStart.getMonth()]} - {weekEnd.getDate()} {monthNames[weekEnd.getMonth()]} {weekEnd.getFullYear()}
            </h2>
            <p className="text-sm text-slate-600">Semaine {Math.ceil((currentWeekStart.getDate() + 6 - currentWeekStart.getDay()) / 7)}</p>
          </div>

          <button
            onClick={nextWeek}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-slate-600">Chargement...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-3">
          {weekDays.map((day, index) => {
            const dayDeliveries = getDeliveriesForDate(day);
            const today = isToday(day);

            return (
              <div
                key={index}
                className={`bg-white rounded-xl border-2 ${
                  today ? 'border-primary-500 shadow-lg' : 'border-slate-200'
                } overflow-hidden`}
              >
                {/* En-tête du jour */}
                <div className={`p-3 ${today ? 'bg-gradient-to-r from-primary-600 to-cyan-600' : 'bg-slate-100'}`}>
                  <p className={`text-xs font-bold uppercase tracking-wide ${today ? 'text-white' : 'text-slate-600'}`}>
                    {dayNames[index]}
                  </p>
                  <p className={`text-2xl font-bold ${today ? 'text-white' : 'text-slate-900'}`}>
                    {day.getDate()}
                  </p>
                </div>

                {/* Livraisons du jour */}
                <div className="p-2 space-y-2 min-h-[200px] max-h-[600px] overflow-y-auto">
                  {dayDeliveries.length === 0 ? (
                    <div className="text-center py-6">
                      <Package className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">Aucune livraison</p>
                    </div>
                  ) : (
                    dayDeliveries.map((delivery) => (
                      <button
                        key={delivery.id}
                        onClick={() => onDeliveryClick(delivery)}
                        className={`w-full p-2 rounded-lg border-l-4 ${getPriorityColor(delivery.priority)} shadow-sm hover:shadow-md transition-all duration-200 text-left`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 bg-gradient-to-br from-primary-500 to-cyan-500 rounded flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {delivery.dentist.name.charAt(0).toUpperCase()}
                          </div>
                          <p className="font-bold text-xs text-slate-900 truncate flex-1">
                            {delivery.dentist.name}
                          </p>
                        </div>

                        {delivery.patient_name && (
                          <div className="flex items-center gap-1 text-xs text-slate-600 mb-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span className="truncate">{delivery.patient_name}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs">
                          <span className={`
                            inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium
                            ${delivery.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : ''}
                            ${delivery.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : ''}
                            ${delivery.status === 'pending' ? 'bg-amber-100 text-amber-700' : ''}
                          `}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              delivery.status === 'completed' ? 'bg-emerald-500' : ''
                            } ${
                              delivery.status === 'in_progress' ? 'bg-blue-500 animate-pulse' : ''
                            } ${
                              delivery.status === 'pending' ? 'bg-amber-500' : ''
                            }`} />
                            {delivery.status === 'completed' && 'OK'}
                            {delivery.status === 'in_progress' && 'WIP'}
                            {delivery.status === 'pending' && 'TODO'}
                          </span>

                          {delivery.items.length > 0 && (
                            <span className="text-slate-500 flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              {delivery.items.length}
                            </span>
                          )}
                        </div>
                      </button>
                    ))
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
