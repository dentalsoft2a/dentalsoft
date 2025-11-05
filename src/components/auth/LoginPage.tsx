import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DentalCloudLogo from '../common/DentalCloudLogo';

interface LoginPageProps {
  onToggleRegister: () => void;
  onViewLanding?: () => void;
}

export default function LoginPage({ onToggleRegister, onViewLanding }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
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
            <p className="text-slate-600 mt-2">Gestion professionnelle pour laboratoires dentaires</p>
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

          <div className="mt-6 text-center space-y-3">
            <p className="text-slate-600 text-sm">
              Pas encore de compte ?{' '}
              <button
                onClick={onToggleRegister}
                className="text-primary-600 font-medium hover:text-primary-700 transition-colors duration-200 hover:underline"
              >
                Créer un compte
              </button>
            </p>
            {onViewLanding && (
              <p className="text-slate-600 text-sm">
                <button
                  onClick={onViewLanding}
                  className="text-cyan-600 font-medium hover:text-cyan-700 transition-colors duration-200 hover:underline"
                >
                  En savoir plus sur DentalCloud
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
