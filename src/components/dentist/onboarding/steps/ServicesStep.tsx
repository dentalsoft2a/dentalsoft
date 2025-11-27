import { useState, useMemo } from 'react';
import { ArrowRight, Stethoscope, Search, CheckCircle2 } from 'lucide-react';
import { usePredefinedDentalServices } from '../../../../hooks/useDentalOnboarding';

interface ServicesStepProps {
  data?: any;
  onNext: (data: any) => void;
  isLoading?: boolean;
}

export default function ServicesStep({ data, onNext, isLoading }: ServicesStepProps) {
  const [selectedServices, setSelectedServices] = useState<string[]>(data?.selectedServices || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { data: services, isLoading: loadingServices } = usePredefinedDentalServices();

  const categories = useMemo(() => {
    if (!services) return [];
    const cats = Array.from(new Set(services.map(s => s.category)));
    return cats.sort();
  }, [services]);

  const filteredServices = useMemo(() => {
    if (!services) return [];

    return services.filter(service => {
      const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           service.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [services, searchTerm, selectedCategory]);

  const toggleService = (id: string) => {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    onNext({ selectedServices });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl mb-3">
          <Stethoscope className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Sélectionnez vos Actes Dentaires
        </h2>
        <p className="text-slate-600">
          Choisissez les actes que vous pratiquez régulièrement
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-slate-700">
          <span className="font-semibold">{selectedServices.length} actes sélectionnés</span> - Vous pourrez toujours ajouter ou modifier ces actes plus tard.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un acte..."
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
        {loadingServices ? (
          <div className="text-center py-8 text-slate-500">Chargement des actes...</div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-8 text-slate-500">Aucun acte trouvé</div>
        ) : (
          filteredServices.map(service => (
            <div
              key={service.id}
              onClick={() => toggleService(service.id)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedServices.includes(service.id)
                  ? 'border-green-500 bg-green-50'
                  : 'border-slate-200 hover:border-green-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900">{service.name}</h3>
                    {service.ccam_code && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-mono">
                        {service.ccam_code}
                      </span>
                    )}
                  </div>
                  {service.description && (
                    <p className="text-sm text-slate-600 mb-2">{service.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-600">
                      Tarif: <span className="font-semibold text-slate-900">{service.default_price.toFixed(2)}€</span>
                    </span>
                    {service.cpam_reimbursement > 0 && (
                      <span className="text-green-600">
                        CPAM: {service.cpam_reimbursement.toFixed(2)}€
                      </span>
                    )}
                  </div>
                </div>
                {selectedServices.includes(service.id) && (
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex justify-between items-center pt-4">
        <button
          onClick={() => setSelectedServices(filteredServices.map(s => s.id))}
          className="text-green-600 hover:text-green-700 font-medium text-sm"
        >
          Tout sélectionner ({filteredServices.length})
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
