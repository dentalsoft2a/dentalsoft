import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DentalCloudLogo from '../common/DentalCloudLogo';

interface UnifiedLoginPageProps {
  onNavigate: (page: string) => void;
}

export default function UnifiedLoginPage({ onNavigate }: UnifiedLoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [laboratoryName, setLaboratoryName] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isRegisterMode) {
      const { error } = await signUp(email, password, firstName, lastName, laboratoryName);
      if (error) {
        setError(error.message);
        setLoading(false);
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-slate-200">
          <div className="flex flex-col items-center mb-8">
            <div className="mb-4">
              <DentalCloudLogo size={64} showText={false} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              {isRegisterMode ? 'Créer un compte' : 'Connexion'}
            </h1>
            <p className="text-slate-600 text-sm">
              {isRegisterMode ? 'Créez votre compte laboratoire' : 'Accédez à votre espace'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-2">
                      Prénom
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                      placeholder="Jean"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-2">
                      Nom
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                      placeholder="Dupont"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="laboratoryName" className="block text-sm font-medium text-slate-700 mb-2">
                    Nom du laboratoire
                  </label>
                  <input
                    id="laboratoryName"
                    type="text"
                    value={laboratoryName}
                    onChange={(e) => setLaboratoryName(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                    placeholder="Laboratoire Dentaire"
                  />
                </div>
              </>
            )}

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
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
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
                minLength={isRegisterMode ? 6 : undefined}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                placeholder="••••••••"
              />
              {isRegisterMode && (
                <p className="text-xs text-slate-500 mt-1">Minimum 6 caractères</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-500 to-cyan-500 text-white py-3.5 rounded-xl font-medium hover:from-primary-600 hover:to-cyan-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              {loading
                ? (isRegisterMode ? 'Création...' : 'Connexion...')
                : (isRegisterMode ? 'Créer mon compte' : 'Se connecter')
              }
            </button>

            <div className="text-center">
              <p className="text-slate-600 text-sm">
                {isRegisterMode ? (
                  <>
                    Déjà un compte ?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisterMode(false);
                        setError('');
                      }}
                      className="text-primary-600 font-medium hover:text-primary-700 transition-colors hover:underline"
                    >
                      Se connecter
                    </button>
                  </>
                ) : (
                  <>
                    Pas encore de compte ?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisterMode(true);
                        setError('');
                      }}
                      className="text-primary-600 font-medium hover:text-primary-700 transition-colors hover:underline"
                    >
                      Créer un compte
                    </button>
                  </>
                )}
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
