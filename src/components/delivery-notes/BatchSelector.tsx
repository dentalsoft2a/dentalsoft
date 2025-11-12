import { useEffect, useState } from 'react';
import { Package, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Batch {
  id: string;
  material_id: string;
  batch_number: string;
  is_current: boolean;
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
}

export default function BatchSelector({ selectedBatches, onSelect }: BatchSelectorProps) {
  const { user } = useAuth();
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAvailableBatches();
  }, [user]);

  const loadAvailableBatches = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('batch_numbers')
        .select(`
          id,
          material_id,
          batch_number,
          is_current,
          batch_materials(name),
          batch_brands(name)
        `)
        .eq('user_id', user.id)
        .order('is_current', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedBatches = (data || []).map((batch: any) => ({
        id: batch.id,
        material_id: batch.material_id,
        batch_number: batch.batch_number,
        is_current: batch.is_current,
        material_name: batch.batch_materials?.name,
        brand_name: batch.batch_brands?.name
      }));

      setAvailableBatches(formattedBatches);
    } catch (error) {
      console.error('Error loading batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const addBatch = () => {
    if (availableBatches.length === 0) {
      alert('Aucun lot disponible. Veuillez d\'abord créer des lots dans la gestion des lots.');
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
        </div>
        <button
          type="button"
          onClick={addBatch}
          className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
        >
          <Plus className="w-3 h-3" />
          Ajouter un lot
        </button>
      </div>

      {selectedBatches.length === 0 ? (
        <div className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded border border-slate-200">
          Aucun lot sélectionné. Cliquez sur "Ajouter un lot" pour enregistrer la traçabilité.
        </div>
      ) : (
        <div className="space-y-2">
          {selectedBatches.map((batch, index) => (
            <div key={index} className="flex gap-2 items-center p-2 bg-slate-50 rounded border border-slate-200">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Lot</label>
                  <select
                    value={batch.batch_number_id}
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
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Quantité utilisée</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={batch.quantity_used}
                    onChange={(e) => updateBatch(index, 'quantity_used', parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
