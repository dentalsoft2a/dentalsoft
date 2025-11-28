import { useState, useEffect } from 'react';
import { Download, Shield, CheckCircle, FileText } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useCompanyLegalInfo } from '../../../hooks/useCompanyLegalInfo';
import { useDentistLegalInfo } from '../../../hooks/useDentistLegalInfo';

interface Certificate {
  id: string;
  key_algorithm: string;
  serial_number: string;
  valid_from: string;
  valid_until: string;
  certificate_type: string;
}

export default function DentistComplianceCertificate() {
  const { user } = useAuth();
  const { info: companyInfo } = useCompanyLegalInfo();
  const { info: dentistInfo } = useDentistLegalInfo();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadCertificate();
    }
  }, [user]);

  const loadCertificate = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('dentist_digital_certificates')
        .select('*')
        .eq('dentist_id', user.id)
        .eq('is_revoked', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading certificate:', error);
      }

      setCertificate(data);
    } catch (error) {
      console.error('Error in loadCertificate:', error);
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
Logiciel de Gestion DentalCloud - Module Cabinet Dentaire
Conformité à l'article 286, I, 3° bis du Code Général des Impôts

═══════════════════════════════════════════════════════════════

IDENTIFICATION DU PRATICIEN

Cabinet: ${dentistInfo.company_name || '[À compléter]'}
Praticien: ${dentistInfo.company_name || '[À compléter]'}
RPPS: ${dentistInfo.rpps_number || '[À compléter]'}
ADELI: ${dentistInfo.adeli_number || '[À compléter]'}
N° Ordre: ${dentistInfo.ordre_number || '[À compléter]'}
SIRET: ${dentistInfo.siret_number || '[À compléter]'}
Adresse: ${dentistInfo.cabinet_address || '[À compléter]'}, ${dentistInfo.cabinet_postal_code || ''} ${dentistInfo.cabinet_city || ''}
Email: ${dentistInfo.cabinet_email || '[À compléter]'}
Téléphone: ${dentistInfo.cabinet_phone || '[À compléter]'}

Date de souscription: ${currentDate}

═══════════════════════════════════════════════════════════════

IDENTIFICATION DE L'ÉDITEUR

Raison sociale: ${companyInfo.company_name}
Forme juridique: ${companyInfo.legal_form}
Capital social: ${companyInfo.capital.toLocaleString('fr-FR')} €
SIRET: ${companyInfo.siret}
RCS: ${companyInfo.rcs}
Numéro TVA: ${companyInfo.vat_number}
Code APE: ${companyInfo.ape_code}
Adresse: ${companyInfo.address}
Téléphone: ${companyInfo.phone}
Email: ${companyInfo.email}

Directeur de publication: ${companyInfo.director_name}
Fonction: ${companyInfo.director_title}

Délégué à la Protection des Données:
Nom: ${companyInfo.dpo_name}
Email: ${companyInfo.dpo_email}

═══════════════════════════════════════════════════════════════

IDENTIFICATION DU LOGICIEL

Nom du logiciel: DentalCloud - Module Cabinet Dentaire
Version: 1.0.0
Date de publication: 28 novembre 2024
Type: Logiciel de gestion pour cabinets dentaires (SaaS)
Module: Facturation patients et gestion cabinet
Technologie: Application web progressive (PWA)
Hébergement: Cloud Supabase (Union Européenne)

═══════════════════════════════════════════════════════════════

OBJET DE L'ATTESTATION

Le module de facturation patients de DentalCloud version 1.0.0 respecte
les conditions d'inaltérabilité, de sécurisation, de conservation et
d'archivage des données en vue du contrôle de l'administration fiscale,
conformément aux dispositions de:

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

✓ Conservation intégrale des factures patients
✓ Durée: ${dentistInfo.data_retention_years || 6} ans minimum (conforme Article L. 123-22)
✓ Calcul automatique de la date de rétention
✓ Conservation du journal d'audit (6 ans minimum)
✓ Protection contre la suppression
✓ Sauvegarde distribuée multi-zones

4. CONDITION D'ARCHIVAGE ✓

✓ Format PDF/A conforme pour archivage long terme
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
- Logiciel: DentalCloud - Module Cabinet Dentaire
- Version: 1.0.0
- À compter du: 28 novembre 2024

═══════════════════════════════════════════════════════════════

CONFORMITÉ SPÉCIFIQUE SECTEUR DENTAIRE

✓ Conformité avec les obligations de l'Ordre des Chirurgiens-Dentistes
✓ Respect du secret médical et professionnel
✓ Conformité RGPD pour données de santé
✓ Conservation sécurisée des dossiers patients
✓ Traçabilité des actes et prescriptions

═══════════════════════════════════════════════════════════════

CONTACT ÉDITEUR

Support conformité:
Email: ${companyInfo.email}
Téléphone: ${companyInfo.phone}

Siège social: ${companyInfo.address}

═══════════════════════════════════════════════════════════════

Document généré le: ${currentDate}

Cette attestation individuelle de conformité répond aux obligations légales
de l'article 286, I, 3° bis du Code Général des Impôts pour les professions
de santé exerçant en cabinet libéral.

À conserver avec vos documents comptables.
    `.trim();

    const blob = new Blob([certificateContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attestation-conformite-dentiste-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-6 border border-green-200">
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
                Le module de facturation DentalCloud v1.0.0 est conforme aux exigences de l'article 286 du CGI.
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
              <span className="text-slate-700">Conservation ({dentistInfo.data_retention_years || 6} ans)</span>
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
                  : 'Aucun certificat généré. Contactez le support si nécessaire.'}
              </p>
            </div>
          </div>

          {certificate && (
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
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h4 className="font-semibold text-slate-900 mb-4">Télécharger l'attestation</h4>

        <div className="space-y-3">
          <button
            onClick={generateCertificate}
            className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg hover:from-green-100 hover:to-teal-100 transition-colors group"
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
        </div>
      </div>

      {/* Informations complémentaires */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h5 className="font-semibold text-blue-900 mb-1">Informations importantes</h5>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• Conservez cette attestation avec vos documents comptables</p>
              <p>• Elle peut être demandée lors d'un contrôle fiscal</p>
              <p>• Le journal d'audit et les périodes fiscales prouvent la conformité continue</p>
              <p>• Vos informations légales doivent être à jour (RPPS, ADELI, SIRET)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
