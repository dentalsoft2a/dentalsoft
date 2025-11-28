import { useState, useEffect } from 'react';
import { Save, Building2, FileText, CreditCard, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { useDentistLegalInfo } from '../../../hooks/useDentistLegalInfo';

export default function DentistLegalSettings() {
  const { info, loading, saveLegalInfo } = useDentistLegalInfo();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState(info);

  useEffect(() => {
    setFormData(info);
  }, [info]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const result = await saveLegalInfo(formData);

      if (result.success) {
        setMessage({ type: 'success', text: 'Informations enregistrées avec succès' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Erreur lors de l\'enregistrement' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de l\'enregistrement' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-6 border border-green-200 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Informations Légales du Cabinet</h2>
            <p className="text-sm text-slate-600">
              Ces informations apparaîtront sur vos factures et documents officiels.
              Elles sont nécessaires pour la conformité légale et fiscale.
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg border flex items-center gap-3 ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <p className={`text-sm ${
            message.type === 'success' ? 'text-green-900' : 'text-red-900'
          }`}>
            {message.text}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations Professionnelles */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-slate-900">Informations Professionnelles</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Numéro RPPS
                <span className="text-slate-500 font-normal ml-2">(Répertoire Partagé des Professionnels de Santé)</span>
              </label>
              <input
                type="text"
                value={formData.rpps_number}
                onChange={(e) => handleChange('rpps_number', e.target.value)}
                placeholder="Ex: 12345678901"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Numéro ADELI
                <span className="text-slate-500 font-normal ml-2">(Automatisation des Listes)</span>
              </label>
              <input
                type="text"
                value={formData.adeli_number}
                onChange={(e) => handleChange('adeli_number', e.target.value)}
                placeholder="Ex: 123456789"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Numéro d'Ordre
                <span className="text-slate-500 font-normal ml-2">(Ordre des Chirurgiens-Dentistes)</span>
              </label>
              <input
                type="text"
                value={formData.ordre_number}
                onChange={(e) => handleChange('ordre_number', e.target.value)}
                placeholder="Ex: 123456"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Région ARS
                <span className="text-slate-500 font-normal ml-2">(Agence Régionale de Santé)</span>
              </label>
              <input
                type="text"
                value={formData.ars_region}
                onChange={(e) => handleChange('ars_region', e.target.value)}
                placeholder="Ex: Île-de-France"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* Informations Entreprise */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Building2 className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-slate-900">Informations Entreprise</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nom du Cabinet
              </label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
                placeholder="Ex: Cabinet Dentaire Dr. Martin"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Forme Juridique
              </label>
              <select
                value={formData.legal_form}
                onChange={(e) => handleChange('legal_form', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="Libéral">Libéral</option>
                <option value="SELARL">SELARL</option>
                <option value="SCP">SCP</option>
                <option value="SCM">SCM</option>
                <option value="SELAS">SELAS</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Numéro SIRET
              </label>
              <input
                type="text"
                value={formData.siret_number}
                onChange={(e) => handleChange('siret_number', e.target.value)}
                placeholder="Ex: 12345678900012"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Numéro TVA Intracommunautaire
                <span className="text-slate-500 font-normal ml-2">(optionnel si exonéré)</span>
              </label>
              <input
                type="text"
                value={formData.vat_number}
                onChange={(e) => handleChange('vat_number', e.target.value)}
                placeholder="Ex: FR12345678901"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* Coordonnées Cabinet */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Building2 className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-slate-900">Coordonnées du Cabinet</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Adresse du Cabinet
              </label>
              <textarea
                value={formData.cabinet_address}
                onChange={(e) => handleChange('cabinet_address', e.target.value)}
                placeholder="Ex: 123 Avenue de la République"
                rows={2}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Code Postal
              </label>
              <input
                type="text"
                value={formData.cabinet_postal_code}
                onChange={(e) => handleChange('cabinet_postal_code', e.target.value)}
                placeholder="Ex: 75001"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Ville
              </label>
              <input
                type="text"
                value={formData.cabinet_city}
                onChange={(e) => handleChange('cabinet_city', e.target.value)}
                placeholder="Ex: Paris"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.cabinet_phone}
                onChange={(e) => handleChange('cabinet_phone', e.target.value)}
                placeholder="Ex: 01 23 45 67 89"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Professionnel
              </label>
              <input
                type="email"
                value={formData.cabinet_email}
                onChange={(e) => handleChange('cabinet_email', e.target.value)}
                placeholder="Ex: contact@cabinet-dentaire.fr"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Site Web
                <span className="text-slate-500 font-normal ml-2">(optionnel)</span>
              </label>
              <input
                type="url"
                value={formData.cabinet_website}
                onChange={(e) => handleChange('cabinet_website', e.target.value)}
                placeholder="Ex: https://www.cabinet-dentaire.fr"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* Informations Bancaires */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-slate-900">Informations Bancaires</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nom de la Banque
              </label>
              <input
                type="text"
                value={formData.bank_name}
                onChange={(e) => handleChange('bank_name', e.target.value)}
                placeholder="Ex: Crédit Mutuel"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                IBAN
              </label>
              <input
                type="text"
                value={formData.bank_iban}
                onChange={(e) => handleChange('bank_iban', e.target.value)}
                placeholder="Ex: FR76 1234 5678 9012 3456 7890 123"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                BIC/SWIFT
              </label>
              <input
                type="text"
                value={formData.bank_bic}
                onChange={(e) => handleChange('bank_bic', e.target.value)}
                placeholder="Ex: CMCIFR2A"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* Configuration Factures */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-slate-900">Configuration des Factures</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Préfixe des Factures
              </label>
              <input
                type="text"
                value={formData.invoice_prefix}
                onChange={(e) => handleChange('invoice_prefix', e.target.value)}
                placeholder="Ex: FACT"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Texte de pied de page
                <span className="text-slate-500 font-normal ml-2">(apparaît en bas des factures)</span>
              </label>
              <textarea
                value={formData.invoice_footer_text}
                onChange={(e) => handleChange('invoice_footer_text', e.target.value)}
                placeholder="Ex: Honoraires soumis à TVA - Exonération fiscale article 293B du CGI"
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* RGPD */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-slate-900">Protection des Données (RGPD)</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nom du DPO
                <span className="text-slate-500 font-normal ml-2">(Délégué à la Protection des Données)</span>
              </label>
              <input
                type="text"
                value={formData.dpo_name}
                onChange={(e) => handleChange('dpo_name', e.target.value)}
                placeholder="Ex: Dr. Martin"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email du DPO
              </label>
              <input
                type="email"
                value={formData.dpo_email}
                onChange={(e) => handleChange('dpo_email', e.target.value)}
                placeholder="Ex: dpo@cabinet-dentaire.fr"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Durée de conservation des données (années)
                <span className="text-slate-500 font-normal ml-2">(minimum légal: 6 ans)</span>
              </label>
              <input
                type="number"
                min="6"
                value={formData.data_retention_years}
                onChange={(e) => handleChange('data_retention_years', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
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
