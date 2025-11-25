import { CheckCircle, Package, Box, User, Loader2, Sparkles } from 'lucide-react';
import { usePredefinedCatalogItems, usePredefinedResources } from '../../../hooks/useOnboarding';

interface SummaryStepProps {
  allData: Record<number, any>;
  onFinish: (data: any) => void;
  isLoading?: boolean;
}

export default function SummaryStep({ allData, onFinish, isLoading }: SummaryStepProps) {
  const { data: catalogItems = [] } = usePredefinedCatalogItems();
  const { data: resources = [] } = usePredefinedResources();

  const selectedCatalogItems = catalogItems.filter((item) =>
    allData[3]?.selectedItems?.includes(item.id)
  );
  const selectedResources = resources.filter((resource) =>
    allData[4]?.selectedResources?.includes(resource.id)
  );

  const hasDentist = allData[5]?.dentistName;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl mb-6 shadow-lg">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Prêt à Démarrer !</h2>
        <p className="text-lg text-gray-600">
          Voici un récapitulatif de votre configuration
        </p>
      </div>

      <div className="space-y-4 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">Articles de Catalogue</h3>
              <p className="text-gray-700 mb-3">
                <span className="text-2xl font-bold text-blue-600">{selectedCatalogItems.length}</span> articles
                seront ajoutés à votre catalogue
              </p>
              {selectedCatalogItems.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedCatalogItems.slice(0, 5).map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full text-sm text-gray-700"
                    >
                      <CheckCircle className="w-3 h-3 text-blue-600" />
                      {item.name}
                    </span>
                  ))}
                  {selectedCatalogItems.length > 5 && (
                    <span className="inline-flex items-center bg-white px-3 py-1 rounded-full text-sm text-gray-700 font-medium">
                      +{selectedCatalogItems.length - 5} autres
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Box className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">Ressources et Matériaux</h3>
              <p className="text-gray-700 mb-3">
                <span className="text-2xl font-bold text-purple-600">{selectedResources.length}</span> ressources
                seront disponibles pour la gestion
              </p>
              {selectedResources.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedResources.slice(0, 5).map((resource) => (
                    <span
                      key={resource.id}
                      className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full text-sm text-gray-700"
                    >
                      <CheckCircle className="w-3 h-3 text-purple-600" />
                      {resource.name}
                    </span>
                  ))}
                  {selectedResources.length > 5 && (
                    <span className="inline-flex items-center bg-white px-3 py-1 rounded-full text-sm text-gray-700 font-medium">
                      +{selectedResources.length - 5} autres
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {hasDentist && (
          <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Premier Dentiste</h3>
                <p className="text-gray-700">
                  <span className="font-semibold">{allData[5]?.dentistName}</span> sera ajouté à vos contacts
                </p>
                {allData[5]?.dentistEmail && (
                  <p className="text-sm text-gray-600 mt-1">{allData[5]?.dentistEmail}</p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
        <h3 className="font-semibold text-gray-900 mb-2">Que va-t-il se passer maintenant ?</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <span>Tous vos articles et ressources seront créés avec un stock initial à 0</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <span>Les étapes de production par défaut seront configurées</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <span>Vous serez redirigé vers le tableau de bord pour commencer à utiliser DentalCloud</span>
          </li>
        </ul>
      </div>

      <div className="text-center">
        <button
          onClick={() => onFinish({})}
          disabled={isLoading}
          className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Configuration en cours...
            </>
          ) : (
            <>
              <CheckCircle className="w-6 h-6" />
              Confirmer et Démarrer
            </>
          )}
        </button>
        <p className="text-sm text-gray-500 mt-3">
          Cela peut prendre quelques secondes...
        </p>
      </div>
    </div>
  );
}
