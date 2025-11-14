import { useState, useEffect } from 'react';
import { Save, Building2, AlertCircle, Check, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CompanyLegalInfo {
  id?: string;
  company_name: string;
  legal_form: string;
  capital: number;
  siret: string;
  rcs: string;
  vat_number: string;
  ape_code: string;
  address: string;
  phone: string;
  email: string;
  dpo_name: string;
  dpo_email: string;
  director_name: string;
  director_title: string;
}

export function CompanyLegalSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState<CompanyLegalInfo>({
    company_name: '',
    legal_form: 'SAS',
    capital: 10000,
    siret: '',
    rcs: '',
    vat_number: '',
    ape_code: '',
    address: '',
    phone: '',
    email: '',
    dpo_name: '',
    dpo_email: '',
    director_name: '',
    director_title: 'Président'
  });

  useEffect(() => {
    loadCompanyInfo();
  }, []);

  const loadCompanyInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('company_legal_info')
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFormData({
          id: data.id,
          company_name: data.company_name || '',
          legal_form: data.legal_form || 'SAS',
          capital: data.capital || 10000,
          siret: data.siret || '',
          rcs: data.rcs || '',
          vat_number: data.vat_number || '',
          ape_code: data.ape_code || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          dpo_name: data.dpo_name || '',
          dpo_email: data.dpo_email || '',
          director_name: data.director_name || '',
          director_title: data.director_title || 'Président'
        });
      }
    } catch (error: any) {
      console.error('Error loading company info:', error);
      showMessage('error', 'Erreur lors du chargement des informations.');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const dataToSave = {
        company_name: formData.company_name,
        legal_form: formData.legal_form,
        capital: formData.capital,
        siret: formData.siret,
        rcs: formData.rcs,
        vat_number: formData.vat_number,
        ape_code: formData.ape_code,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        dpo_name: formData.dpo_name,
        dpo_email: formData.dpo_email,
        director_name: formData.director_name,
        director_title: formData.director_title
      };

      if (formData.id) {
        // Update existing
        const { error } = await supabase
          .from('company_legal_info')
          .update(dataToSave)
          .eq('id', formData.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('company_legal_info')
          .insert(dataToSave);

        if (error) throw error;
      }

      showMessage('success', 'Informations légales enregistrées avec succès.');
      await loadCompanyInfo();
    } catch (error: any) {
      console.error('Error saving company info:', error);
      showMessage('error', 'Erreur lors de l\'enregistrement : ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="w-6 h-6 text-sky-600" />
        <h2 className="text-xl font-semibold text-gray-900">Informations Légales de l'Entreprise</h2>
      </div>

      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-800 font-medium mb-1">
              Ces informations sont utilisées dans les pages légales
            </p>
            <p className="text-sm text-amber-700">
              Elles apparaîtront automatiquement dans les Mentions Légales, la Politique de Confidentialité
              et les CGU. Assurez-vous qu'elles sont à jour avant la mise en production.
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <Check className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
          <p className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
            {message.text}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Raison sociale *
            </label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Forme juridique
            </label>
            <select
              value={formData.legal_form}
              onChange={(e) => setFormData({ ...formData, legal_form: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            >
              <option value="SAS">SAS</option>
              <option value="SARL">SARL</option>
              <option value="SA">SA</option>
              <option value="EURL">EURL</option>
              <option value="SNC">SNC</option>
              <option value="Auto-entrepreneur">Auto-entrepreneur</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Capital social (€)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.capital}
              onChange={(e) => setFormData({ ...formData, capital: parseFloat(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Numéro SIRET
            </label>
            <input
              type="text"
              value={formData.siret}
              onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              placeholder="123 456 789 00010"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              RCS
            </label>
            <input
              type="text"
              value={formData.rcs}
              onChange={(e) => setFormData({ ...formData, rcs: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              placeholder="RCS Paris 123456789"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Numéro TVA intracommunautaire
            </label>
            <input
              type="text"
              value={formData.vat_number}
              onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              placeholder="FR12345678901"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Code APE/NAF
            </label>
            <input
              type="text"
              value={formData.ape_code}
              onChange={(e) => setFormData({ ...formData, ape_code: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              placeholder="6201Z"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Téléphone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              placeholder="+33 1 23 45 67 89"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email général
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              placeholder="contact@dentalcloud.fr"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Adresse complète du siège social
          </label>
          <textarea
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            placeholder="123 rue de la République, 75001 Paris, France"
          />
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Protection des Données (RGPD)</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom du DPO (Délégué à la Protection des Données)
              </label>
              <input
                type="text"
                value={formData.dpo_name}
                onChange={(e) => setFormData({ ...formData, dpo_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Jean Dupont"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email du DPO
              </label>
              <input
                type="email"
                value={formData.dpo_email}
                onChange={(e) => setFormData({ ...formData, dpo_email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="dpo@dentalcloud.fr"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Directeur de Publication</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom du directeur
              </label>
              <input
                type="text"
                value={formData.director_name}
                onChange={(e) => setFormData({ ...formData, director_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Marie Martin"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fonction
              </label>
              <input
                type="text"
                value={formData.director_title}
                onChange={(e) => setFormData({ ...formData, director_title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Président / Gérant / Directeur Général"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Enregistrer les informations
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
