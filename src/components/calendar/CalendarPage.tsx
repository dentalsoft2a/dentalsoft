import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Package, User, Clock, MapPin, X, FileText, Palette, AlertTriangle, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';

type DeliveryNote = Database['public']['Tables']['delivery_notes']['Row'];
type Dentist = Database['public']['Tables']['dentists']['Row'];

interface DeliveryItem {
  description: string;
  quantity: number;
  unit_price?: number;
  unit?: string;
  shade?: string;
  tooth_number?: string;
  catalog_item?: {
    name: string;
  };
}

interface DeliveryWithDentist extends DeliveryNote {
  dentist: Dentist;
  patient_name?: string;
  status?: string;
  items: DeliveryItem[];
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [deliveries, setDeliveries] = useState<DeliveryWithDentist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryWithDentist | null>(null);

  useEffect(() => {
    if (user) {
      loadDeliveries();
    }
  }, [user, currentDate]);

  const loadDeliveries = async () => {
    if (!user) return;

    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('delivery_notes')
        .select(`
          *,
          dentist:dentists(*)
        `)
        .eq('user_id', user.id)
        .gte('date', startOfMonth.toISOString().split('T')[0])
        .lte('date', endOfMonth.toISOString().split('T')[0])
        .order('date');

      if (error) throw error;

      // Load catalog items for each delivery note
      const deliveriesWithItems = await Promise.all(
        (data || []).map(async (delivery) => {
          const { data: itemsData } = await supabase
            .from('proforma_items')
            .select(`
              quantity,
              catalog_item:catalog_items(name)
            `)
            .eq('delivery_note_id', delivery.id);

          return {
            ...delivery,
            items: itemsData?.map(item => ({
              ...item,
              description: item.catalog_item?.name || '',
            })) || delivery.items || []
          };
        })
      );

      setDeliveries(deliveriesWithItems as DeliveryWithDentist[] || []);
    } catch (error) {
      console.error('Error loading deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < (startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1); i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getDeliveriesForDate = (date: Date | null) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return deliveries.filter(d => d.date === dateStr);
  };

  const getStatusCounts = (date: Date | null) => {
    const dayDeliveries = getDeliveriesForDate(date);
    return {
      pending: dayDeliveries.filter(d => d.status === 'pending').length,
      in_progress: dayDeliveries.filter(d => d.status === 'in_progress').length,
      completed: dayDeliveries.filter(d => d.status === 'completed').length,
    };
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date | null) => {
    if (!date || !selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const getUrgentDeliveries = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    const urgent = deliveries.filter(delivery => {
      if (delivery.status === 'completed') return false;

      const deliveryDate = new Date(delivery.date);
      deliveryDate.setHours(0, 0, 0, 0);

      console.log('Checking delivery:', {
        date: delivery.date,
        deliveryDate: deliveryDate.toISOString(),
        now: now.toISOString(),
        twoDaysFromNow: twoDaysFromNow.toISOString(),
        isInRange: deliveryDate >= now && deliveryDate <= twoDaysFromNow,
        status: delivery.status
      });

      return deliveryDate >= now && deliveryDate <= twoDaysFromNow;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log('Urgent deliveries found:', urgent.length);
    return urgent;
  };

  const getDaysUntilDelivery = (dateStr: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const deliveryDate = new Date(dateStr);
    deliveryDate.setHours(0, 0, 0, 0);
    const diffTime = deliveryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const selectedDeliveries = selectedDate ? getDeliveriesForDate(selectedDate) : [];
  const urgentDeliveries = getUrgentDeliveries();

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <CalendarIcon className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-slate-900">Calendrier des Livraisons</h1>
        </div>
        <p className="text-slate-600">Gérez et suivez vos livraisons prévues</p>
      </div>

      {urgentDeliveries.length > 0 && (
        <div className="mb-6 bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-400 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wide">Livraisons urgentes (48h)</h3>
              <p className="text-sm text-slate-600">{urgentDeliveries.length} livraison{urgentDeliveries.length > 1 ? 's' : ''} à traiter rapidement</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {urgentDeliveries.map((delivery) => {
              const daysUntil = getDaysUntilDelivery(delivery.date);

              return (
                <button
                  key={delivery.id}
                  onClick={() => setSelectedDelivery(delivery)}
                  className="inline-flex items-center gap-3 px-4 py-3 bg-white border-2 border-slate-300 rounded-xl hover:bg-slate-50 hover:border-slate-400 hover:shadow-md transition-all duration-200 text-left"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-md">
                    {delivery.dentist.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-slate-900 truncate max-w-[180px]">{delivery.dentist.name}</p>
                    <p className="text-sm text-slate-600 font-medium">N° {delivery.delivery_number}</p>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg text-sm font-bold flex-shrink-0 shadow-md ${
                    daysUntil === 0
                      ? 'bg-red-500 text-white animate-pulse'
                      : daysUntil === 1
                      ? 'bg-orange-500 text-white'
                      : 'bg-amber-500 text-white'
                  }`}>
                    {daysUntil === 0 ? "Aujourd'hui" : daysUntil === 1 ? 'Demain' : `Dans ${daysUntil}j`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-primary-600 to-cyan-600 px-4 py-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={previousMonth}
                  className="p-1.5 text-white hover:bg-white/20 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h2 className="text-base font-bold text-white">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <button
                  onClick={nextMonth}
                  className="p-1.5 text-white hover:bg-white/20 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-3">
              <div className="grid grid-cols-7 gap-1 mb-1.5">
                {dayNames.map((day) => (
                  <div
                    key={day}
                    className="text-center text-[10px] font-bold text-slate-600 uppercase tracking-wider py-0.5"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {loading ? (
                <div className="text-center py-8 text-slate-600">
                  <div className="animate-pulse text-sm">Chargement...</div>
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {getDaysInMonth().map((date, index) => {
                    const dayDeliveries = getDeliveriesForDate(date);
                    const hasDeliveries = dayDeliveries.length > 0;
                    const statusCounts = getStatusCounts(date);

                    return (
                      <button
                        key={index}
                        onClick={() => date && setSelectedDate(date)}
                        disabled={!date}
                        className={`
                          aspect-square p-1 rounded-lg transition-all duration-200 relative flex flex-col items-center justify-center min-h-[50px]
                          ${!date ? 'invisible' : ''}
                          ${isToday(date) ? 'ring-2 ring-primary-500' : ''}
                          ${isSelected(date) ? 'bg-primary-600 text-white shadow-md' : ''}
                          ${!isSelected(date) && date ? 'hover:bg-slate-100' : ''}
                          ${!isSelected(date) && hasDeliveries ? 'bg-slate-50' : ''}
                        `}
                      >
                        {date && (
                          <>
                            <span className={`
                              text-xs font-bold mb-0.5
                              ${isSelected(date) ? 'text-white' : 'text-slate-900'}
                            `}>
                              {date.getDate()}
                            </span>
                            {hasDeliveries && (
                              <div className="flex gap-1 flex-wrap justify-center">
                                {statusCounts.pending > 0 && (
                                  <div className={`w-3 h-3 rounded-full ${
                                    isSelected(date) ? 'bg-amber-200' : 'bg-amber-500'
                                  }`} />
                                )}
                                {statusCounts.in_progress > 0 && (
                                  <div className={`w-3 h-3 rounded-full ${
                                    isSelected(date) ? 'bg-blue-200' : 'bg-blue-500'
                                  } animate-pulse`} />
                                )}
                                {statusCounts.completed > 0 && (
                                  <div className={`w-3 h-3 rounded-full ${
                                    isSelected(date) ? 'bg-emerald-200' : 'bg-emerald-500'
                                  }`} />
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden sticky top-6">
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-4 py-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {selectedDate
                  ? `${selectedDate.getDate()} ${monthNames[selectedDate.getMonth()]}`
                  : 'Sélectionnez une date'}
              </h3>
            </div>

            <div className="p-4">
              {!selectedDate ? (
                <div className="text-center py-8">
                  <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">
                    Cliquez sur une date
                  </p>
                </div>
              ) : selectedDeliveries.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">
                    Aucune livraison
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {selectedDeliveries.map((delivery) => {
                    const items = Array.isArray(delivery.items) ? delivery.items : [];
                    const itemCount = items.length;

                    return (
                      <button
                        key={delivery.id}
                        onClick={() => setSelectedDelivery(delivery)}
                        className="w-full bg-slate-50 rounded-lg p-3 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-all duration-200 text-left"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-cyan-500 rounded flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {delivery.dentist.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-slate-900 truncate">
                              {delivery.dentist.name}
                            </h4>
                            <p className="text-xs text-slate-500">
                              N° {delivery.delivery_number}
                            </p>
                          </div>
                        </div>

                        {delivery.patient_name && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate">{delivery.patient_name}</span>
                          </div>
                        )}

                        {itemCount > 0 && (
                          <div className="text-xs text-slate-600 mb-1.5 space-y-0.5">
                            {items.map((item: any, index: number) => (
                              <div key={index} className="flex items-center gap-1.5">
                                <Package className="w-3.5 h-3.5 text-slate-400" />
                                <span className="truncate">
                                  {item.catalog_item?.name || 'Article'} x {item.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {delivery.status && (
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200">
                            <span className={`
                              inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium
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
                              {delivery.status === 'completed' && 'Terminé'}
                              {delivery.status === 'in_progress' && 'En cours'}
                              {delivery.status === 'pending' && 'En attente'}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Légende des statuts</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
            <div>
              <p className="text-sm font-semibold text-slate-900">En attente</p>
              <p className="text-xs text-slate-500">Travail non commencé</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <div>
              <p className="text-sm font-semibold text-slate-900">En cours</p>
              <p className="text-xs text-slate-500">Travail en progression</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Terminé</p>
              <p className="text-xs text-slate-500">Travail complété</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl p-6 border border-amber-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-600 font-medium">En attente</p>
              <p className="text-2xl font-bold text-slate-900">
                {deliveries.filter(d => d.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-6 border border-blue-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-600 font-medium">En cours</p>
              <p className="text-2xl font-bold text-slate-900">
                {deliveries.filter(d => d.status === 'in_progress').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl p-6 border border-emerald-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-600 font-medium">Terminés</p>
              <p className="text-2xl font-bold text-slate-900">
                {deliveries.filter(d => d.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {selectedDelivery && (
        <DeliveryDetailModal
          delivery={selectedDelivery}
          onClose={() => {
            setSelectedDelivery(null);
            loadDeliveries();
          }}
        />
      )}
    </div>
  );
}

interface DeliveryDetailModalProps {
  delivery: DeliveryWithDentist;
  onClose: () => void;
}

function DeliveryDetailModal({ delivery, onClose }: DeliveryDetailModalProps) {
  const { user } = useAuth();
  const items = Array.isArray(delivery.items) ? delivery.items : [];
  const [converting, setConverting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(delivery.status || 'pending');

  const handleConvertToProforma = async () => {
    if (!user) return;

    if (!confirm('Voulez-vous créer une proforma à partir de ce bon de livraison ?')) {
      return;
    }

    setConverting(true);
    try {
      const { data: existingProformas, error: countError } = await supabase
        .from('proformas')
        .select('proforma_number')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (countError) throw countError;

      let nextNumber = 1;
      if (existingProformas && existingProformas.length > 0) {
        const lastNumber = existingProformas[0].proforma_number;
        const match = lastNumber.match(/\d+$/);
        if (match) {
          nextNumber = parseInt(match[0]) + 1;
        }
      }

      const proformaNumber = `PRO-${new Date().getFullYear()}-${String(nextNumber).padStart(4, '0')}`;

      let subtotal = 0;
      items.forEach(item => {
        if (item.unit_price) {
          subtotal += item.quantity * item.unit_price;
        }
      });

      const taxRate = 20;
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;

      const { data: proforma, error: proformaError } = await supabase
        .from('proformas')
        .insert({
          user_id: user.id,
          dentist_id: delivery.dentist_id,
          proforma_number: proformaNumber,
          date: new Date().toISOString().split('T')[0],
          status: 'pending',
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total,
        })
        .select()
        .single();

      if (proformaError) throw proformaError;

      const proformaItems = items.map(item => ({
        proforma_id: proforma.id,
        delivery_note_id: delivery.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price || 0,
        total: (item.unit_price || 0) * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('proforma_items')
        .insert(proformaItems);

      if (itemsError) throw itemsError;

      const { error: updateError } = await supabase
        .from('delivery_notes')
        .update({ proforma_id: proforma.id })
        .eq('id', delivery.id);

      if (updateError) throw updateError;

      alert('Proforma créée avec succès !');
      onClose();
    } catch (error) {
      console.error('Error converting to proforma:', error);
      alert('Erreur lors de la création de la proforma');
    } finally {
      setConverting(false);
    }
  };

  const handleCancelDelivery = async () => {
    if (!user) return;

    if (!confirm('Êtes-vous sûr de vouloir annuler ce bon de livraison ? Cette action est irréversible.')) {
      return;
    }

    setCancelling(true);
    try {
      const { error } = await supabase
        .from('delivery_notes')
        .delete()
        .eq('id', delivery.id);

      if (error) throw error;

      alert('Bon de livraison annulé avec succès');
      onClose();
    } catch (error) {
      console.error('Error cancelling delivery:', error);
      alert('Erreur lors de l\'annulation du bon de livraison');
    } finally {
      setCancelling(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!user) return;

    const statusLabels: { [key: string]: string } = {
      'pending': 'En attente',
      'in_progress': 'En cours',
      'completed': 'Terminé'
    };

    if (!confirm(`Voulez-vous marquer cette livraison comme "${statusLabels[newStatus]}" ?`)) {
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('delivery_notes')
        .update({ status: newStatus })
        .eq('id', delivery.id);

      if (error) throw error;

      setCurrentStatus(newStatus);
      alert('Statut mis à jour avec succès !');

      if (newStatus === 'completed') {
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erreur lors de la mise à jour du statut');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden animate-fade-in">
        <div className="bg-gradient-to-r from-primary-600 to-cyan-600 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white font-bold text-lg">
              {delivery.dentist.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Bon de livraison N° {delivery.delivery_number}
              </h2>
              <p className="text-primary-100 text-sm">
                {new Date(delivery.date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-4 border border-slate-200">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Informations dentiste
              </h3>
              <div className="space-y-2">
                <p className="font-bold text-slate-900">{delivery.dentist.name}</p>
                {delivery.dentist.email && (
                  <p className="text-sm text-slate-600 flex items-center gap-2">
                    <span className="text-slate-400">Email:</span>
                    {delivery.dentist.email}
                  </p>
                )}
                {delivery.dentist.phone && (
                  <p className="text-sm text-slate-600 flex items-center gap-2">
                    <span className="text-slate-400">Tél:</span>
                    {delivery.dentist.phone}
                  </p>
                )}
                {delivery.dentist.address && (
                  <p className="text-sm text-slate-600 flex items-start gap-2">
                    <span className="text-slate-400 flex-shrink-0">Adresse:</span>
                    <span>{delivery.dentist.address}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-4 border border-slate-200">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Informations patient
              </h3>
              <div className="space-y-2">
                {delivery.patient_name ? (
                  <p className="font-bold text-slate-900">{delivery.patient_name}</p>
                ) : (
                  <p className="text-slate-500 italic">Aucun patient spécifié</p>
                )}
                {delivery.prescription_date && (
                  <p className="text-sm text-slate-600 flex items-center gap-2">
                    <span className="text-slate-400">Date prescription:</span>
                    {new Date(delivery.prescription_date).toLocaleDateString('fr-FR')}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-slate-400 text-sm">Statut:</span>
                  <span className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                    ${currentStatus === 'completed' ? 'bg-emerald-100 text-emerald-700' : ''}
                    ${currentStatus === 'in_progress' ? 'bg-blue-100 text-blue-700' : ''}
                    ${currentStatus === 'pending' ? 'bg-amber-100 text-amber-700' : ''}
                  `}>
                    <div className={`w-2 h-2 rounded-full ${
                      currentStatus === 'completed' ? 'bg-emerald-500' : ''
                    } ${
                      currentStatus === 'in_progress' ? 'bg-blue-500 animate-pulse' : ''
                    } ${
                      currentStatus === 'pending' ? 'bg-amber-500' : ''
                    }`} />
                    {currentStatus === 'completed' && 'Terminé'}
                    {currentStatus === 'in_progress' && 'En cours'}
                    {currentStatus === 'pending' && 'En attente'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-6 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Articles à livrer ({items.length})
            </h3>

            {items.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Aucun article dans ce bon de livraison</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg p-4 border border-slate-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-cyan-100 rounded-lg flex items-center justify-center text-primary-700 font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 mb-2">{item.description}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-slate-500 text-xs uppercase tracking-wide">Quantité</span>
                            <p className="font-semibold text-slate-900">{item.quantity} {item.unit || 'pièce(s)'}</p>
                          </div>
                          {item.shade && (
                            <div>
                              <span className="text-slate-500 text-xs uppercase tracking-wide flex items-center gap-1">
                                <Palette className="w-3 h-3" />
                                Teinte
                              </span>
                              <p className="font-semibold text-slate-900">{item.shade}</p>
                            </div>
                          )}
                          {item.tooth_number && (
                            <div>
                              <span className="text-slate-500 text-xs uppercase tracking-wide">Dent N°</span>
                              <p className="font-semibold text-slate-900">{item.tooth_number}</p>
                            </div>
                          )}
                          {item.unit_price && (
                            <div>
                              <span className="text-slate-500 text-xs uppercase tracking-wide">Prix unitaire</span>
                              <p className="font-semibold text-slate-900">{item.unit_price.toFixed(2)} €</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {delivery.compliance_text && (
            <div className="mt-6 bg-gradient-to-br from-blue-50 to-white rounded-xl p-4 border border-blue-200">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
                Notes de conformité
              </h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{delivery.compliance_text}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Actions</h3>
          </div>

          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-3">
              {currentStatus === 'pending' && (
                <button
                  onClick={() => handleUpdateStatus('in_progress')}
                  disabled={updating}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  {updating ? 'Mise à jour...' : 'Démarrer le travail'}
                </button>
              )}

              {currentStatus === 'in_progress' && (
                <button
                  onClick={() => handleUpdateStatus('completed')}
                  disabled={updating}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  {updating ? 'Mise à jour...' : 'Marquer comme terminé'}
                </button>
              )}

              {currentStatus === 'completed' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200">
                  <Package className="w-4 h-4" />
                  <span className="font-medium text-sm">Travail terminé ✓</span>
                </div>
              )}

              {delivery.proforma_id ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl border border-slate-200">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">Lié à une proforma</span>
                </div>
              ) : items.length > 0 && items.some(item => item.unit_price) && (
                <button
                  onClick={handleConvertToProforma}
                  disabled={converting}
                  className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  {converting ? 'Conversion...' : 'Convertir en proforma'}
                </button>
              )}

              <button
                onClick={handleCancelDelivery}
                disabled={cancelling || delivery.proforma_id !== null}
                className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title={delivery.proforma_id ? "Impossible d'annuler un bon lié à une proforma" : "Annuler ce bon de livraison"}
              >
                <Trash2 className="w-4 h-4" />
                {cancelling ? 'Annulation...' : 'Annuler'}
              </button>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gradient-to-r from-primary-600 to-cyan-600 text-white rounded-xl hover:from-primary-700 hover:to-cyan-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
