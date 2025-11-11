import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DentalCloudLogo from '../common/DentalCloudLogo';
import { Package, Camera, Gift } from 'lucide-react';

interface RegisterPageProps {
  onToggleLogin: () => void;
}

export default function RegisterPage({ onToggleLogin }: RegisterPageProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [laboratoryName, setLaboratoryName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isDentistMode, setIsDentistMode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  // Check for referral code in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      setReferralCode(refCode);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signUp(email, password, firstName, lastName, laboratoryName, isDentistMode, referralCode);

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/50 p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="mb-4">
              <DentalCloudLogo size={56} showText={false} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">DentalCloud</h1>
            <p className="text-slate-600 mt-2">Créer votre compte</p>

            <div className="flex items-center justify-center gap-2 mt-6 bg-slate-100 rounded-lg p-1 w-full">
              <button
                type="button"
                onClick={() => setIsDentistMode(false)}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
                  !isDentistMode
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Package className="w-4 h-4" />
                  Laboratoire
                </div>
              </button>
              <button
                type="button"
                onClick={() => setIsDentistMode(true)}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
                  isDentistMode
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Camera className="w-4 h-4" />
                  Dentiste
                </div>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
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
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                />
              </div>
            </div>

            {!isDentistMode && (
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
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                />
              </div>
            )}

            {isDentistMode && (
              <div>
                <label htmlFor="laboratoryName" className="block text-sm font-medium text-slate-700 mb-2">
                  Nom du cabinet
                </label>
                <input
                  id="laboratoryName"
                  type="text"
                  value={laboratoryName}
                  onChange={(e) => setLaboratoryName(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  placeholder="Cabinet dentaire..."
                />
              </div>
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
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
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
                minLength={6}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                placeholder="••••••••"
              />
              <p className="text-xs text-slate-500 mt-1">Minimum 6 caractères</p>
            </div>

            <div>
              <label htmlFor="referralCode" className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Gift className="w-4 h-4 text-purple-600" />
                Code de parrainage (optionnel)
              </label>
              <input
                id="referralCode"
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-lg border border-purple-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition font-mono"
                placeholder="CODE123"
              />
              <p className="text-xs text-purple-600 mt-1 flex items-center gap-1.5">
                <Gift className="w-3 h-3" />
                Gagnez 15 jours supplémentaires sur votre période d'essai
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Création du compte...' : 'Créer mon compte'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-600 text-sm">
              Déjà un compte ?{' '}
              <button
                onClick={onToggleLogin}
                className="text-primary-600 font-medium hover:text-primary-700 transition"
              >
                Se connecter
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
