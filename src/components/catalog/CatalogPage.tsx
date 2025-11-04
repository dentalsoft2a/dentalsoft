import { useEffect, useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Search, Save, X, Package, Tag, DollarSign, CheckCircle2, XCircle, Filter, Archive, AlertTriangle, HelpCircle, BookOpen } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';

type CatalogItem = Database['public']['Tables']['catalog_items']['Row'];

export default function CatalogPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [itemResources, setItemResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    default_unit: 'unité',
    default_price: 0,
    category: '',
    is_active: true,
    track_stock: false,
    stock_quantity: 0,
    low_stock_threshold: 10,
    stock_unit: 'unité',
  });

  useEffect(() => {
    loadItems();
    loadResources();
  }, [user]);

  const loadItems = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('catalog_items')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading catalog items:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadResources = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error('Error loading resources:', error);
    }
  };

  const loadItemResources = async (itemId: string) => {
    try {
      const { data, error } = await supabase
        .from('catalog_item_resources')
        .select('*, resources(*)')
        .eq('catalog_item_id', itemId);

      if (error) throw error;
      setItemResources(data || []);
    } catch (error) {
      console.error('Error loading item resources:', error);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set<string>();
    items.forEach(item => {
      if (item.category) {
        cats.add(item.category);
      }
    });
    return Array.from(cats).sort();
  }, [items]);

  const lowStockItems = useMemo(() => {
    return items.filter(item =>
      item.track_stock &&
      item.stock_quantity <= item.low_stock_threshold &&
      item.is_active
    );
  }, [items]);

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'all' ||
      (selectedCategory === 'uncategorized' && !item.category) ||
      item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleOpenModal = async (item?: CatalogItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        description: item.description || '',
        default_unit: item.default_unit || 'unité',
        default_price: Number(item.default_price),
        category: item.category || '',
        is_active: item.is_active,
        track_stock: item.track_stock || false,
        stock_quantity: item.stock_quantity || 0,
        low_stock_threshold: item.low_stock_threshold || 10,
        stock_unit: item.stock_unit || 'unité',
      });
      await loadItemResources(item.id);
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        description: '',
        default_unit: 'unité',
        default_price: 0,
        category: '',
        is_active: true,
        track_stock: false,
        stock_quantity: 0,
        low_stock_threshold: 10,
        stock_unit: 'unité',
      });
      setItemResources([]);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setItemResources([]);
  };

  const handleAddResource = async (resourceId: string, quantityNeeded: number) => {
    if (!editingItem) return;

    try {
      const { error } = await supabase
        .from('catalog_item_resources')
        .insert({
          catalog_item_id: editingItem.id,
          resource_id: resourceId,
          quantity_needed: quantityNeeded,
        });

      if (error) throw error;
      await loadItemResources(editingItem.id);

      // Disable track_stock when resources are added
      if (formData.track_stock) {
        setFormData({ ...formData, track_stock: false });
      }
    } catch (error: any) {
      console.error('Error adding resource:', error);
      if (error.code === '23505') {
        alert('Cette ressource est déjà assignée à cet article');
      } else {
        alert('Erreur lors de l\'ajout de la ressource');
      }
    }
  };

  const handleUpdateResource = async (id: string, quantityNeeded: number) => {
    try {
      const { error } = await supabase
        .from('catalog_item_resources')
        .update({ quantity_needed: quantityNeeded })
        .eq('id', id);

      if (error) throw error;
      if (editingItem) {
        await loadItemResources(editingItem.id);
      }
    } catch (error) {
      console.error('Error updating resource:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const handleRemoveResource = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir retirer cette ressource ?')) return;

    try {
      const { error } = await supabase
        .from('catalog_item_resources')
        .delete()
        .eq('id', id);

      if (error) throw error;
      if (editingItem) {
        await loadItemResources(editingItem.id);
      }
    } catch (error) {
      console.error('Error removing resource:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('catalog_items')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('catalog_items').insert({
          ...formData,
          user_id: user.id,
        });

        if (error) throw error;
      }

      await loadItems();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving catalog item:', error);
      alert('Erreur lors de l\'enregistrement');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;

    try {
      const { error } = await supabase.from('catalog_items').delete().eq('id', id);
      if (error) throw error;
      await loadItems();
    } catch (error) {
      console.error('Error deleting catalog item:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleToggleActive = async (item: CatalogItem) => {
    try {
      const { error } = await supabase
        .from('catalog_items')
        .update({ is_active: !item.is_active })
        .eq('id', item.id);

      if (error) throw error;
      await loadItems();
    } catch (error) {
      console.error('Error updating catalog item:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Catalogue</h1>
          <p className="text-slate-600 mt-2">Gérez vos articles et prestations</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTutorial(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
          >
            <HelpCircle className="w-5 h-5" />
            Guide
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-cyan-600 text-white shadow-lg hover:shadow-xl rounded-lg hover:from-primary-700 hover:to-cyan-700 transition"
          >
            <Plus className="w-5 h-5" />
            Nouvel article
          </button>
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <div className="mb-6 bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 rounded-lg p-5 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-orange-900 mb-2 flex items-center gap-2">
                Alerte stock faible
                <span className="px-3 py-1 bg-orange-500 text-white text-sm font-bold rounded-full shadow">
                  {lowStockItems.length}
                </span>
              </h3>
              <p className="text-orange-800 mb-3">
                {lowStockItems.length === 1
                  ? 'Un article a atteint le seuil d\'alerte de stock :'
                  : `${lowStockItems.length} articles ont atteint leur seuil d'alerte de stock :`}
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-white rounded-lg p-3 border border-orange-200 hover:border-orange-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        {item.category && (
                          <p className="text-xs text-slate-600">{item.category}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-slate-600">Stock actuel</p>
                        <p className="font-bold text-orange-600">
                          {item.stock_quantity} {item.stock_unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-600">Seuil</p>
                        <p className="font-medium text-slate-700">
                          {item.low_stock_threshold} {item.stock_unit}
                        </p>
                      </div>
                      <button
                        onClick={() => handleOpenModal(item)}
                        className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                      >
                        Réapprovisionner
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un article..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-5 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 outline-none transition-all duration-200 hover:border-slate-400 bg-white shadow-sm placeholder:text-slate-400"
          />
        </div>

        <div className="relative min-w-[200px]">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 outline-none transition-all duration-200 hover:border-slate-400 bg-white shadow-sm appearance-none cursor-pointer"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
            <option value="uncategorized">Sans catégorie</option>
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-600 bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="animate-pulse">Chargement...</div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-sm border border-slate-200">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 text-lg">
            {searchTerm ? 'Aucun article trouvé' : 'Aucun article dans le catalogue'}
          </p>
          {!searchTerm && (
            <p className="text-slate-500 text-sm mt-2">
              Commencez par ajouter votre premier article
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl shadow-md border border-slate-200 hover:shadow-xl hover:border-primary-300 transition-all duration-300 overflow-hidden group"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <Package className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-slate-900 group-hover:text-primary-700 transition-colors line-clamp-1">
                          {item.name}
                        </h3>
                        {item.is_active ? (
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-500/50"></div>
                            <span className="text-xs font-medium text-emerald-600">
                              Actif
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                            <span className="text-xs font-medium text-slate-500">
                              Inactif
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {item.description && (
                  <div className="mb-4">
                    <p className="text-sm text-slate-600 line-clamp-2">{item.description}</p>
                  </div>
                )}

                <div className="space-y-3 mb-4">
                  {item.category && (
                    <div className="flex items-center gap-3 text-sm text-slate-600 group/item hover:text-primary-600 transition-colors">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center group-hover/item:bg-primary-50 transition-colors">
                        <Tag className="w-4 h-4" />
                      </div>
                      <span className="truncate">{item.category}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Package className="w-4 h-4" />
                    </div>
                    <span>{item.default_unit}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Prix par défaut</p>
                      <p className="text-xl font-bold text-slate-900">{Number(item.default_price).toFixed(2)} €</p>
                    </div>
                  </div>

                  {item.track_stock && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg ${
                      item.stock_quantity <= item.low_stock_threshold
                        ? 'bg-orange-50 border border-orange-200'
                        : 'bg-slate-50 border border-slate-200'
                    }`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        item.stock_quantity <= item.low_stock_threshold
                          ? 'bg-orange-100'
                          : 'bg-slate-100'
                      }`}>
                        {item.stock_quantity <= item.low_stock_threshold ? (
                          <AlertTriangle className="w-4 h-4 text-orange-600" />
                        ) : (
                          <Archive className="w-4 h-4 text-slate-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-slate-500">Stock</p>
                        <p className={`text-sm font-bold ${
                          item.stock_quantity <= item.low_stock_threshold
                            ? 'text-orange-600'
                            : 'text-slate-900'
                        }`}>
                          {item.stock_quantity} {item.stock_unit}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenModal(item)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-md font-medium"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Modifier</span>
                  </button>
                  <button
                    onClick={() => handleToggleActive(item)}
                    className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md"
                    title={item.is_active ? 'Désactiver' : 'Activer'}
                  >
                    {item.is_active ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-slate-400" />}
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                {editingItem ? 'Modifier l\'article' : 'Nouvel article'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-slate-100 rounded-lg transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nom de l'article *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="Ex: Couronne céramique"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="Description détaillée de l'article"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Catégorie
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    placeholder="Ex: Prothèse fixe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Unité
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.default_unit}
                    onChange={(e) => setFormData({ ...formData, default_unit: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    placeholder="Ex: unité, paire"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Prix par défaut (€) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.default_price}
                  onChange={(e) => setFormData({ ...formData, default_price: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-2 focus:ring-primary-500"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
                    Article actif
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="track_stock"
                    checked={formData.track_stock}
                    onChange={(e) => setFormData({ ...formData, track_stock: e.target.checked })}
                    disabled={itemResources.length > 0}
                    className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <label htmlFor="track_stock" className={`text-sm font-medium ${itemResources.length > 0 ? 'text-slate-400' : 'text-slate-700'}`}>
                    Gérer le stock pour cet article
                  </label>
                  {itemResources.length > 0 && (
                    <span className="text-xs text-amber-600 italic">(Désactivé car ressources utilisées)</span>
                  )}
                </div>

                {formData.track_stock && itemResources.length === 0 && (
                  <div className="space-y-4 mt-4 pl-7 border-l-2 border-primary-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Quantité en stock *
                        </label>
                        <input
                          type="number"
                          required={formData.track_stock}
                          min="0"
                          value={formData.stock_quantity}
                          onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Seuil d'alerte *
                        </label>
                        <input
                          type="number"
                          required={formData.track_stock}
                          min="0"
                          value={formData.low_stock_threshold}
                          onChange={(e) => setFormData({ ...formData, low_stock_threshold: parseInt(e.target.value) || 10 })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Unité de stock *
                      </label>
                      <input
                        type="text"
                        required={formData.track_stock}
                        value={formData.stock_unit}
                        onChange={(e) => setFormData({ ...formData, stock_unit: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        placeholder="Ex: unité, kg, litre"
                      />
                    </div>

                    <p className="text-xs text-slate-500 italic">
                      Le stock sera automatiquement déduit lors de la création d'un bon de livraison et remis lors de son annulation.
                    </p>
                  </div>
                )}

                {formData.track_stock && itemResources.length > 0 && (
                  <div className="mt-4 pl-7 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-900 mb-1">
                          Stock géré via les ressources
                        </p>
                        <p className="text-xs text-amber-700">
                          Cet article utilise des ressources. Le stock sera automatiquement calculé et déduit depuis les ressources assignées ci-dessous lors de la création d'un bon de livraison.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-900">Ressources utilisées</h3>
                  <span className="text-xs text-slate-600">
                    {editingItem ? 'Configurez les matières premières nécessaires' : 'Créez d\'abord l\'article pour ajouter des ressources'}
                  </span>
                </div>

                {!editingItem && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">
                      Les ressources ne peuvent être configurées qu'après la création de l'article. Enregistrez d'abord l'article, puis modifiez-le pour ajouter des ressources.
                    </p>
                  </div>
                )}

                {editingItem && (
                  <>
                    {itemResources.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {itemResources.map((ir: any) => (
                          <div key={ir.id} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-cyan-200">
                            <Archive className="w-5 h-5 text-cyan-600" />
                            <div className="flex-1">
                              <p className="font-medium text-slate-900">{ir.resources.name}</p>
                              <p className="text-xs text-slate-600">
                                {ir.quantity_needed} {formData.default_unit} = 1 {ir.resources.unit}
                              </p>
                            </div>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={ir.quantity_needed}
                              onChange={(e) => handleUpdateResource(ir.id, parseFloat(e.target.value) || 1)}
                              className="w-24 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveResource(ir.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <select
                        className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                        id="resource-select"
                      >
                        <option value="">Sélectionner une ressource</option>
                        {resources.map((resource) => (
                          <option key={resource.id} value={resource.id}>
                            {resource.name} ({resource.unit})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="Qté"
                        defaultValue="1"
                        className="w-24 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                        id="quantity-input"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const select = document.getElementById('resource-select') as HTMLSelectElement;
                          const input = document.getElementById('quantity-input') as HTMLInputElement;
                          if (select.value) {
                            handleAddResource(select.value, parseFloat(input.value) || 1);
                            select.value = '';
                            input.value = '1';
                          }
                        }}
                        className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition text-sm font-medium"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-cyan-800 italic">
                      <strong>Exemple:</strong> Si 28 couronnes nécessitent 1 disque, entrez 28 dans la quantité.
                    </p>
                  </>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-cyan-600 text-white shadow-lg hover:shadow-xl rounded-lg hover:from-primary-700 hover:to-cyan-700 transition"
                >
                  <Save className="w-4 h-4" />
                  {editingItem ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTutorial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-primary-600 to-cyan-600 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Guide du Catalogue</h2>
                    <p className="text-white/80 text-sm mt-1">Comprendre la gestion des articles et ressources</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTutorial(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <section className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-5">
                <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Qu'est-ce que le Catalogue ?
                </h3>
                <p className="text-blue-800 mb-3">
                  Le catalogue contient tous les articles et prestations que vous proposez à vos clients (couronnes, bridges, implants, etc.).
                  Chaque article peut être configuré avec un prix par défaut et des options de gestion de stock.
                </p>
              </section>

              <section className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Archive className="w-5 h-5 text-slate-600" />
                  Deux modes de gestion de stock
                </h3>

                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5">
                  <h4 className="font-bold text-emerald-900 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    1. Gestion de stock directe
                  </h4>
                  <p className="text-emerald-800 mb-3">
                    Activez "Gérer le stock pour cet article" pour suivre directement les quantités disponibles de cet article.
                  </p>
                  <div className="bg-white border border-emerald-200 rounded p-3 space-y-2">
                    <p className="text-sm text-emerald-900"><strong>Quand l'utiliser :</strong></p>
                    <ul className="text-sm text-emerald-800 space-y-1 ml-4 list-disc">
                      <li>Articles simples sans ressources</li>
                      <li>Produits finis achetés directement</li>
                      <li>Prestations de services</li>
                    </ul>
                  </div>
                  <div className="mt-3 p-3 bg-emerald-100 rounded border border-emerald-300">
                    <p className="text-sm text-emerald-900">
                      <strong>Exemple :</strong> Vous vendez des couronnes pré-fabriquées. Vous en avez 50 en stock.
                      Chaque fois qu'un bon de livraison est créé, le stock diminue automatiquement.
                    </p>
                  </div>
                </div>

                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-5">
                  <h4 className="font-bold text-cyan-900 mb-2 flex items-center gap-2">
                    <Archive className="w-5 h-5" />
                    2. Gestion via ressources
                  </h4>
                  <p className="text-cyan-800 mb-3">
                    Utilisez la section "Ressources utilisées" pour indiquer quelles matières premières sont nécessaires à la fabrication de cet article.
                  </p>
                  <div className="bg-white border border-cyan-200 rounded p-3 space-y-2">
                    <p className="text-sm text-cyan-900"><strong>Quand l'utiliser :</strong></p>
                    <ul className="text-sm text-cyan-800 space-y-1 ml-4 list-disc">
                      <li>Articles composés de plusieurs matières premières</li>
                      <li>Produits fabriqués à partir de ressources</li>
                      <li>Vous voulez suivre la consommation de vos matériaux</li>
                    </ul>
                  </div>
                  <div className="mt-3 p-3 bg-cyan-100 rounded border border-cyan-300">
                    <p className="text-sm text-cyan-900 mb-2">
                      <strong>Exemple :</strong> Une couronne nécessite :
                    </p>
                    <ul className="text-sm text-cyan-800 space-y-1 ml-4 list-disc">
                      <li>1 disque de zircone par 28 couronnes</li>
                      <li>5g de porcelaine par couronne</li>
                    </ul>
                    <p className="text-sm text-cyan-900 mt-2">
                      Quand vous créez un bon de livraison de 28 couronnes, le système déduira automatiquement 1 disque et 140g de porcelaine de vos ressources.
                    </p>
                  </div>
                </div>
              </section>

              <section className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-5">
                <h3 className="text-lg font-bold text-amber-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Règle importante
                </h3>
                <p className="text-amber-800 mb-2">
                  <strong>Vous ne pouvez pas utiliser les deux modes en même temps !</strong>
                </p>
                <p className="text-amber-800">
                  Dès que vous ajoutez une ressource à un article, la case "Gérer le stock pour cet article" se désactive automatiquement.
                  Le stock sera géré via les ressources uniquement.
                </p>
              </section>

              <section className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-slate-600" />
                  Configuration des ressources
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary-700 font-bold text-sm">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Créez d'abord vos ressources</p>
                      <p className="text-sm text-slate-600">Rendez-vous dans la page "Ressources" pour créer vos matières premières (disques, porcelaine, etc.)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary-700 font-bold text-sm">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Créez votre article dans le catalogue</p>
                      <p className="text-sm text-slate-600">Ajoutez le nom, la description, le prix, etc.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary-700 font-bold text-sm">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Modifiez l'article pour ajouter des ressources</p>
                      <p className="text-sm text-slate-600">Dans la section "Ressources utilisées", sélectionnez chaque ressource et indiquez la quantité nécessaire</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary-700 font-bold text-sm">4</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Le stock se gère automatiquement</p>
                      <p className="text-sm text-slate-600">À chaque bon de livraison, les ressources sont déduites automatiquement selon les quantités configurées</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-gradient-to-r from-primary-50 to-cyan-50 border border-primary-200 rounded-lg p-5">
                <h3 className="text-lg font-bold text-primary-900 mb-3 flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Conseils pratiques
                </h3>
                <ul className="space-y-2 text-primary-800">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <span>Utilisez des catégories pour organiser vos articles (Couronnes, Bridges, Implants, etc.)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <span>Définissez des seuils d'alerte pour être prévenu quand le stock est bas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <span>Les articles inactifs n'apparaissent pas dans les bons de livraison mais restent dans le catalogue</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <span>Les prix par défaut peuvent être modifiés lors de la création d'un bon de livraison</span>
                  </li>
                </ul>
              </section>
            </div>

            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-4 rounded-b-xl">
              <button
                onClick={() => setShowTutorial(false)}
                className="w-full px-4 py-3 bg-gradient-to-r from-primary-600 to-cyan-600 text-white rounded-lg hover:from-primary-700 hover:to-cyan-700 transition font-medium"
              >
                J'ai compris
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
