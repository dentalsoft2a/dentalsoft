import { X, Play, CheckCircle, Clock, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface DemoWelcomeModalProps {
  onClose: () => void;
}

export function DemoWelcomeModal({ onClose }: DemoWelcomeModalProps) {
  const { createDemoAccount } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartDemo = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const { error: demoError } = await createDemoAccount();

      if (demoError) {
        throw demoError;
      }

      // Le compte est créé et l'utilisateur est automatiquement connecté
      // L'AuthContext redirigera automatiquement vers le dashboard
    } catch (err: any) {
      console.error('Error starting demo:', err);
      setError(err.message || 'Une erreur est survenue lors de la création de la démo');
      setIsCreating(false);
    }
  };

  const features = [
    'Accès complet à toutes les fonctionnalités',
    'Données de test réalistes pré-chargées',
    'Tutoriel interactif étape par étape',
    'Aucune carte bancaire requise',
    'Conversion facile vers un compte réel'
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl relative overflow-hidden animate-scale-in">
        {/* Fond décoratif */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary-200/30 to-cyan-200/30 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-cyan-200/30 to-primary-200/30 rounded-full blur-3xl -z-10" />

        {/* En-tête */}
        <div className="relative p-8 border-b border-slate-200">
          <button
            onClick={onClose}
            disabled={isCreating}
            className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <Play className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Essayer la Démo</h2>
              <p className="text-slate-600 mt-1">Découvrez DentalCloud gratuitement</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Session de 30 minutes</span> - Idéal pour explorer toutes les fonctionnalités
            </p>
          </div>
        </div>

        {/* Contenu */}
        <div className="p-8">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-600" />
              Ce qui vous attend dans la démo
            </h3>
            <div className="space-y-3">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <span className="text-slate-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-r from-primary-50 to-cyan-50 rounded-xl p-4 mb-6 border border-primary-200">
            <p className="text-sm text-slate-700 leading-relaxed">
              <span className="font-semibold text-primary-900">Données pré-chargées :</span> 8 dentistes, 15 patients,
              25 bons de livraison, 12 proformas, 8 factures et bien plus encore. Tout est déjà en place pour que
              vous puissiez tester immédiatement !
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleStartDemo}
              disabled={isCreating}
              className="flex-1 px-6 py-4 rounded-xl bg-gradient-to-r from-primary-500 to-cyan-500 text-white font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 group relative overflow-hidden"
            >
              {isCreating ? (
                <>
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Création en cours...</span>
                </>
              ) : (
                <>
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Play className="w-5 h-5 relative z-10" />
                  <span className="relative z-10">Démarrer la Démo</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              disabled={isCreating}
              className="px-6 py-4 rounded-xl border-2 border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
          </div>

          <p className="text-xs text-slate-500 text-center mt-4">
            Aucune inscription ni carte bancaire requise pour tester la démo
          </p>
        </div>
      </div>
    </div>
  );
}
