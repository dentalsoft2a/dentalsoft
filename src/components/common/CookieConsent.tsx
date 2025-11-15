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
      {!showSettings && (
        <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 max-w-md">
          <div className="bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden">
            <div className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                  <Cookie className="w-4 h-4 text-sky-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">
                    Cookies essentiels
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Nous utilisons uniquement des cookies nécessaires au fonctionnement et à la sécurité du service.
                  </p>
                </div>
                <button
                  onClick={() => setShowBanner(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={acceptAll}
                  className="flex-1 px-3 py-1.5 bg-sky-600 text-white text-xs font-medium rounded-md hover:bg-sky-700 transition-colors"
                >
                  Accepter
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 text-xs font-medium rounded-md hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                >
                  <Settings className="w-3 h-3" />
                  Détails
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowSettings(false)} />
          <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl z-50">
            <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-sky-600" />
                    Paramètres des cookies
                  </h2>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="border border-slate-200 rounded-lg p-4 bg-sky-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={preferences.essential}
                          disabled
                          className="w-4 h-4 text-sky-600 rounded cursor-not-allowed opacity-50"
                        />
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">Cookies essentiels</h3>
                          <p className="text-xs text-slate-600">Requis pour le fonctionnement</p>
                        </div>
                      </div>
                      <span className="text-xs bg-sky-600 text-white px-2 py-0.5 rounded-full font-medium">
                        Actif
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 ml-7 leading-relaxed">
                      Cookies nécessaires pour la connexion, la navigation et la sécurité.
                    </p>
                  </div>

                  <div className="border border-slate-200 rounded-lg p-4 opacity-60">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={preferences.functional}
                          disabled
                          className="w-4 h-4 text-slate-400 rounded cursor-not-allowed"
                        />
                        <div>
                          <h3 className="text-sm font-semibold text-slate-700">Cookies fonctionnels</h3>
                          <p className="text-xs text-slate-500">Amélioration de l'expérience</p>
                        </div>
                      </div>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        Non utilisé
                      </span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg p-4 opacity-60">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={preferences.analytics}
                          disabled
                          className="w-4 h-4 text-slate-400 rounded cursor-not-allowed"
                        />
                        <div>
                          <h3 className="text-sm font-semibold text-slate-700">Cookies analytiques</h3>
                          <p className="text-xs text-slate-500">Statistiques d'utilisation</p>
                        </div>
                      </div>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        Non utilisé
                      </span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg p-4 opacity-60">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={preferences.marketing}
                          disabled
                          className="w-4 h-4 text-slate-400 rounded cursor-not-allowed"
                        />
                        <div>
                          <h3 className="text-sm font-semibold text-slate-700">Cookies marketing</h3>
                          <p className="text-xs text-slate-500">Publicité ciblée</p>
                        </div>
                      </div>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        Non utilisé
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={saveCustomPreferences}
                    className="flex-1 px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 transition-colors"
                  >
                    Enregistrer
                  </button>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
