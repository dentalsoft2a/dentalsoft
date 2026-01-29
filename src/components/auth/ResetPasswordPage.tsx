import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import DentalCloudLogo from '../common/DentalCloudLogo';
import { useNavigate } from 'react-router-dom';

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isValidRecoverySession, setIsValidRecoverySession] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isSubscribed = true;

    const checkRecoverySession = async () => {
      try {
        console.log('[Reset Password] Checking session...');
        console.log('[Reset Password] Full URL:', window.location.href);
        console.log('[Reset Password] URL hash:', window.location.hash);

        // Check if this is a direct navigation without hash (not from email link)
        if (!window.location.hash) {
          console.log('[Reset Password] No hash in URL - not a valid reset link');
          if (isSubscribed) {
            setIsCheckingSession(false);
            setIsValidRecoverySession(false);
            setError('Accès direct non autorisé. Veuillez utiliser le lien envoyé par email.');
          }
          return;
        }

        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        const urlError = hashParams.get('error');
        const errorCode = hashParams.get('error_code');
        const errorDescription = hashParams.get('error_description');

        if (urlError) {
          console.error('[Reset Password] Error in URL:', urlError, errorCode, errorDescription);

          let errorMessage = 'Lien de réinitialisation invalide ou expiré.';

          if (errorCode === 'otp_expired') {
            errorMessage = 'Ce lien de réinitialisation a expiré. Les liens sont valides pendant 1 heure et ne peuvent être utilisés qu\'une seule fois.';
          } else if (errorCode === 'otp_disabled') {
            errorMessage = 'Ce lien de réinitialisation a déjà été utilisé. Chaque lien ne peut être utilisé qu\'une seule fois.';
          } else if (urlError === 'access_denied') {
            errorMessage = 'Accès refusé. Le lien de réinitialisation est invalide ou a expiré.';
          }

          if (isSubscribed) {
            setIsCheckingSession(false);
            setIsValidRecoverySession(false);
            setError(errorMessage + ' Veuillez faire une nouvelle demande de réinitialisation.');
          }
          return;
        }

        const hasRecoveryToken = hashParams.get('type') === 'recovery' ||
                                 hashParams.get('access_token') !== null;

        console.log('[Reset Password] Has recovery token in URL:', hasRecoveryToken);

        if (!hasRecoveryToken && !window.location.hash) {
          console.log('[Reset Password] No hash in URL - invalid link');
          if (isSubscribed) {
            setIsCheckingSession(false);
            setIsValidRecoverySession(false);
            setError('Lien de réinitialisation invalide. Veuillez faire une nouvelle demande.');
          }
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        const { data } = await supabase.auth.getSession();
        console.log('[Reset Password] Session data:', data);

        if (isSubscribed && data.session) {
          console.log('[Reset Password] Valid session found!');
          setIsValidRecoverySession(true);
          setIsCheckingSession(false);
          if (timeoutId) clearTimeout(timeoutId);
        }
      } catch (err) {
        console.error('[Reset Password] Error checking session:', err);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Reset Password] Auth state changed:', event, session?.user?.email);

      if (!isSubscribed) return;

      if (event === 'PASSWORD_RECOVERY') {
        console.log('[Reset Password] PASSWORD_RECOVERY event detected!');
        setIsValidRecoverySession(true);
        setIsCheckingSession(false);
        if (timeoutId) clearTimeout(timeoutId);
      } else if (event === 'SIGNED_IN' && session) {
        console.log('[Reset Password] SIGNED_IN event detected!');
        setIsValidRecoverySession(true);
        setIsCheckingSession(false);
        if (timeoutId) clearTimeout(timeoutId);
      }
    });

    checkRecoverySession();

    timeoutId = setTimeout(() => {
      if (isSubscribed && !isValidRecoverySession) {
        console.log('[Reset Password] Timeout reached - no valid session detected');
        setIsCheckingSession(false);
        setError('Lien de réinitialisation invalide ou expiré. Veuillez faire une nouvelle demande.');
      }
    }, 10000);

    return () => {
      isSubscribed = false;
      if (timeoutId) clearTimeout(timeoutId);
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setSuccess(true);

      // Sign out the user to clear the recovery session
      await supabase.auth.signOut();

      // Redirect to login page after a short delay
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la réinitialisation du mot de passe');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-cyan-50">
      <div className="w-full max-w-md animate-scale-in">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-slate-200/50">
          <div className="flex flex-col items-center mb-8">
            <div className="mb-4">
              <DentalCloudLogo size={56} showText={false} />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 via-cyan-600 to-primary-600 bg-clip-text text-transparent">DentalCloud</h1>
            <p className="text-slate-600 mt-2">Réinitialiser le mot de passe</p>
          </div>

          {isCheckingSession ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-600 text-sm">Vérification du lien de réinitialisation...</p>
            </div>
          ) : !isValidRecoverySession ? (
            <div className="space-y-4">
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 text-center animate-slide-in">
                <h2 className="text-lg font-bold text-red-700 mb-2">Lien invalide ou expiré</h2>
                <p className="text-red-600 text-sm mb-4">{error || 'Ce lien de réinitialisation n\'est plus valide.'}</p>
              </div>
              <button
                onClick={() => navigate('/')}
                className="w-full bg-gradient-to-r from-primary-500 to-cyan-500 text-white py-3 rounded-lg font-medium hover:from-primary-600 hover:to-cyan-600 transition-all duration-200 shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40"
              >
                Retour à la connexion
              </button>
            </div>
          ) : success ? (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center animate-slide-in">
              <h2 className="text-lg font-bold text-green-700 mb-2">Mot de passe réinitialisé avec succès</h2>
              <p className="text-green-600 text-sm">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
              <p className="text-green-500 text-xs mt-2">Redirection automatique dans quelques secondes...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 mb-2">
                  Nouveau mot de passe
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all duration-200"
                  placeholder="••••••••"
                />
                <p className="text-xs text-slate-500 mt-1">Minimum 6 caractères</p>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-2">
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all duration-200"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm animate-slide-in">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary-500 to-cyan-500 text-white py-3 rounded-lg font-medium hover:from-primary-600 hover:to-cyan-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40"
              >
                {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
              </button>

              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate('/');
                }}
                className="w-full bg-slate-100 text-slate-600 py-3 rounded-lg font-medium hover:bg-slate-200 transition-all duration-200"
              >
                Annuler
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
