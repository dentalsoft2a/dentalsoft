import { CheckCircle, Lock, Sparkles, Key } from 'lucide-react';
import { useDentistSubscription } from '../../hooks/useDentistSubscription';
import { useState } from 'react';

interface SubscriptionLockedScreenProps {
  feature: string;
  onSubscribe?: () => void;
  onRedeemCode?: () => void;
}

const FEATURE_DETAILS: Record<string, { title: string; description: string; benefits: string[] }> = {
  patients: {
    title: 'Gestion des Patients',
    description: 'Centralisez toutes les informations de vos patients en un seul endroit',
    benefits: [
      'Fichier patient complet avec historique',
      'Informations sécurisées et RGPD',
      'Accès rapide aux données patient',
      'Suivi des traitements en cours'
    ]
  },
  catalog: {
    title: 'Catalogue d\'Actes CCAM',
    description: 'Gérez votre catalogue d\'actes dentaires avec codes CCAM intégrés',
    benefits: [
      'Base CCAM complète et mise à jour',
      'Tarifs personnalisables',
      'Remboursements CPAM automatiques',
      'Création d\'actes personnalisés'
    ]
  },
  stock: {
    title: 'Gestion du Stock',
    description: 'Suivez vos fournitures dentaires en temps réel',
    benefits: [
      'Suivi en temps réel des stocks',
      'Alertes de stock bas',
      'Historique des mouvements',
      'Optimisation des achats'
    ]
  },
  invoicing: {
    title: 'Facturation Cabinet',
    description: 'Facturez vos patients de manière professionnelle',
    benefits: [
      'Factures conformes et professionnelles',
      'Calcul automatique CPAM/Mutuelle',
      'Suivi des paiements',
      'Export PDF et envoi email'
    ]
  },
  default: {
    title: 'Gestion Complète de Votre Cabinet',
    description: 'Débloquez toutes les fonctionnalités premium pour gérer efficacement votre cabinet dentaire',
    benefits: [
      'Gestion illimitée des patients',
      'Catalogue d\'actes avec codes CCAM',
      'Suivi en temps réel du stock',
      'Facturation professionnelle'
    ]
  }
};

export default function SubscriptionLockedScreen({
  feature,
  onSubscribe,
  onRedeemCode
}: SubscriptionLockedScreenProps) {
  const { canStartTrial, activateTrial, loading: subscriptionLoading } = useDentistSubscription();
  const [activating, setActivating] = useState(false);

  const details = FEATURE_DETAILS[feature] || FEATURE_DETAILS.default;

  const handleStartTrial = async () => {
    setActivating(true);
    try {
      const result = await activateTrial();
      if (result.success) {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error starting trial:', error);
      alert('Une erreur est survenue');
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-blue-50 to-green-50">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 border border-slate-200">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                <Lock className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-md animate-pulse">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center text-slate-900 mb-3">
            {details.title}
          </h1>

          <p className="text-center text-slate-600 mb-8 text-lg">
            {details.description}
          </p>

          <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-xl p-6 mb-8 border border-blue-100">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Fonctionnalités incluses
            </h2>
            <div className="space-y-3">
              {details.benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-xl p-6 mb-6 text-white">
            <div className="text-center mb-4">
              <div className="text-4xl font-bold mb-2">59,99€<span className="text-xl font-normal">/mois</span></div>
              <div className="text-blue-100">+ 15 jours d'essai gratuit</div>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>Sans engagement • Annulation à tout moment</span>
            </div>
          </div>

          <div className="space-y-3">
            {canStartTrial ? (
              <button
                onClick={handleStartTrial}
                disabled={activating || subscriptionLoading}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-green-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {activating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Activation en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Démarrer l'essai gratuit de 15 jours
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={onSubscribe}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-green-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Voir les détails de l'offre
              </button>
            )}

            <button
              onClick={onRedeemCode}
              className="w-full px-6 py-3 bg-white text-slate-700 border-2 border-slate-300 rounded-xl font-medium hover:bg-slate-50 hover:border-slate-400 transition-all flex items-center justify-center gap-2"
            >
              <Key className="w-5 h-5" />
              J'ai un code promo
            </button>
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            Aucun paiement maintenant. Vous ne serez facturé qu'à la fin de la période d'essai.
          </p>
        </div>
      </div>
    </div>
  );
}
