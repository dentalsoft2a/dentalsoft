import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Stethoscope } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface CatalogItem {
  id: string;
  name: string;
  description: string;
  category: string;
  ccam_code: string;
  price: number;
  cpam_reimbursement: number;
  unit: string;
  is_active: boolean;
}

export default function DentalCatalogPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    ccam_code: '',
    price: 0,
    cpam_reimbursement: 0,
    unit: 'acte',
  });

  useEffect(() => {
    if (user) {
      loadCatalog();
    }
  }, [user]);

  const loadCatalog = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('dental_catalog_items')
        .select('*')
        .eq('dentist_id', user.id)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading catalog:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(new Set(items.map(i => i.category)));

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.ccam_code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('dental_catalog_items')
          .update(formData)
          .eq('id', editingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('dental_catalog_items')
          .insert({
            ...formData,
            dentist_id: user.id,
          });

        if (error) throw error;
      }

      setShowModal(false);
      setEditingItem(null);
      resetForm();
      loadCatalog();
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Erreur lors de l\'enregistrement');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      ccam_code: '',
      price: 0,
      cpam_reimbursement: 0,
      unit: 'acte',
    });
  };

  const handleEdit = (item: CatalogItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      category: item.category,
      ccam_code: item.ccam_code,
      price: item.price,
      cpam_reimbursement: item.cpam_reimbursement,
      unit: item.unit,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet acte ?')) return;

    try {
      const { error } = await supabase
        .from('dental_catalog_items')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      loadCatalog();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Erreur lors de la suppression');
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Catalogue d'Actes</h1>
          <p className="text-slate-600 mt-1">{items.length} actes dentaires</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingItem(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition"
        >
          <Plus className="w-5 h-5" />
          Nouvel Acte
        </button>
      </div>

      <div className="mb-6 flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un acte..."
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
          {filteredItems.map(item => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-lg transition">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
                    <Stethoscope className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900 text-lg">{item.name}</h3>
                      {item.ccam_code && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-mono">
                          {item.ccam_code}
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                        {item.category}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-sm text-slate-600 mb-2">{item.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-slate-600">
                        Tarif: <span className="font-semibold text-slate-900">{item.price.toFixed(2)}€</span>
                      </span>
                      {item.cpam_reimbursement > 0 && (
                        <span className="text-green-600">
                          CPAM: {item.cpam_reimbursement.toFixed(2)}€
                        </span>
                      )}
                      <span className="text-slate-500">
                        Reste: <span className="font-semibold">{(item.price - item.cpam_reimbursement).toFixed(2)}€</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              Aucun acte trouvé
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4">
              <h2 className="text-xl font-bold text-slate-900">
                {editingItem ? 'Modifier l\'Acte' : 'Nouvel Acte'}
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Code CCAM</label>
                  <input
                    type="text"
                    value={formData.ccam_code}
                    onChange={(e) => setFormData({ ...formData, ccam_code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tarif (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Remboursement CPAM (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cpam_reimbursement}
                    onChange={(e) => setFormData({ ...formData, cpam_reimbursement: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingItem(null);
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
                  {editingItem ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
