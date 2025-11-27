import { useState } from 'react';
import { ArrowRight, Settings } from 'lucide-react';

interface ConfigurationStepProps {
  data?: any;
  onNext: (data: any) => void;
  isLoading?: boolean;
}

export default function ConfigurationStep({ data, onNext, isLoading }: ConfigurationStepProps) {
  const [formData, setFormData] = useState({
    defaultTaxRate: data?.defaultTaxRate || 0,
    acceptTiersPayant: data?.acceptTiersPayant || true,
    defaultPaymentTerms: data?.defaultPaymentTerms || 'immediate',
    enableStockAlerts: data?.enableStockAlerts || true,
    lowStockThreshold: data?.lowStockThreshold || 10,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl mb-3">
          <Settings className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Configuration Générale
        </h2>
        <p className="text-slate-600">
          Personnalisez les paramètres de votre cabinet
        </p>
      </div>

      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Paramètres de Facturation</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Taux de TVA par défaut
              </label>
              <select
                value={formData.defaultTaxRate}
                onChange={(e) => setFormData({ ...formData, defaultTaxRate: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value={0}>0% (Exonéré)</option>
                <option value={5.5}>5.5%</option>
                <option value={10}>10%</option>
                <option value={20}>20%</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Les soins dentaires sont généralement exonérés de TVA
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Conditions de paiement par défaut
              </label>
              <select
                value={formData.defaultPaymentTerms}
                onChange={(e) => setFormData({ ...formData, defaultPaymentTerms: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="immediate">Immédiat</option>
                <option value="15days">15 jours</option>
                <option value="30days">30 jours</option>
                <option value="45days">45 jours</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="tiersPayant"
                checked={formData.acceptTiersPayant}
                onChange={(e) => setFormData({ ...formData, acceptTiersPayant: e.target.checked })}
                className="w-5 h-5 text-green-600 border-slate-300 rounded focus:ring-green-500"
              />
              <label htmlFor="tiersPayant" className="text-sm text-slate-700">
                Accepter le tiers payant (CPAM/Mutuelle)
              </label>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Gestion de Stock</h3>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="stockAlerts"
                checked={formData.enableStockAlerts}
                onChange={(e) => setFormData({ ...formData, enableStockAlerts: e.target.checked })}
                className="w-5 h-5 text-green-600 border-slate-300 rounded focus:ring-green-500"
              />
              <label htmlFor="stockAlerts" className="text-sm text-slate-700">
                Activer les alertes de stock bas
              </label>
            </div>

            {formData.enableStockAlerts && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Seuil d'alerte par défaut
                </label>
                <input
                  type="number"
                  value={formData.lowStockThreshold}
                  onChange={(e) => setFormData({ ...formData, lowStockThreshold: Number(e.target.value) })}
                  min="1"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Vous serez alerté quand le stock passe sous cette quantité
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
        >
          Continuer
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
}
