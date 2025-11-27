import { useState, useEffect } from 'react';
import { User, Mail, Phone, Save, Eye, EyeOff, Building2, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function DentistSettingsPage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [cabinetBillingEnabled, setCabinetBillingEnabled] = useState(false);
  const [enablingCabinet, setEnablingCabinet] = useState(false);

  useEffect(() => {
    if (user) {
      loadDentistData();
    }
  }, [user]);

  const loadDentistData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('dentist_accounts')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFormData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
        });
        setCabinetBillingEnabled(data.cabinet_billing_enabled || false);
      }
    } catch (error) {
      console.error('Error loading dentist data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableCabinetBilling = async () => {
    if (!user) return;

    if (!confirm('Activer le module de gestion de cabinet ? Vous aurez accès à la facturation patients, gestion de stock et plus encore.')) {
      return;
    }

    setEnablingCabinet(true);

    try {
      const { error } = await supabase.rpc('enable_dental_billing_module', {
        p_dentist_id: user.id,
      });

      if (error) throw error;

      alert('Module de gestion de cabinet activé ! Rechargez la page pour voir les nouvelles fonctionnalités.');
      window.location.reload();
    } catch (error) {
      console.error('Error enabling cabinet billing:', error);
      alert('Erreur lors de l\'activation du module');
    } finally {
      setEnablingCabinet(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('dentist_accounts')
        .update({
          name: formData.name,
          phone: formData.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      alert('Profil mis à jour avec succès');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Erreur lors de la mise à jour du profil');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwords.new !== passwords.confirm) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwords.new.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setPasswordLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new,
      });

      if (error) throw error;

      alert('Mot de passe mis à jour avec succès');
      setPasswords({ current: '', new: '', confirm: '' });
      setShowPasswordChange(false);
    } catch (error) {
      console.error('Error updating password:', error);
      alert('Erreur lors de la mise à jour du mot de passe');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 md:mb-8 animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Paramètres</h1>
        <p className="text-slate-600 mt-1 md:mt-2 text-sm md:text-base">Gérez vos informations personnelles</p>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Informations du profil
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Nom complet *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Dr. Jean Dupont"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg bg-slate-50 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">L'email ne peut pas être modifié</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Téléphone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="06 12 34 56 78"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-600" />
              Sécurité
            </h2>
          </div>

          <div className="p-6">
            {!showPasswordChange ? (
              <button
                onClick={() => setShowPasswordChange(true)}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-purple-300 text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition"
              >
                <EyeOff className="w-5 h-5" />
                Modifier le mot de passe
              </button>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Nouveau mot de passe *
                  </label>
                  <input
                    type="password"
                    value={passwords.new}
                    onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Confirmer le mot de passe *
                  </label>
                  <input
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordChange(false);
                      setPasswords({ current: '', new: '', confirm: '' });
                    }}
                    className="flex-1 py-3 border-2 border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {passwordLoading ? 'Mise à jour...' : 'Confirmer'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {!cabinetBillingEnabled && (
          <div className="bg-white rounded-xl shadow-lg border-2 border-green-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-teal-50 border-b border-green-200">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-green-600" />
                Module Gestion de Cabinet
              </h2>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <p className="text-slate-700 mb-4">
                  Activez le module de gestion complète pour votre cabinet dentaire et bénéficiez de :
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">Gestion des patients et historique des soins</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">Facturation avec calcul automatique CPAM/Mutuelle</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">Gestion du stock de fournitures dentaires</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">Catalogue d'actes dentaires personnalisable</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">Statistiques et reporting détaillés</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={handleEnableCabinetBilling}
                disabled={enablingCabinet}
                className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-lg"
              >
                <Building2 className="w-6 h-6" />
                {enablingCabinet ? 'Activation en cours...' : 'Activer le module de gestion'}
              </button>

              <p className="text-xs text-slate-500 mt-3 text-center">
                Une configuration guidée vous accompagnera après l'activation
              </p>
            </div>
          </div>
        )}

        {cabinetBillingEnabled && (
          <div className="bg-gradient-to-br from-green-50 to-teal-50 border-2 border-green-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Module Cabinet Activé</h3>
                <p className="text-sm text-slate-600">Vous avez accès à toutes les fonctionnalités de gestion</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

