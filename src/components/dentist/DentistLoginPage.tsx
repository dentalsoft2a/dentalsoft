import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Camera, ArrowLeft } from 'lucide-react';
import DentalCloudLogo from '../common/DentalCloudLogo';

interface DentistLoginPageProps {
  onNavigate: (page: string) => void;
}

export default function DentistLoginPage({ onNavigate }: DentistLoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
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
          throw new Error('Ce compte n\'est pas un compte dentiste. Utilisez la page de connexion laboratoire.');
        }

        window.location.reload();
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Une erreur est survenue lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour
        </button>

        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <DentalCloudLogo size={40} showText={false} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Connexion Dentiste</h1>
            <p className="text-sm text-slate-600">Accédez à votre portail dentiste</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
            <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl mb-5 mx-auto">
              <Camera className="w-7 h-7 text-white" />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                  placeholder="votre@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Mot de passe *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-4"
              >
                {loading ? 'Connexion en cours...' : 'Se connecter'}
              </button>
            </form>

            <div className="mt-5 text-center">
              <p className="text-sm text-slate-600">
                Pas encore inscrit ?{' '}
                <button
                  onClick={() => onNavigate('dentist-register')}
                  className="text-blue-500 hover:text-blue-600 font-medium"
                >
                  Créer un compte gratuit
                </button>
              </p>
            </div>

            <div className="mt-3 text-center">
              <p className="text-xs text-slate-500">
                Vous êtes un laboratoire ?{' '}
                <button
                  onClick={() => onNavigate('login')}
                  className="text-blue-500 hover:text-blue-600 font-medium"
                >
                  Connexion laboratoire
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
