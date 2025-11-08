# ATTESTATION INDIVIDUELLE DE CONFORMITÉ
## Logiciel de Gestion DentalCloud
### Conformité à l'article 286, I, 3° bis du Code Général des Impôts

---

## IDENTIFICATION DE L'ÉDITEUR

**Raison sociale**: [Nom de votre société]
**Forme juridique**: [SAS / SARL / SA / etc.]
**Capital social**: [Montant] €
**SIRET**: [N° SIRET]
**Code APE**: [Code APE]
**Adresse du siège social**: [Adresse complète]
**Téléphone**: [Numéro]
**Email**: [Email de contact]
**Site web**: [URL]

---

## IDENTIFICATION DU LOGICIEL

**Nom du logiciel**: DentalCloud
**Version**: 1.0.0
**Date de publication**: 8 janvier 2025
**Type**: Logiciel de gestion pour laboratoires dentaires (SaaS)
**Technologie**: Application web progressive (PWA)
**Hébergement**: Cloud Supabase (Union Européenne)

---

## IDENTIFICATION DU CLIENT

**Raison sociale / Nom**: _______________________________________________
**SIRET**: _____________________________________________________________
**Adresse**: ___________________________________________________________
**Date de souscription**: _______________________________________________
**Numéro de licence**: _________________________________________________

---

## OBJET DE L'ATTESTATION

Je soussigné(e), **[Nom et prénom du représentant légal]**, agissant en qualité de **[Fonction]** de la société **[Nom de la société éditrice]**, atteste sur l'honneur que:

Le logiciel **DentalCloud version 1.0.0** respecte les conditions d'inaltérabilité, de sécurisation, de conservation et d'archivage des données en vue du contrôle de l'administration fiscale, conformément aux dispositions de:

- **L'article 286, I, 3° bis du Code Général des Impôts (CGI)**
- **L'arrêté du 3 août 2016** fixant les conditions techniques
- **Le Bulletin Officiel des Finances Publiques BOI-TVA-DECLA-30-10-30**

Cette attestation est délivrée en application du § 160 du BOI-TVA-DECLA-30-10-30.

---

## DÉCLARATION DE CONFORMITÉ

### 1. CONDITION D'INALTÉRABILITÉ

✅ **Le logiciel garantit l'inaltérabilité des données enregistrées**

**Mesures techniques mises en œuvre**:

- **Journal d'audit inaltérable**: Chaque opération de création, modification ou suppression d'une facture, d'un avoir ou d'un proforma est automatiquement enregistrée dans un journal d'audit (`audit_log`) avec un numéro de séquence unique, croissant et non modifiable.

- **Chaînage cryptographique**: Chaque enregistrement d'audit contient un hash SHA-256 calculé à partir de ses données et du hash de l'enregistrement précédent, formant une chaîne cryptographique inaltérable (blockchain locale).

- **Verrouillage des documents**: Les factures validées sont automatiquement verrouillées (`is_locked = true`) et ne peuvent plus être modifiées. Toute tentative de modification est bloquée au niveau applicatif et base de données.

- **Clôture périodique**: Une clôture mensuelle obligatoire (réalisée à J+5 du mois suivant) verrouille définitivement toutes les factures de la période avec un scellement cryptographique.

- **Protection base de données**: Row Level Security (RLS) PostgreSQL empêche toute modification directe des tables d'audit. Les triggers automatiques enregistrent toute opération sans possibilité de contournement.

**Conformité**: Article 286, I, 3° bis du CGI / Arrêté du 3 août 2016, Article 3

---

### 2. CONDITION DE SÉCURISATION

✅ **Le logiciel garantit la sécurisation des données enregistrées**

**Mesures techniques mises en œuvre**:

- **Signature électronique**: Chaque facture est signée numériquement avec une clé privée RSA-4096 unique par laboratoire. La signature est stockée dans le champ `digital_signature` et horodatée. La clé privée est chiffrée avec AES-256 et stockée de manière sécurisée.

- **Chiffrement des communications**: Toutes les communications entre le client et le serveur sont chiffrées avec TLS 1.3 (HTTPS). Aucune donnée sensible n'est transmise en clair.

- **Chiffrement des archives**: Les documents archivés sont chiffrés avec AES-256 avant stockage. Chaque archive possède un hash SHA-256 pour vérification d'intégrité.

- **Authentification forte**: Accès au logiciel sécurisé par authentification Supabase Auth avec validation d'email. Gestion des sessions avec timeout automatique.

- **Contrôle d'accès**: Row Level Security (RLS) garantit que chaque utilisateur ne peut accéder qu'à ses propres données. Principe du moindre privilège appliqué.

- **Traçabilité des accès**: Chaque accès est enregistré avec l'adresse IP, le user-agent et l'horodatage précis (microseconde).

- **Sauvegarde automatique**: Sauvegarde quotidienne automatique chiffrée avec réplication géographique (infrastructure Supabase).

**Conformité**: Article 286, I, 3° bis du CGI / Arrêté du 3 août 2016, Article 4

---

### 3. CONDITION DE CONSERVATION

✅ **Le logiciel garantit la conservation des données enregistrées**

**Mesures techniques mises en œuvre**:

- **Conservation intégrale**: Toutes les factures, avoirs, proformas et bons de livraison sont conservés de manière permanente en base de données. Aucune suppression n'est possible (soft delete uniquement).

- **Durée de conservation**: Conservation réglementaire de **6 ans minimum** à compter de la date d'émission du document, conformément à l'article L. 123-22 du Code de commerce.

- **Calcul automatique**: Le champ `retention_until` est calculé automatiquement (`date_émission + 6 ans`) pour chaque document archivé.

- **Conservation du journal d'audit**: L'intégralité du journal d'audit (`audit_log`) est conservée pendant 6 ans minimum. Les logs de plus de 2 ans sont archivés dans une table séparée pour optimisation, mais restent accessibles.

- **Protection contre la suppression**: Les utilisateurs ne peuvent pas supprimer de factures ou d'avoirs. Seul un marquage "annulé" est possible, avec conservation de l'original et enregistrement dans l'audit.

- **Sauvegarde distribuée**: Les données sont stockées avec réplication multi-zones géographiques pour garantir la pérennité.

**Conformité**: Article L. 123-22 du Code de commerce / BOI-TVA-DECLA-30-10-30 § 90

---

### 4. CONDITION D'ARCHIVAGE

✅ **Le logiciel garantit l'archivage des données enregistrées**

**Mesures techniques mises en œuvre**:

- **Format Factur-X**: Toutes les factures et avoirs sont automatiquement générés au format Factur-X (PDF/A-3 avec XML embarqué conforme à la norme EN 16931). Ce format hybride garantit la lisibilité et l'exploitabilité à long terme.

- **Archivage automatique**: Un processus automatique quotidien archive toutes les nouvelles factures validées. Les documents sont générés en Factur-X, chiffrés (AES-256), puis stockés dans Supabase Storage.

- **Métadonnées complètes**: Chaque archive contient:
  - Le PDF/A-3 avec le XML embarqué
  - La signature électronique
  - Le hash SHA-256 du fichier
  - Les métadonnées (date, montant, client, numéro)
  - L'identifiant de clé de chiffrement

- **Table `archived_documents`**: Une table dédiée référence tous les documents archivés avec leur emplacement de stockage, leur hash, leur date d'archivage et leur date de fin de rétention.

- **Accessibilité**: Les archives sont accessibles en quelques secondes via l'interface utilisateur. Possibilité de recherche par période, client, numéro de facture, montant. Export en masse possible.

- **Intégrité vérifiable**: Le hash SHA-256 de chaque archive permet de vérifier à tout moment que le fichier n'a pas été altéré.

- **Export pour l'administration**: En cas de contrôle fiscal, possibilité d'exporter l'ensemble des archives d'une période au format Factur-X, avec le journal d'audit complet.

**Conformité**: Arrêté du 3 août 2016, Article 5 / BOI-TVA-DECLA-30-10-30 § 100

---

## FONCTIONNALITÉS DE TRAÇABILITÉ

**Le logiciel DentalCloud met en œuvre les fonctionnalités suivantes pour garantir une traçabilité complète**:

### Enregistrement des opérations
- Chaque création, modification, suppression de facture ou avoir est tracée
- Horodatage UTC avec précision à la microseconde
- Identification de l'utilisateur (user_id) et de son laboratoire
- Enregistrement de l'adresse IP et du user-agent
- Conservation des anciennes et nouvelles valeurs en cas de modification

### Numérotation séquentielle
- Numéros de facture séquentiels et continus par laboratoire et par année
- Impossible de sauter un numéro ou de revenir en arrière
- Contrôle automatique à la création de chaque nouvelle facture
- En cas d'écart détecté, alerte générée dans le journal

### Clôture périodique
- Clôture mensuelle automatique recommandée (J+5 du mois suivant)
- Clôture annuelle obligatoire (avant le 31 janvier N+1)
- Scellement cryptographique de la période (hash combiné + signature RSA)
- Table `data_seals` conservant l'historique des scellements
- Table `fiscal_periods` pour gestion des périodes ouvertes/closes/archivées

### Vérification d'intégrité
- Fonction SQL `verify_audit_chain()` pour vérifier la chaîne d'audit
- Vérification automatique quotidienne de l'intégrité
- Alerte immédiate en cas de rupture de chaîne
- Rapport d'intégrité disponible dans le dashboard administrateur

---

## COMPATIBILITÉ AVEC LA FACTURATION ÉLECTRONIQUE

**Le logiciel DentalCloud est préparé pour l'obligation de facturation électronique B2B**:

- ✅ **Format Factur-X**: Génération native au format Factur-X (PDF/A-3 + XML EN 16931)
- ✅ **Export PPF/PDP**: Fonction d'export compatible avec le Portail Public de Facturation (PPF) ou les Plateformes de Dématérialisation Partenaires (PDP)
- ✅ **Profil BASIC minimum**: XML conforme au profil BASIC de la norme EN 16931, avec possibilité d'export en COMFORT ou EXTENDED
- ✅ **Prêt pour 2024-2026**: Anticipation de l'obligation progressive de facturation électronique (Ordonnance n° 2021-1190 du 15 septembre 2021)

---

## CONFORMITÉ RGPD

**Le logiciel DentalCloud est conforme au Règlement Général sur la Protection des Données (RGPD)**:

- ✅ Données collectées limitées au strict nécessaire (B2B uniquement)
- ✅ Base légale: Intérêt légitime (gestion commerciale B2B) et obligation légale (TVA)
- ✅ Droits des personnes: Accès, rectification, portabilité, effacement (sous réserve obligations légales)
- ✅ Sécurité: Chiffrement, authentification, logs d'accès, sauvegarde
- ✅ Durée de conservation: Données actives (durée d'abonnement), archives comptables (6 ans minimum)
- ✅ Registre des traitements disponible sur demande

---

## DOCUMENTATION FOURNIE

**Le client bénéficie des documents suivants**:

- ✅ Présente attestation individuelle de conformité
- ✅ Documentation utilisateur complète (DOCUMENTATION_UTILISATEUR.md)
- ✅ Guide de mise en conformité anti-fraude
- ✅ FAQ conformité et réglementaire
- ✅ Tutoriels vidéo
- ✅ Support technique par email et téléphone

**Documentation technique disponible sur demande**:

- Plan technique détaillé (PLAN_TECHNIQUE_CONFORMITE_ANTIFRAUD.md)
- Document de conformité légale (DOCUMENT_CONFORMITE_LEGALE.md)
- Schémas de base de données
- Description des algorithmes cryptographiques

---

## ENGAGEMENTS DE L'ÉDITEUR

**L'éditeur s'engage à**:

1. **Maintenir la conformité**: Toute nouvelle version du logiciel respectera les mêmes exigences de conformité. Une nouvelle attestation sera délivrée pour chaque version majeure.

2. **Informer des évolutions**: L'éditeur informera les clients de toute évolution réglementaire affectant le logiciel et mettra à jour le logiciel si nécessaire.

3. **Corriger les non-conformités**: En cas de détection d'une non-conformité, l'éditeur s'engage à la corriger sous 30 jours et à en informer tous les clients.

4. **Support en cas de contrôle**: L'éditeur s'engage à fournir une assistance technique en cas de contrôle fiscal d'un client, et à fournir tous les exports et justificatifs nécessaires.

5. **Audits réguliers**: L'éditeur réalise un audit interne annuel de conformité et publie un rapport de conformité.

---

## RESPONSABILITÉS DU CLIENT

**Le client s'engage à**:

1. **Utiliser conformément**: Utiliser le logiciel conformément à sa destination et ne pas tenter d'altérer le système d'audit ou de contourner les protections.

2. **Conserver les données**: Conserver les archives pendant au moins 6 ans et ne pas supprimer de factures.

3. **Effectuer les clôtures**: Réaliser les clôtures périodiques mensuelles et annuelles recommandées.

4. **Maintenir son abonnement**: En cas de résiliation, exporter l'intégralité de ses données avant la fermeture du compte.

5. **Coopérer en cas de contrôle**: En cas de contrôle fiscal, présenter cette attestation, donner accès au logiciel si nécessaire, et fournir les exports demandés par l'administration.

---

## VALIDITÉ DE L'ATTESTATION

**Cette attestation est valable pour**:

- **Logiciel**: DentalCloud
- **Version**: 1.0.0
- **À compter du**: 8 janvier 2025
- **Jusqu'au**: Publication d'une nouvelle version majeure (avec nouvelle attestation)

**En cas de mise à jour mineure (correctifs de bugs, améliorations de performance) n'affectant pas les mécanismes de conformité, cette attestation reste valide.**

**En cas de mise à jour majeure modifiant les mécanismes de conformité, une nouvelle attestation sera délivrée et transmise à tous les clients.**

---

## CONTACT ÉDITEUR

Pour toute question relative à la conformité ou à cette attestation:

**Support conformité**:
- Email: [conformite@votresociete.com]
- Téléphone: [+33 X XX XX XX XX]
- Horaires: Lundi au vendredi, 9h-18h

**Support technique**:
- Email: [support@votresociete.com]
- Téléphone: [+33 X XX XX XX XX]
- Horaires: Lundi au vendredi, 9h-18h

---

## SIGNATURES

**Fait à** [Ville], **le** 8 janvier 2025

**Pour l'éditeur [Nom de la société]**:

**Nom et prénom**: _____________________________________________________

**Fonction**: __________________________________________________________

**Signature**:


**Cachet de l'entreprise**:




---

**Pour le client** (optionnel):

**Nom et prénom**: _____________________________________________________

**Fonction**: __________________________________________________________

**Signature**:


**Cachet de l'entreprise**:




---

## ANNEXES

- Annexe 1: Extrait du Code Général des Impôts (Article 286, I, 3° bis)
- Annexe 2: Extrait de l'arrêté du 3 août 2016
- Annexe 3: Extrait du BOI-TVA-DECLA-30-10-30
- Annexe 4: Schéma de principe du système d'audit
- Annexe 5: Exemple de journal d'audit (anonymisé)

---

**FIN DE L'ATTESTATION**

*Ce document constitue une attestation individuelle de conformité au sens du BOI-TVA-DECLA-30-10-30 § 160. Il n'est pas une certification NF525 délivrée par un organisme tiers, mais répond aux obligations légales de l'article 286, I, 3° bis du Code Général des Impôts.*

*À conserver pendant toute la durée d'utilisation du logiciel et pendant 6 ans après la cessation d'utilisation.*
