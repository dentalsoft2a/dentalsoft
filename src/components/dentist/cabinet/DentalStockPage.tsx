import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useLowStockAlert } from '../../../hooks/useLowStockAlert';

interface Resource {
  id: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  stock_quantity: number;
  low_stock_threshold: number;
  cost_per_unit: number;
  has_batch_tracking: boolean;
  has_expiry_date: boolean;
  is_active: boolean;
}

export default function DentalStockPage() {
  const { user } = useAuth();
  const { refresh: refreshLowStockAlert } = useLowStockAlert();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState({
    resourceId: '',
    quantity: 0,
    type: 'in' as 'in' | 'out',
    notes: '',
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    unit: '',
    stock_quantity: 0,
    low_stock_threshold: 10,
    cost_per_unit: 0,
    has_batch_tracking: false,
    has_expiry_date: false,
  });

  useEffect(() => {
    if (user) {
      loadResources();
    }
  }, [user]);

  const loadResources = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('dental_resources')
        .select('*')
        .eq('dentist_id', user.id)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setResources(data || []);
      refreshLowStockAlert();
    } catch (error) {
      console.error('Error loading resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(new Set(resources.map(r => r.category)));

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory;
    const matchesLowStock = !showLowStockOnly || resource.stock_quantity <= resource.low_stock_threshold;
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const lowStockCount = resources.filter(r => r.stock_quantity <= r.low_stock_threshold).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingResource) {
        const { error } = await supabase
          .from('dental_resources')
          .update(formData)
          .eq('id', editingResource.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('dental_resources')
          .insert({
            ...formData,
            dentist_id: user.id,
          });

        if (error) throw error;
      }

      setShowModal(false);
      setEditingResource(null);
      resetForm();
      await loadResources();
      setTimeout(() => refreshLowStockAlert(), 100);
    } catch (error) {
      console.error('Error saving resource:', error);
      alert('Erreur lors de l\'enregistrement');
    }
  };

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const resource = resources.find(r => r.id === stockAdjustment.resourceId);
      if (!resource) return;

      const newQuantity = stockAdjustment.type === 'in'
        ? resource.stock_quantity + stockAdjustment.quantity
        : resource.stock_quantity - stockAdjustment.quantity;

      // Update stock
      const { error: updateError } = await supabase
        .from('dental_resources')
        .update({ stock_quantity: newQuantity })
        .eq('id', stockAdjustment.resourceId);

      if (updateError) throw updateError;

      // Record movement
      const { error: movementError } = await supabase
        .from('dental_stock_movements')
        .insert({
          dentist_id: user.id,
          resource_id: stockAdjustment.resourceId,
          movement_type: stockAdjustment.type === 'in' ? 'in' : 'out',
          quantity: stockAdjustment.quantity,
          notes: stockAdjustment.notes,
        });

      if (movementError) throw movementError;

      setShowStockModal(false);
      setStockAdjustment({ resourceId: '', quantity: 0, type: 'in', notes: '' });
      await loadResources();
      setTimeout(() => refreshLowStockAlert(), 100);
    } catch (error) {
      console.error('Error adjusting stock:', error);
      alert('Erreur lors de l\'ajustement du stock');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      unit: '',
      stock_quantity: 0,
      low_stock_threshold: 10,
      cost_per_unit: 0,
      has_batch_tracking: false,
      has_expiry_date: false,
    });
  };

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource);
    setFormData({
      name: resource.name,
      description: resource.description,
      category: resource.category,
      unit: resource.unit,
      stock_quantity: resource.stock_quantity,
      low_stock_threshold: resource.low_stock_threshold,
      cost_per_unit: resource.cost_per_unit,
      has_batch_tracking: resource.has_batch_tracking,
      has_expiry_date: resource.has_expiry_date,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette fourniture ?')) return;

    try {
      const { error } = await supabase
        .from('dental_resources')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      await loadResources();
      setTimeout(() => refreshLowStockAlert(), 100);
    } catch (error) {
      console.error('Error deleting resource:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const openStockAdjustment = (resourceId: string, type: 'in' | 'out') => {
    setStockAdjustment({ resourceId, quantity: 0, type, notes: '' });
    setShowStockModal(true);
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Stock de Fournitures</h1>
            <p className="text-slate-600 mt-1">{resources.length} fournitures</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setEditingResource(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition"
          >
            <Plus className="w-5 h-5" />
            Nouvelle Fourniture
          </button>
        </div>

        {lowStockCount > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-orange-900">
                {lowStockCount} fourniture{lowStockCount > 1 ? 's' : ''} en stock bas
              </p>
              <p className="text-sm text-orange-700">
                Pensez à réapprovisionner vos stocks
              </p>
            </div>
            <button
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className="px-3 py-1 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 transition"
            >
              {showLowStockOnly ? 'Voir tout' : 'Afficher'}
            </button>
          </div>
        )}
      </div>

      <div className="mb-6 flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher une fourniture..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
        >
          <option value="all">Toutes catégories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">Chargement...</div>
      ) : (
        <div className="grid gap-4">
          {filteredResources.map(resource => {
            const isLowStock = resource.stock_quantity <= resource.low_stock_threshold;
            const stockPercentage = (resource.stock_quantity / (resource.low_stock_threshold * 2)) * 100;

            return (
              <div key={resource.id} className={`bg-white border-2 rounded-lg p-4 hover:shadow-lg transition ${isLowStock ? 'border-orange-300' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isLowStock ? 'bg-gradient-to-br from-orange-500 to-red-500' : 'bg-gradient-to-br from-green-500 to-teal-500'}`}>
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 text-lg">{resource.name}</h3>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                          {resource.category}
                        </span>
                        {isLowStock && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded font-semibold">
                            Stock bas
                          </span>
                        )}
                      </div>
                      {resource.description && (
                        <p className="text-sm text-slate-600 mb-2">{resource.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm mb-2">
                        <span className="text-slate-600">
                          Stock: <span className={`font-bold ${isLowStock ? 'text-orange-600' : 'text-green-600'}`}>{resource.stock_quantity} {resource.unit}</span>
                        </span>
                        <span className="text-slate-500">
                          Seuil: {resource.low_stock_threshold} {resource.unit}
                        </span>
                        {resource.cost_per_unit > 0 && (
                          <span className="text-slate-500">
                            Coût: {resource.cost_per_unit.toFixed(2)}€/{resource.unit}
                          </span>
                        )}
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${isLowStock ? 'bg-orange-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openStockAdjustment(resource.id, 'in')}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                      title="Entrée de stock"
                    >
                      <TrendingUp className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => openStockAdjustment(resource.id, 'out')}
                      className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition"
                      title="Sortie de stock"
                    >
                      <TrendingDown className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleEdit(resource)}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(resource.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredResources.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              Aucune fourniture trouvée
            </div>
          )}
        </div>
      )}

      {/* Modal création/édition fourniture */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4">
              <h2 className="text-xl font-bold text-slate-900">
                {editingResource ? 'Modifier la Fourniture' : 'Nouvelle Fourniture'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie *</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unité *</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Ex: boîte, sachet..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stock actuel</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Seuil d'alerte</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.low_stock_threshold}
                    onChange={(e) => setFormData({ ...formData, low_stock_threshold: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Coût unitaire (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost_per_unit}
                    onChange={(e) => setFormData({ ...formData, cost_per_unit: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingResource(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700"
                >
                  {editingResource ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal ajustement stock */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white">
                {stockAdjustment.type === 'in' ? 'Entrée de Stock' : 'Sortie de Stock'}
              </h2>
            </div>

            <form onSubmit={handleStockAdjustment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantité *</label>
                <input
                  type="number"
                  step="0.01"
                  value={stockAdjustment.quantity}
                  onChange={(e) => setStockAdjustment({ ...stockAdjustment, quantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                  min="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={stockAdjustment.notes}
                  onChange={(e) => setStockAdjustment({ ...stockAdjustment, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  rows={2}
                  placeholder="Raison de l'ajustement..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white rounded-lg ${
                    stockAdjustment.type === 'in'
                      ? 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700'
                      : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'
                  }`}
                >
                  Valider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
