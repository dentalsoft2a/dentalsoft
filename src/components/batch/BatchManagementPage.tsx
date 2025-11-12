import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Search, Save, X, Package, Star, Tag, Archive, CheckCircle2, AlertTriangle, Clock, History } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLockScroll } from '../../hooks/useLockScroll';

interface BatchBrand {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BatchMaterial {
  id: string;
  brand_id: string;
  name: string;
  description: string | null;
  material_type: string;
  is_favorite: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  batch_brands?: { name: string };
}

interface BatchNumber {
  id: string;
  material_id: string;
  batch_number: string;
  is_current: boolean;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function BatchManagementPage() {
  const { user } = useAuth();
  const [brands, setBrands] = useState<BatchBrand[]>([]);
  const [materials, setMaterials] = useState<BatchMaterial[]>([]);
  const [batchNumbers, setBatchNumbers] = useState<BatchNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState<string | null>(null);

  const [editingBrand, setEditingBrand] = useState<BatchBrand | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<BatchMaterial | null>(null);
  const [editingBatchMaterialId, setEditingBatchMaterialId] = useState<string | null>(null);

  useLockScroll(showBrandModal || showMaterialModal || showBatchModal || !!showHistoryModal);

  const [brandFormData, setBrandFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  const [materialFormData, setMaterialFormData] = useState({
    brand_id: '',
    name: '',
    description: '',
    material_type: 'disque',
    is_favorite: false,
    is_active: true,
  });

  const [batchFormData, setBatchFormData] = useState({
    batch_number: '',
    notes: '',
  });

  useEffect(() => {
    loadAllData();
  }, [user]);

  const loadAllData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await Promise.all([
        loadBrands(),
        loadMaterials(),
        loadBatchNumbers(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBrands = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('batch_brands')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    if (error) throw error;
    setBrands(data || []);
  };

  const loadMaterials = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('batch_materials')
      .select('*, batch_brands(name)')
      .eq('user_id', user.id)
      .order('name');

    if (error) throw error;
    setMaterials(data || []);
  };

  const loadBatchNumbers = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('batch_numbers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setBatchNumbers(data || []);
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingBrand) {
        const { error } = await supabase
          .from('batch_brands')
          .update(brandFormData)
          .eq('id', editingBrand.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('batch_brands')
          .insert({ ...brandFormData, user_id: user.id });

        if (error) throw error;
      }

      await loadBrands();
      setShowBrandModal(false);
      setEditingBrand(null);
      setBrandFormData({ name: '', description: '', is_active: true });
    } catch (error: any) {
      console.error('Error saving brand:', error);
      if (error.code === '23505') {
        alert('Une marque avec ce nom existe déjà. Veuillez choisir un autre nom.');
      } else {
        alert('Erreur lors de l\'enregistrement');
      }
    }
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingMaterial) {
        const { error } = await supabase
          .from('batch_materials')
          .update(materialFormData)
          .eq('id', editingMaterial.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('batch_materials')
          .insert({ ...materialFormData, user_id: user.id });

        if (error) throw error;
      }

      await loadMaterials();
      setShowMaterialModal(false);
      setEditingMaterial(null);
      setMaterialFormData({
        brand_id: '',
        name: '',
        description: '',
        material_type: 'disque',
        is_favorite: false,
        is_active: true,
      });
    } catch (error: any) {
      console.error('Error saving material:', error);
      if (error.code === '23505') {
        alert('Un matériau avec ce nom existe déjà pour cette marque. Veuillez choisir un autre nom.');
      } else {
        alert('Erreur lors de l\'enregistrement');
      }
    }
  };

  const handleSaveBatchNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingBatchMaterialId) return;

    try {
      const { error } = await supabase
        .from('batch_numbers')
        .insert({
          ...batchFormData,
          material_id: editingBatchMaterialId,
          user_id: user.id,
          is_current: true,
        });

      if (error) throw error;

      await loadBatchNumbers();
      setShowBatchModal(false);
      setEditingBatchMaterialId(null);
      setBatchFormData({ batch_number: '', notes: '' });
    } catch (error) {
      console.error('Error saving batch number:', error);
      alert('Erreur lors de l\'enregistrement');
    }
  };

  const handleDeleteBrand = async (id: string) => {
    if (!confirm('Supprimer cette marque ? Tous les matériaux associés seront également supprimés.')) return;

    try {
      const { error } = await supabase
        .from('batch_brands')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadAllData();
    } catch (error) {
      console.error('Error deleting brand:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm('Supprimer ce matériau ?')) return;

    try {
      const { error } = await supabase
        .from('batch_materials')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const toggleFavorite = async (material: BatchMaterial) => {
    try {
      const { error } = await supabase
        .from('batch_materials')
        .update({ is_favorite: !material.is_favorite })
        .eq('id', material.id);

      if (error) throw error;
      await loadMaterials();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const getCurrentBatchNumber = (materialId: string): BatchNumber | undefined => {
    return batchNumbers.find(b => b.material_id === materialId && b.is_current);
  };

  const getMaterialHistory = (materialId: string): BatchNumber[] => {
    return batchNumbers.filter(b => b.material_id === materialId).sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  };

  const filteredMaterials = materials.filter(material => {
    const matchesSearch =
      material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.batch_brands?.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBrand = selectedBrand === 'all' || material.brand_id === selectedBrand;
    const matchesFavorites = !showFavoritesOnly || material.is_favorite;

    return matchesSearch && matchesBrand && matchesFavorites;
  });

  const favoriteMaterials = materials.filter(m => m.is_favorite);

  return (
    <div>
      <div className="mb-6 md:mb-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">N° Lot</h1>
            <p className="text-slate-600 mt-1 md:mt-2 text-sm md:text-base">Gérez les numéros de lot de vos matériaux</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditingBrand(null);
                setBrandFormData({ name: '', description: '', is_active: true });
                setShowBrandModal(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 text-sm font-medium"
            >
              <Tag className="w-4 h-4" />
              <span>Nouvelle Marque</span>
            </button>
            <button
              onClick={() => {
                setEditingMaterial(null);
                setMaterialFormData({
                  brand_id: brands[0]?.id || '',
                  name: '',
                  description: '',
                  material_type: 'disque',
                  is_favorite: false,
                  is_active: true,
                });
                setShowMaterialModal(true);
              }}
              disabled={brands.length === 0}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-600 to-cyan-600 text-white shadow-lg hover:shadow-xl rounded-lg hover:from-primary-700 hover:to-cyan-700 transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Matériau</span>
            </button>
          </div>
        </div>
      </div>

      {favoriteMaterials.length > 0 && (
        <div className="mb-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-5 h-5 text-amber-600 fill-amber-600" />
            <h3 className="font-bold text-slate-900">Favoris</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {favoriteMaterials.map(material => {
              const currentBatch = getCurrentBatchNumber(material.id);
              return (
                <div
                  key={material.id}
                  className="bg-white rounded-lg px-3 py-2 border border-amber-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{material.name}</p>
                      {currentBatch && (
                        <p className="text-xs text-slate-600">N° {currentBatch.batch_number}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un matériau..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          />
        </div>
        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
        >
          <option value="all">Toutes les marques</option>
          {brands.filter(b => b.is_active).map(brand => (
            <option key={brand.id} value={brand.id}>{brand.name}</option>
          ))}
        </select>
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
            showFavoritesOnly
              ? 'bg-amber-100 text-amber-700 border-2 border-amber-300'
              : 'bg-white text-slate-700 border-2 border-slate-300 hover:bg-slate-50'
          }`}
        >
          <Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-amber-600' : ''}`} />
          <span className="hidden sm:inline">Favoris</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-600 bg-white rounded-xl shadow-sm border border-slate-200">
          Chargement...
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl shadow-sm border border-slate-200">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 text-lg">
            {materials.length === 0
              ? 'Aucun matériau enregistré'
              : 'Aucun matériau trouvé'}
          </p>
          {brands.length === 0 && (
            <p className="text-slate-500 text-sm mt-2">
              Commencez par créer une marque
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map(material => {
            const currentBatch = getCurrentBatchNumber(material.id);
            const history = getMaterialHistory(material.id);

            return (
              <div
                key={material.id}
                className="bg-white rounded-xl shadow-md border border-slate-200 hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          onClick={() => toggleFavorite(material)}
                          className="p-1 hover:bg-amber-50 rounded transition-colors"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              material.is_favorite
                                ? 'fill-amber-500 text-amber-500'
                                : 'text-slate-300'
                            }`}
                          />
                        </button>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-slate-900">{material.name}</h3>
                          <p className="text-xs text-slate-500">{material.batch_brands?.name}</p>
                        </div>
                      </div>
                      {material.description && (
                        <p className="text-sm text-slate-600 line-clamp-2 mb-2">{material.description}</p>
                      )}
                      <span className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-full">
                        {material.material_type}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-primary-50 to-cyan-50 rounded-lg p-4 mb-4 border border-primary-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">N° Lot actuel</span>
                      {currentBatch && (
                        <span className="flex items-center gap-1 text-xs text-emerald-600">
                          <CheckCircle2 className="w-3 h-3" />
                          Actif
                        </span>
                      )}
                    </div>
                    {currentBatch ? (
                      <div>
                        <p className="text-2xl font-bold text-slate-900">{currentBatch.batch_number}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Depuis le {new Date(currentBatch.started_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 italic">Aucun numéro de lot</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingBatchMaterialId(material.id);
                        setBatchFormData({ batch_number: '', notes: '' });
                        setShowBatchModal(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-xl transition-all font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Nouveau lot</span>
                    </button>
                    {history.length > 0 && (
                      <button
                        onClick={() => setShowHistoryModal(material.id)}
                        className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                        title="Historique"
                      >
                        <History className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingMaterial(material);
                        setMaterialFormData({
                          brand_id: material.brand_id,
                          name: material.name,
                          description: material.description || '',
                          material_type: material.material_type,
                          is_favorite: material.is_favorite,
                          is_active: material.is_active,
                        });
                        setShowMaterialModal(true);
                      }}
                      className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMaterial(material.id)}
                      className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showBrandModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                {editingBrand ? 'Modifier la marque' : 'Nouvelle marque'}
              </h2>
              <button
                onClick={() => {
                  setShowBrandModal(false);
                  setEditingBrand(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBrand} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nom de la marque *
                </label>
                <input
                  type="text"
                  required
                  value={brandFormData.name}
                  onChange={(e) => setBrandFormData({ ...brandFormData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="Ex: Ivoclar, Miyo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={brandFormData.description}
                  onChange={(e) => setBrandFormData({ ...brandFormData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="Description optionnelle"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="brand_is_active"
                  checked={brandFormData.is_active}
                  onChange={(e) => setBrandFormData({ ...brandFormData, is_active: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-2 focus:ring-primary-500"
                />
                <label htmlFor="brand_is_active" className="text-sm font-medium text-slate-700">
                  Marque active
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowBrandModal(false);
                    setEditingBrand(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-cyan-600 text-white shadow-lg rounded-lg hover:from-primary-700 hover:to-cyan-700 transition"
                >
                  <Save className="w-4 h-4" />
                  {editingBrand ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMaterialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                {editingMaterial ? 'Modifier le matériau' : 'Nouveau matériau'}
              </h2>
              <button
                onClick={() => {
                  setShowMaterialModal(false);
                  setEditingMaterial(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMaterial} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Marque *
                </label>
                <select
                  required
                  value={materialFormData.brand_id}
                  onChange={(e) => setMaterialFormData({ ...materialFormData, brand_id: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                >
                  <option value="">Sélectionner une marque</option>
                  {brands.filter(b => b.is_active).map(brand => (
                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nom du matériau *
                </label>
                <input
                  type="text"
                  required
                  value={materialFormData.name}
                  onChange={(e) => setMaterialFormData({ ...materialFormData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="Ex: Zircone Prime A2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Type de matériau *
                </label>
                <select
                  required
                  value={materialFormData.material_type}
                  onChange={(e) => setMaterialFormData({ ...materialFormData, material_type: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                >
                  <option value="disque">Disque</option>
                  <option value="bloc">Bloc</option>
                  <option value="porcelaine">Porcelaine</option>
                  <option value="résine">Résine</option>
                  <option value="maquillage">Maquillage</option>
                  <option value="glaze">Glaze</option>
                  <option value="autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={materialFormData.description}
                  onChange={(e) => setMaterialFormData({ ...materialFormData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="Description optionnelle"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="material_is_favorite"
                    checked={materialFormData.is_favorite}
                    onChange={(e) => setMaterialFormData({ ...materialFormData, is_favorite: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-2 focus:ring-primary-500"
                  />
                  <label htmlFor="material_is_favorite" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" />
                    Marquer comme favori
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="material_is_active"
                    checked={materialFormData.is_active}
                    onChange={(e) => setMaterialFormData({ ...materialFormData, is_active: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-2 focus:ring-primary-500"
                  />
                  <label htmlFor="material_is_active" className="text-sm font-medium text-slate-700">
                    Matériau actif
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowMaterialModal(false);
                    setEditingMaterial(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-cyan-600 text-white shadow-lg rounded-lg hover:from-primary-700 hover:to-cyan-700 transition"
                >
                  <Save className="w-4 h-4" />
                  {editingMaterial ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBatchModal && editingBatchMaterialId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Nouveau numéro de lot</h2>
              <button
                onClick={() => {
                  setShowBatchModal(false);
                  setEditingBatchMaterialId(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBatchNumber} className="p-6 space-y-4">
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-primary-900">
                  <strong>Matériau:</strong>{' '}
                  {materials.find(m => m.id === editingBatchMaterialId)?.name}
                </p>
                <p className="text-xs text-primary-700 mt-1">
                  L'ancien numéro de lot sera automatiquement archivé
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Numéro de lot *
                </label>
                <input
                  type="text"
                  required
                  value={batchFormData.batch_number}
                  onChange={(e) => setBatchFormData({ ...batchFormData, batch_number: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="Ex: 1234919"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes (optionnel)
                </label>
                <textarea
                  rows={3}
                  value={batchFormData.notes}
                  onChange={(e) => setBatchFormData({ ...batchFormData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="Informations complémentaires"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowBatchModal(false);
                    setEditingBatchMaterialId(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-cyan-600 text-white shadow-lg rounded-lg hover:from-primary-700 hover:to-cyan-700 transition"
                >
                  <Save className="w-4 h-4" />
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Historique des numéros de lot</h2>
              <button
                onClick={() => setShowHistoryModal(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                {getMaterialHistory(showHistoryModal).map((batch, index) => (
                  <div
                    key={batch.id}
                    className={`p-4 rounded-lg border ${
                      batch.is_current
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg font-bold text-slate-900">
                            N° {batch.batch_number}
                          </span>
                          {batch.is_current && (
                            <span className="px-2 py-0.5 bg-emerald-600 text-white text-xs rounded-full font-medium">
                              Actuel
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Clock className="w-4 h-4" />
                            <span>
                              Du {new Date(batch.started_at).toLocaleDateString('fr-FR')}
                              {batch.ended_at && ` au ${new Date(batch.ended_at).toLocaleDateString('fr-FR')}`}
                            </span>
                          </div>
                          {batch.notes && (
                            <p className="text-slate-600 mt-2">{batch.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
