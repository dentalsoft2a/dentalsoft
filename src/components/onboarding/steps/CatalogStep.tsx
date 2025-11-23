import { useState, useMemo } from 'react';
import { ArrowRight, Package, Search, CheckCircle, Circle } from 'lucide-react';
import { usePredefinedCatalogItems } from '../../../hooks/useOnboarding';

interface CatalogStepProps {
  data?: any;
  onNext: (data: any) => void;
  isLoading?: boolean;
}

export default function CatalogStep({ data, onNext, isLoading }: CatalogStepProps) {
  const { data: catalogItems = [], isLoading: loadingItems } = usePredefinedCatalogItems();
  const [selectedItems, setSelectedItems] = useState<string[]>(data?.selectedItems || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = useMemo(() => {
    const cats = new Set(catalogItems.map((item) => item.category));
    return ['all', ...Array.from(cats)];
  }, [catalogItems]);

  const filteredItems = useMemo(() => {
    return catalogItems.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [catalogItems, searchQuery, selectedCategory]);

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const toggleAll = () => {
    if (selectedItems.length === catalogItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(catalogItems.map((item) => item.id));
    }
  };

  const applyTemplate = (template: 'essential' | 'standard' | 'complete') => {
    if (template === 'essential') {
      setSelectedItems(catalogItems.slice(0, 20).map((item) => item.id));
    } else if (template === 'standard') {
      setSelectedItems(catalogItems.slice(0, 40).map((item) => item.id));
    } else {
      setSelectedItems(catalogItems.map((item) => item.id));
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Articles du Catalogue</h2>
        <p className="text-gray-600">
          Sélectionnez les articles que vous souhaitez ajouter à votre catalogue. Vous pourrez toujours en ajouter d'autres plus tard.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => applyTemplate('essential')}
          className="p-4 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 hover:border-blue-400 rounded-xl transition-all text-left"
        >
          <div className="font-semibold text-gray-900">Essentiels</div>
          <div className="text-sm text-gray-600 mt-1">~20 articles les plus courants</div>
        </button>
        <button
          onClick={() => applyTemplate('standard')}
          className="p-4 bg-cyan-50 hover:bg-cyan-100 border-2 border-cyan-200 hover:border-cyan-400 rounded-xl transition-all text-left"
        >
          <div className="font-semibold text-gray-900">Standard</div>
          <div className="text-sm text-gray-600 mt-1">~40 articles variés</div>
        </button>
        <button
          onClick={() => applyTemplate('complete')}
          className="p-4 bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 hover:border-purple-400 rounded-xl transition-all text-left"
        >
          <div className="font-semibold text-gray-900">Complet</div>
          <div className="text-sm text-gray-600 mt-1">Tous les articles ({catalogItems.length})</div>
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="relative flex-1 mr-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un article..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={toggleAll}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
          >
            {selectedItems.length === catalogItems.length ? 'Tout désélectionner' : 'Tout sélectionner'}
          </button>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat === 'all' ? 'Tous' : cat}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 max-h-96 overflow-y-auto mb-6">
        {loadingItems ? (
          <div className="text-center py-8 text-gray-500">Chargement des articles...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Aucun article trouvé</div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => {
              const isSelected = selectedItems.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                    isSelected
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'bg-gray-50 border-2 border-transparent hover:border-gray-300'
                  }`}
                >
                  {isSelected ? (
                    <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                  <Package className="w-5 h-5 text-gray-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    {item.description && (
                      <div className="text-sm text-gray-600 truncate">{item.description}</div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {item.category}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{selectedItems.length}</span> article(s) sélectionné(s)
        </div>
        <button
          onClick={() => onNext({ selectedItems })}
          disabled={selectedItems.length === 0 || isLoading}
          className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continuer
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
