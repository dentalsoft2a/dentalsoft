import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useExtensions } from '../../hooks/useExtensions';
import { Package, Check, X, Calendar, CreditCard, ChevronRight, Sparkles, Lock } from 'lucide-react';
import * as Icons from 'lucide-react';

interface Extension {
  id: string;
  name: string;
  description: string;
  monthly_price: number;
  is_active: boolean;
  icon: string;
  sort_order: number;
}

interface ExtensionFeature {
  id: string;
  extension_id: string;
  feature_key: string;
  feature_name: string;
  description: string | null;
}

interface UserExtension {
  id: string;
  user_id: string;
  extension_id: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  start_date: string;
  expiry_date: string | null;
  auto_renew: boolean;
  cancelled_at: string | null;
}

export default function ExtensionsPage() {
  const { user } = useAuth();
  const { extensions, userExtensions, loading, reloadExtensions, hasUnlockAllAccess } = useExtensions();
  const [features, setFeatures] = useState<ExtensionFeature[]>([]);
  const [processingExtension, setProcessingExtension] = useState<string | null>(null);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    const { data, error } = await supabase
      .from('extension_features')
      .select('*');

    if (!error && data) {
      setFeatures(data);
    }
  };

  const getIconComponent = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName.split('-').map((word: string) =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('')] || Package;
    return IconComponent;
  };

  const getUserExtension = (extensionId: string): UserExtension | undefined => {
    return userExtensions.find(ue => ue.extension_id === extensionId);
  };

  const isExtensionActive = (extensionId: string): boolean => {
    const userExt = getUserExtension(extensionId);
    if (!userExt || userExt.status !== 'active') return false;
    if (userExt.expiry_date && new Date(userExt.expiry_date) < new Date()) return false;
    return true;
  };

  const getExtensionFeatures = (extensionId: string) => {
    return features.filter(f => f.extension_id === extensionId);
  };

  const handleSubscribe = async (extensionId: string) => {
    const extension = extensions.find(e => e.id === extensionId);
    if (!extension) return;

    alert(
      `Pour activer l'extension "${extension.name}" (${extension.monthly_price.toFixed(2)}€/mois), veuillez contacter notre équipe support.\n\n` +
      `Vous pouvez également passer au Plan Premium Complet (99.99€/mois) qui débloque automatiquement TOUTES les extensions actuelles et futures.`
    );

    // Rediriger vers la page d'abonnement
    if (confirm('Voulez-vous voir le Plan Premium Complet?')) {
      window.location.href = '/#/subscription';
    }
  };

  const handleCancelSubscription = async (extensionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cet abonnement?')) return;

    setProcessingExtension(extensionId);
    try {
      const userExt = getUserExtension(extensionId);
      if (!userExt) return;

      const { error } = await supabase
        .from('user_extensions')
        .update({
          status: 'cancelled',
          auto_renew: false,
          cancelled_at: new Date().toISOString()
        })
        .eq('id', userExt.id);

      if (error) throw error;

      alert('Abonnement annulé avec succès');
      reloadExtensions();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert('Erreur lors de l\'annulation de l\'abonnement');
    } finally {
      setProcessingExtension(null);
    }
  };

  const handleReactivateSubscription = async (extensionId: string) => {
    setProcessingExtension(extensionId);
    try {
      const userExt = getUserExtension(extensionId);
      if (!userExt) return;

      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);

      const { error } = await supabase
        .from('user_extensions')
        .update({
          status: 'active',
          auto_renew: true,
          expiry_date: expiryDate.toISOString(),
          cancelled_at: null
        })
        .eq('id', userExt.id);

      if (error) throw error;

      alert('Abonnement réactivé avec succès');
      reloadExtensions();
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      alert('Erreur lors de la réactivation de l\'abonnement');
    } finally {
      setProcessingExtension(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const activeExtensions = userExtensions.filter(ue => isExtensionActive(ue.extension_id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Extensions</h1>
        <p className="text-gray-600 mt-2">
          Débloquez des fonctionnalités avancées pour votre laboratoire dentaire
        </p>
      </div>

      {hasUnlockAllAccess && (
        <div className="mb-8 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-6 border-2 border-amber-400 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 backdrop-blur rounded-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-1">Plan Premium Complet Actif</h2>
              <p className="text-white/90 text-sm">
                Toutes les extensions sont déjà incluses dans votre plan. Profitez de toutes les fonctionnalités sans limites!
              </p>
            </div>
          </div>
        </div>
      )}

      {activeExtensions.length > 0 && (
        <div className="mb-8 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Mes Extensions Actives</h2>
              <p className="text-sm text-gray-600">Vous avez {activeExtensions.length} extension(s) active(s)</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeExtensions.map(userExt => {
              const extension = extensions.find(e => e.id === userExt.extension_id);
              if (!extension) return null;

              const IconComponent = getIconComponent(extension.icon);
              const expiryDate = userExt.expiry_date ? new Date(userExt.expiry_date) : null;

              return (
                <div key={userExt.id} className="bg-white rounded-lg p-4 shadow-sm border border-blue-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <IconComponent className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{extension.name}</h3>
                      <p className="text-xs text-gray-500">
                        {expiryDate ? `Expire le ${expiryDate.toLocaleDateString('fr-FR')}` : 'Actif'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCancelSubscription(extension.id)}
                    disabled={processingExtension === extension.id}
                    className="w-full mt-2 px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
                  >
                    Annuler l'abonnement
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {extensions.filter(ext => ext.is_active).map(extension => {
          const IconComponent = getIconComponent(extension.icon);
          const extensionFeatures = getExtensionFeatures(extension.id);
          const userExt = getUserExtension(extension.id);
          const isActive = isExtensionActive(extension.id);
          const isCancelled = userExt?.status === 'cancelled';
          const isExpired = userExt?.status === 'expired';

          return (
            <div
              key={extension.id}
              className={`bg-white rounded-xl shadow-lg border-2 overflow-hidden transition-all hover:shadow-xl ${
                isActive ? 'border-blue-500' : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className={`p-6 ${isActive ? 'bg-gradient-to-br from-blue-50 to-cyan-50' : 'bg-white'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${isActive ? 'bg-blue-600' : 'bg-gray-100'}`}>
                      <IconComponent className={`w-8 h-8 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{extension.name}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-2xl font-bold text-blue-600">
                          {extension.monthly_price.toFixed(2)} €
                        </span>
                        <span className="text-sm text-gray-500">/mois</span>
                      </div>
                    </div>
                  </div>
                  {isActive && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
                      Active
                    </span>
                  )}
                  {isCancelled && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-semibold rounded-full">
                      Annulé
                    </span>
                  )}
                  {isExpired && (
                    <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded-full">
                      Expiré
                    </span>
                  )}
                </div>

                <p className="text-gray-600 mb-6">{extension.description}</p>

                <div className="space-y-3 mb-6">
                  <p className="text-sm font-semibold text-gray-700">Fonctionnalités incluses:</p>
                  {extensionFeatures.map(feature => (
                    <div key={feature.id} className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <Check className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{feature.feature_name}</p>
                        {feature.description && (
                          <p className="text-sm text-gray-600">{feature.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {!isActive && !isCancelled && !isExpired && (
                  hasUnlockAllAccess ? (
                    <div className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Inclus dans votre Plan Premium Complet
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(extension.id)}
                      disabled={processingExtension === extension.id}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {processingExtension === extension.id ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Activation...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5" />
                          S'abonner maintenant
                        </>
                      )}
                    </button>
                  )
                )}

                {(isCancelled || isExpired) && (
                  <button
                    onClick={() => handleReactivateSubscription(extension.id)}
                    disabled={processingExtension === extension.id}
                    className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {processingExtension === extension.id ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Réactivation...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        Réactiver l'abonnement
                      </>
                    )}
                  </button>
                )}

                {userExt && userExt.expiry_date && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {isActive
                        ? `Prochain renouvellement: ${new Date(userExt.expiry_date).toLocaleDateString('fr-FR')}`
                        : `Expiré le: ${new Date(userExt.expiry_date).toLocaleDateString('fr-FR')}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 bg-gray-50 rounded-xl p-6 border border-gray-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Lock className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Paiement sécurisé
            </h3>
            <p className="text-gray-600 text-sm">
              Tous les paiements sont sécurisés et cryptés. Vous pouvez annuler votre abonnement à tout moment.
              Les extensions sont facturées mensuellement et se renouvellent automatiquement sauf annulation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
