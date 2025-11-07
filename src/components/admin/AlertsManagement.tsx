import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertCircle, Plus, Edit2, Trash2, Check, X, Info, AlertTriangle } from 'lucide-react';

interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export default function AlertsManagement() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info' as Alert['type'],
    is_active: false,
    start_date: new Date().toISOString().slice(0, 16),
    end_date: '',
  });

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      console.error('Error loading alerts:', error);
      alert('Erreur lors du chargement des alertes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const alertData = {
        title: formData.title,
        message: formData.message,
        type: formData.type,
        is_active: formData.is_active,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
      };

      if (editingAlert) {
        const { error } = await supabase
          .from('alerts')
          .update(alertData)
          .eq('id', editingAlert.id);

        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('alerts')
          .insert([{ ...alertData, created_by: user?.id }]);

        if (error) throw error;
      }

      setShowForm(false);
      setEditingAlert(null);
      setFormData({
        title: '',
        message: '',
        type: 'info',
        is_active: false,
        start_date: new Date().toISOString().slice(0, 16),
        end_date: '',
      });
      loadAlerts();
    } catch (error: any) {
      console.error('Error saving alert:', error);
      alert('Erreur lors de la sauvegarde de l\'alerte');
    }
  };

  const handleEdit = (alert: Alert) => {
    setEditingAlert(alert);
    setFormData({
      title: alert.title,
      message: alert.message,
      type: alert.type,
      is_active: alert.is_active,
      start_date: alert.start_date.slice(0, 16),
      end_date: alert.end_date ? alert.end_date.slice(0, 16) : '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette alerte ?')) return;

    try {
      const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadAlerts();
    } catch (error: any) {
      console.error('Error deleting alert:', error);
      alert('Erreur lors de la suppression de l\'alerte');
    }
  };

  const toggleActive = async (alert: Alert) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ is_active: !alert.is_active })
        .eq('id', alert.id);

      if (error) throw error;
      loadAlerts();
    } catch (error: any) {
      console.error('Error toggling alert:', error);
      alert('Erreur lors de la modification de l\'alerte');
    }
  };

  const getTypeIcon = (type: Alert['type']) => {
    switch (type) {
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'success':
        return <Check className="w-5 h-5 text-green-500" />;
    }
  };

  const getTypeBadgeClass = (type: Alert['type']) => {
    switch (type) {
      case 'info':
        return 'bg-blue-100 text-blue-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'success':
        return 'bg-green-100 text-green-800';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des Alertes</h2>
          <p className="text-gray-600 mt-1">Créez et gérez les alertes affichées sur le dashboard</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingAlert(null);
            setFormData({
              title: '',
              message: '',
              type: 'info',
              is_active: false,
              start_date: new Date().toISOString().slice(0, 16),
              end_date: '',
            });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Nouvelle Alerte
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingAlert ? 'Modifier l\'Alerte' : 'Nouvelle Alerte'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titre
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Alert['type'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="info">Information</option>
                  <option value="warning">Avertissement</option>
                  <option value="error">Erreur</option>
                  <option value="success">Succès</option>
                </select>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de début
                </label>
                <input
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de fin (optionnelle)
                </label>
                <input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingAlert(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingAlert ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Aucune alerte créée</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-white rounded-lg shadow-md p-6 border-l-4"
              style={{
                borderLeftColor:
                  alert.type === 'info'
                    ? '#3b82f6'
                    : alert.type === 'warning'
                    ? '#eab308'
                    : alert.type === 'error'
                    ? '#ef4444'
                    : '#10b981',
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  {getTypeIcon(alert.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{alert.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getTypeBadgeClass(alert.type)}`}>
                        {alert.type}
                      </span>
                      {alert.is_active && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-3">{alert.message}</p>
                    <div className="flex gap-4 text-sm text-gray-500">
                      <span>Début: {new Date(alert.start_date).toLocaleString('fr-FR')}</span>
                      {alert.end_date && (
                        <span>Fin: {new Date(alert.end_date).toLocaleString('fr-FR')}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(alert)}
                    className={`p-2 rounded-lg ${
                      alert.is_active
                        ? 'bg-green-100 text-green-600 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={alert.is_active ? 'Désactiver' : 'Activer'}
                  >
                    {alert.is_active ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => handleEdit(alert)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
