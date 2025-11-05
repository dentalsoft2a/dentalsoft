import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DentalCloudLogo from '../common/DentalCloudLogo';
import { Building2, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface UnifiedLoginPageProps {
  onNavigate: (page: string) => void;
}

type UserType = 'laboratory' | 'dentist';

export default function UnifiedLoginPage({ onNavigate }: UnifiedLoginPageProps) {
  const [userType, setUserType] = useState<UserType>('laboratory');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [laboratoryName, setLaboratoryName] = useState('');
  const [laboratoryId, setLaboratoryId] = useState('');
  const [laboratories, setLaboratories] = useState<Array<{ id: string; laboratory_name: string }>>([]);
  const [showLabSelection, setShowLabSelection] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const loadLaboratories = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, laboratory_name')
      .eq('user_type', 'laboratory')
      .order('laboratory_name');

    if (data) {
      setLaboratories(data);
    }
  };

  const handleDentistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!showLabSelection) {
      await loadLaboratories();
      setShowLabSelection(true);
      setLoading(false);
      return;
    }

    if (!laboratoryId) {
      setError('Veuillez sélectionner un laboratoire');
      setLoading(false);
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          user_type: 'dentist',
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email: authData.user.email!,
        first_name: firstName,
        last_name: lastName,
        user_type: 'dentist',
      });

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      const { error: favError } = await supabase.from('dentist_favorite_laboratories').insert({
        dentist_id: authData.user.id,
        laboratory_id: laboratoryId,
      });

      if (favError) {
        setError(favError.message);
        setLoading(false);
        return;
      }
    }
  };

  const handleLaboratorySubmit = async (e: React.FormEvent) => {
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

  const resetDentistForm = () => {
    setShowLabSelection(false);
    setLaboratoryId('');
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
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
              Connexion
            </h1>
            <p className="text-slate-600 text-sm">
              Accédez à votre espace
            </p>
          </div>

          <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setUserType('laboratory');
                setError('');
                resetDentistForm();
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                userType === 'laboratory'
                  ? 'bg-white text-primary-600 shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-5 h-5" />
              Laboratoire
            </button>
            <button
              type="button"
              onClick={() => {
                setUserType('dentist');
                setError('');
                setIsRegisterMode(false);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                userType === 'dentist'
                  ? 'bg-white text-cyan-600 shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-5 h-5" />
              Dentiste
            </button>
          </div>

          {userType === 'laboratory' ? (
            <form onSubmit={handleLaboratorySubmit} className="space-y-4">
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
          ) : (
            <form onSubmit={handleDentistSubmit} className="space-y-4">
              {!showLabSelection ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="dentistFirstName" className="block text-sm font-medium text-slate-700 mb-2">
                        Prénom
                      </label>
                      <input
                        id="dentistFirstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                        placeholder="Jean"
                      />
                    </div>
                    <div>
                      <label htmlFor="dentistLastName" className="block text-sm font-medium text-slate-700 mb-2">
                        Nom
                      </label>
                      <input
                        id="dentistLastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                        placeholder="Dupont"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="dentistEmail" className="block text-sm font-medium text-slate-700 mb-2">
                      Email
                    </label>
                    <input
                      id="dentistEmail"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                      placeholder="votre@email.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="dentistPassword" className="block text-sm font-medium text-slate-700 mb-2">
                      Mot de passe
                    </label>
                    <input
                      id="dentistPassword"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                      placeholder="••••••••"
                    />
                    <p className="text-xs text-slate-500 mt-1">Minimum 6 caractères</p>
                  </div>
                </>
              ) : (
                <div>
                  <label htmlFor="laboratory" className="block text-sm font-medium text-slate-700 mb-2">
                    Sélectionnez votre laboratoire
                  </label>
                  <select
                    id="laboratory"
                    value={laboratoryId}
                    onChange={(e) => setLaboratoryId(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                  >
                    <option value="">Choisir un laboratoire</option>
                    {laboratories.map((lab) => (
                      <option key={lab.id} value={lab.id}>
                        {lab.laboratory_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                {showLabSelection && (
                  <button
                    type="button"
                    onClick={resetDentistForm}
                    className="flex-1 bg-slate-100 text-slate-700 py-3.5 rounded-xl font-medium hover:bg-slate-200 transition-all duration-200"
                  >
                    Retour
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className={`${showLabSelection ? 'flex-1' : 'w-full'} bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3.5 rounded-xl font-medium hover:from-cyan-600 hover:to-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02]`}
                >
                  {loading
                    ? 'Création...'
                    : showLabSelection
                    ? 'Créer mon compte'
                    : 'Continuer'
                  }
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
