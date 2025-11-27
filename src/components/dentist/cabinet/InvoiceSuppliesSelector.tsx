import { useState, useEffect } from 'react';
import { Plus, Trash2, Search, AlertTriangle, Package } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

export interface InvoiceSupply {
  id: string;
  resource_id: string;
  resource_name: string;
  quantity: number;
  unit: string;
  available_stock: number;
}

interface Resource {
  id: string;
  name: string;
  unit: string;
  stock_quantity: number;
  low_stock_threshold: number;
  category: string;
}

interface InvoiceSuppliesSelectorProps {
  supplies: InvoiceSupply[];
  onSuppliesChange: (supplies: InvoiceSupply[]) => void;
  disabled?: boolean;
}

export default function InvoiceSuppliesSelector({
  supplies,
  onSuppliesChange,
  disabled = false
}: InvoiceSuppliesSelectorProps) {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSelector, setShowSelector] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadResources();
  }, [user]);

  const loadResources = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dental_resources')
        .select('id, name, unit, stock_quantity, low_stock_threshold, category')
        .eq('dentist_id', user.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error('Error loading resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredResources = resources.filter(resource =>
    resource.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !supplies.some(s => s.resource_id === resource.id)
  );

  const addSupply = (resource: Resource) => {
    const newSupply: InvoiceSupply = {
      id: crypto.randomUUID(),
      resource_id: resource.id,
      resource_name: resource.name,
      quantity: 1,
      unit: resource.unit,
      available_stock: resource.stock_quantity,
    };

    onSuppliesChange([...supplies, newSupply]);
    setSearchTerm('');
    setShowSelector(false);
  };

  const updateQuantity = (id: string, quantity: number) => {
    onSuppliesChange(
      supplies.map(supply =>
        supply.id === id ? { ...supply, quantity } : supply
      )
    );
  };

  const removeSupply = (id: string) => {
    onSuppliesChange(supplies.filter(s => s.id !== id));
  };

  const hasInsufficientStock = (supply: InvoiceSupply): boolean => {
    return supply.quantity > supply.available_stock;
  };

  const totalInsufficientStock = supplies.filter(hasInsufficientStock).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Fournitures utilisées</h3>
          <p className="text-sm text-slate-600">Stock déduit lors de la validation</p>
        </div>
        <button
          type="button"
          onClick={() => setShowSelector(!showSelector)}
          disabled={disabled}
          className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <Plus className="w-4 h-4" />
          Ajouter fourniture
        </button>
      </div>

      {totalInsufficientStock > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <p className="text-sm text-orange-900">
            <span className="font-semibold">{totalInsufficientStock}</span> fourniture
            {totalInsufficientStock > 1 ? 's ont' : ' a'} un stock insuffisant
          </p>
        </div>
      )}

      {showSelector && (
        <div className="border border-teal-200 rounded-lg p-4 bg-teal-50">
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher une fourniture..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {loading ? (
              <p className="text-center text-slate-500 py-4">Chargement...</p>
            ) : filteredResources.length === 0 ? (
              <p className="text-center text-slate-500 py-4">
                {searchTerm ? 'Aucune fourniture trouvée' : 'Toutes les fournitures sont déjà ajoutées'}
              </p>
            ) : (
              filteredResources.map(resource => {
                const isLowStock = resource.stock_quantity <= resource.low_stock_threshold;

                return (
                  <button
                    key={resource.id}
                    type="button"
                    onClick={() => addSupply(resource)}
                    className="w-full text-left p-3 bg-white rounded-lg hover:bg-teal-100 transition border border-slate-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isLowStock ? 'bg-orange-100' : 'bg-teal-100'
                        }`}>
                          <Package className={`w-5 h-5 ${isLowStock ? 'text-orange-600' : 'text-teal-600'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{resource.name}</p>
                          <div className="flex items-center gap-2 text-xs mt-1">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                              {resource.category}
                            </span>
                            {isLowStock && (
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded font-semibold">
                                Stock bas
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${isLowStock ? 'text-orange-600' : 'text-slate-900'}`}>
                          {resource.stock_quantity} {resource.unit}
                        </p>
                        <p className="text-xs text-slate-500">disponible</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {supplies.length === 0 ? (
        <div className="text-center py-6 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
          <Package className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">Aucune fourniture ajoutée</p>
          <p className="text-xs text-slate-400 mt-1">Les fournitures sont optionnelles</p>
        </div>
      ) : (
        <div className="space-y-2">
          {supplies.map(supply => {
            const insufficient = hasInsufficientStock(supply);

            return (
              <div
                key={supply.id}
                className={`border-2 rounded-lg p-3 ${
                  insufficient
                    ? 'border-orange-300 bg-orange-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-medium text-slate-900">{supply.resource_name}</p>
                      {insufficient && (
                        <span className="flex items-center gap-1 text-xs text-orange-700 font-semibold">
                          <AlertTriangle className="w-3 h-3" />
                          Stock insuffisant
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-600">Quantité:</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={supply.quantity}
                          onChange={(e) => updateQuantity(supply.id, Number(e.target.value))}
                          disabled={disabled}
                          className={`w-20 px-2 py-1 border rounded text-sm text-center ${
                            insufficient
                              ? 'border-orange-300 bg-orange-100'
                              : 'border-slate-300'
                          }`}
                        />
                        <span className="text-sm text-slate-600">{supply.unit}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-slate-600">Stock: </span>
                        <span className={`font-semibold ${insufficient ? 'text-orange-600' : 'text-green-600'}`}>
                          {supply.available_stock} {supply.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSupply(supply.id)}
                    disabled={disabled}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
