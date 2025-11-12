import { useEffect, useState } from 'react';
import { X, Plus, Save, Trash2, Tag, Package, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface BatchMaterial {
  id: string;
  name: string;
  material_type: string;
  batch_brands?: { name: string };
}

interface BatchNumber {
  id: string;
  batch_number: string;
  is_current: boolean;
}

interface ResourceBatchLink {
  id: string;
  material_id: string;
  is_required: boolean;
  batch_materials?: BatchMaterial;
}

interface ResourceBatchLinkManagerProps {
  resourceId?: string;
  variantId?: string;
  resourceName: string;
  onClose: () => void;
}

export default function ResourceBatchLinkManager({
  resourceId,
  variantId,
  resourceName,
  onClose,
}: ResourceBatchLinkManagerProps) {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<BatchMaterial[]>([]);
  const [links, setLinks] = useState<ResourceBatchLink[]>([]);
  const [batchNumbers, setBatchNumbers] = useState<Record<string, BatchNumber | null>>({});
  const [loading, setLoading] = useState(true);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [isRequired, setIsRequired] = useState(false);

  useEffect(() => {
    loadData();
  }, [resourceId, variantId]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await Promise.all([
        loadMaterials(),
        loadLinks(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMaterials = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('batch_materials')
      .select('*, batch_brands(name)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    setMaterials(data || []);
  };

  const loadLinks = async () => {
    if (!user) return;

    let query = supabase
      .from('resource_batch_link')
      .select('*, batch_materials(*, batch_brands(name))')
      .eq('user_id', user.id);

    if (resourceId) {
      query = query.eq('resource_id', resourceId);
    } else if (variantId) {
      query = query.eq('variant_id', variantId);
    }

    const { data, error } = await query;

    if (error) throw error;
    setLinks(data || []);

    const materialIds = (data || []).map(link => link.material_id);
    await loadCurrentBatchNumbers(materialIds);
  };

  const loadCurrentBatchNumbers = async (materialIds: string[]) => {
    if (materialIds.length === 0) return;

    const { data, error } = await supabase
      .from('batch_numbers')
      .select('*')
      .in('material_id', materialIds)
      .eq('is_current', true);

    if (error) {
      console.error('Error loading batch numbers:', error);
      return;
    }

    const batchMap: Record<string, BatchNumber | null> = {};
    materialIds.forEach(id => {
      const batch = data?.find(b => b.material_id === id);
      batchMap[id] = batch || null;
    });
    setBatchNumbers(batchMap);
  };

  const handleAddLink = async () => {
    if (!user || !selectedMaterialId) return;

    try {
      const { error } = await supabase
        .from('resource_batch_link')
        .insert({
          user_id: user.id,
          resource_id: resourceId || null,
          variant_id: variantId || null,
          material_id: selectedMaterialId,
          is_required: isRequired,
        });

      if (error) throw error;

      await loadLinks();
      setSelectedMaterialId('');
      setIsRequired(false);
    } catch (error: any) {
      console.error('Error adding link:', error);
      if (error.code === '23505') {
        alert('Ce matériau est déjà lié à cette ressource');
      } else {
        alert('Erreur lors de l\'ajout');
      }
    }
  };

  const handleUpdateLink = async (linkId: string, isRequired: boolean) => {
    try {
      const { error } = await supabase
        .from('resource_batch_link')
        .update({ is_required: isRequired })
        .eq('id', linkId);

      if (error) throw error;
      await loadLinks();
    } catch (error) {
      console.error('Error updating link:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm('Supprimer ce lien ?')) return;

    try {
      const { error } = await supabase
        .from('resource_batch_link')
        .delete()
        .eq('id', linkId);

      if (error) throw error;
      await loadLinks();
    } catch (error) {
      console.error('Error deleting link:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const availableMaterials = materials.filter(
    m => !links.some(link => link.material_id === m.id)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Numéros de lot associés</h2>
            <p className="text-sm text-slate-600 mt-1">{resourceName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8 text-slate-600">Chargement...</div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">À quoi servent les liens de lots ?</p>
                    <p>
                      Liez des matériaux de lot à cette ressource pour tracer automatiquement les numéros
                      de lot utilisés dans les bons de livraison. Marquez un matériau comme obligatoire
                      si le numéro de lot doit toujours être renseigné.
                    </p>
                  </div>
                </div>
              </div>

              {links.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-slate-900 mb-3">Matériaux liés</h3>
                  <div className="space-y-3">
                    {links.map(link => {
                      const material = link.batch_materials;
                      const currentBatch = batchNumbers[link.material_id];

                      return (
                        <div
                          key={link.id}
                          className="bg-slate-50 border border-slate-200 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Package className="w-4 h-4 text-slate-600" />
                                <span className="font-medium text-slate-900">
                                  {material?.batch_brands?.name} - {material?.name}
                                </span>
                                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-xs rounded-full">
                                  {material?.material_type}
                                </span>
                              </div>
                              {currentBatch ? (
                                <div className="flex items-center gap-2 text-sm">
                                  <Tag className="w-3 h-3 text-primary-600" />
                                  <span className="text-slate-600">N° Lot actuel:</span>
                                  <span className="font-medium text-slate-900">
                                    {currentBatch.batch_number}
                                  </span>
                                </div>
                              ) : (
                                <p className="text-xs text-orange-600 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  Aucun numéro de lot actif
                                </p>
                              )}
                              <div className="mt-2">
                                <label className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={link.is_required}
                                    onChange={(e) => handleUpdateLink(link.id, e.target.checked)}
                                    className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-2 focus:ring-primary-500"
                                  />
                                  <span className="text-slate-700">N° de lot obligatoire</span>
                                </label>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteLink(link.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-br from-primary-50 to-cyan-50 border border-primary-200 rounded-lg p-4">
                <h3 className="font-bold text-slate-900 mb-3">Ajouter un matériau</h3>
                {availableMaterials.length === 0 ? (
                  <p className="text-sm text-slate-600">
                    Tous les matériaux disponibles sont déjà liés à cette ressource.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Matériau
                      </label>
                      <select
                        value={selectedMaterialId}
                        onChange={(e) => setSelectedMaterialId(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      >
                        <option value="">Sélectionner un matériau</option>
                        {availableMaterials.map(material => (
                          <option key={material.id} value={material.id}>
                            {material.batch_brands?.name} - {material.name} ({material.material_type})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="is_required"
                        checked={isRequired}
                        onChange={(e) => setIsRequired(e.target.checked)}
                        className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-2 focus:ring-primary-500"
                      />
                      <label htmlFor="is_required" className="text-sm font-medium text-slate-700">
                        N° de lot obligatoire
                      </label>
                    </div>

                    <button
                      onClick={handleAddLink}
                      disabled={!selectedMaterialId}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-600 to-cyan-600 text-white rounded-lg hover:from-primary-700 hover:to-cyan-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
