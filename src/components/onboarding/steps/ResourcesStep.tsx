import { useState, useMemo } from 'react';
import { ArrowRight, Box, Search, CheckCircle, Circle } from 'lucide-react';
import { usePredefinedResources } from '../../../hooks/useOnboarding';

interface ResourcesStepProps {
  data?: any;
  onNext: (data: any) => void;
  isLoading?: boolean;
}

export default function ResourcesStep({ data, onNext, isLoading }: ResourcesStepProps) {
  const { data: resources = [], isLoading: loadingResources } = usePredefinedResources();
  const [selectedResources, setSelectedResources] = useState<string[]>(data?.selectedResources || []);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredResources = useMemo(() => {
    return resources.filter((resource) =>
      resource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [resources, searchQuery]);

  const toggleResource = (resourceId: string) => {
    setSelectedResources((prev) =>
      prev.includes(resourceId) ? prev.filter((id) => id !== resourceId) : [...prev, resourceId]
    );
  };

  const toggleAll = () => {
    if (selectedResources.length === resources.length) {
      setSelectedResources([]);
    } else {
      setSelectedResources(resources.map((resource) => resource.id));
    }
  };

  const applyTemplate = (template: 'basic' | 'advanced') => {
    if (template === 'basic') {
      setSelectedResources(resources.slice(0, 15).map((resource) => resource.id));
    } else {
      setSelectedResources(resources.map((resource) => resource.id));
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Ressources et Matériaux</h2>
        <p className="text-gray-600">
          Sélectionnez les ressources et matériaux que vous utilisez dans votre laboratoire.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => applyTemplate('basic')}
          className="p-4 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 hover:border-blue-400 rounded-xl transition-all text-left"
        >
          <div className="font-semibold text-gray-900">Basique</div>
          <div className="text-sm text-gray-600 mt-1">~15 ressources essentielles</div>
        </button>
        <button
          onClick={() => applyTemplate('advanced')}
          className="p-4 bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 hover:border-purple-400 rounded-xl transition-all text-left"
        >
          <div className="font-semibold text-gray-900">Avancé</div>
          <div className="text-sm text-gray-600 mt-1">Toutes les ressources ({resources.length})</div>
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 mr-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une ressource..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={toggleAll}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
          >
            {selectedResources.length === resources.length ? 'Tout désélectionner' : 'Tout sélectionner'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 max-h-96 overflow-y-auto mb-6">
        {loadingResources ? (
          <div className="text-center py-8 text-gray-500">Chargement des ressources...</div>
        ) : filteredResources.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Aucune ressource trouvée</div>
        ) : (
          <div className="space-y-2">
            {filteredResources.map((resource) => {
              const isSelected = selectedResources.includes(resource.id);
              return (
                <button
                  key={resource.id}
                  onClick={() => toggleResource(resource.id)}
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
                  <Box className="w-5 h-5 text-gray-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{resource.name}</div>
                    {resource.description && (
                      <div className="text-sm text-gray-600 truncate">{resource.description}</div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded whitespace-nowrap">
                    {resource.unit}
                  </div>
                  {resource.has_variants && (
                    <div className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded whitespace-nowrap">
                      Variantes
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{selectedResources.length}</span> ressource(s) sélectionnée(s)
        </div>
        <button
          onClick={() => onNext({ selectedResources })}
          disabled={isLoading}
          className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continuer
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
