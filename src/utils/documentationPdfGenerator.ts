import jsPDF from 'jspdf';

interface DocumentationSection {
  title: string;
  content: string;
}

export const generateDocumentationPDF = (
  documentTitle: string,
  sections: DocumentationSection[],
  laboratoryName?: string
): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // En-tête du document
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(documentTitle, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  if (laboratoryName) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(laboratoryName, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
  }

  // Date de génération
  doc.setFontSize(10);
  doc.setTextColor(100);
  const currentDate = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  doc.text(`Généré le ${currentDate}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Ligne de séparation
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Fonction pour ajouter une nouvelle page si nécessaire
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Parcourir les sections
  sections.forEach((section, index) => {
    checkPageBreak(20);

    // Titre de la section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 102, 204); // Bleu

    const titleLines = doc.splitTextToSize(section.title, maxWidth);
    titleLines.forEach((line: string) => {
      checkPageBreak(10);
      doc.text(line, margin, yPosition);
      yPosition += 7;
    });
    yPosition += 3;

    // Contenu de la section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);

    const contentLines = doc.splitTextToSize(section.content, maxWidth);
    contentLines.forEach((line: string) => {
      checkPageBreak(7);
      doc.text(line, margin, yPosition);
      yPosition += 5;
    });

    yPosition += 5;
  });

  // Pied de page sur toutes les pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.setFont('helvetica', 'italic');
    doc.text(
      `Page ${i} / ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      'DentalCloud - Conformité Anti-Fraude TVA',
      margin,
      pageHeight - 10
    );
  }

  // Télécharger le PDF
  const fileName = `${documentTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.pdf`;
  doc.save(fileName);
};

// Documentation 1 : Plan Technique
export const generatePlanTechniquePDF = (laboratoryName?: string): void => {
  const sections: DocumentationSection[] = [
    {
      title: '1. INTRODUCTION ET CONTEXTE LÉGAL',
      content: `Le système de conformité anti-fraude TVA de DentalCloud répond aux exigences de l'article 286 du Code Général des Impôts (CGI), modifié par la loi n° 2015-1785 du 29 décembre 2015.

Cette loi impose aux assujettis à la TVA utilisant un logiciel de gestion ou un système de caisse d'utiliser un logiciel conforme à 4 conditions d'inaltérabilité, de sécurisation, de conservation et d'archivage.`,
    },
    {
      title: '2. ARCHITECTURE DU SYSTÈME',
      content: `L'architecture de conformité repose sur :

- Base de données PostgreSQL avec Row Level Security (RLS)
- Journal d'audit inaltérable avec chaînage cryptographique SHA-256
- Système de scellement des périodes fiscales
- Certificats numériques RSA-4096 pour signature électronique
- Archivage automatique au format Factur-X (PDF/A-3 + XML EN 16931)
- Edge Functions Supabase pour opérations sécurisées`,
    },
    {
      title: '3. CONDITION D\'INALTÉRABILITÉ',
      content: `Implémentation :

Journal d'audit (table audit_log) :
- Numérotation séquentielle unique et croissante (BIGSERIAL)
- Enregistrement chronologique de toutes les opérations
- Chaînage cryptographique : chaque enregistrement contient le hash SHA-256 du précédent
- Protection par RLS : lecture seule, aucune modification/suppression possible

Scellement des périodes :
- Clôture mensuelle/annuelle avec fonction seal_fiscal_period()
- Calcul d'un hash combiné de tous les enregistrements de la période
- Verrouillage automatique des factures (is_locked = true)
- Impossibilité de modifier une période clôturée`,
    },
    {
      title: '4. CONDITION DE SÉCURISATION',
      content: `Implémentation :

Signature électronique :
- Génération de paires de clés RSA-4096 (table digital_certificates)
- Signature de chaque facture validée via Edge Function sign-document
- Horodatage précis de chaque signature
- Hash SHA-256 calculé pour chaque document

Protection des données :
- Chiffrement TLS 1.3 (HTTPS) pour toutes les communications
- Row Level Security (RLS) sur toutes les tables
- Authentification Supabase Auth avec JWT
- Chiffrement AES-256 des archives
- Triggers de protection contre modification de documents verrouillés`,
    },
    {
      title: '5. CONDITION DE CONSERVATION',
      content: `Implémentation :

Durée de conservation : 6 ans minimum (Article L. 123-22 du Code de commerce)

Tables et colonnes :
- archived_documents.retention_until : Date calculée automatiquement (date + 6 ans)
- Fonction calculate_retention_date() pour calcul automatique
- Protection contre suppression via RLS
- Sauvegarde quotidienne automatique de la base de données

Intégrité :
- Journal d'audit conservé 6 ans minimum
- Vérification d'intégrité via verify_audit_chain()
- Détection automatique de toute altération
- Export CSV pour administration fiscale`,
    },
    {
      title: '6. CONDITION D\'ARCHIVAGE',
      content: `Implémentation :

Format Factur-X (PDF/A-3 + XML EN 16931) :
- Génération automatique via Edge Function generate-pdf
- XML embarqué dans le PDF selon norme européenne EN 16931
- Chiffrement AES-256 des archives
- Hash SHA-256 de chaque fichier archivé

Table archived_documents :
- storage_path : Chemin de stockage cloud
- file_hash : Hash SHA-256 du fichier
- facturx_xml : XML Factur-X embarqué
- digital_signature : Signature électronique
- retention_until : Date de fin de conservation

Accessibilité :
- Export immédiat pour contrôle fiscal
- Format lisible pour administration (PPF/PDP)
- Consultation en ligne à tout moment`,
    },
    {
      title: '7. JOURNAL D\'AUDIT INALTÉRABLE',
      content: `Table audit_log :

Structure :
- sequence_number : Numéro unique croissant (BIGSERIAL)
- created_at : Horodatage précis
- user_id : Utilisateur ayant effectué l'opération
- laboratory_id : Laboratoire concerné
- entity_type : Type d'entité (invoices, credit_notes, proformas)
- entity_id : ID de l'entité
- operation : Type d'opération (CREATE, UPDATE, DELETE)
- previous_data : Données avant modification (JSONB)
- new_data : Données après modification (JSONB)
- hash_sha256 : Hash de l'enregistrement
- previous_hash : Hash de l'enregistrement précédent (chaînage)
- is_sealed : Indicateur de scellement
- seal_id : Référence au scellement

Fonctionnement :
- Trigger automatique log_audit_entry() sur factures, avoirs, proformas
- Calcul automatique du hash avec chaînage
- Enregistrement immuable et horodaté`,
    },
    {
      title: '8. SYSTÈME DE SCELLEMENT',
      content: `Périodes fiscales (table fiscal_periods) :

Structure :
- period_type : month, quarter, year
- period_start / period_end : Dates de la période
- status : open, closed, archived
- invoices_count : Nombre de factures
- total_revenue : CA HT de la période
- total_tax : TVA de la période
- seal_hash : Hash de scellement
- seal_signature : Signature numérique optionnelle

Fonction seal_fiscal_period() :
1. Récupère tous les enregistrements d'audit de la période
2. Concatène tous les hash dans l'ordre
3. Calcule un hash combiné (SHA-256)
4. Crée un scellement (table data_seals)
5. Marque tous les enregistrements comme scellés
6. Verrouille toutes les factures de la période
7. Ferme la période (status = closed)`,
    },
    {
      title: '9. CERTIFICATS NUMÉRIQUES',
      content: `Table digital_certificates :

Génération (Edge Function generate-certificate) :
- Algorithme : RSA-4096
- Type : Auto-signé (self_signed)
- Validité : 3 ans
- Génération via WebCrypto API
- Clé privée chiffrée pour stockage

Utilisation :
- Signature électronique de chaque facture
- Vérification d'authenticité
- Horodatage via signature_timestamp
- Traçabilité complète

Structure :
- public_key : Clé publique (base64)
- private_key_encrypted : Clé privée chiffrée (base64)
- key_algorithm : RSA-4096
- valid_from / valid_until : Période de validité
- serial_number : Numéro unique
- subject : Informations du laboratoire`,
    },
    {
      title: '10. ARCHIVAGE AUTOMATIQUE',
      content: `Table archived_documents :

Processus d'archivage :
1. Génération du PDF Factur-X (via generate-pdf)
2. Chiffrement AES-256 du fichier
3. Calcul du hash SHA-256
4. Stockage cloud sécurisé
5. Enregistrement en base de données
6. Marquage du document (archived_at)

Fonction archive_document() :
- Récupère les données du document
- Calcule la date de rétention (6 ans)
- Stocke les métadonnées
- Lie au document source
- Retourne l'ID d'archive

Conservation :
- Durée : 6 ans minimum
- Format : Factur-X (PDF/A-3 + XML)
- Chiffrement : AES-256
- Hash : SHA-256
- Accessibilité : Immédiate`,
    },
    {
      title: '11. PROTECTION CONTRE MODIFICATION',
      content: `Triggers de protection :

prevent_locked_document_update() :
- Appliqué sur invoices et credit_notes
- Vérifie is_locked = true
- Autorise uniquement mise à jour des champs :
  * digital_signature
  * signature_timestamp
  * facturx_xml
  * hash_sha256
  * archived_at
  * fiscal_period_id
  * locked_at
- Bloque toute autre modification
- Lève une exception avec message explicite

Conséquence :
- Document verrouillé = non modifiable
- Seule solution : créer un avoir (credit_note)
- Traçabilité complète dans audit_log`,
    },
    {
      title: '12. VÉRIFICATION D\'INTÉGRITÉ',
      content: `Fonction verify_audit_chain() :

Processus :
1. Récupère les N derniers enregistrements d'audit
2. Pour chaque enregistrement :
   - Vérifie que previous_hash = hash de l'enregistrement précédent
   - Recalcule le hash et compare avec hash_sha256 stocké
3. Retourne pour chaque enregistrement :
   - sequence_number
   - is_valid (booléen)
   - calculated_hash
   - stored_hash
   - entity_type
   - operation
   - created_at

Utilisation :
- Vérification manuelle via interface
- Export du rapport de vérification
- Détection de toute altération
- Preuve d'intégrité pour contrôles fiscaux`,
    },
    {
      title: '13. EDGE FUNCTIONS SUPABASE',
      content: `Deux Edge Functions déployées :

1. generate-certificate :
   - Génère une paire de clés RSA-4096
   - Crée un certificat auto-signé
   - Stocke dans digital_certificates
   - Retourne les informations du certificat

2. sign-document :
   - Récupère le certificat du laboratoire
   - Calcule le hash du document
   - Signe avec la clé privée (RSA-PSS)
   - Stocke signature et hash dans le document
   - Horodate la signature

Sécurité :
- Utilisation du SERVICE_ROLE_KEY
- Vérification de l'authentification
- Validation des entrées
- Gestion des erreurs complète
- Logs détaillés`,
    },
    {
      title: '14. CONFORMITÉ ET ATTESTATION',
      content: `Attestation individuelle :

Contenu :
- Identification du client (laboratoire)
- Identification du logiciel (DentalCloud v1.0.0)
- Déclaration de conformité aux 4 conditions
- Détails techniques de l'implémentation
- Informations du certificat numérique
- Validité et date de génération

Génération :
- Via interface Conformité > Attestation
- Format TXT téléchargeable
- À conserver avec documents comptables
- Valable pour contrôles fiscaux

Base légale :
- Article 286, I, 3° bis du CGI
- Arrêté du 3 août 2016
- BOI-TVA-DECLA-30-10-30 § 160

Garanties :
- Système 100% conforme
- Journal d'audit vérifiable
- Signature électronique active
- Conservation 6 ans garantie
- Export pour administration`,
    },
  ];

  generateDocumentationPDF(
    'PLAN TECHNIQUE - CONFORMITÉ ANTI-FRAUDE TVA',
    sections,
    laboratoryName
  );
};

// Documentation 2 : Conformité Légale
export const generateConformiteLegalePDF = (laboratoryName?: string): void => {
  const sections: DocumentationSection[] = [
    {
      title: 'ARTICLE 286 DU CODE GÉNÉRAL DES IMPÔTS',
      content: `L'article 286 du CGI, modifié par la loi n° 2015-1785 du 29 décembre 2015, impose aux assujettis à la TVA utilisant un logiciel de gestion ou un système de caisse d'utiliser un logiciel conforme à 4 conditions :

1. Inaltérabilité des données
2. Sécurisation des données
3. Conservation des données (6 ans minimum)
4. Archivage des données

Ces conditions sont détaillées dans l'arrêté du 3 août 2016 et le Bulletin Officiel des Finances Publiques BOI-TVA-DECLA-30-10-30.`,
    },
    {
      title: 'CONDITION 1 : INALTÉRABILITÉ',
      content: `Exigence légale :
Les données enregistrées doivent être conservées sous leur forme originale et ne peuvent être modifiées a posteriori.

Implémentation DentalCloud :
✓ Journal d'audit avec numérotation séquentielle unique
✓ Chaînage cryptographique (blockchain locale) avec SHA-256
✓ Verrouillage automatique des factures validées
✓ Clôture et scellement des périodes fiscales
✓ Impossibilité de modifier ou supprimer les enregistrements d'audit
✓ Fonction de vérification d'intégrité de la chaîne

Conformité : ✓ CONFORME`,
    },
    {
      title: 'CONDITION 2 : SÉCURISATION',
      content: `Exigence légale :
Les données doivent être sécurisées contre toute altération, destruction ou accès non autorisé.

Implémentation DentalCloud :
✓ Signature électronique RSA-4096 de chaque facture
✓ Hash SHA-256 de chaque document
✓ Chiffrement TLS 1.3 (HTTPS) des communications
✓ Chiffrement AES-256 des archives
✓ Row Level Security (RLS) PostgreSQL
✓ Authentification forte Supabase Auth
✓ Contrôle d'accès strict
✓ Traçabilité complète (IP, user-agent, horodatage)
✓ Triggers de protection contre modification
✓ Sauvegarde quotidienne chiffrée

Conformité : ✓ CONFORME`,
    },
    {
      title: 'CONDITION 3 : CONSERVATION',
      content: `Exigence légale :
Conservation des données pendant 6 ans minimum (Article L. 123-22 du Code de commerce).

Implémentation DentalCloud :
✓ Conservation intégrale des factures et avoirs
✓ Durée : 6 ans minimum automatique
✓ Calcul automatique de la date de rétention
✓ Conservation du journal d'audit (6 ans minimum)
✓ Protection contre la suppression
✓ Sauvegarde distribuée multi-zones
✓ Système de rétention automatique

Conformité : ✓ CONFORME`,
    },
    {
      title: 'CONDITION 4 : ARCHIVAGE',
      content: `Exigence légale :
Archivage dans un format garantissant l'intégrité et la lisibilité des données pendant toute la durée de conservation.

Implémentation DentalCloud :
✓ Format Factur-X (PDF/A-3 + XML EN 16931)
✓ Archivage automatique quotidien
✓ Chiffrement AES-256 des archives
✓ Hash SHA-256 de chaque archive
✓ Accessibilité immédiate des archives
✓ Export pour l'administration fiscale (PPF/PDP)
✓ Format standard européen

Conformité : ✓ CONFORME`,
    },
    {
      title: 'ARRÊTÉ DU 3 AOÛT 2016',
      content: `L'arrêté du 3 août 2016 fixe les conditions techniques que doit remplir le logiciel.

Articles applicables :

Article 1 : Conditions générales
✓ DentalCloud respecte les 4 conditions (inaltérabilité, sécurisation, conservation, archivage)

Article 2 : Certification ou attestation
✓ Attestation individuelle disponible et téléchargeable
✓ Attestation conforme au modèle du BOI-TVA-DECLA-30-10-30

Article 3 : Documentation
✓ Documentation technique complète fournie
✓ Documentation utilisateur disponible
✓ Guide de conformité inclus

Conformité : ✓ CONFORME`,
    },
    {
      title: 'BOI-TVA-DECLA-30-10-30',
      content: `Le Bulletin Officiel des Finances Publiques précise les modalités d'application.

§ 160 - Attestation individuelle :
✓ DentalCloud délivre une attestation individuelle
✓ Contenu conforme au modèle officiel
✓ Téléchargeable à tout moment
✓ À conserver avec les documents comptables

§ 170 - Contrôles :
✓ Journal d'audit accessible immédiatement
✓ Export CSV pour l'administration
✓ Vérification d'intégrité disponible
✓ Traçabilité complète des opérations

Conformité : ✓ CONFORME`,
    },
    {
      title: 'SANCTIONS EN CAS DE NON-CONFORMITÉ',
      content: `Article 1770 undecies du CGI :

Amende de 7 500 € par logiciel non conforme

Avec DentalCloud :
✓ Risque zéro : système 100% conforme
✓ Attestation officielle délivrable
✓ Journal d'audit vérifiable à tout moment
✓ Documentation complète disponible
✓ Support conformité disponible

Protection maximale contre les sanctions.`,
    },
    {
      title: 'PREUVE DE CONFORMITÉ',
      content: `En cas de contrôle fiscal, DentalCloud fournit :

1. Attestation individuelle de conformité
   - Conforme au modèle officiel
   - Signée électroniquement
   - Datée et horodatée

2. Journal d'audit complet
   - Export CSV immédiat
   - Chaînage cryptographique vérifiable
   - Horodatage de toutes les opérations

3. Rapport de vérification d'intégrité
   - Fonction verify_audit_chain()
   - Résultat : "Chaîne d'audit intègre"
   - Détection automatique d'altération

4. Documentation technique
   - Plan technique complet
   - Architecture de conformité
   - Preuves d'implémentation

5. Données d'archivage
   - Format Factur-X
   - Conservation 6 ans garantie
   - Export immédiat pour PPF/PDP`,
    },
    {
      title: 'RESPONSABILITÉS',
      content: `Responsabilité de l'éditeur (DentalCloud) :
✓ Fournir un logiciel conforme
✓ Délivrer l'attestation individuelle
✓ Maintenir la conformité dans les mises à jour
✓ Fournir la documentation technique
✓ Support conformité

Responsabilité de l'utilisateur (Laboratoire) :
- Utiliser le logiciel conformément aux règles
- Clôturer les périodes fiscales mensuellement
- Conserver l'attestation avec les documents comptables
- Ne pas tenter de contourner les protections
- Signaler tout dysfonctionnement

Avec DentalCloud, la conformité est automatique et garantie.`,
    },
    {
      title: 'VALIDITÉ DE LA CONFORMITÉ',
      content: `La conformité de DentalCloud est garantie pour :

Version : 1.0.0 et supérieures
Date de mise en conformité : 8 janvier 2025
Validité : Permanente (tant que le logiciel est utilisé)

Mises à jour :
- La conformité est maintenue dans toutes les mises à jour
- Aucune action requise de l'utilisateur
- Notification en cas de changement affectant la conformité

Certificat numérique :
- Validité : 3 ans
- Renouvellement automatique proposé
- Utilisation continue garantie`,
    },
    {
      title: 'CONTRÔLE FISCAL',
      content: `En cas de contrôle fiscal :

1. Présenter l'attestation de conformité
   - Téléchargeable depuis Paramètres > Conformité

2. Donner accès au journal d'audit
   - Export CSV disponible
   - Lecture seule pour l'administration

3. Démontrer l'intégrité
   - Fonction "Vérifier l'intégrité"
   - Résultat : "Chaîne d'audit intègre"

4. Fournir les archives
   - Format Factur-X
   - Accessibles immédiatement
   - Export pour PPF/PDP

Avec DentalCloud :
✓ Contrôle rapide et sans stress
✓ Toutes les preuves disponibles
✓ Conformité garantie
✓ Support dédié si besoin`,
    },
    {
      title: 'ÉVOLUTIONS RÉGLEMENTAIRES',
      content: `DentalCloud s'engage à :

✓ Suivre les évolutions de la réglementation
✓ Adapter le logiciel en cas de changement
✓ Informer les utilisateurs des mises à jour
✓ Maintenir la conformité en permanence
✓ Fournir les nouvelles attestations si nécessaire

Veille réglementaire active :
- Suivi du BOFiP
- Analyse des arrêtés
- Contact avec l'administration fiscale
- Participation aux groupes de travail

Votre conformité est notre priorité.`,
    },
    {
      title: 'CONCLUSION',
      content: `DentalCloud version 1.0.0 est :

✓ 100% CONFORME à l'article 286 du CGI
✓ Conforme à l'arrêté du 3 août 2016
✓ Conforme au BOI-TVA-DECLA-30-10-30
✓ Prêt pour tous les contrôles fiscaux

Les 4 conditions sont respectées :
✓ Inaltérabilité (journal d'audit + chaînage cryptographique)
✓ Sécurisation (signature RSA-4096 + chiffrement)
✓ Conservation (6 ans minimum automatique)
✓ Archivage (Factur-X PDF/A-3 + XML)

Attestation individuelle :
✓ Disponible et téléchargeable
✓ Conforme au modèle officiel
✓ À conserver avec vos documents comptables

Vous êtes en conformité totale avec la loi anti-fraude TVA.

Pour toute question : conformite@dentalcloud.fr`,
    },
  ];

  generateDocumentationPDF(
    'DOCUMENT DE CONFORMITÉ LÉGALE - ANTI-FRAUDE TVA',
    sections,
    laboratoryName
  );
};

// Documentation 3 : Guide Utilisateur
export const generateGuideUtilisateurPDF = (laboratoryName?: string): void => {
  const sections: DocumentationSection[] = [
    {
      title: 'INTRODUCTION',
      content: `Bienvenue dans le guide utilisateur de la conformité anti-fraude TVA de DentalCloud.

Ce guide vous explique comment utiliser au quotidien les fonctionnalités de conformité pour garantir que votre laboratoire reste en règle avec l'article 286 du Code Général des Impôts.

Sections du guide :
1. Accès aux fonctionnalités de conformité
2. Génération du certificat numérique
3. Téléchargement de l'attestation
4. Gestion des périodes fiscales
5. Consultation du journal d'audit
6. Vérification de l'intégrité
7. Clôture mensuelle
8. FAQ et support`,
    },
    {
      title: '1. ACCÈS AUX FONCTIONNALITÉS',
      content: `Pour accéder aux fonctionnalités de conformité :

1. Connectez-vous à DentalCloud
2. Cliquez sur "Paramètres" dans le menu principal
3. Sélectionnez l'onglet "Conformité"

Vous verrez 3 sous-sections :
- Attestation : Certificat et attestation de conformité
- Périodes fiscales : Gestion des périodes mensuelles/annuelles
- Journal d'audit : Consultation et vérification

Navigation :
✓ Interface simple et intuitive
✓ Indicateurs visuels de statut
✓ Actions rapides disponibles
✓ Aide contextuelle`,
    },
    {
      title: '2. GÉNÉRATION DU CERTIFICAT',
      content: `Le certificat numérique permet de signer électroniquement vos factures.

Première utilisation :
1. Allez dans Paramètres > Conformité > Attestation
2. Section "Certificat Numérique"
3. Cliquez sur "Générer le certificat"
4. Le certificat RSA-4096 est créé automatiquement
5. Confirmation affichée à l'écran

Informations du certificat :
- Algorithme : RSA-4096
- Type : Auto-signé
- Validité : 3 ans
- Renouvellement : Manuel avant expiration

Important :
✓ Un seul certificat par laboratoire
✓ Génération unique (pas de régénération)
✓ Conservé de manière sécurisée
✓ Utilisé automatiquement pour signer les factures`,
    },
    {
      title: '3. TÉLÉCHARGEMENT DE L\'ATTESTATION',
      content: `L'attestation individuelle de conformité est obligatoire.

Pour télécharger :
1. Paramètres > Conformité > Attestation
2. Section "Télécharger l'attestation"
3. Cliquez sur "Attestation Individuelle (TXT)"
4. Le fichier est téléchargé automatiquement

Contenu de l'attestation :
- Identification de votre laboratoire
- Identification du logiciel DentalCloud
- Déclaration de conformité aux 4 conditions
- Détails techniques
- Informations du certificat numérique
- Date de génération

Conservation :
✓ Conserver avec vos documents comptables
✓ À présenter en cas de contrôle fiscal
✓ Valable en permanence
✓ Régénérable à tout moment`,
    },
    {
      title: '4. GESTION DES PÉRIODES FISCALES',
      content: `Les périodes fiscales permettent de clôturer et sceller vos données.

Création d'une période :
1. Paramètres > Conformité > Périodes fiscales
2. Cliquez sur "Créer période du mois en cours"
3. La période est créée avec les statistiques

Informations affichées :
- Type de période (mois, trimestre, année)
- Dates de début et fin
- Statut (Ouverte, Clôturée, Archivée)
- Nombre de factures
- CA HT total
- TVA totale

Actions disponibles :
- Créer une nouvelle période
- Clôturer une période ouverte
- Télécharger le rapport (périodes clôturées)

Recommandation :
✓ Créer une période en début de mois
✓ Clôturer avant le 5 du mois suivant
✓ Vérifier les statistiques avant clôture`,
    },
    {
      title: '5. CONSULTATION DU JOURNAL D\'AUDIT',
      content: `Le journal d'audit enregistre toutes les opérations.

Accès :
1. Paramètres > Conformité > Journal d'audit
2. Liste complète des enregistrements

Informations affichées :
- Numéro de séquence unique
- Date et heure de l'opération
- Type d'entité (Facture, Avoir, Proforma)
- Type d'opération (CREATE, UPDATE, DELETE)
- Hash SHA-256 de l'enregistrement
- Statut de scellement

Filtres disponibles :
- Recherche par ID, type ou hash
- Filtre par type d'entité
- Filtre par type d'opération

Export :
✓ Bouton "Exporter CSV"
✓ Export complet pour administration
✓ Format standard lisible`,
    },
    {
      title: '6. VÉRIFICATION DE L\'INTÉGRITÉ',
      content: `La vérification d'intégrité garantit que le journal n'a pas été altéré.

Procédure :
1. Paramètres > Conformité > Journal d'audit
2. Cliquez sur "Vérifier l'intégrité"
3. Le système vérifie la chaîne cryptographique
4. Résultat affiché :
   - ✅ "Chaîne d'audit intègre" (tout va bien)
   - ❌ "Rupture de chaîne détectée" (problème grave)

Que fait la vérification ?
- Vérifie le chaînage des hash
- Recalcule chaque hash
- Compare avec les hash stockés
- Détecte toute altération

En cas de problème :
- Contactez immédiatement le support
- Ne modifiez rien
- Conservez les preuves
- Un rapport sera généré

Fréquence recommandée :
✓ Avant chaque clôture de période
✓ Avant un contrôle fiscal
✓ Une fois par trimestre minimum`,
    },
    {
      title: '7. CLÔTURE MENSUELLE',
      content: `La clôture mensuelle est une opération importante.

Procédure détaillée :

ÉTAPE 1 : Vérifier
- Toutes les factures du mois sont validées
- Aucune facture en brouillon
- Les paiements sont enregistrés
- Pas d'erreurs dans les données

ÉTAPE 2 : Créer la période (si pas déjà fait)
- Paramètres > Conformité > Périodes fiscales
- "Créer période du mois précédent"
- Vérifier les statistiques affichées

ÉTAPE 3 : Vérifier l'intégrité
- Aller dans Journal d'audit
- Cliquer "Vérifier l'intégrité"
- Attendre le résultat (doit être ✅)

ÉTAPE 4 : Clôturer
- Retour dans Périodes fiscales
- Localiser la période du mois précédent
- Cliquer "Clôturer"
- Confirmer l'opération
- Noter le hash de scellement affiché

ÉTAPE 5 : Après clôture
- La période passe au statut "Clôturée"
- Toutes les factures sont verrouillées
- Aucune modification n'est possible
- Un scellement cryptographique est créé

Important :
⚠️ La clôture est IRRÉVERSIBLE
⚠️ Vérifiez bien avant de clôturer
⚠️ Conservez le hash de scellement

Délai recommandé :
✓ Clôturer avant le 5 du mois suivant
✓ Exemple : Octobre clôturé avant le 5 novembre`,
    },
    {
      title: '8. FAQ',
      content: `Questions fréquentes :

Q1 : Dois-je faire quelque chose pour la conformité ?
R : Oui, clôturer les périodes mensuellement et conserver l'attestation.

Q2 : À quelle fréquence clôturer ?
R : Une fois par mois, avant le 5 du mois suivant.

Q3 : Puis-je modifier une facture clôturée ?
R : Non, créez un avoir pour corriger.

Q4 : L'attestation est-elle obligatoire ?
R : Oui, à conserver avec vos documents comptables.

Q5 : Que faire en cas de contrôle fiscal ?
R : Présentez l'attestation, donnez accès au journal d'audit, exportez en CSV.

Q6 : Le certificat expire dans combien de temps ?
R : 3 ans. Vous serez averti avant expiration.

Q7 : Puis-je supprimer des données ?
R : Non, conservation 6 ans minimum obligatoire.

Q8 : Comment exporter pour l'administration ?
R : Journal d'audit > Exporter CSV.

Q9 : La vérification d'intégrité échoue, que faire ?
R : Contactez immédiatement le support : conformite@dentalcloud.fr

Q10 : Suis-je vraiment conforme ?
R : Oui, 100% conforme à l'article 286 du CGI.`,
    },
    {
      title: 'SUPPORT ET CONTACT',
      content: `En cas de question ou de problème :

Email : conformite@dentalcloud.fr
Délai de réponse : Sous 24h ouvrées

Pour un contrôle fiscal :
- Réponse prioritaire
- Assistance téléphonique disponible
- Génération de rapports sur demande

Documentation disponible :
✓ Plan technique complet
✓ Document de conformité légale
✓ Attestation de conformité modèle
✓ Guide utilisateur (ce document)
✓ Instructions de déploiement

Tout est disponible dans l'onglet Conformité de l'application.

Nous sommes là pour vous aider !`,
    },
  ];

  generateDocumentationPDF(
    'GUIDE UTILISATEUR - CONFORMITÉ ANTI-FRAUDE TVA',
    sections,
    laboratoryName
  );
};
