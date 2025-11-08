# Document de Conformité Légale
## DentalCloud - Logiciel de Gestion pour Laboratoires Dentaires

**Conformité à la Loi n° 2015-1785 du 29 décembre 2015**
**Article 286 du Code Général des Impôts (CGI)**
**Lutte contre la fraude à la TVA**

---

## INFORMATIONS GÉNÉRALES

**Éditeur**: [Nom de votre société]
**Application**: DentalCloud
**Version**: 1.0
**Date de mise en conformité**: 2025-01-08
**Type de certification**: Attestation individuelle de conformité
**Document version**: 1.0

---

## 1. CADRE LÉGAL

### 1.1 Textes de référence

#### Loi n° 2015-1785 du 29 décembre 2015 (Article 88)
Obligation pour les assujettis à la TVA utilisant un logiciel de comptabilité ou de gestion ou un système de caisse de:
- Justifier de l'utilisation d'un logiciel satisfaisant à des conditions d'inaltérabilité, de sécurisation, de conservation et d'archivage des données

#### Article 286 du Code Général des Impôts (CGI), I, 3° bis
Les assujettis doivent:
> "Lorsqu'ils enregistrent les règlements de leurs clients au moyen d'un logiciel de comptabilité ou de gestion ou d'un système de caisse, utiliser un logiciel ou système satisfaisant à des conditions d'inaltérabilité, de sécurisation, de conservation et d'archivage des données en vue du contrôle de l'administration fiscale"

#### Arrêté du 3 août 2016 (BOI-TVA-DECLA-30-10-30)
Définit les conditions techniques et fonctionnelles auxquelles doivent satisfaire les logiciels:
- Inaltérabilité des enregistrements
- Sécurisation des données
- Conservation des données
- Archivage des données

### 1.2 Sanctions

**Article 1770 undecies du CGI**:
> "Le fait de se livrer à des manœuvres frauduleuses, par voie de comptabilité, notamment en utilisant un logiciel aux fins de permettre la commission de ces infractions, est puni d'une amende de 7 500 € pour une personne physique et de 37 500 € pour une personne morale"

---

## 2. DÉCLARATION DE CONFORMITÉ

### 2.1 Domaine d'application

**DentalCloud** est un logiciel de gestion destiné aux laboratoires de prothèses dentaires permettant:
- La création de bons de livraison
- L'émission de devis/proformas
- L'émission de factures
- L'émission d'avoirs (notes de crédit)
- La gestion des clients (dentistes)
- Le suivi des paiements
- La gestion des stocks de matières premières

**Public concerné**: Laboratoires de prothèses dentaires, assujettis à la TVA

### 2.2 Déclaration de conformité

Nous, soussignés [Nom de la société éditrice], déclarons sur l'honneur que le logiciel **DentalCloud version 1.0** respecte l'ensemble des conditions d'inaltérabilité, de sécurisation, de conservation et d'archivage des données prévues par:
- L'article 286 du Code Général des Impôts
- L'arrêté du 3 août 2016
- Le Bulletin Officiel des Finances Publiques (BOI-TVA-DECLA-30-10-30)

Cette conformité est effective à compter du **8 janvier 2025**.

---

## 3. RESPECT DES CONDITIONS D'INALTÉRABILITÉ

### 3.1 Principe d'inaltérabilité

**Définition**: Aucune modification rétroactive des données comptables ne doit être possible sans laisser de trace.

### 3.2 Implémentation dans DentalCloud

#### 3.2.1 Journal d'audit inaltérable
✅ **Mise en œuvre**:
- Chaque opération (création, modification, suppression) est enregistrée dans une table dédiée `audit_log`
- Chaque enregistrement possède un numéro de séquence unique et croissant
- Impossible de supprimer ou modifier un enregistrement dans `audit_log`
- Protection par Row Level Security (RLS) PostgreSQL

**Conformité**: ✅ Article 286, I, 3° bis - Inaltérabilité

#### 3.2.2 Chaînage cryptographique
✅ **Mise en œuvre**:
- Calcul d'un hash SHA-256 pour chaque enregistrement
- Chaque hash inclut le hash de l'enregistrement précédent
- Formation d'une blockchain locale
- Détection automatique de toute tentative d'altération

**Conformité**: ✅ Arrêté du 3 août 2016 - Article 3

#### 3.2.3 Verrouillage des documents
✅ **Mise en œuvre**:
- Les factures sont verrouillées (champ `is_locked`) après validation
- Impossible de modifier une facture verrouillée
- Système de clôture périodique mensuelle
- Toutes les factures d'une période close sont définitivement verrouillées

**Conformité**: ✅ BOI-TVA-DECLA-30-10-30 § 70

---

## 4. RESPECT DES CONDITIONS DE SÉCURISATION

### 4.1 Principe de sécurisation

**Définition**: Les données doivent être protégées contre toute altération, destruction ou accès non autorisé.

### 4.2 Implémentation dans DentalCloud

#### 4.2.1 Signature électronique
✅ **Mise en œuvre**:
- Chaque facture est signée numériquement avec une clé privée RSA-4096
- Génération d'une paire de clés unique par laboratoire
- Stockage sécurisé de la clé privée (chiffrée AES-256)
- Signature au format PKCS#7

**Conformité**: ✅ Arrêté du 3 août 2016 - Article 4

#### 4.2.2 Authentification et contrôle d'accès
✅ **Mise en œuvre**:
- Authentification forte via Supabase Auth
- Row Level Security (RLS) sur toutes les tables
- Principe du moindre privilège
- Logs d'accès avec adresse IP et user-agent
- Session timeout automatique

**Conformité**: ✅ BOI-TVA-DECLA-30-10-30 § 80

#### 4.2.3 Chiffrement
✅ **Mise en œuvre**:
- Transmission: HTTPS/TLS 1.3
- Stockage: Encryption at rest (Supabase)
- Archives: AES-256
- Clés privées: AES-256 + passphrase

**Conformité**: ✅ RGPD Article 32

#### 4.2.4 Sauvegarde
✅ **Mise en œuvre**:
- Sauvegarde automatique quotidienne (Supabase)
- Sauvegarde chiffrée hebdomadaire
- Point de restauration mensuel
- Stockage géographiquement distribué

**Conformité**: ✅ Arrêté du 3 août 2016 - Article 4

---

## 5. RESPECT DES CONDITIONS DE CONSERVATION

### 5.1 Principe de conservation

**Définition**: Les données doivent être conservées pendant une durée minimale de 6 ans.

### 5.2 Implémentation dans DentalCloud

#### 5.2.1 Conservation des factures
✅ **Mise en œuvre**:
- Toutes les factures sont conservées en base de données
- Aucune suppression possible
- Archivage automatique au format Factur-X
- Conservation du PDF + XML + signature

**Conformité**: ✅ Article L. 123-22 du Code de commerce

#### 5.2.2 Conservation du journal d'audit
✅ **Mise en œuvre**:
- Conservation intégrale du journal `audit_log`
- Partition annuelle pour optimisation
- Archivage des logs > 2 ans dans table séparée
- Aucune suppression avant 6 ans

**Conformité**: ✅ BOI-TVA-DECLA-30-10-30 § 90

#### 5.2.3 Durée de conservation
✅ **Mise en œuvre**:
- Durée minimale: **6 ans** à compter de la date d'émission
- Champ `retention_until` dans `archived_documents`
- Calcul automatique: date_facture + 6 ans
- Alerte avant expiration pour renouvellement si nécessaire

**Conformité**: ✅ Article L. 123-22 du Code de commerce

---

## 6. RESPECT DES CONDITIONS D'ARCHIVAGE

### 6.1 Principe d'archivage

**Définition**: Les données doivent être archivées de manière sécurisée, accessible et pérenne.

### 6.2 Implémentation dans DentalCloud

#### 6.2.1 Format Factur-X
✅ **Mise en œuvre**:
- Génération automatique au format Factur-X (ZUGFeRD)
- PDF/A-3 avec XML embarqué (norme EN 16931)
- Métadonnées XMP complètes
- Validation du XML par rapport au schéma

**Conformité**: ✅ Ordonnance n° 2021-1190 (e-invoicing)

#### 6.2.2 Archivage automatique
✅ **Mise en œuvre**:
- Archivage quotidien automatique
- Chiffrement AES-256 avant stockage
- Stockage dans Supabase Storage
- Hash SHA-256 de chaque archive
- Table `archived_documents` avec métadonnées

**Conformité**: ✅ Arrêté du 3 août 2016 - Article 5

#### 6.2.3 Accessibilité
✅ **Mise en œuvre**:
- Restauration possible en quelques secondes
- Interface de recherche et consultation
- Export en masse par période
- Compatible avec le contrôle fiscal

**Conformité**: ✅ BOI-TVA-DECLA-30-10-30 § 100

---

## 7. TRAÇABILITÉ DES OPÉRATIONS

### 7.1 Enregistrement des opérations

✅ **Mise en œuvre**:
- Chaque création de facture → Entrée audit avec statut "CREATE"
- Chaque modification → Entrée audit avec ancienne et nouvelle valeur
- Chaque suppression → Entrée audit avec valeur supprimée (soft delete)
- Horodatage UTC précis (microseconde)
- Identification de l'utilisateur (user_id)
- Adresse IP et user-agent

**Conformité**: ✅ BOI-TVA-DECLA-30-10-30 § 110

### 7.2 Clôture périodique

✅ **Mise en œuvre**:
- Clôture mensuelle automatique (J+5 du mois suivant)
- Clôture annuelle automatique (31 janvier N+1)
- Scellement cryptographique (hash combiné + signature)
- Table `data_seals` pour traçabilité des scellements
- Table `fiscal_periods` pour gestion des périodes

**Conformité**: ✅ BOI-TVA-DECLA-30-10-30 § 120

### 7.3 Vérification de l'intégrité

✅ **Mise en œuvre**:
- Fonction SQL `verify_audit_chain()` pour vérifier la chaîne
- Vérification automatique quotidienne
- Alerte en cas de rupture de chaîne
- Rapport d'intégrité dans le dashboard admin

**Conformité**: ✅ Arrêté du 3 août 2016 - Article 3

---

## 8. COMPATIBILITÉ AVEC LA FACTURATION ÉLECTRONIQUE

### 8.1 Contexte réglementaire

**Ordonnance n° 2021-1190** du 15 septembre 2021:
- Obligation de facturation électronique B2B
- Calendrier: 2024-2026
- Passage par le Portail Public de Facturation (PPF) ou Plateforme de Dématérialisation Partenaire (PDP)

### 8.2 Implémentation dans DentalCloud

#### 8.2.1 Format Factur-X
✅ **Mise en œuvre**:
- Toutes les factures générées au format Factur-X
- Profil BASIC minimum (EN 16931)
- Possibilité d'export en COMFORT ou EXTENDED

**Conformité**: ✅ Norme européenne EN 16931

#### 8.2.2 Export PPF/PDP
✅ **Mise en œuvre**:
- Edge function `export-ppf` pour génération du flux
- Format: ZIP contenant les Factur-X + manifest XML
- Structure conforme aux spécifications PPF
- Prêt pour transmission via API PPF (future)

**Conformité**: ✅ Préparation obligation 2024-2026

---

## 9. PROTECTION DES DONNÉES PERSONNELLES (RGPD)

### 9.1 Conformité RGPD

**Règlement (UE) 2016/679** du 27 avril 2016:

✅ **Données collectées**:
- Laboratoires: Raison sociale, SIRET, adresse, contact
- Dentistes (B2B): Nom, adresse professionnelle, contact professionnel
- Utilisateurs: Email, nom, prénom

✅ **Base légale**: Intérêt légitime (B2B), obligation légale (TVA)

✅ **Droits des personnes**:
- Droit d'accès: Interface de consultation
- Droit de rectification: Interface de modification
- Droit à l'effacement: Pseudo-suppression (conservation légale 6 ans)
- Droit à la portabilité: Export des données

✅ **Sécurité**:
- Chiffrement des données sensibles
- Authentification forte
- Logs d'accès
- Sauvegarde chiffrée

✅ **Durée de conservation**:
- Données actives: Durée de l'abonnement
- Archives comptables: 6 ans (obligation légale)
- Logs d'audit: 6 ans (obligation légale)

### 9.2 Registre des traitements

Un registre des activités de traitement conforme à l'article 30 du RGPD est maintenu et disponible sur demande.

---

## 10. ATTESTATION INDIVIDUELLE DE CONFORMITÉ

### 10.1 Nature de l'attestation

Conformément au **BOI-TVA-DECLA-30-10-30 § 160**, DentalCloud fournit une **attestation individuelle de conformité** et **non une certification NF525**.

### 10.2 Valeur juridique

L'attestation individuelle:
- ✅ Est reconnue par l'administration fiscale
- ✅ Satisfait aux obligations de l'article 286 du CGI
- ✅ Est suffisante pour les contrôles fiscaux
- ✅ N'implique pas de certification par un organisme tiers

### 10.3 Contenu de l'attestation

L'attestation remise à chaque client comprend:
- Identification de l'éditeur et du logiciel
- Numéro de version
- Date de délivrance
- Déclaration de conformité aux 4 conditions (inaltérabilité, sécurisation, conservation, archivage)
- Détail des mesures techniques mises en œuvre
- Signature de l'éditeur

**Modèle d'attestation**: Voir fichier `ATTESTATION_CONFORMITE_MODELE.md`

---

## 11. DOCUMENTATION ET PREUVES

### 11.1 Documentation technique

✅ Disponible:
- Plan technique détaillé (PLAN_TECHNIQUE_CONFORMITE_ANTIFRAUD.md)
- Schéma de base de données
- Description des algorithmes cryptographiques
- Architecture du système d'audit

### 11.2 Documentation utilisateur

✅ Disponible:
- Guide d'utilisation (DOCUMENTATION_UTILISATEUR.md)
- Manuel de conformité
- FAQ anti-fraude
- Vidéos de formation

### 11.3 Preuves de conformité

En cas de contrôle fiscal, le logiciel permet:
- ✅ Export complet du journal d'audit
- ✅ Vérification de l'intégrité de la chaîne
- ✅ Consultation de toutes les factures archivées
- ✅ Export au format Factur-X
- ✅ Rapport de conformité automatique

---

## 12. ENGAGEMENTS DE L'ÉDITEUR

### 12.1 Mises à jour

L'éditeur s'engage à:
- Maintenir la conformité à chaque nouvelle version
- Publier une nouvelle attestation pour chaque version majeure
- Informer les clients de toute évolution réglementaire
- Corriger toute non-conformité identifiée sous 30 jours

### 12.2 Support

L'éditeur s'engage à:
- Fournir un support technique pour toute question relative à la conformité
- Assister les clients en cas de contrôle fiscal
- Fournir les exports nécessaires pour l'administration

### 12.3 Audits

L'éditeur s'engage à:
- Réaliser un audit interne annuel de conformité
- Permettre les audits externes si requis
- Publier un rapport de conformité annuel

---

## 13. RESPONSABILITÉS DE L'UTILISATEUR

### 13.1 Utilisation conforme

L'utilisateur s'engage à:
- Utiliser le logiciel conformément à sa destination
- Ne pas tenter d'altérer le système d'audit
- Ne pas modifier le code source
- Effectuer les clôtures périodiques recommandées

### 13.2 Conservation

L'utilisateur s'engage à:
- Conserver les archives pendant 6 ans minimum
- Ne pas supprimer de factures
- Maintenir son abonnement actif ou exporter ses données avant résiliation

### 13.3 Contrôle fiscal

En cas de contrôle fiscal, l'utilisateur s'engage à:
- Fournir l'attestation de conformité
- Donner accès au logiciel si nécessaire
- Fournir les exports demandés par l'administration

---

## 14. CONCLUSION

Le logiciel **DentalCloud version 1.0** respecte l'intégralité des exigences légales en matière de lutte contre la fraude à la TVA, telles que définies par:
- ✅ L'article 286 du Code Général des Impôts
- ✅ L'arrêté du 3 août 2016
- ✅ Le BOI-TVA-DECLA-30-10-30

Les mesures techniques et organisationnelles mises en place garantissent:
- ✅ L'inaltérabilité des données comptables
- ✅ La sécurisation des enregistrements
- ✅ La conservation réglementaire (6 ans minimum)
- ✅ L'archivage pérenne et accessible

Cette conformité est documentée, vérifiable et auditable à tout moment.

---

**Date**: 8 janvier 2025
**Signature de l'éditeur**: _____________________

**[Nom et qualité du signataire]**
**[Société éditrice]**
**[SIRET]**
