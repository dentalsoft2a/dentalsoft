import React, { ReactNode } from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { useExtensions } from '../../hooks/useExtensions';
import { useNavigate } from 'react-router-dom';

interface ExtensionGuardProps {
  featureKey: string;
  children: ReactNode;
  fallbackMessage?: string;
}

export function ExtensionGuard({ featureKey, children, fallbackMessage }: ExtensionGuardProps) {
  const { hasFeatureAccess, getExtensionByFeature, loading, isEmployee } = useExtensions();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const hasAccess = hasFeatureAccess(featureKey);

  if (!hasAccess) {
    const extension = getExtensionByFeature(featureKey);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-8 text-white">
            <div className="flex items-center justify-center mb-4">
              <div className="p-4 bg-white/20 rounded-full">
                <Lock className="w-12 h-12" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-center mb-2">
              Fonctionnalité Premium
            </h2>
            <p className="text-center text-blue-100">
              Cette fonctionnalité nécessite une extension
            </p>
          </div>

          <div className="p-8">
            {extension ? (
              <>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {extension.name}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {extension.description}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-blue-600">
                      {extension.monthly_price.toFixed(2)} €
                    </span>
                    <span className="text-gray-500">/mois</span>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-700">
                    {isEmployee
                      ? 'Cette fonctionnalité nécessite que votre laboratoire souscrive à l\'extension correspondante. Veuillez contacter le responsable de votre laboratoire.'
                      : (fallbackMessage || 'Pour accéder à cette fonctionnalité, vous devez souscrire à l\'extension correspondante.')
                    }
                  </p>
                </div>

                {!isEmployee && (
                  <button
                    onClick={() => navigate('/extensions')}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all flex items-center justify-center gap-2"
                  >
                    Voir les extensions
                    <ArrowRight className="w-5 h-5" />
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-6">
                  {isEmployee
                    ? 'Cette fonctionnalité nécessite que votre laboratoire souscrive à une extension. Veuillez contacter le responsable de votre laboratoire.'
                    : 'Cette fonctionnalité nécessite une extension. Veuillez consulter notre catalogue d\'extensions pour en savoir plus.'
                  }
                </p>
                {!isEmployee && (
                  <button
                    onClick={() => navigate('/extensions')}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all flex items-center justify-center gap-2"
                  >
                    Voir les extensions
                    <ArrowRight className="w-5 h-5" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

interface ExtensionBadgeProps {
  featureKey: string;
  className?: string;
}

export function ExtensionBadge({ featureKey, className = '' }: ExtensionBadgeProps) {
  const { hasFeatureAccess, getExtensionByFeature } = useExtensions();

  if (hasFeatureAccess(featureKey)) {
    return null;
  }

  const extension = getExtensionByFeature(featureKey);

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full ${className}`}>
      <Lock className="w-3 h-3" />
      {extension ? extension.name : 'Premium'}
    </span>
  );
}
