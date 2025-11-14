import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Package, Plus, Edit2, Trash2, Check, X, Save, DollarSign, Users, Calendar } from 'lucide-react';

interface Extension {
  id: string;
  name: string;
  description: string;
  monthly_price: number;
  is_active: boolean;
  icon: string;
  sort_order: number;
}

interface ExtensionFeature {
  id: string;
  extension_id: string;
  feature_key: string;
  feature_name: string;
  description: string | null;
}

interface UserExtension {
  id: string;
  user_id: string;
  extension_id: string;
  status: string;
  start_date: string;
  expiry_date: string | null;
  auto_renew: boolean;
  user_profiles?: {
    email: string;
  };
  extensions?: {
    name: string;
  };
}

const AVAILABLE_FEATURES = [
  { key: 'work_management', name: 'Gestion des Travaux', description: 'Module de gestion des travaux avec Kanban' },
  { key: 'stl_scan', name: 'Scan STL', description: 'Téléchargement et visualisation de fichiers STL' },
  { key: 'employee_management', name: 'Gestion des Employés', description: 'Module de gestion des employés' },
  { key: 'batch_management', name: 'Gestion des Lots', description: 'Système de gestion des lots de matériaux' },
  { key: 'resource_management', name: 'Gestion des Ressources', description: 'Gestion avancée des ressources et matériaux' }
];

const ICON_OPTIONS = [
  'package', 'kanban-square', 'scan', 'users', 'package-2', 'boxes', 'briefcase', 'folder', 'settings'
];

export default function ExtensionsManagement() {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [features, setFeatures] = useState<ExtensionFeature[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<UserExtension[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'extensions' | 'subscriptions' | 'stats'>('extensions');
  const [editingExtension, setEditingExtension] = useState<Extension | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [extensionsRes, featuresRes, subscriptionsRes] = await Promise.all([
        supabase.from('extensions').select('*').order('sort_order'),
        supabase.from('extension_features').select('*'),
        supabase.from('user_extensions').select(`
          *,
          extensions(name)
        `).order('created_at', { ascending: false })
      ]);

      if (extensionsRes.error) throw extensionsRes.error;
      if (featuresRes.error) throw featuresRes.error;
      if (subscriptionsRes.error) throw subscriptionsRes.error;

      const subscriptionsWithEmails = await Promise.all(
        (subscriptionsRes.data || []).map(async (sub) => {
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('email')
            .eq('id', sub.user_id)
            .maybeSingle();

          return {
            ...sub,
            user_profiles: userProfile
          };
        })
      );

      setExtensions(extensionsRes.data || []);
      setFeatures(featuresRes.data || []);
      setUserSubscriptions(subscriptionsWithEmails);
    } catch (error) {
      console.error('Error loading extensions data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveExtension = async () => {
    if (!editingExtension) return;

    try {
      const { id, ...extensionData } = editingExtension;

      if (isCreatingNew) {
        const { data: newExtension, error: extensionError } = await supabase
          .from('extensions')
          .insert([extensionData])
          .select()
          .single();

        if (extensionError) throw extensionError;

        for (const featureKey of selectedFeatures) {
          const feature = AVAILABLE_FEATURES.find(f => f.key === featureKey);
          if (feature) {
            const { error: featureError } = await supabase
              .from('extension_features')
              .insert([{
                extension_id: newExtension.id,
                feature_key: feature.key,
                feature_name: feature.name,
                description: feature.description
              }]);

            if (featureError) throw featureError;
          }
        }
      } else {
        const { error: updateError } = await supabase
          .from('extensions')
          .update(extensionData)
          .eq('id', id);

        if (updateError) throw updateError;

        await supabase
          .from('extension_features')
          .delete()
          .eq('extension_id', id);

        for (const featureKey of selectedFeatures) {
          const feature = AVAILABLE_FEATURES.find(f => f.key === featureKey);
          if (feature) {
            const { error: featureError } = await supabase
              .from('extension_features')
              .insert([{
                extension_id: id,
                feature_key: feature.key,
                feature_name: feature.name,
                description: feature.description
              }]);

            if (featureError) throw featureError;
          }
        }
      }

      setEditingExtension(null);
      setIsCreatingNew(false);
      setSelectedFeatures([]);
      loadData();
    } catch (error) {
      console.error('Error saving extension:', error);
      alert('Erreur lors de la sauvegarde de l\'extension');
    }
  };

  const handleDeleteExtension = async (extensionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette extension?')) return;

    try {
      const { error } = await supabase
        .from('extensions')
        .delete()
        .eq('id', extensionId);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting extension:', error);
      alert('Erreur lors de la suppression de l\'extension');
    }
  };

  const handleCreateNew = () => {
    setEditingExtension({
      id: '',
      name: '',
      description: '',
      monthly_price: 9.99,
      is_active: true,
      icon: 'package',
      sort_order: extensions.length + 1
    });
    setSelectedFeatures([]);
    setIsCreatingNew(true);
  };

  const handleEditExtension = (extension: Extension) => {
    setEditingExtension(extension);
    const extensionFeatures = features.filter(f => f.extension_id === extension.id);
    setSelectedFeatures(extensionFeatures.map(f => f.feature_key));
    setIsCreatingNew(false);
  };

  const toggleFeature = (featureKey: string) => {
    setSelectedFeatures(prev =>
      prev.includes(featureKey)
        ? prev.filter(k => k !== featureKey)
        : [...prev, featureKey]
    );
  };

  const handleToggleUserExtension = async (userExtension: UserExtension) => {
    try {
      const newStatus = userExtension.status === 'active' ? 'cancelled' : 'active';
      const { error } = await supabase
        .from('user_extensions')
        .update({
          status: newStatus,
          cancelled_at: newStatus === 'cancelled' ? new Date().toISOString() : null
        })
        .eq('id', userExtension.id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error toggling user extension:', error);
      alert('Erreur lors de la modification du statut');
    }
  };

  const getExtensionStats = () => {
    const activeSubscriptions = userSubscriptions.filter(s => s.status === 'active').length;
    const totalRevenue = userSubscriptions
      .filter(s => s.status === 'active')
      .reduce((sum, sub) => {
        const ext = extensions.find(e => e.id === sub.extension_id);
        return sum + (ext?.monthly_price || 0);
      }, 0);

    return { activeSubscriptions, totalRevenue };
  };

  const stats = getExtensionStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des Extensions</h2>
          <p className="text-sm text-gray-600 mt-1">Gérez les extensions payantes et leurs abonnements</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Extension
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex gap-8 px-6">
            <button
              onClick={() => setActiveTab('extensions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'extensions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Extensions
              </div>
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'subscriptions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Abonnements
              </div>
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stats'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Statistiques
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'extensions' && (
            <div className="space-y-4">
              {extensions.map(extension => (
                <div key={extension.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">{extension.name}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          extension.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {extension.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{extension.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="font-semibold text-blue-600">{extension.monthly_price.toFixed(2)} €/mois</span>
                        <span>Ordre: {extension.sort_order}</span>
                        <span>Icône: {extension.icon}</span>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs font-medium text-gray-700">Fonctionnalités:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {features
                            .filter(f => f.extension_id === extension.id)
                            .map(feature => (
                              <span key={feature.id} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                                {feature.feature_name}
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditExtension(extension)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteExtension(extension.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'subscriptions' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Utilisateur</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Extension</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Statut</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date début</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date expiration</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Auto-renouvellement</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {userSubscriptions.map(subscription => (
                    <tr key={subscription.id} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {subscription.user_profiles?.email || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {subscription.extensions?.name || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          subscription.status === 'active' ? 'bg-green-100 text-green-800' :
                          subscription.status === 'expired' ? 'bg-red-100 text-red-800' :
                          subscription.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {subscription.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(subscription.start_date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {subscription.expiry_date
                          ? new Date(subscription.expiry_date).toLocaleDateString('fr-FR')
                          : 'Indéfini'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {subscription.auto_renew ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-red-600" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleToggleUserExtension(subscription)}
                          className={`px-3 py-1 text-xs rounded ${
                            subscription.status === 'active'
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {subscription.status === 'active' ? 'Désactiver' : 'Activer'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-600 rounded-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Abonnements actifs</p>
                    <p className="text-2xl font-bold text-blue-900">{stats.activeSubscriptions}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-600 rounded-lg">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-green-600 font-medium">Revenu mensuel</p>
                    <p className="text-2xl font-bold text-green-900">{stats.totalRevenue.toFixed(2)} €</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-600 rounded-lg">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-600 font-medium">Extensions disponibles</p>
                    <p className="text-2xl font-bold text-purple-900">{extensions.filter(e => e.is_active).length}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {editingExtension && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {isCreatingNew ? 'Créer une extension' : 'Modifier l\'extension'}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'extension
                </label>
                <input
                  type="text"
                  value={editingExtension.name}
                  onChange={(e) => setEditingExtension({ ...editingExtension, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Gestion des Travaux"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editingExtension.description}
                  onChange={(e) => setEditingExtension({ ...editingExtension, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Description détaillée de l'extension"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prix mensuel (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingExtension.monthly_price}
                    onChange={(e) => setEditingExtension({ ...editingExtension, monthly_price: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ordre d'affichage
                  </label>
                  <input
                    type="number"
                    value={editingExtension.sort_order}
                    onChange={(e) => setEditingExtension({ ...editingExtension, sort_order: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icône
                </label>
                <select
                  value={editingExtension.icon}
                  onChange={(e) => setEditingExtension({ ...editingExtension, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {ICON_OPTIONS.map(icon => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editingExtension.is_active}
                  onChange={(e) => setEditingExtension({ ...editingExtension, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Extension active
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fonctionnalités incluses
                </label>
                <div className="space-y-2">
                  {AVAILABLE_FEATURES.map(feature => (
                    <div key={feature.key} className="flex items-start">
                      <input
                        type="checkbox"
                        id={feature.key}
                        checked={selectedFeatures.includes(feature.key)}
                        onChange={() => toggleFeature(feature.key)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-1"
                      />
                      <label htmlFor={feature.key} className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{feature.name}</div>
                        <div className="text-xs text-gray-500">{feature.description}</div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditingExtension(null);
                  setIsCreatingNew(false);
                  setSelectedFeatures([]);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveExtension}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
