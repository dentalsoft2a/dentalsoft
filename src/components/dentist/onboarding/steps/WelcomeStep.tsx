import { ArrowRight, Stethoscope, FileText, Package, CreditCard } from 'lucide-react';

interface WelcomeStepProps {
  onNext: (data: any) => void;
  isLoading?: boolean;
}

export default function WelcomeStep({ onNext, isLoading }: WelcomeStepProps) {
  const handleContinue = () => {
    onNext({ started: true });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-teal-500 rounded-2xl mb-4">
          <Stethoscope className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-3">
          Bienvenue dans votre espace de gestion
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Configurez votre cabinet dentaire en quelques minutes pour bénéficier d'une gestion complète.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
          <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">Facturation Patients</h3>
          <p className="text-sm text-slate-600">
            Créez des devis et factures avec calcul automatique des parts CPAM, mutuelle et patient.
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
          <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mb-4">
            <Package className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">Gestion de Stock</h3>
          <p className="text-sm text-slate-600">
            Suivez vos fournitures dentaires avec traçabilité des lots et alertes de stock bas.
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
          <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-4">
            <Stethoscope className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">Catalogue d'Actes</h3>
          <p className="text-sm text-slate-600">
            Gérez vos actes dentaires avec codes CCAM et tarifs conventionnés.
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200">
          <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mb-4">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">Suivi des Paiements</h3>
          <p className="text-sm text-slate-600">
            Gérez les paiements patients et les règlements tiers payant en toute simplicité.
          </p>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
        <p className="text-sm text-slate-700 text-center">
          Cette configuration ne prend que <span className="font-semibold text-green-700">5 minutes</span> et vous permettra de gérer votre cabinet de manière professionnelle.
        </p>
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleContinue}
          disabled={isLoading}
          className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
        >
          Commencer la configuration
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
