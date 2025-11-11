import { AlertTriangle, LogOut, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';

export function ImpersonationBanner() {
  const { isImpersonating, impersonationSession, endImpersonation } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isEnding, setIsEnding] = useState(false);

  useEffect(() => {
    if (!impersonationSession) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expires = new Date(impersonationSession.expiresAt).getTime();
      const remaining = expires - now;

      if (remaining <= 0) {
        setTimeRemaining('Expiré');
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [impersonationSession]);

  const handleEndImpersonation = async () => {
    if (isEnding) return;
    setIsEnding(true);

    const { error } = await endImpersonation();

    if (error) {
      alert('Erreur lors de la fin de la session: ' + error.message);
      setIsEnding(false);
    }
  };

  if (!isImpersonating || !impersonationSession) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg animate-pulse">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div className="text-white">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm">MODE IMPERSONNEMENT ACTIF</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                  Connecté en tant que: {impersonationSession.targetEmail}
                </span>
              </div>
              <div className="text-xs opacity-90 mt-0.5">
                Admin: {impersonationSession.adminEmail}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-white text-sm bg-white/10 px-3 py-1.5 rounded-lg">
              <Clock className="w-4 h-4" />
              <span className="font-medium">{timeRemaining}</span>
            </div>
            <button
              onClick={handleEndImpersonation}
              disabled={isEnding}
              className="flex items-center gap-2 px-4 py-2 bg-white text-orange-600 rounded-lg font-semibold hover:bg-orange-50 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Revenir à mon compte admin</span>
              <span className="sm:hidden">Quitter</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
