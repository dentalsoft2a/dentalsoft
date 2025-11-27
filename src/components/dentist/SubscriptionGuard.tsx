import { ReactNode } from 'react';
import { useDentistSubscription } from '../../hooks/useDentistSubscription';
import SubscriptionLockedScreen from './SubscriptionLockedScreen';
import { Clock } from 'lucide-react';

interface SubscriptionGuardProps {
  children: ReactNode;
  feature: string;
  onSubscribe?: () => void;
  onRedeemCode?: () => void;
}

export default function SubscriptionGuard({
  children,
  feature,
  onSubscribe,
  onRedeemCode
}: SubscriptionGuardProps) {
  const {
    hasAccess,
    loading,
    subscriptionStatus,
    trialDaysRemaining
  } = useDentistSubscription();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Vérification de votre abonnement...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <SubscriptionLockedScreen
        feature={feature}
        onSubscribe={onSubscribe}
        onRedeemCode={onRedeemCode}
      />
    );
  }

  return (
    <>
      {subscriptionStatus === 'trial' && trialDaysRemaining !== null && trialDaysRemaining <= 3 && (
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white py-3 px-4 mb-4 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5" />
              <div>
                <p className="font-semibold">Votre essai gratuit expire dans {trialDaysRemaining} jour{trialDaysRemaining > 1 ? 's' : ''}</p>
                <p className="text-sm text-white/90">Passez à Premium pour continuer à utiliser ces fonctionnalités</p>
              </div>
            </div>
            {onSubscribe && (
              <button
                onClick={onSubscribe}
                className="px-4 py-2 bg-white text-orange-600 rounded-lg font-semibold hover:bg-orange-50 transition-colors"
              >
                Souscrire maintenant
              </button>
            )}
          </div>
        </div>
      )}
      {children}
    </>
  );
}
