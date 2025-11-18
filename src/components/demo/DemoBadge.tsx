import { Play, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function DemoBadge() {
  const { isDemoAccount, demoExpiresAt } = useAuth();

  if (!isDemoAccount || !demoExpiresAt) return null;

  const timeLeft = new Date(demoExpiresAt).getTime() - new Date().getTime();
  const minutesLeft = Math.floor(timeLeft / 60000);

  return (
    <div className="flex items-center gap-3">
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary-400 to-cyan-400 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-300 animate-pulse" />
        <div className="relative px-4 py-2 bg-white rounded-lg border-2 border-primary-300 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
          <Play className="w-4 h-4 text-primary-600" />
          <span className="text-sm font-semibold text-primary-700">Mode Démo</span>
          <span className="text-xs text-primary-600 font-medium ml-1">({minutesLeft}min)</span>
        </div>

        {/* Tooltip au survol */}
        <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 w-64 bg-slate-900 text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
          <p className="font-semibold mb-1">Session de démonstration</p>
          <p className="text-slate-300 mb-2">
            Vous explorez DentalCloud avec des données de test. Créez un compte pour sauvegarder vos données réelles.
          </p>
          <p className="text-primary-300 font-medium">
            Temps restant: {minutesLeft} minute{minutesLeft > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <button
        onClick={() => window.location.href = '/'}
        className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary-500 to-cyan-500 text-white text-sm font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center gap-2 group"
      >
        <span>Créer un Compte</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}
