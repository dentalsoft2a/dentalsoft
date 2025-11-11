import { useState, useEffect } from 'react';
import { Save, UserPlus, ShoppingCart, FileText, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function DentistPortalSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    allow_dentist_orders: false,
    allow_dentist_quote_requests: false,
    dentist_portal_message: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('allow_dentist_orders, allow_dentist_quote_requests, dentist_portal_message')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setSettings({
          allow_dentist_orders: data.allow_dentist_orders || false,
          allow_dentist_quote_requests: data.allow_dentist_quote_requests || false,
          dentist_portal_message: data.dentist_portal_message || ''
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setSuccess(false);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          allow_dentist_orders: settings.allow_dentist_orders,
          allow_dentist_quote_requests: settings.allow_dentist_quote_requests,
          dentist_portal_message: settings.dentist_portal_message || null
        })
        .eq('id', user.id);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erreur lors de la sauvegarde des paramètres');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1">À propos du portail dentiste</h3>
            <p className="text-sm text-blue-800">
              Le portail dentiste permet à vos clients dentistes de se connecter avec un compte gratuit et d'accéder à certaines fonctionnalités.
              Les dentistes doivent être liés à votre liste de dentistes par email pour accéder à leurs informations.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Commandes directes */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-slate-900">Commandes directes</h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.allow_dentist_orders}
                    onChange={(e) => setSettings({ ...settings, allow_dentist_orders: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
              <p className="text-sm text-slate-600 mb-3">
                Permettez aux dentistes de passer des commandes directement depuis leur interface.
                Les commandes seront en attente de validation de votre part.
              </p>
              {settings.allow_dentist_orders && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs text-green-800">
                    <strong>Activé:</strong> Les dentistes peuvent voir votre catalogue (items marqués visibles) et créer des bons de livraison en attente de validation.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Demandes de devis */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-primary-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-slate-900">Demandes de devis</h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.allow_dentist_quote_requests}
                    onChange={(e) => setSettings({ ...settings, allow_dentist_quote_requests: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
              <p className="text-sm text-slate-600 mb-3">
                Permettez aux dentistes de vous envoyer des demandes de devis directement depuis leur interface.
                Vous recevrez une notification et pourrez répondre avec un montant estimé.
              </p>
              {settings.allow_dentist_quote_requests && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs text-green-800">
                    <strong>Activé:</strong> Les dentistes peuvent vous soumettre des demandes de devis avec description du travail souhaité.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Message d'accueil personnalisé */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Message personnalisé</h3>
              <p className="text-sm text-slate-600 mb-4">
                Affichez un message d'accueil ou des instructions pour vos dentistes sur leur portail.
              </p>
              <textarea
                value={settings.dentist_portal_message}
                onChange={(e) => setSettings({ ...settings, dentist_portal_message: e.target.value })}
                rows={4}
                placeholder="Ex: Bienvenue sur notre portail! N'hésitez pas à nous contacter pour toute question..."
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
              />
              <p className="text-xs text-slate-500 mt-2">
                Ce message sera affiché en haut du portail dentiste. Laissez vide pour ne rien afficher.
              </p>
            </div>
          </div>
        </div>

        {/* Preview */}
        {(settings.allow_dentist_orders || settings.allow_dentist_quote_requests) && (
          <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border-2 border-primary-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Info className="w-5 h-5 text-primary-600" />
              Aperçu pour les dentistes
            </h3>
            <div className="space-y-2 text-sm">
              <p className="text-slate-700">
                <strong>Fonctionnalités activées:</strong>
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-1 ml-4">
                <li>Envoi de photos (toujours actif)</li>
                {settings.allow_dentist_quote_requests && <li>Demandes de devis</li>}
                {settings.allow_dentist_orders && <li>Commandes directes</li>}
                {(settings.allow_dentist_orders || settings.allow_dentist_quote_requests) && (
                  <li>Suivi des bons de livraison (30 derniers jours)</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <p className="text-sm text-slate-600">
            {!settings.allow_dentist_orders && !settings.allow_dentist_quote_requests
              ? 'Toutes les fonctionnalités sont désactivées'
              : 'Les modifications seront immédiatement visibles pour vos dentistes'}
          </p>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-cyan-600 text-white rounded-xl hover:from-primary-700 hover:to-cyan-700 transition-all duration-200 disabled:opacity-50 font-medium shadow-lg hover:shadow-xl"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Enregistrement...
              </>
            ) : success ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Enregistré !
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Enregistrer
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
