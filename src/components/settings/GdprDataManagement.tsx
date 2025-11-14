import { useState } from 'react';
import { Download, Trash2, FileText, AlertTriangle, Check, Loader2, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useCompanyLegalInfo } from '../../hooks/useCompanyLegalInfo';

export function GdprDataManagement() {
  const { user, profile } = useAuth();
  const { info: companyInfo } = useCompanyLegalInfo();
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const exportMyData = async () => {
    if (!user) return;

    setExportLoading(true);
    try {
      // Collect all user data
      const userData: any = {
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at
        },
        profile: null,
        laboratory: null,
        deliveryNotes: [],
        proformas: [],
        invoices: [],
        creditNotes: [],
        dentists: [],
        catalog: [],
        resources: [],
        employees: []
      };

      // Get profile data
      if (profile) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', profile.id)
          .single();
        userData.profile = profileData;
      }

      // Get laboratory-specific data if user is a laboratory
      if (profile?.role === 'laboratory') {
        // Delivery notes
        const { data: deliveryNotes } = await supabase
          .from('delivery_notes')
          .select('*')
          .eq('user_id', profile.id);
        userData.deliveryNotes = deliveryNotes || [];

        // Proformas
        const { data: proformas } = await supabase
          .from('proformas')
          .select('*')
          .eq('user_id', profile.id);
        userData.proformas = proformas || [];

        // Invoices
        const { data: invoices } = await supabase
          .from('invoices')
          .select('*')
          .eq('user_id', profile.id);
        userData.invoices = invoices || [];

        // Credit notes
        const { data: creditNotes } = await supabase
          .from('credit_notes')
          .select('*')
          .eq('user_id', profile.id);
        userData.creditNotes = creditNotes || [];

        // Dentists
        const { data: dentists } = await supabase
          .from('dentist_accounts')
          .select('*')
          .eq('laboratory_id', profile.id);
        userData.dentists = dentists || [];

        // Catalog
        const { data: catalog } = await supabase
          .from('catalog_items')
          .select('*')
          .eq('laboratory_id', profile.id);
        userData.catalog = catalog || [];

        // Resources
        const { data: resources } = await supabase
          .from('resources')
          .select('*')
          .eq('laboratory_id', profile.id);
        userData.resources = resources || [];

        // Employees
        const { data: employees } = await supabase
          .from('employees')
          .select('*')
          .eq('laboratory_id', profile.id);
        userData.employees = employees || [];
      }

      // Create JSON file
      const dataStr = JSON.stringify(userData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      // Download file
      const link = document.createElement('a');
      link.href = url;
      link.download = `dentalcloud-data-${user.email}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showMessage('success', 'Vos données ont été exportées avec succès.');
    } catch (error: any) {
      console.error('Export error:', error);
      showMessage('error', 'Erreur lors de l\'export des données.');
    } finally {
      setExportLoading(false);
    }
  };

  const requestDataDeletion = async () => {
    if (!user || !profile) return;
    if (deleteConfirmText !== 'SUPPRIMER') {
      showMessage('error', 'Veuillez taper SUPPRIMER pour confirmer.');
      return;
    }

    setDeleteLoading(true);
    try {
      // Note: Due to legal requirements (6 years retention for accounting documents),
      // we cannot immediately delete all data. Instead, we mark the account for deletion.

      const { error } = await supabase
        .from('user_profiles')
        .update({
          deletion_requested_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      showMessage(
        'success',
        'Demande de suppression enregistrée. Vous serez contacté sous 72h. Note : Les données comptables seront conservées 6 ans (obligation légale).'
      );

      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    } catch (error: any) {
      console.error('Delete request error:', error);
      showMessage('error', 'Erreur lors de la demande de suppression.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-sky-600" />
        <h2 className="text-xl font-semibold text-gray-900">Mes Droits RGPD</h2>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <Check className="w-5 h-5 text-green-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600" />
          )}
          <p className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
            {message.text}
          </p>
        </div>
      )}

      <div className="space-y-6">
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <Download className="w-6 h-6 text-sky-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Droit à la portabilité (Article 20 RGPD)
              </h3>
              <p className="text-gray-600 mb-4">
                Téléchargez toutes vos données personnelles dans un format structuré et lisible par machine (JSON).
                Cet export inclut votre profil, vos clients, factures, catalogue, stocks, etc.
              </p>
              <button
                onClick={exportMyData}
                disabled={exportLoading}
                className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exportLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Export en cours...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Exporter mes données
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <FileText className="w-6 h-6 text-sky-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Droit d'accès (Article 15 RGPD)
              </h3>
              <p className="text-gray-600 mb-4">
                Vous avez accès à toutes vos données via l'interface de l'application.
                Pour obtenir des informations supplémentaires sur le traitement de vos données,
                consultez notre <a href="/privacy-policy" className="text-sky-600 hover:text-sky-700 underline">Politique de Confidentialité</a>.
              </p>
              <p className="text-sm text-gray-500">
                Pour toute question : <a href={`mailto:${companyInfo.dpo_email}`} className="text-sky-600 hover:text-sky-700 underline">{companyInfo.dpo_email}</a>
              </p>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <FileText className="w-6 h-6 text-sky-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Droit de rectification (Article 16 RGPD)
              </h3>
              <p className="text-gray-600 mb-4">
                Vous pouvez modifier vos informations personnelles directement depuis la page Paramètres.
              </p>
              <a
                href="/settings"
                className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-700 font-medium"
              >
                Modifier mes informations →
              </a>
            </div>
          </div>
        </div>

        <div className="border border-red-200 rounded-lg p-6 bg-red-50">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Droit à l'effacement (Article 17 RGPD)
              </h3>
              <p className="text-gray-600 mb-3">
                Demander la suppression de votre compte et de vos données personnelles.
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-amber-800 font-medium mb-2">
                  ⚠️ Important - Obligation légale de conservation
                </p>
                <p className="text-sm text-amber-700">
                  Conformément à l'Article L. 123-22 du Code de Commerce et à l'Article 286 du CGI,
                  nous sommes <strong>légalement obligés de conserver vos factures, avoirs et documents
                  comptables pendant 6 ans minimum</strong> à compter de leur émission.
                </p>
                <p className="text-sm text-amber-700 mt-2">
                  Ces documents seront conservés de manière sécurisée et ne seront accessibles que
                  pour répondre aux obligations fiscales et comptables.
                </p>
              </div>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Demander la suppression
                </button>
              ) : (
                <div className="bg-white border border-red-300 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-3">
                    <strong>Confirmez la suppression de votre compte</strong>
                  </p>
                  <p className="text-sm text-gray-600 mb-3">
                    Cette action entraînera :
                  </p>
                  <ul className="text-sm text-gray-600 list-disc list-inside mb-4 space-y-1">
                    <li>La désactivation immédiate de votre compte</li>
                    <li>La suppression de vos données personnelles actives sous 30 jours</li>
                    <li>La conservation des documents comptables pendant 6 ans (obligation légale)</li>
                    <li>L'impossibilité de récupérer votre compte après validation</li>
                  </ul>

                  <p className="text-sm text-gray-700 mb-2">
                    Tapez <strong>SUPPRIMER</strong> pour confirmer :
                  </p>

                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Tapez SUPPRIMER"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={requestDataDeletion}
                      disabled={deleteLoading || deleteConfirmText !== 'SUPPRIMER'}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleteLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Traitement...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Confirmer la suppression
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText('');
                      }}
                      disabled={deleteLoading}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Autres droits RGPD
          </h3>

          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <p className="font-medium mb-1">Droit à la limitation du traitement (Article 18)</p>
              <p className="text-gray-600">
                Contactez-nous : <a href={`mailto:${companyInfo.dpo_email}`} className="text-sky-600 hover:text-sky-700 underline">{companyInfo.dpo_email}</a>
              </p>
            </div>

            <div>
              <p className="font-medium mb-1">Droit d'opposition (Article 21)</p>
              <p className="text-gray-600">
                Contactez-nous : <a href={`mailto:${companyInfo.dpo_email}`} className="text-sky-600 hover:text-sky-700 underline">{companyInfo.dpo_email}</a>
              </p>
            </div>

            <div>
              <p className="font-medium mb-1">Réclamation CNIL</p>
              <p className="text-gray-600">
                Si vos droits ne sont pas respectés, vous pouvez déposer une réclamation auprès de la CNIL :
                <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-700 underline ml-1">
                  www.cnil.fr
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-500 text-center pt-4 border-t border-gray-200">
          <p>
            Pour toute question concernant vos données personnelles ou l'exercice de vos droits,
            contactez notre Délégué à la Protection des Données (DPO) :
          </p>
          <p className="mt-2">
            <a href={`mailto:${companyInfo.dpo_email}`} className="text-sky-600 hover:text-sky-700 underline font-medium">
              {companyInfo.dpo_email}
            </a>
          </p>
          <p className="mt-2">
            Nous vous répondrons sous 30 jours maximum.
          </p>
        </div>
      </div>
    </div>
  );
}
