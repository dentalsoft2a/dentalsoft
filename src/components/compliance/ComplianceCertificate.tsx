import { useState, useEffect } from 'react';
import { Download, FileText, Shield, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Profile {
  laboratory_name: string;
  laboratory_rcs: string | null;
  laboratory_address: string | null;
  laboratory_phone: string | null;
  laboratory_email: string | null;
}

export function ComplianceCertificate() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [certificate, setCertificate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Charger le profil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

      // Charger le certificat numérique
      const { data: certData } = await supabase
        .from('digital_certificates')
        .select('*')
        .eq('laboratory_id', user.id)
        .maybeSingle();

      if (certData) {
        setCertificate(certData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCertificate = () => {
    const currentDate = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const certificateContent = `
ATTESTATION INDIVIDUELLE DE CONFORMITÉ
Logiciel de Gestion DentalCloud
Conformité à l'article 286, I, 3° bis du Code Général des Impôts

═══════════════════════════════════════════════════════════════

IDENTIFICATION DU CLIENT

Raison sociale: ${profile?.laboratory_name || '[À compléter]'}
SIRET: ${profile?.laboratory_rcs || '[À compléter]'}
Adresse: ${profile?.laboratory_address || '[À compléter]'}
Email: ${profile?.laboratory_email || '[À compléter]'}
Téléphone: ${profile?.laboratory_phone || '[À compléter]'}

Date de souscription: ${currentDate}

═══════════════════════════════════════════════════════════════

IDENTIFICATION DU LOGICIEL

Nom du logiciel: DentalCloud
Version: 1.0.0
Date de publication: 8 janvier 2025
Type: Logiciel de gestion pour laboratoires dentaires (SaaS)
Technologie: Application web progressive (PWA)
Hébergement: Cloud Supabase (Union Européenne)

═══════════════════════════════════════════════════════════════

OBJET DE L'ATTESTATION

Le logiciel DentalCloud version 1.0.0 respecte les conditions d'inaltérabilité,
de sécurisation, de conservation et d'archivage des données en vue du contrôle
de l'administration fiscale, conformément aux dispositions de:

✓ L'article 286, I, 3° bis du Code Général des Impôts (CGI)
✓ L'arrêté du 3 août 2016 fixant les conditions techniques
✓ Le Bulletin Officiel des Finances Publiques BOI-TVA-DECLA-30-10-30

Cette attestation est délivrée en application du § 160 du BOI-TVA-DECLA-30-10-30.

═══════════════════════════════════════════════════════════════

DÉCLARATION DE CONFORMITÉ

1. CONDITION D'INALTÉRABILITÉ ✓

✓ Journal d'audit inaltérable avec numérotation séquentielle
✓ Chaînage cryptographique (blockchain locale) avec hash SHA-256
✓ Verrouillage automatique des factures validées
✓ Clôture périodique avec scellement cryptographique
✓ Protection base de données (Row Level Security)

2. CONDITION DE SÉCURISATION ✓

✓ Signature électronique RSA-4096 de chaque facture
✓ Chiffrement TLS 1.3 (HTTPS) des communications
✓ Chiffrement AES-256 des archives
✓ Authentification forte Supabase Auth
✓ Contrôle d'accès strict (RLS)
✓ Traçabilité des accès (IP, user-agent, horodatage)
✓ Sauvegarde automatique quotidienne chiffrée

3. CONDITION DE CONSERVATION ✓

✓ Conservation intégrale des factures et avoirs
✓ Durée: 6 ans minimum (conforme Article L. 123-22)
✓ Calcul automatique de la date de rétention
✓ Conservation du journal d'audit (6 ans minimum)
✓ Protection contre la suppression
✓ Sauvegarde distribuée multi-zones

4. CONDITION D'ARCHIVAGE ✓

✓ Format Factur-X (PDF/A-3 + XML EN 16931)
✓ Archivage automatique quotidien
✓ Chiffrement AES-256 des archives
✓ Hash SHA-256 de chaque archive
✓ Accessibilité immédiate des archives
✓ Export pour l'administration fiscale

═══════════════════════════════════════════════════════════════

CERTIFICAT NUMÉRIQUE

${certificate ? `
Algorithme: ${certificate.key_algorithm}
Numéro de série: ${certificate.serial_number}
Valide du: ${new Date(certificate.valid_from).toLocaleDateString('fr-FR')}
Valide jusqu'au: ${new Date(certificate.valid_until).toLocaleDateString('fr-FR')}
Type: ${certificate.certificate_type === 'self_signed' ? 'Auto-signé' : certificate.certificate_type}
` : 'Aucun certificat numérique généré'}

═══════════════════════════════════════════════════════════════

VALIDITÉ DE L'ATTESTATION

Cette attestation est valable pour:
- Logiciel: DentalCloud
- Version: 1.0.0
- À compter du: 8 janvier 2025

═══════════════════════════════════════════════════════════════

CONTACT ÉDITEUR

Support conformité:
Email: conformite@dentalcloud.fr
Téléphone: [Support]

═══════════════════════════════════════════════════════════════

Document généré le: ${currentDate}

Cette attestation individuelle de conformité répond aux obligations légales
de l'article 286, I, 3° bis du Code Général des Impôts.

À conserver avec vos documents comptables.
    `.trim();

    const blob = new Blob([certificateContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attestation-conformite-dentalcloud-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateCertificateForUser = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-certificate');

      if (error) throw error;

      alert('Certificat numérique généré avec succès!');
      await loadData();
    } catch (error: any) {
      console.error('Error generating certificate:', error);
      alert(`Erreur: ${error.message || 'Échec de la génération du certificat'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Attestation de Conformité Anti-Fraude TVA</h3>
            <p className="text-sm text-slate-600">
              DentalCloud est conforme à l'article 286 du Code Général des Impôts.
              Téléchargez votre attestation individuelle pour vos contrôles fiscaux.
            </p>
          </div>
        </div>
      </div>

      {/* Statut de conformité */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-start gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-slate-900 mb-1">Conformité Logicielle</h4>
              <p className="text-sm text-slate-600">
                Le logiciel DentalCloud v1.0.0 est conforme aux exigences de l'article 286 du CGI.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-slate-700">Inaltérabilité</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-slate-700">Sécurisation</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-slate-700">Conservation (6 ans)</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-slate-700">Archivage</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-start gap-3 mb-4">
            {certificate ? (
              <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
            ) : (
              <FileText className="w-6 h-6 text-slate-400 flex-shrink-0" />
            )}
            <div>
              <h4 className="font-semibold text-slate-900 mb-1">Certificat Numérique</h4>
              <p className="text-sm text-slate-600">
                {certificate
                  ? 'Votre certificat de signature électronique est actif.'
                  : 'Générez votre certificat pour signer vos factures.'}
              </p>
            </div>
          </div>

          {certificate ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Algorithme:</span>
                <span className="font-medium text-slate-900">{certificate.key_algorithm}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Type:</span>
                <span className="font-medium text-slate-900">
                  {certificate.certificate_type === 'self_signed' ? 'Auto-signé' : certificate.certificate_type}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Valide jusqu'au:</span>
                <span className="font-medium text-slate-900">
                  {new Date(certificate.valid_until).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
          ) : (
            <button
              onClick={generateCertificateForUser}
              className="w-full mt-4 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
            >
              Générer le certificat
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h4 className="font-semibold text-slate-900 mb-4">Télécharger l'attestation</h4>

        <div className="space-y-3">
          <button
            onClick={generateCertificate}
            className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg hover:from-green-100 hover:to-emerald-100 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-green-600" />
              <div className="text-left">
                <div className="font-medium text-slate-900">Attestation Individuelle (TXT)</div>
                <div className="text-xs text-slate-600">Format texte pour archivage et impression</div>
              </div>
            </div>
            <div className="text-green-600 group-hover:translate-x-1 transition-transform">→</div>
          </button>

          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-1">Documentation complète disponible</p>
              <p className="text-blue-700">
                Pour plus d'informations, consultez la documentation complète dans le dossier du projet:
              </p>
              <ul className="mt-2 space-y-1 text-blue-700">
                <li>• PLAN_TECHNIQUE_CONFORMITE_ANTIFRAUD.md</li>
                <li>• DOCUMENT_CONFORMITE_LEGALE.md</li>
                <li>• ATTESTATION_CONFORMITE_MODELE.md</li>
                <li>• DOCUMENTATION_UTILISATEUR.md</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
