import { CheckCircle, Building2, Stethoscope, Package, Settings, Loader2 } from 'lucide-react';

interface SummaryStepProps {
  allData: Record<number, any>;
  onFinish: (data: any) => void;
  isLoading?: boolean;
}

export default function SummaryStep({ allData, onFinish, isLoading }: SummaryStepProps) {
  const cabinetInfo = allData[2] || {};
  const servicesCount = allData[3]?.selectedServices?.length || 0;
  const suppliesCount = allData[4]?.selectedSupplies?.length || 0;
  const config = allData[5] || {};

  const handleFinish = () => {
    onFinish({ confirmed: true });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl mb-3">
          <CheckCircle className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Récapitulatif de la Configuration
        </h2>
        <p className="text-slate-600">
          Vérifiez les informations avant de finaliser
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 mb-2">Cabinet Dentaire</h3>
              <div className="space-y-1 text-sm text-slate-600">
                <p><span className="font-medium">Nom:</span> {cabinetInfo.cabinetName || 'Non défini'}</p>
                <p><span className="font-medium">Type:</span> {cabinetInfo.cabinetType || 'Non défini'}</p>
                {cabinetInfo.address && (
                  <p><span className="font-medium">Adresse:</span> {cabinetInfo.address}, {cabinetInfo.postalCode} {cabinetInfo.city}</p>
                )}
                {cabinetInfo.phone && (
                  <p><span className="font-medium">Téléphone:</span> {cabinetInfo.phone}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 mb-2">Actes Dentaires</h3>
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-green-700 text-lg">{servicesCount}</span> actes sélectionnés pour votre catalogue
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 mb-2">Fournitures Dentaires</h3>
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-orange-700 text-lg">{suppliesCount}</span> fournitures à suivre en stock
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 mb-2">Configuration</h3>
              <div className="space-y-1 text-sm text-slate-600">
                <p><span className="font-medium">TVA:</span> {config.defaultTaxRate || 0}%</p>
                <p><span className="font-medium">Tiers payant:</span> {config.acceptTiersPayant ? 'Activé' : 'Désactivé'}</p>
                <p><span className="font-medium">Alertes stock:</span> {config.enableStockAlerts ? `Activées (seuil: ${config.lowStockThreshold})` : 'Désactivées'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <h3 className="font-semibold text-slate-900">Prêt à démarrer !</h3>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Votre cabinet sera configuré avec tous les éléments sélectionnés. Vous pourrez :
        </p>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            Gérer vos patients et leur historique de soins
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            Créer des devis et factures avec calcul automatique
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            Suivre vos stocks de fournitures en temps réel
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            Analyser votre activité avec des statistiques détaillées
          </li>
        </ul>
      </div>

      <div className="flex justify-center pt-4">
        <button
          onClick={handleFinish}
          disabled={isLoading}
          className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 text-lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Configuration en cours...
            </>
          ) : (
            <>
              <CheckCircle className="w-6 h-6" />
              Finaliser la configuration
            </>
          )}
        </button>
      </div>
    </div>
  );
}
