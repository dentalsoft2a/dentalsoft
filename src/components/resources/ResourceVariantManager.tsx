import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Save, X, Package, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ResourceVariant {
  id: string;
  resource_id: string;
  subcategory: string;
  variant_name: string;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ResourceVariantManagerProps {
  resourceId: string;
  resourceName: string;
  onClose: () => void;
}

export default function ResourceVariantManager({
  resourceId,
  resourceName,
  onClose
}: ResourceVariantManagerProps) {
  const [variants, setVariants] = useState<ResourceVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ResourceVariant | null>(null);
  const [formData, setFormData] = useState({
    subcategory: '',
    variant_name: '',
    stock_quantity: 0,
    low_stock_threshold: 5,
    is_active: true,
  });

  useEffect(() => {
    loadVariants();
  }, [resourceId]);

  const loadVariants = async () => {
    try {
      const { data, error } = await supabase
        .from('resource_variants')
        .select('*')
        .eq('resource_id', resourceId)
        .order('subcategory, variant_name', { ascending: true });

      if (error) throw error;
      setVariants(data || []);
    } catch (error) {
      console.error('Error loading variants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (variant?: ResourceVariant) => {
    if (variant) {
      setEditingVariant(variant);
      setFormData({
        subcategory: variant.subcategory || '',
        variant_name: variant.variant_name,
        stock_quantity: Number(variant.stock_quantity),
        low_stock_threshold: variant.low_stock_threshold || 5,
        is_active: variant.is_active,
      });
    } else {
      setEditingVariant(null);
      setFormData({
        subcategory: '',
        variant_name: '',
        stock_quantity: 0,
        low_stock_threshold: 5,
        is_active: true,
      });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingVariant(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (editingVariant) {
        const { error } = await supabase
          .from('resource_variants')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingVariant.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('resource_variants')
          .insert({
            resource_id: resourceId,
            user_id: user.id,
            ...formData,
          });

        if (error) throw error;
      }

      await loadVariants();
      handleCloseForm();
    } catch (error) {
      console.error('Error saving variant:', error);
      alert('Erreur lors de l\'enregistrement');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette variante ?')) return;

    try {
      const { error } = await supabase
        .from('resource_variants')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadVariants();
    } catch (error) {
      console.error('Error deleting variant:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const totalStock = variants.reduce((sum, v) => sum + Number(v.stock_quantity), 0);

  const groupedVariants = variants.reduce((acc, variant) => {
    const subcat = variant.subcategory || 'Sans catégorie';
    if (!acc[subcat]) {
      acc[subcat] = [];
    }
    acc[subcat].push(variant);
    return acc;
  }, {} as Record<string, ResourceVariant[]>);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-primary-50 to-cyan-50">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Variantes de {resourceName}</h2>
            <p className="text-sm text-slate-600 mt-1">Gérez les teintes ou types disponibles</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {!showForm && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="px-4 py-2 bg-primary-100 rounded-lg">
                    <p className="text-sm text-slate-600">Stock total</p>
                    <p className="text-2xl font-bold text-primary-600">{totalStock}</p>
                  </div>
                  <div className="px-4 py-2 bg-cyan-100 rounded-lg">
                    <p className="text-sm text-slate-600">Variantes</p>
                    <p className="text-2xl font-bold text-cyan-600">{variants.length}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenForm()}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-cyan-600 text-white shadow-lg hover:shadow-xl rounded-lg hover:from-primary-700 hover:to-cyan-700 transition"
                >
                  <Plus className="w-5 h-5" />
                  Ajouter une variante
                </button>
              </div>

              {loading ? (
                <div className="p-8 text-center text-slate-600">Chargement...</div>
              ) : variants.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 rounded-xl">
                  <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">Aucune variante définie</p>
                  <p className="text-sm text-slate-500 mt-2">Ajoutez des variantes pour suivre le stock par teinte</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedVariants).map(([subcategory, subcategoryVariants]) => (
                    <div key={subcategory} className="space-y-3">
                      <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
                        <h3 className="text-lg font-bold text-slate-900">{subcategory}</h3>
                        <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full">
                          {subcategoryVariants.length} variante{subcategoryVariants.length > 1 ? 's' : ''}
                        </span>
                        <span className="px-2 py-1 bg-cyan-100 text-cyan-700 text-xs font-semibold rounded-full">
                          Stock: {subcategoryVariants.reduce((sum, v) => sum + Number(v.stock_quantity), 0)}
                        </span>
                      </div>
                      {subcategoryVariants.map((variant) => (
                    <div
                      key={variant.id}
                      className={`p-4 border-2 rounded-lg transition ${
                        variant.is_active
                          ? Number(variant.stock_quantity) <= variant.low_stock_threshold
                            ? 'border-orange-300 bg-orange-50'
                            : 'border-slate-200 hover:border-primary-300 bg-white'
                          : 'border-slate-100 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow ${
                            Number(variant.stock_quantity) <= variant.low_stock_threshold
                              ? 'bg-gradient-to-br from-orange-500 to-red-500'
                              : 'bg-gradient-to-br from-primary-500 to-cyan-500'
                          }`}>
                            {variant.variant_name}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{variant.variant_name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className={`w-2 h-2 rounded-full ${variant.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                              <span className="text-xs text-slate-600">
                                {variant.is_active ? 'Active' : 'Inactive'}
                              </span>
                              {Number(variant.stock_quantity) <= variant.low_stock_threshold && (
                                <>
                                  <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                                  <AlertTriangle className="w-3 h-3 text-orange-500" />
                                  <span className="text-xs text-orange-600 font-medium">Stock faible</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-slate-600">Stock</p>
                            <p className={`text-2xl font-bold ${
                              Number(variant.stock_quantity) <= variant.low_stock_threshold
                                ? 'text-orange-600'
                                : 'text-slate-900'
                            }`}>{Number(variant.stock_quantity)}</p>
                            <p className="text-xs text-slate-500 mt-1">Seuil: {variant.low_stock_threshold}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenForm(variant)}
                              className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(variant.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-gradient-to-br from-slate-50 to-white p-6 rounded-xl border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4">
                  {editingVariant ? 'Modifier la variante' : 'Nouvelle variante'}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Sous-catégorie
                    </label>
                    <input
                      type="text"
                      value={formData.subcategory}
                      onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder="Ex: 16mm, 20mm, Petite taille..."
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Optionnel - Utilisez pour grouper les variantes (ex: par taille, forme, etc.)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nom de la variante *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.variant_name}
                      onChange={(e) => setFormData({ ...formData, variant_name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder="Ex: A1, A2, Bleach"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Quantité en stock *
                      </label>
                      <input
                        type="number"
                        required
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
                        required
                        min="0"
                        value={formData.low_stock_threshold}
                        onChange={(e) => setFormData({ ...formData, low_stock_threshold: parseInt(e.target.value) || 5 })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="variant_is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-2 focus:ring-primary-500"
                    />
                    <label htmlFor="variant_is_active" className="text-sm font-medium text-slate-700">
                      Variante active
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-cyan-600 text-white shadow-lg hover:shadow-xl rounded-lg hover:from-primary-700 hover:to-cyan-700 transition"
                  >
                    <Save className="w-4 h-4" />
                    {editingVariant ? 'Mettre à jour' : 'Créer'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
