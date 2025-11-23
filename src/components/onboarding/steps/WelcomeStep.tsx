import { ArrowRight, CheckCircle, Clock, Sparkles } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useSkipOnboarding } from '../../../hooks/useOnboarding';

interface WelcomeStepProps {
  onNext: (data: any) => void;
  isLoading?: boolean;
}

export default function WelcomeStep({ onNext, isLoading }: WelcomeStepProps) {
  const { profile } = useAuth();
  const skipOnboarding = useSkipOnboarding();

  const handleSkip = () => {
    if (confirm('Êtes-vous sûr de vouloir passer la configuration ? Vous pourrez toujours configurer votre compte plus tard depuis les paramètres.')) {
      skipOnboarding.mutate();
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-6 shadow-lg">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          Bienvenue {profile?.first_name} !
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Nous sommes ravis de vous accueillir sur DentalCloud. Configurons ensemble votre laboratoire
          pour que vous puissiez commencer à travailler efficacement.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Simple et Rapide</h3>
          <p className="text-sm text-gray-600">
            Seulement 5-10 minutes pour configurer votre laboratoire
          </p>
        </div>

        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-6 rounded-xl border border-cyan-200">
          <div className="w-12 h-12 bg-cyan-600 rounded-lg flex items-center justify-center mb-4">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Articles Prédéfinis</h3>
          <p className="text-sm text-gray-600">
            Choisissez parmi des centaines d'articles déjà configurés
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
          <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Prêt à Démarrer</h3>
          <p className="text-sm text-gray-600">
            Tout sera prêt pour créer vos premiers bons de livraison
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
        <h3 className="font-semibold text-gray-900 mb-3">Ce que nous allons configurer :</h3>
        <ul className="space-y-2">
          <li className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">Vos informations de laboratoire et coordonnées</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">Les articles de votre catalogue</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">Les ressources et matériaux que vous utilisez</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">Vos préférences de gestion</span>
          </li>
        </ul>
      </div>

      <div className="flex items-center justify-between gap-4">
        <button
          onClick={handleSkip}
          disabled={skipOnboarding.isPending}
          className="px-6 py-3 text-gray-600 hover:text-gray-900 font-medium transition-colors disabled:opacity-50"
        >
          Passer cette étape
        </button>
        <button
          onClick={() => onNext({})}
          disabled={isLoading}
          className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Commencer la configuration
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
