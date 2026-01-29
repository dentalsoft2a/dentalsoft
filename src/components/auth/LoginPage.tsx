import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import DentalCloudLogo from '../common/DentalCloudLogo';
import { Camera, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LoginPageProps {
  onToggleRegister: () => void;
  onNavigateToDentistRegister?: () => void;
}

export default function LoginPage({ onToggleRegister, onNavigateToDentistRegister }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<'laboratory' | 'dentist'>('laboratory');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (userType === 'dentist') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        if (data.user) {
          const { data: dentistAccount, error: dentistError } = await supabase
            .from('dentist_accounts')
            .select('id')
            .eq('id', data.user.id)
            .maybeSingle();

          if (dentistError) throw dentistError;

          if (!dentistAccount) {
            await supabase.auth.signOut();
            throw new Error('Ce compte n\'est pas un compte dentiste. Utilisez le mode "Laboratoire".');
          }

          window.location.reload();
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la connexion');
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess(false);
    setResetLoading(true);

    try {
      console.log('[Reset Password Request] Sending reset code to:', resetEmail);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-reset-password-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de l\'envoi du code');
      }

      console.log('[Reset Password Request] Code sent successfully');
      setResetSuccess(true);
      setResetEmail('');

      setTimeout(() => {
        setShowResetModal(false);
        setResetSuccess(false);
        setResetLoading(false);
        navigate('/reset-password');
      }, 2000);
    } catch (err: any) {
      console.error('[Reset Password Request] Error:', err);
      setResetError(err.message || 'Erreur lors de l\'envoi du code de réinitialisation');
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-scale-in">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-slate-200/50">
          <div className="flex flex-col items-center mb-8">
            <div className="mb-4">
              <DentalCloudLogo size={56} showText={false} />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 via-cyan-600 to-primary-600 bg-clip-text text-transparent">DentalCloud</h1>
            <p className="text-slate-600 mt-2">
              {userType === 'laboratory' ? 'Gestion professionnelle pour laboratoires dentaires' : 'Portail dentiste'}
            </p>
          </div>

          <div className="mb-6">
            <div className="bg-slate-100 rounded-xl p-1 flex gap-1">
              <button
                type="button"
                onClick={() => setUserType('laboratory')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
                  userType === 'laboratory'
                    ? 'bg-gradient-to-r from-primary-500 to-cyan-500 text-white shadow-lg'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Laboratoire</span>
              </button>
              <button
                type="button"
                onClick={() => setUserType('dentist')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
                  userType === 'dentist'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Dentiste</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all duration-200 hover:border-primary-300"
                placeholder="votre@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all duration-200 hover:border-primary-300"
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
              className="w-full bg-gradient-to-r from-primary-500 to-cyan-500 text-white py-3 rounded-lg font-medium hover:from-primary-600 hover:to-cyan-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 hover:scale-102"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 space-y-3 text-center">
            <p className="text-slate-600 text-sm">
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="text-primary-600 font-medium hover:text-primary-700 transition-colors duration-200 hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </p>
            <p className="text-slate-600 text-sm">
              Pas encore de compte ?{' '}
              <button
                onClick={userType === 'dentist' && onNavigateToDentistRegister ? onNavigateToDentistRegister : onToggleRegister}
                className="text-primary-600 font-medium hover:text-primary-700 transition-colors duration-200 hover:underline"
              >
                Créer un compte {userType === 'dentist' ? 'dentiste' : 'laboratoire'}
              </button>
            </p>
          </div>
        </div>
      </div>

      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-scale-in">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Réinitialiser le mot de passe</h2>
            <p className="text-slate-600 text-sm mb-6">Entrez votre email pour recevoir un code de réinitialisation</p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700 mb-2">
                  Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all duration-200"
                  placeholder="votre@email.com"
                />
              </div>

              {resetError && (
                <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm animate-slide-in">
                  {resetError}
                </div>
              )}

              {resetSuccess && (
                <div className="bg-green-50 border-2 border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm animate-slide-in">
                  Code de réinitialisation envoyé ! Vérifiez votre email et utilisez /reset-password
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setResetError('');
                    setResetSuccess(false);
                    setResetEmail('');
                  }}
                  className="flex-1 px-4 py-3 rounded-lg border-2 border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors duration-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 bg-gradient-to-r from-primary-500 to-cyan-500 text-white py-3 rounded-lg font-medium hover:from-primary-600 hover:to-cyan-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resetLoading ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
