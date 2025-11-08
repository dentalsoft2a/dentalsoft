import { useState, useEffect } from 'react';
import { Download, X, Share, MoreVertical } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const hasSeenPrompt = localStorage.getItem('pwa_install_prompt_seen');

    if (isStandalone || hasSeenPrompt) {
      return;
    }

    const userAgent = navigator.userAgent.toLowerCase();
    const iOS = /iphone|ipad|ipod/.test(userAgent);
    const android = /android/.test(userAgent);

    setIsIOS(iOS);
    setIsAndroid(android);

    if (iOS || android) {
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
    handleDismiss();
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_install_prompt_seen', 'true');
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] lg:hidden animate-slide-up">
      <div className="mx-4 mb-4 bg-gradient-to-r from-primary-500 to-cyan-500 rounded-2xl shadow-2xl border-2 border-white/20 overflow-hidden">
        <div className="relative p-4">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <div className="flex items-start gap-3 pr-8">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <Download className="w-5 h-5 text-white" />
            </div>

            <div className="flex-1">
              <h3 className="text-white font-bold text-sm mb-1">
                Installer DentalCloud
              </h3>

              {isIOS && (
                <div className="space-y-2">
                  <p className="text-white/90 text-xs leading-relaxed">
                    Ajoutez cette application à votre écran d'accueil pour un accès rapide
                  </p>
                  <div className="bg-white/15 backdrop-blur-sm rounded-lg p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-white/25 rounded-full flex items-center justify-center text-white text-xs font-bold">1</span>
                      <div className="flex items-center gap-1.5 flex-1">
                        <p className="text-white text-xs">Appuyez sur</p>
                        <Share className="w-4 h-4 text-white" />
                        <p className="text-white text-xs">(Partager)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-white/25 rounded-full flex items-center justify-center text-white text-xs font-bold">2</span>
                      <p className="text-white text-xs flex-1">
                        Faites défiler et sélectionnez <span className="font-semibold">"Sur l'écran d'accueil"</span>
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-white/25 rounded-full flex items-center justify-center text-white text-xs font-bold">3</span>
                      <p className="text-white text-xs flex-1">
                        Appuyez sur <span className="font-semibold">"Ajouter"</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isAndroid && !deferredPrompt && (
                <div className="space-y-2">
                  <p className="text-white/90 text-xs leading-relaxed">
                    Ajoutez cette application à votre écran d'accueil
                  </p>
                  <div className="bg-white/15 backdrop-blur-sm rounded-lg p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-white/25 rounded-full flex items-center justify-center text-white text-xs font-bold">1</span>
                      <div className="flex items-center gap-1.5 flex-1">
                        <p className="text-white text-xs">Appuyez sur</p>
                        <MoreVertical className="w-4 h-4 text-white" />
                        <p className="text-white text-xs">(Menu)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-white/25 rounded-full flex items-center justify-center text-white text-xs font-bold">2</span>
                      <p className="text-white text-xs flex-1">
                        Sélectionnez <span className="font-semibold">"Installer l'application"</span> ou <span className="font-semibold">"Ajouter à l'écran d'accueil"</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isAndroid && deferredPrompt && (
                <div className="space-y-2">
                  <p className="text-white/90 text-xs leading-relaxed mb-3">
                    Profitez d'une expérience optimale avec l'application
                  </p>
                  <button
                    onClick={handleInstallClick}
                    className="w-full bg-white text-primary-600 font-bold text-sm py-2.5 px-4 rounded-lg hover:bg-white/95 active:scale-98 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Installer l'application
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
