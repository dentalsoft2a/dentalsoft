import { useState, useEffect } from 'react';
import { X, Cookie, Settings } from 'lucide-react';

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true, // Always true, cannot be disabled
    functional: false,
    analytics: false,
    marketing: false
  });

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      // Show banner after a short delay for better UX
      setTimeout(() => setShowBanner(true), 1000);
    } else {
      const savedPreferences = JSON.parse(consent);
      setPreferences(savedPreferences);
    }
  }, []);

  const acceptAll = () => {
    const allAccepted = {
      essential: true,
      functional: true,
      analytics: true,
      marketing: true
    };
    savePreferences(allAccepted);
  };

  const acceptEssential = () => {
    const essentialOnly = {
      essential: true,
      functional: false,
      analytics: false,
      marketing: false
    };
    savePreferences(essentialOnly);
  };

  const saveCustomPreferences = () => {
    savePreferences(preferences);
    setShowSettings(false);
  };

  const savePreferences = (prefs: typeof preferences) => {
    localStorage.setItem('cookieConsent', JSON.stringify(prefs));
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    setPreferences(prefs);
    setShowBanner(false);

    // Here you would initialize tracking scripts based on preferences
    // For example:
    // if (prefs.analytics) { initAnalytics(); }
    // if (prefs.marketing) { initMarketing(); }
  };

  if (!showBanner) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => !showSettings && setShowBanner(false)} />

      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-2xl border border-gray-200">
          {!showSettings ? (
            <div className="p-6">
              <div className="flex items-start gap-4">
                <Cookie className="w-8 h-8 text-sky-600 flex-shrink-0 mt-1" />

                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">
                    Nous utilisons des cookies
                  </h2>

                  <p className="text-gray-700 mb-4">
                    Nous utilisons des cookies essentiels pour assurer le bon fonctionnement de notre service.
                    Ces cookies sont nécessaires à votre authentification et à la sécurité de votre compte.
                  </p>

                  <p className="text-sm text-gray-600 mb-4">
                    DentalCloud n'utilise actuellement <strong>aucun cookie de suivi, d'analyse ou publicitaire</strong>.
                    Seuls les cookies strictement nécessaires au fonctionnement du service sont utilisés.
                  </p>

                  <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-700">
                      <strong>Cookies essentiels utilisés :</strong>
                    </p>
                    <ul className="text-sm text-gray-600 mt-2 space-y-1">
                      <li>• Cookie de session (supabase.auth.token) - Maintien de votre connexion</li>
                      <li>• Cookie de sécurité CSRF - Protection contre les attaques</li>
                      <li>• Cookie de consentement - Enregistrement de votre choix</li>
                    </ul>
                  </div>

                  <p className="text-xs text-gray-500 mb-4">
                    Pour plus d'informations, consultez notre{' '}
                    <a href="/privacy-policy#cookies" className="text-sky-600 hover:text-sky-700 underline">
                      Politique de Confidentialité
                    </a>.
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={acceptAll}
                      className="px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors font-medium"
                    >
                      J'accepte
                    </button>

                    <button
                      onClick={acceptEssential}
                      className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Cookies essentiels uniquement
                    </button>

                    <button
                      onClick={() => setShowSettings(true)}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Personnaliser
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setShowBanner(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Settings className="w-6 h-6 text-sky-600" />
                  Paramètres des cookies
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={preferences.essential}
                        disabled
                        className="w-4 h-4 text-sky-600 rounded cursor-not-allowed opacity-50"
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900">Cookies essentiels</h3>
                        <p className="text-sm text-gray-600">Requis pour le fonctionnement du site</p>
                      </div>
                    </div>
                    <span className="text-xs bg-sky-100 text-sky-800 px-2 py-1 rounded">
                      Toujours actif
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 ml-7">
                    Ces cookies sont nécessaires pour vous permettre de vous connecter, naviguer
                    et utiliser les fonctionnalités du service. Ils ne peuvent pas être désactivés.
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 opacity-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={preferences.functional}
                        disabled
                        className="w-4 h-4 text-sky-600 rounded cursor-not-allowed"
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900">Cookies fonctionnels</h3>
                        <p className="text-sm text-gray-600">Amélioration de l'expérience utilisateur</p>
                      </div>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      Non utilisé
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 ml-7">
                    DentalCloud n'utilise actuellement aucun cookie fonctionnel.
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 opacity-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={preferences.analytics}
                        disabled
                        className="w-4 h-4 text-sky-600 rounded cursor-not-allowed"
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900">Cookies analytiques</h3>
                        <p className="text-sm text-gray-600">Statistiques d'utilisation anonymes</p>
                      </div>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      Non utilisé
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 ml-7">
                    DentalCloud n'utilise actuellement aucun outil d'analyse ou de statistiques.
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 opacity-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={preferences.marketing}
                        disabled
                        className="w-4 h-4 text-sky-600 rounded cursor-not-allowed"
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900">Cookies marketing</h3>
                        <p className="text-sm text-gray-600">Publicité ciblée</p>
                      </div>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      Non utilisé
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 ml-7">
                    DentalCloud n'utilise aucun cookie publicitaire ou de marketing.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={saveCustomPreferences}
                  className="flex-1 px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors font-medium"
                >
                  Enregistrer mes préférences
                </button>

                <button
                  onClick={() => setShowSettings(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
