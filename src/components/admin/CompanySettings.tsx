import { useState, useEffect } from 'react';
import { Building2, Save, Mail, Phone, MapPin, FileText, Landmark } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CompanySettings {
  company_name: string;
  company_address: string;
  company_postal_code: string;
  company_city: string;
  company_country: string;
  company_phone: string;
  company_email: string;
  company_rcs: string;
  company_siret: string;
  company_vat: string;
  company_iban: string;
  company_bic: string;
  company_logo_url: string;
  invoice_prefix: string;
  tax_rate: number;
}

export function CompanySettings() {
  const [settings, setSettings] = useState<CompanySettings>({
    company_name: '',
    company_address: '',
    company_postal_code: '',
    company_city: '',
    company_country: '',
    company_phone: '',
    company_email: '',
    company_rcs: '',
    company_siret: '',
    company_vat: '',
    company_iban: '',
    company_bic: '',
    company_logo_url: '',
    invoice_prefix: 'SUB',
    tax_rate: 20.00
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      if (error) throw error;

      if (data) {
        setSettings({
          company_name: data.company_name || '',
          company_address: data.company_address || '',
          company_postal_code: data.company_postal_code || '',
          company_city: data.company_city || '',
          company_country: data.company_country || 'France',
          company_phone: data.company_phone || '',
          company_email: data.company_email || '',
          company_rcs: data.company_rcs || '',
          company_siret: data.company_siret || '',
          company_vat: data.company_vat || '',
          company_iban: data.company_iban || '',
          company_bic: data.company_bic || '',
          company_logo_url: data.company_logo_url || '',
          invoice_prefix: data.invoice_prefix || 'SUB',
          tax_rate: data.tax_rate || 20.00
        });
      }
    } catch (error) {
      console.error('Error loading company settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      const { error } = await supabase
        .from('company_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving company settings:', error);
      alert('Erreur lors de l\'enregistrement des paramètres');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-slate-600 mt-4">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <Building2 className="w-8 h-8 text-blue-600" />
          Informations de l'entreprise
        </h2>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Important :</strong> Ces informations apparaîtront sur toutes les factures d'abonnement générées automatiquement.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Informations générales
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nom de l'entreprise *
              </label>
              <input
                type="text"
                value={settings.company_name}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Préfixe des factures
              </label>
              <input
                type="text"
                value={settings.invoice_prefix}
                onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                placeholder="SUB"
              />
              <p className="text-xs text-slate-500 mt-1">Format: {settings.invoice_prefix}-2025-000001</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Taux de TVA (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={settings.tax_rate}
                onChange={(e) => setSettings({ ...settings, tax_rate: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="20.00"
              />
              <p className="text-xs text-slate-500 mt-1">Utilisé pour calculer le HT depuis le prix TTC de l'abonnement</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Adresse
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Adresse complète
              </label>
              <input
                type="text"
                value={settings.company_address}
                onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Code postal
                </label>
                <input
                  type="text"
                  value={settings.company_postal_code}
                  onChange={(e) => setSettings({ ...settings, company_postal_code: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ville
                </label>
                <input
                  type="text"
                  value={settings.company_city}
                  onChange={(e) => setSettings({ ...settings, company_city: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Pays
                </label>
                <input
                  type="text"
                  value={settings.company_country}
                  onChange={(e) => setSettings({ ...settings, company_country: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Contact
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={settings.company_email}
                onChange={(e) => setSettings({ ...settings, company_email: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Téléphone
              </label>
              <input
                type="tel"
                value={settings.company_phone}
                onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Informations légales
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                RCS
              </label>
              <input
                type="text"
                value={settings.company_rcs}
                onChange={(e) => setSettings({ ...settings, company_rcs: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                SIRET
              </label>
              <input
                type="text"
                value={settings.company_siret}
                onChange={(e) => setSettings({ ...settings, company_siret: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                N° TVA Intracommunautaire
              </label>
              <input
                type="text"
                value={settings.company_vat}
                onChange={(e) => setSettings({ ...settings, company_vat: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Landmark className="w-5 h-5 text-blue-600" />
            Informations bancaires
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                IBAN
              </label>
              <input
                type="text"
                value={settings.company_iban}
                onChange={(e) => setSettings({ ...settings, company_iban: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                BIC
              </label>
              <input
                type="text"
                value={settings.company_bic}
                onChange={(e) => setSettings({ ...settings, company_bic: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
              />
            </div>
          </div>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm text-green-800 font-medium">
              ✓ Paramètres enregistrés avec succès
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>
    </div>
  );
}
