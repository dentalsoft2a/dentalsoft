import { useState, useEffect } from 'react';
import { Bell, BellOff, AlertTriangle, Clock, AlertCircle, X, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLockScroll } from '../../hooks/useLockScroll';

interface ProductionAlert {
  id: string;
  delivery_note_id: string | null;
  alert_type: string;
  priority: string;
  message: string;
  is_read: boolean;
  created_at: string;
  delivery_note?: {
    delivery_number: string;
    dentist: {
      name: string;
    };
  };
}

export default function ProductionAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<ProductionAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useLockScroll(showPanel);

  useEffect(() => {
    if (user) {
      loadAlerts();

      // Rafraîchir les alertes toutes les 30 secondes
      const interval = setInterval(loadAlerts, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadAlerts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('production_alerts')
        .select(`
          *,
          delivery_note:delivery_notes(
            delivery_number,
            dentist:dentists(name)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setAlerts(data || []);
      setUnreadCount((data || []).filter(a => !a.is_read).length);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('production_alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) throw error;

      await loadAlerts();
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('production_alerts')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      await loadAlerts();
    } catch (error) {
      console.error('Error marking all alerts as read:', error);
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('production_alerts')
        .delete()
        .eq('id', alertId);

      if (error) throw error;

      await loadAlerts();
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'deadline_approaching':
        return <Clock className="w-5 h-5 text-amber-500" />;
      case 'overdue':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'quality_issue':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'resource_conflict':
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <Bell className="w-5 h-5 text-slate-500" />;
    }
  };

  const getAlertColor = (priority: string) => {
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

  const getAlertTypeLabel = (alertType: string) => {
    switch (alertType) {
      case 'deadline_approaching':
        return 'Échéance proche';
      case 'overdue':
        return 'En retard';
      case 'quality_issue':
        return 'Problème qualité';
      case 'resource_conflict':
        return 'Conflit ressource';
      default:
        return 'Alerte';
    }
  };

  return (
    <>
      {/* Bouton de notification */}
      <button
        onClick={() => setShowPanel(true)}
        className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
      >
        {unreadCount > 0 ? (
          <Bell className="w-5 h-5 animate-pulse text-red-500" />
        ) : (
          <BellOff className="w-5 h-5" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panneau des alertes */}
      {showPanel && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center sm:justify-end z-50 backdrop-blur-sm">
          <div className="bg-white w-full sm:w-96 sm:h-full sm:max-h-[600px] rounded-t-2xl sm:rounded-l-2xl sm:rounded-r-none shadow-2xl flex flex-col animate-slide-up sm:animate-slide-left">
            {/* En-tête */}
            <div className="bg-gradient-to-r from-primary-600 to-cyan-600 px-6 py-4 flex items-center justify-between rounded-t-2xl sm:rounded-tl-2xl sm:rounded-tr-none">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-white" />
                <h2 className="text-lg font-bold text-white">Alertes de production</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-white/20 text-white text-xs font-bold rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowPanel(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Actions */}
            {unreadCount > 0 && (
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Tout marquer comme lu
                </button>
              </div>
            )}

            {/* Liste des alertes */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-12">
                  <BellOff className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium mb-1">Aucune alerte</p>
                  <p className="text-sm text-slate-500">Vous êtes à jour!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border-l-4 ${getAlertColor(alert.priority)} ${
                        !alert.is_read ? 'shadow-md' : 'opacity-60'
                      } transition-all duration-200`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getAlertIcon(alert.alert_type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                {getAlertTypeLabel(alert.alert_type)}
                              </span>
                              {!alert.is_read && (
                                <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full inline-block"></span>
                              )}
                            </div>
                            <button
                              onClick={() => deleteAlert(alert.id)}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <p className="text-sm text-slate-900 mb-2">{alert.message}</p>

                          {alert.delivery_note && (
                            <div className="text-xs text-slate-600 bg-white/60 rounded px-2 py-1 inline-block">
                              <span className="font-medium">
                                {alert.delivery_note.delivery_number}
                              </span>
                              {' - '}
                              <span>{alert.delivery_note.dentist.name}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200">
                            <span className="text-xs text-slate-500">
                              {new Date(alert.created_at).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>

                            {!alert.is_read && (
                              <button
                                onClick={() => markAsRead(alert.id)}
                                className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                Marquer lu
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
