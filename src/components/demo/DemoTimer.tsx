import { Clock, X, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface DemoTimerProps {
  onExpired: () => void;
}

export function DemoTimer({ onExpired }: DemoTimerProps) {
  const { demoExpiresAt } = useAuth();
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningShown20, setWarningShown20] = useState(false);
  const [warningShown5, setWarningShown5] = useState(false);
  const [warningShown2, setWarningShown2] = useState(false);

  useEffect(() => {
    if (!demoExpiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expires = new Date(demoExpiresAt).getTime();
      const remaining = Math.max(0, expires - now);

      setTimeLeft(remaining);

      // Afficher des notifications aux moments clés
      const minutesLeft = Math.floor(remaining / 60000);

      if (minutesLeft <= 2 && !warningShown2) {
        setWarningShown2(true);
        showNotification('⏰ Plus que 2 minutes ! Votre session démo se termine bientôt.');
      } else if (minutesLeft <= 5 && !warningShown5) {
        setWarningShown5(true);
        showNotification('⏰ Plus que 5 minutes de démonstration restantes.');
      } else if (minutesLeft <= 20 && !warningShown20) {
        setWarningShown20(true);
        showNotification('📋 Il reste 20 minutes pour explorer la démo.');
      }

      if (remaining === 0) {
        onExpired();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [demoExpiresAt, onExpired, warningShown20, warningShown5, warningShown2]);

  const showNotification = (message: string) => {
    // Créer une notification système si disponible
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('DentalCloud Démo', { body: message });
    }
  };

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  const getTimerColor = () => {
    if (minutes <= 2) return 'from-red-500 to-rose-500';
    if (minutes <= 5) return 'from-orange-500 to-amber-500';
    if (minutes <= 10) return 'from-amber-500 to-yellow-500';
    return 'from-primary-500 to-cyan-500';
  };

  const getTextColor = () => {
    if (minutes <= 2) return 'text-red-600';
    if (minutes <= 5) return 'text-orange-600';
    if (minutes <= 10) return 'text-amber-600';
    return 'text-primary-600';
  };

  if (!demoExpiresAt) return null;

  return (
    <>
      <div className="fixed top-4 right-4 z-40 animate-fade-in">
        <div className="bg-white rounded-xl shadow-2xl border-2 border-slate-200 overflow-hidden">
          <div className={`h-1 bg-gradient-to-r ${getTimerColor()}`} />
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getTimerColor()} flex items-center justify-center`}>
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium mb-0.5">Session Démo</div>
                <div className={`text-lg font-bold ${getTextColor()} tabular-nums`}>
                  {minutes}:{seconds.toString().padStart(2, '0')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal d'avertissement final */}
      {minutes <= 1 && !showWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Session bientôt terminée</h3>
                <p className="text-slate-600">Moins d'une minute restante</p>
              </div>
            </div>

            <p className="text-slate-700 mb-6 leading-relaxed">
              Votre session de démonstration se termine dans moins d'une minute. Pour continuer à utiliser DentalCloud
              avec toutes vos données sauvegardées, créez un compte gratuit maintenant !
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowWarning(true);
                  window.location.href = '/';
                }}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-cyan-500 text-white font-semibold hover:shadow-xl transition-all"
              >
                Créer un compte
              </button>
              <button
                onClick={() => setShowWarning(true)}
                className="px-6 py-3 rounded-xl border-2 border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                Continuer la démo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
