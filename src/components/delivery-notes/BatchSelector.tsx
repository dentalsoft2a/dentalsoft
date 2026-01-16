import { useEffect, useState } from 'react';
import { Package, Plus, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Batch {
  id: string;
  material_id: string;
  batch_number: string;
  is_current: boolean;
  is_available: boolean;
  is_required: boolean;
  material_name?: string;
  brand_name?: string;
}

interface BatchSelection {
  batch_number_id: string;
  material_id: string;
  quantity_used: number;
  batch_number?: string;
  material_name?: string;
}

interface BatchSelectorProps {
  selectedBatches: BatchSelection[];
  onSelect: (batches: BatchSelection[]) => void;
  catalogItemId?: string;
  resourceId?: string;
  variantId?: string;
}

export default function BatchSelector({
  selectedBatches,
  onSelect,
  catalogItemId,
  resourceId,
  variantId
}: BatchSelectorProps) {
  const { user } = useAuth();
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasRequiredBatches, setHasRequiredBatches] = useState(false);

  useEffect(() => {
    loadAvailableBatches();
  }, [user, catalogItemId, resourceId, variantId]);

  const loadAvailableBatches = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let data: any[] = [];

      if (catalogItemId) {
        const { data: batchData, error } = await supabase
          .rpc('get_available_batches_for_catalog_item', {
            p_catalog_item_id: catalogItemId,
            p_user_id: user.id
          });

        if (error) throw error;
        data = batchData || [];
      } else if (resourceId) {
        const { data: batchData, error } = await supabase
          .rpc('get_available_batches_for_resource', {
            p_resource_id: resourceId,
            p_user_id: user.id
          });

        if (error) throw error;
        data = batchData || [];
      } else if (variantId) {
        const { data: batchData, error } = await supabase
          .rpc('get_available_batches_for_variant', {
            p_variant_id: variantId,
            p_user_id: user.id
          });

        if (error) throw error;
        data = batchData || [];
      } else {
        const { data: batchData, error } = await supabase
          .from('batch_numbers')
          .select(`
            id,
            material_id,
            batch_number,
            is_current,
            is_available,
            batch_materials(name, batch_brands(name))
          `)
          .eq('user_id', user.id)
          .eq('is_available', true)
          .order('is_current', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) throw error;

        data = (batchData || []).map((batch: any) => ({
          batch_number_id: batch.id,
          batch_number: batch.batch_number,
          material_id: batch.material_id,
          material_name: batch.batch_materials?.name,
          brand_name: batch.batch_materials?.batch_brands?.name,
          is_current: batch.is_current,
          is_available: batch.is_available,
          is_required: false
        }));
      }

      const formattedBatches = data.map((batch: any) => ({
        id: batch.batch_number_id,
        material_id: batch.material_id,
        batch_number: batch.batch_number,
        is_current: batch.is_current,
        is_available: true,
        is_required: batch.is_required || false,
        material_name: batch.material_name,
        brand_name: batch.brand_name
      }));

      setAvailableBatches(formattedBatches);
      setHasRequiredBatches(formattedBatches.some((b: Batch) => b.is_required));
    } catch (error) {
      console.error('Error loading batches:', error);
      setAvailableBatches([]);
    } finally {
      setLoading(false);
    }
  };

  const addBatch = () => {
    if (availableBatches.length === 0) {
      alert('Aucun lot disponible pour cet article ou cette ressource. Veuillez assigner des lots dans la gestion des lots.');
      return;
    }

    const firstBatch = availableBatches[0];
    onSelect([
      ...selectedBatches,
      {
        batch_number_id: firstBatch.id,
        material_id: firstBatch.material_id,
        quantity_used: 1,
        batch_number: firstBatch.batch_number,
        material_name: firstBatch.material_name
      }
    ]);
  };

  const removeBatch = (index: number) => {
    onSelect(selectedBatches.filter((_, i) => i !== index));
  };

  const updateBatch = (index: number, field: string, value: any) => {
    const updated = [...selectedBatches];
    if (field === 'batch_number_id') {
      const batch = availableBatches.find(b => b.id === value);
      if (batch) {
        updated[index] = {
          ...updated[index],
          batch_number_id: value,
          material_id: batch.material_id,
          batch_number: batch.batch_number,
          material_name: batch.material_name
        };
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    onSelect(updated);
  };

  if (loading) {
    return <div className="text-sm text-slate-500">Chargement des lots...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Package className="w-4 h-4" />
          <span>Traçabilité des lots</span>
          {hasRequiredBatches && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full font-medium">
              Obligatoire
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={addBatch}
          disabled={availableBatches.length === 0}
          className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-3 h-3" />
          Ajouter un lot
        </button>
      </div>

      {availableBatches.length === 0 ? (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800">
            <p className="font-medium mb-1">Aucun lot disponible</p>
            <p>
              {(catalogItemId || resourceId || variantId)
                ? 'Aucun lot n\'est assigné à cet article ou cette ressource. Rendez-vous dans la gestion des lots pour créer et assigner des lots.'
                : 'Aucun lot disponible. Veuillez créer des lots dans la gestion des lots.'}
            </p>
          </div>
        </div>
      ) : selectedBatches.length === 0 && !hasRequiredBatches ? (
        <div className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded border border-slate-200">
          Aucun lot sélectionné. La traçabilité est optionnelle pour cet article.
        </div>
      ) : selectedBatches.length === 0 && hasRequiredBatches ? (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-800">
            <strong>Obligatoire:</strong> Vous devez sélectionner au moins un lot pour cet article.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {selectedBatches.map((batch, index) => (
            <div key={index} className="flex gap-2 items-center p-2 bg-slate-50 rounded border border-slate-200">
              <div className="flex-1">
                <label className="block text-xs text-slate-600 mb-1">Lot</label>
                <select
                  value={batch.batch_number_id || ''}
                  onChange={(e) => updateBatch(index, 'batch_number_id', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batch_number} - {b.material_name} {b.is_current && '(actuel)'}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => removeBatch(index)}
                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
