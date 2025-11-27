import { useState, useMemo } from 'react';
import { ArrowRight, Package, Search, CheckCircle2 } from 'lucide-react';
import { usePredefinedDentalSupplies } from '../../../../hooks/useDentalOnboarding';

interface SuppliesStepProps {
  data?: any;
  onNext: (data: any) => void;
  isLoading?: boolean;
}

export default function SuppliesStep({ data, onNext, isLoading }: SuppliesStepProps) {
  const [selectedSupplies, setSelectedSupplies] = useState<string[]>(data?.selectedSupplies || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { data: supplies, isLoading: loadingSupplies } = usePredefinedDentalSupplies();

  const categories = useMemo(() => {
    if (!supplies) return [];
    const cats = Array.from(new Set(supplies.map(s => s.category)));
    return cats.sort();
  }, [supplies]);

  const filteredSupplies = useMemo(() => {
    if (!supplies) return [];

    return supplies.filter(supply => {
      const matchesSearch = supply.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           supply.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || supply.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [supplies, searchTerm, selectedCategory]);

  const toggleSupply = (id: string) => {
    setSelectedSupplies(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    onNext({ selectedSupplies });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl mb-3">
          <Package className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Sélectionnez vos Fournitures
        </h2>
        <p className="text-slate-600">
          Choisissez les fournitures que vous souhaitez suivre en stock
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-slate-700">
          <span className="font-semibold">{selectedSupplies.length} fournitures sélectionnées</span> - Vous pourrez gérer vos stocks et recevoir des alertes.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher une fourniture..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="all">Toutes les catégories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="max-h-96 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-4">
        {loadingSupplies ? (
          <div className="text-center py-8 text-slate-500">Chargement des fournitures...</div>
        ) : filteredSupplies.length === 0 ? (
          <div className="text-center py-8 text-slate-500">Aucune fourniture trouvée</div>
        ) : (
          filteredSupplies.map(supply => (
            <div
              key={supply.id}
              onClick={() => toggleSupply(supply.id)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedSupplies.includes(supply.id)
                  ? 'border-green-500 bg-green-50'
                  : 'border-slate-200 hover:border-green-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900">{supply.name}</h3>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                      {supply.unit}
                    </span>
                  </div>
                  {supply.description && (
                    <p className="text-sm text-slate-600 mb-2">{supply.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs">
                    {supply.has_batch_tracking && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                        Traçabilité lots
                      </span>
                    )}
                    {supply.has_expiry_date && (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                        Date péremption
                      </span>
                    )}
                  </div>
                </div>
                {selectedSupplies.includes(supply.id) && (
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex justify-between items-center pt-4">
        <button
          onClick={() => setSelectedSupplies(filteredSupplies.map(s => s.id))}
          className="text-green-600 hover:text-green-700 font-medium text-sm"
        >
          Tout sélectionner ({filteredSupplies.length})
        </button>
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
        >
          Continuer
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
