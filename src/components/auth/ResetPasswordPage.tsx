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
    let isSubscribed = true;

    const verifyRecoverySession = async () => {
      try {
        console.log('[Reset Password] Starting verification...');
        console.log('[Reset Password] Full URL:', window.location.href);
        console.log('[Reset Password] Hash:', window.location.hash);

        // Check if we have a hash with parameters
        if (!window.location.hash || window.location.hash === '#') {
          console.log('[Reset Password] No hash parameters found');
          if (isSubscribed) {
            setIsCheckingSession(false);
            setIsValidRecoverySession(false);
            setError(
              'Pour réinitialiser votre mot de passe, vous devez cliquer sur le lien reçu par email. ' +
              'Si vous n\'avez pas reçu d\'email, retournez à la page de connexion.'
            );
          }
          return;
        }

        // Parse hash parameters
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        console.log('[Reset Password] Hash parameters:', Object.fromEntries(hashParams.entries()));

        // Check for errors in URL
        const urlError = hashParams.get('error');
        const errorCode = hashParams.get('error_code');
        const errorDescription = hashParams.get('error_description');

        if (urlError) {
          console.error('[Reset Password] Error in URL:', { urlError, errorCode, errorDescription });

          let errorMessage = 'Lien de réinitialisation invalide ou expiré.';
          if (errorCode === 'otp_expired') {
            errorMessage = 'Ce lien a expiré. Les liens sont valides pendant 1 heure.';
          } else if (errorCode === 'otp_disabled') {
            errorMessage = 'Ce lien a déjà été utilisé.';
          }

          if (isSubscribed) {
            setIsCheckingSession(false);
            setIsValidRecoverySession(false);
            setError(errorMessage + ' Veuillez demander un nouveau lien.');
          }
          return;
        }

        // Check for access token and type
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');

        console.log('[Reset Password] Token check:', {
          hasAccessToken: !!accessToken,
          type,
          tokenLength: accessToken?.length
        });

        if (!accessToken || type !== 'recovery') {
          console.log('[Reset Password] Missing recovery token or wrong type');
          if (isSubscribed) {
            setIsCheckingSession(false);
            setIsValidRecoverySession(false);
            setError('Lien de réinitialisation invalide. Veuillez demander un nouveau lien.');
          }
          return;
        }

        // Let Supabase process the hash (it does this automatically)
        // Wait a bit for Supabase to set up the session
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if we have a valid session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        console.log('[Reset Password] Session check:', {
          hasSession: !!session,
          userEmail: session?.user?.email,
          error: sessionError
        });

        if (sessionError) {
          console.error('[Reset Password] Session error:', sessionError);
          if (isSubscribed) {
            setIsCheckingSession(false);
            setIsValidRecoverySession(false);
            setError('Erreur lors de la vérification de la session. Veuillez redemander un lien.');
          }
          return;
        }

        if (session) {
          console.log('[Reset Password] Valid recovery session detected!');
          if (isSubscribed) {
            setIsValidRecoverySession(true);
            setIsCheckingSession(false);
          }
        } else {
          console.log('[Reset Password] No valid session found');
          if (isSubscribed) {
            setIsCheckingSession(false);
            setIsValidRecoverySession(false);
            setError('Session de récupération invalide. Veuillez redemander un lien.');
          }
        }
      } catch (err) {
        console.error('[Reset Password] Error during verification:', err);
        if (isSubscribed) {
          setIsCheckingSession(false);
          setIsValidRecoverySession(false);
          setError('Erreur lors de la vérification du lien. Veuillez réessayer.');
        }
      }
    };

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Reset Password] Auth event:', event, 'Session:', !!session);

      if (!isSubscribed) return;

      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        console.log('[Reset Password] Recovery session established via event');
        setIsValidRecoverySession(true);
        setIsCheckingSession(false);
      }
    });

    // Start verification
    verifyRecoverySession();

    return () => {
      isSubscribed = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
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
      console.log('[Reset Password] Attempting to update password...');

      // Verify we still have a valid session before updating
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.error('[Reset Password] No active session found');
        setError('Session expirée. Veuillez redemander un nouveau lien de réinitialisation.');
        setLoading(false);
        return;
      }

      console.log('[Reset Password] Session valid, updating password...');

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('[Reset Password] Error updating password:', updateError);
        throw updateError;
      }

      console.log('[Reset Password] Password updated successfully');
      setSuccess(true);

      // Sign out immediately to require login with new password
      await supabase.auth.signOut();
      console.log('[Reset Password] User signed out after password reset');

      // Redirect to login page
      setTimeout(() => {
        navigate('/');
      }, 2500);
    } catch (err: any) {
      console.error('[Reset Password] Error during password reset:', err);

      let errorMessage = 'Erreur lors de la réinitialisation du mot de passe';

      if (err.message?.includes('session')) {
        errorMessage = 'Session expirée. Veuillez redemander un nouveau lien.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
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
