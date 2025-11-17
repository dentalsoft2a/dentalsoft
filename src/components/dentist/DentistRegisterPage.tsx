import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Camera, ArrowLeft } from 'lucide-react';
import DentalCloudLogo from '../common/DentalCloudLogo';

interface DentistRegisterPageProps {
  onNavigate: (page: string) => void;
}

export default function DentistRegisterPage({ onNavigate }: DentistRegisterPageProps) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Importer supabase pour vérifier l'email
      const { supabase } = await import('../../lib/supabase');

      // Normaliser l'email (lowercase et trim)
      const normalizedEmail = email.trim().toLowerCase();

      // Vérifier si l'email existe déjà avant de créer le compte
      const { data: validationData, error: validationError } = await supabase
        .rpc('validate_dentist_registration', { p_email: normalizedEmail });

      if (validationError) {
        throw new Error('Erreur lors de la validation de l\'email');
      }

      if (validationData && !validationData.valid) {
        throw new Error(validationData.message || 'Cet email est déjà utilisé');
      }

      // Procéder à l'inscription avec l'email normalisé
      const { error } = await signUp(normalizedEmail, password, name, phone, '', true);
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
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
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Inscription Dentiste</h1>
            <p className="text-sm text-slate-600">Créez votre compte gratuit pour envoyer des photos aux laboratoires</p>
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

            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nom complet *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                  placeholder="Dr. Jean Dupont"
                  required
                />
              </div>

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
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                  placeholder="+33 6 12 34 56 78"
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
                <p className="mt-1 text-xs text-slate-500">Minimum 6 caractères</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-4"
              >
                {loading ? 'Inscription en cours...' : 'Créer mon compte gratuit'}
              </button>
            </form>

            <div className="mt-5 text-center">
              <p className="text-sm text-slate-600">
                Déjà inscrit ?{' '}
                <button
                  onClick={() => onNavigate('dentist-login')}
                  className="text-blue-500 hover:text-blue-600 font-medium"
                >
                  Se connecter
                </button>
              </p>
            </div>
          </div>

          <div className="mt-5 bg-blue-50 border border-blue-200 rounded-xl p-3.5">
            <h3 className="font-semibold text-slate-900 mb-2 text-sm">Compte 100% gratuit</h3>
            <ul className="space-y-1 text-xs text-slate-600">
              <li>✓ Envoi illimité de photos</li>
              <li>✓ Communication directe avec les laboratoires</li>
              <li>✓ Suivi de vos demandes en temps réel</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
