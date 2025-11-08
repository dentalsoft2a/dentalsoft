# Documentation Utilisateur DentalCloud
## Guide de Conformité Anti-Fraude TVA

**Version**: 1.0
**Date**: 8 janvier 2025
**Application**: DentalCloud - Logiciel de gestion pour laboratoires dentaires

---

## TABLE DES MATIÈRES

1. [Introduction](#1-introduction)
2. [Qu'est-ce que la conformité anti-fraude TVA ?](#2-quest-ce-que-la-conformité-anti-fraude-tva-)
3. [Fonctionnalités de conformité dans DentalCloud](#3-fonctionnalités-de-conformité-dans-dentalcloud)
4. [Utilisation quotidienne](#4-utilisation-quotidienne)
5. [Clôture mensuelle](#5-clôture-mensuelle)
6. [Clôture annuelle](#6-clôture-annuelle)
7. [Consultation du journal d'audit](#7-consultation-du-journal-d-audit)
8. [Archivage et export](#8-archivage-et-export)
9. [Format Factur-X](#9-format-factur-x)
10. [Export pour le Portail Public de Facturation (PPF)](#10-export-pour-le-portail-public-de-facturation-ppf)
11. [En cas de contrôle fiscal](#11-en-cas-de-contrôle-fiscal)
12. [Questions fréquentes (FAQ)](#12-questions-fréquentes-faq)
13. [Support et contact](#13-support-et-contact)

---

## 1. INTRODUCTION

Bienvenue dans DentalCloud, votre solution de gestion conforme à la réglementation anti-fraude TVA.

Ce guide vous accompagne dans l'utilisation des fonctionnalités de conformité pour:
- ✅ Respecter vos obligations légales
- ✅ Sécuriser vos données
- ✅ Préparer sereinement un éventuel contrôle fiscal
- ✅ Anticiper l'obligation de facturation électronique

**Public visé**: Laboratoires de prothèses dentaires, assujettis à la TVA en France.

---

## 2. QU'EST-CE QUE LA CONFORMITÉ ANTI-FRAUDE TVA ?

### 2.1 Contexte légal

Depuis le **1er janvier 2018**, la loi anti-fraude à la TVA (Loi n° 2015-1785) impose aux assujettis utilisant un logiciel de comptabilité, de gestion ou de caisse de s'assurer que celui-ci respecte **4 conditions** :

1. **Inaltérabilité** : Les données ne peuvent pas être modifiées sans laisser de trace
2. **Sécurisation** : Les données sont protégées contre toute altération
3. **Conservation** : Les données sont conservées pendant au moins 6 ans
4. **Archivage** : Les données sont archivées dans un format pérenne et accessible

### 2.2 Sanctions

Le non-respect de ces obligations peut entraîner:
- **Amende fiscale** de 7 500 € (personne physique) ou 37 500 € (personne morale)
- **Rejet de comptabilité** en cas de contrôle
- **Redressement fiscal**

### 2.3 Comment DentalCloud vous protège

DentalCloud est **conforme** à ces obligations et vous fournit une **attestation individuelle de conformité** prouvant que vous respectez la loi.

Vous n'avez **rien à faire de particulier**, les mécanismes de conformité sont **automatiques** !

---

## 3. FONCTIONNALITÉS DE CONFORMITÉ DANS DENTALCLOUD

### 3.1 Journal d'audit automatique

**Qu'est-ce que c'est ?**
- Chaque action (création, modification, suppression) sur une facture ou un avoir est automatiquement enregistrée
- Impossible de modifier ou supprimer ces enregistrements
- Chaînage cryptographique (blockchain locale) garantit l'intégrité

**Que devez-vous faire ?**
- **Rien !** C'est automatique et transparent

### 3.2 Signature électronique des factures

**Qu'est-ce que c'est ?**
- Chaque facture est signée numériquement avec votre certificat unique
- La signature prouve que la facture n'a pas été altérée

**Que devez-vous faire ?**
- **Rien !** La signature est automatique à la validation de la facture

### 3.3 Verrouillage des factures

**Qu'est-ce que c'est ?**
- Une fois validée, une facture est automatiquement **verrouillée**
- Vous ne pouvez plus la modifier
- Si vous devez la corriger, vous devez créer un **avoir** (note de crédit)

**Que devez-vous faire ?**
- Vérifiez bien votre facture avant de la valider
- En cas d'erreur, créez un avoir pour annuler puis recréez une nouvelle facture

### 3.4 Format Factur-X

**Qu'est-ce que c'est ?**
- Format de facture électronique (PDF + XML)
- Lisible par l'humain (PDF) et exploitable par les machines (XML)
- Prépare la facturation électronique obligatoire dès 2024

**Que devez-vous faire ?**
- **Rien !** Vos factures sont automatiquement générées au format Factur-X
- Vous pouvez les télécharger et les envoyer comme des PDF classiques

### 3.5 Archivage automatique

**Qu'est-ce que c'est ?**
- Vos factures sont automatiquement archivées de manière sécurisée
- Conservation pendant **6 ans minimum**
- Chiffrement pour la sécurité

**Que devez-vous faire ?**
- **Rien !** L'archivage est automatique
- Vous pouvez consulter vos archives à tout moment

### 3.6 Clôture périodique

**Qu'est-ce que c'est ?**
- Une clôture mensuelle et annuelle scelle définitivement vos données
- Garantit qu'aucune modification rétroactive n'est possible

**Que devez-vous faire ?**
- Effectuer une **clôture mensuelle** (recommandé) ou au minimum **annuelle** (obligatoire)
- Voir section 5 et 6 ci-dessous

---

## 4. UTILISATION QUOTIDIENNE

### 4.1 Créer une facture

**Processus normal**:
1. Créez votre facture comme d'habitude
2. Ajoutez les lignes (articles, quantités, prix)
3. Vérifiez les montants (HT, TVA, TTC)
4. Cliquez sur **"Valider la facture"**

**Ce qui se passe en arrière-plan**:
- ✅ La facture est enregistrée dans le journal d'audit
- ✅ Un hash SHA-256 est calculé
- ✅ La facture est signée numériquement
- ✅ La facture est **verrouillée** (plus de modification possible)
- ✅ Un Factur-X (PDF+XML) est généré
- ✅ La facture est automatiquement archivée

### 4.2 Modifier une facture en cours

**Si la facture est encore en brouillon** (statut "draft"):
- ✅ Vous pouvez la modifier normalement
- ✅ Chaque modification est tracée dans l'audit

**Si la facture est validée** (verrouillée):
- ❌ Vous ne pouvez plus la modifier
- ✅ Vous devez créer un **avoir** pour la corriger

### 4.3 Créer un avoir (note de crédit)

**Quand créer un avoir ?**
- Pour annuler une facture erronée
- Pour accorder une réduction commerciale
- Pour corriger une erreur de facturation

**Processus**:
1. Allez dans **Factures**
2. Sélectionnez la facture à corriger
3. Cliquez sur **"Créer un avoir"**
4. DentalCloud pré-remplit l'avoir avec les lignes de la facture
5. Modifiez si nécessaire (montant partiel, etc.)
6. Validez l'avoir

**Ce qui se passe**:
- ✅ L'avoir est lié à la facture d'origine
- ✅ L'avoir est signé et verrouillé
- ✅ L'avoir est archivé au format Factur-X

### 4.4 Indicateurs de conformité

**Badge de signature**:
- ✅ Badge vert : Facture signée et conforme
- ⏳ Badge orange : Facture en cours de validation
- ❌ Badge rouge : Erreur de signature (contactez le support)

**Statut d'archivage**:
- 📦 Archivé : Document conservé de manière sécurisée
- ⏳ En cours : Archivage en cours
- ❌ Échec : Erreur d'archivage (contactez le support)

---

## 5. CLÔTURE MENSUELLE

### 5.1 Pourquoi une clôture mensuelle ?

La clôture mensuelle:
- ✅ Scelle définitivement toutes les factures du mois
- ✅ Empêche toute modification rétroactive
- ✅ Facilite les déclarations de TVA
- ✅ Rassure en cas de contrôle fiscal

**Fréquence recommandée**: Tous les mois, entre le 1er et le 5 du mois suivant

### 5.2 Comment effectuer la clôture

**Étape 1: Aller dans Paramètres**
1. Cliquez sur l'icône ⚙️ Paramètres
2. Allez dans l'onglet **"Conformité"**
3. Cliquez sur **"Périodes fiscales"**

**Étape 2: Clôturer la période**
1. Vérifiez que toutes les factures du mois sont validées
2. Vérifiez que vous n'avez pas de factures en brouillon à valider
3. Cliquez sur **"Clôturer le mois de [Mois]"**
4. Confirmez la clôture

**Étape 3: Vérification**
- ✅ Un scellement cryptographique est créé
- ✅ Toutes les factures du mois sont définitivement verrouillées
- ✅ Un rapport de clôture est généré (PDF téléchargeable)

### 5.3 Que se passe-t-il après la clôture ?

**Vous ne pouvez plus**:
- ❌ Modifier les factures du mois clos
- ❌ Supprimer les factures du mois clos
- ❌ Annuler la clôture

**Vous pouvez toujours**:
- ✅ Consulter les factures du mois clos
- ✅ Télécharger les factures du mois clos
- ✅ Créer des avoirs pour corriger une erreur

**Important**: Si vous découvrez une erreur après la clôture, créez un **avoir** sur la période en cours.

### 5.4 Rapport de clôture

Après chaque clôture, un rapport PDF est généré contenant:
- Période clôturée (début et fin)
- Nombre de factures
- Chiffre d'affaires total HT
- Montant de TVA total
- Scellement cryptographique (hash + signature)
- Date et heure de clôture

**💡 Conseil**: Téléchargez et conservez ce rapport avec vos documents comptables.

---

## 6. CLÔTURE ANNUELLE

### 6.1 Pourquoi une clôture annuelle ?

La clôture annuelle est **obligatoire** et doit être effectuée **avant le 31 janvier** de l'année suivante.

Elle permet de:
- ✅ Sceller l'ensemble de l'exercice fiscal
- ✅ Préparer la déclaration de TVA annuelle
- ✅ Générer un rapport annuel de conformité

### 6.2 Comment effectuer la clôture annuelle

**Processus similaire à la clôture mensuelle**:
1. Allez dans **Paramètres > Conformité > Périodes fiscales**
2. Assurez-vous que **tous les mois de l'année** sont clos
3. Cliquez sur **"Clôturer l'année [Année]"**
4. Confirmez la clôture

**Ce qui se passe**:
- ✅ Scellement cryptographique de l'année entière
- ✅ Génération du rapport annuel de conformité
- ✅ Préparation de l'archive annuelle

### 6.3 Rapport annuel de conformité

Le rapport annuel contient:
- Exercice fiscal clôturé
- Nombre total de factures émises
- Chiffre d'affaires total HT de l'année
- Montant de TVA total de l'année
- Liste des clôtures mensuelles
- Vérification d'intégrité de la chaîne d'audit
- Scellement cryptographique annuel

**💡 Conseil**: Conservez ce rapport avec votre déclaration de TVA annuelle et votre liasse fiscale.

---

## 7. CONSULTATION DU JOURNAL D'AUDIT

### 7.1 Accéder au journal d'audit

**Pour les administrateurs et propriétaires**:
1. Allez dans **Paramètres > Conformité**
2. Cliquez sur **"Journal d'audit"**

### 7.2 Que contient le journal d'audit ?

Pour chaque opération, le journal enregistre:
- Date et heure précise (à la microseconde)
- Type d'opération (Création, Modification, Suppression)
- Type de document (Facture, Avoir, Proforma)
- Numéro du document
- Utilisateur ayant effectué l'action
- Anciennes et nouvelles valeurs (en cas de modification)
- Hash cryptographique
- Adresse IP

### 7.3 Rechercher dans le journal

**Filtres disponibles**:
- Par période (date de début et date de fin)
- Par type de document (Facture, Avoir, Proforma)
- Par type d'opération (Création, Modification, Suppression)
- Par utilisateur
- Par numéro de document

**Export**:
- ✅ Export CSV pour Excel
- ✅ Export JSON pour analyse informatique
- ✅ Export PDF pour archivage

### 7.4 Vérification d'intégrité

**Fonction de vérification**:
1. Dans le journal d'audit, cliquez sur **"Vérifier l'intégrité"**
2. Le système vérifie le chaînage cryptographique
3. Résultat affiché en quelques secondes

**Interprétation des résultats**:
- ✅ Vert : Intégrité OK, aucune altération détectée
- ❌ Rouge : Rupture de chaîne détectée (contactez immédiatement le support)

**Important**: En cas de rupture de chaîne, **ne pas paniquer** ! Cela peut être dû à:
- Une restauration de sauvegarde
- Un bug logiciel (rare)
- Une tentative d'altération (très rare)

👉 **Contactez immédiatement le support** qui analysera la situation.

---

## 8. ARCHIVAGE ET EXPORT

### 8.1 Consultation des archives

**Accès**:
1. Allez dans **Factures**
2. Utilisez le filtre **"Archivées"**
3. Sélectionnez la période

**Informations affichées**:
- Date d'archivage
- Format (Factur-X)
- Taille du fichier
- Hash SHA-256
- Date de fin de rétention (date + 6 ans)

### 8.2 Télécharger une archive

**Pour une facture individuelle**:
1. Ouvrez la facture
2. Cliquez sur **"Télécharger Factur-X"**
3. Le fichier PDF+XML est téléchargé

**Pour plusieurs factures**:
1. Cochez les factures à télécharger
2. Cliquez sur **"Export multiple"**
3. Un fichier ZIP est généré contenant tous les Factur-X

### 8.3 Export par période

**Export mensuel ou annuel**:
1. Allez dans **Factures**
2. Cliquez sur **"Export période"**
3. Sélectionnez le mois ou l'année
4. Choisissez le format:
   - **Factur-X** (PDF+XML) : Recommandé
   - **PDF seul** : Pour impression
   - **Excel** : Pour comptabilité
5. Cliquez sur **"Générer l'export"**
6. Un fichier ZIP est téléchargé

**Contenu du ZIP**:
- Tous les fichiers Factur-X de la période
- Un fichier `manifest.xml` listant tous les documents
- Le rapport de clôture de la période (si clôturée)

---

## 9. FORMAT FACTUR-X

### 9.1 Qu'est-ce que Factur-X ?

**Factur-X** (aussi appelé ZUGFeRD en Allemagne) est un format de facture hybride:
- **PDF/A-3** : Lisible par l'humain (comme un PDF classique)
- **XML embarqué** : Exploitable par les machines (comptabilité automatisée)

**Avantages**:
- ✅ Lisible sur n'importe quel lecteur PDF
- ✅ Importable automatiquement dans les logiciels comptables
- ✅ Conforme à la norme européenne EN 16931
- ✅ Prépare l'obligation de facturation électronique

### 9.2 Ouvrir un Factur-X

**Comme un PDF classique**:
- Double-cliquez sur le fichier
- Il s'ouvre dans votre lecteur PDF habituel
- Vous voyez la facture mise en forme

**Extraire le XML**:
- Utilisez un lecteur PDF avancé (Adobe Acrobat, Foxit, etc.)
- Allez dans **Pièces jointes** ou **Fichiers joints**
- Le fichier `factur-x.xml` est embarqué dans le PDF

### 9.3 Envoyer un Factur-X à un client

**Par email**:
- Attachez le fichier Factur-X comme une facture PDF classique
- Votre client le lit comme un PDF normal
- S'il a un logiciel comptable compatible, il peut importer le XML automatiquement

**Par courrier**:
- Imprimez le Factur-X comme un PDF classique
- Le format PDF/A garantit une impression fidèle

---

## 10. EXPORT POUR LE PORTAIL PUBLIC DE FACTURATION (PPF)

### 10.1 Contexte

À partir de **2024-2026**, la facturation électronique sera **obligatoire** pour toutes les entreprises assujetties à la TVA en France.

Les factures devront transiter par:
- Le **Portail Public de Facturation (PPF)** (gratuit, géré par l'État)
- Ou une **Plateforme de Dématérialisation Partenaire (PDP)** (payante, privée)

**DentalCloud est prêt pour cette obligation !**

### 10.2 Export pour le PPF

**Processus**:
1. Allez dans **Factures**
2. Cliquez sur **"Export PPF/PDP"**
3. Sélectionnez la période (mois ou trimestre)
4. Cliquez sur **"Générer l'export"**
5. Un fichier ZIP est téléchargé

**Contenu du ZIP**:
- Tous les Factur-X de la période
- Un fichier `manifest_ppf.xml` au format PPF
- Instructions de transmission

### 10.3 Transmettre au PPF

**Option 1: Upload manuel** (disponible dès maintenant):
1. Connectez-vous sur [portail-public-facturation.gouv.fr](https://portail-public-facturation.gouv.fr) (URL hypothétique)
2. Allez dans **"Transmettre des factures"**
3. Uploadez le fichier ZIP généré par DentalCloud
4. Validez la transmission

**Option 2: Transmission automatique** (disponible ultérieurement):
- DentalCloud transmettra automatiquement vos factures au PPF
- Vous serez informé de la disponibilité de cette fonctionnalité
- Aucune action supplémentaire de votre part

---

## 11. EN CAS DE CONTRÔLE FISCAL

### 11.1 Que demande l'administration ?

En cas de contrôle fiscal, l'administration peut vous demander:
- ✅ L'attestation de conformité de votre logiciel
- ✅ L'accès à votre logiciel (consultation sur place)
- ✅ Les factures de la période contrôlée
- ✅ Le journal d'audit
- ✅ Les rapports de clôture

### 11.2 Comment répondre ?

**Étape 1: Présenter l'attestation**
- Téléchargez l'attestation depuis **Paramètres > Conformité > Attestation**
- Remettez une copie à l'inspecteur

**Étape 2: Donner accès au logiciel**
- Créez un compte temporaire pour l'inspecteur (demandez au support)
- Ou organisez une consultation sur place

**Étape 3: Fournir les exports**
1. Allez dans **Factures > Export période**
2. Sélectionnez la période demandée
3. Exportez au format **Factur-X** (recommandé) ou **PDF + Excel**
4. Remettez le fichier ZIP à l'inspecteur

**Étape 4: Fournir le journal d'audit**
1. Allez dans **Paramètres > Conformité > Journal d'audit**
2. Sélectionnez la période demandée
3. Cliquez sur **"Exporter (PDF)"** ou **"Exporter (CSV)"**
4. Remettez le fichier à l'inspecteur

**Étape 5: Fournir les rapports de clôture**
1. Allez dans **Paramètres > Conformité > Périodes fiscales**
2. Téléchargez les rapports de clôture de la période concernée
3. Remettez les rapports à l'inspecteur

### 11.3 Support en cas de contrôle

**Le support DentalCloud vous assiste**:
- 📞 Assistance téléphonique prioritaire
- 📧 Réponse par email sous 24h
- 📄 Fourniture de documentation complémentaire si nécessaire
- 🤝 Intervention sur site si nécessaire (sous conditions)

**Contactez-nous dès réception de l'avis de contrôle** :
- Email: support-conformite@dentalcloud.fr
- Téléphone: [Numéro de support]

---

## 12. QUESTIONS FRÉQUENTES (FAQ)

### 12.1 Questions générales

**Q: Est-ce que DentalCloud est certifié NF525 ?**
R: Non, DentalCloud fournit une **attestation individuelle de conformité**, qui est **reconnue par l'administration fiscale** et **suffit pour respecter vos obligations légales**. La certification NF525 est une option payante et non obligatoire.

**Q: Que se passe-t-il si je me trompe sur une facture ?**
R: Si la facture est encore en brouillon, vous pouvez la modifier. Si elle est validée, vous devez créer un **avoir** pour la corriger.

**Q: Puis-je supprimer une facture ?**
R: Non, les factures ne peuvent pas être supprimées. Vous pouvez les **annuler** en créant un avoir.

**Q: Combien de temps mes factures sont-elles conservées ?**
R: **6 ans minimum**, conformément à la loi. Vous pouvez les conserver plus longtemps si vous le souhaitez.

**Q: Mes données sont-elles sécurisées ?**
R: Oui, vos données sont:
- ✅ Chiffrées lors de la transmission (HTTPS/TLS 1.3)
- ✅ Chiffrées au repos (encryption at rest)
- ✅ Sauvegardées quotidiennement
- ✅ Répliquées géographiquement

**Q: Que se passe-t-il si je résiilie mon abonnement ?**
R: Avant la résiliation, exportez l'intégralité de vos données (factures, journal d'audit, archives). Après résiliation, vos données sont conservées 90 jours puis définitivement supprimées (sauf obligations légales).

### 12.2 Questions sur la clôture

**Q: Suis-je obligé de faire une clôture mensuelle ?**
R: Non, seule la clôture **annuelle** est obligatoire. Cependant, la clôture mensuelle est **fortement recommandée** pour:
- Faciliter les déclarations de TVA mensuelles
- Éviter les corrections rétroactives
- Rassurer en cas de contrôle

**Q: Que se passe-t-il si j'oublie la clôture annuelle ?**
R: Le système vous enverra des **rappels automatiques** fin janvier. Si vous ne clôturez pas avant le 31 janvier, une **alerte** s'affichera dans votre tableau de bord. Clôturez dès que possible.

**Q: Puis-je annuler une clôture ?**
R: **Non**, c'est justement le principe ! Une fois clôturée, une période ne peut plus être modifiée. C'est ce qui garantit la conformité.

### 12.3 Questions sur Factur-X

**Q: Mes clients peuvent-ils lire les Factur-X ?**
R: Oui ! Un Factur-X se lit comme un PDF classique. Vos clients n'ont rien de spécial à faire.

**Q: Puis-je imprimer un Factur-X ?**
R: Oui, imprimez-le comme un PDF classique. Le format PDF/A garantit un rendu fidèle à l'impression.

**Q: Le format Factur-X est-il accepté par l'administration ?**
R: Oui, Factur-X est conforme à la norme européenne EN 16931 et est reconnu par l'administration fiscale française.

### 12.4 Questions sur le contrôle fiscal

**Q: Que faire si l'inspecteur demande des documents que je ne trouve pas ?**
R: Contactez immédiatement le support DentalCloud. Nous vous aiderons à retrouver et exporter les documents demandés.

**Q: L'inspecteur peut-il modifier mes factures ?**
R: Non ! L'inspecteur a un accès en **lecture seule**. Il ne peut rien modifier.

**Q: Combien de temps prend un contrôle fiscal en général ?**
R: Cela dépend, mais généralement de quelques heures à quelques jours. Avec DentalCloud, vous pouvez fournir tous les documents en quelques minutes, ce qui accélère le processus.

---

## 13. SUPPORT ET CONTACT

### 13.1 Support technique

**Par email**:
- support@dentalcloud.fr
- Réponse sous 24h (jours ouvrés)

**Par téléphone**:
- [Numéro de téléphone]
- Lundi au vendredi, 9h-18h

**Chat en ligne**:
- Disponible dans l'application (icône 💬 en bas à droite)
- Lundi au vendredi, 9h-18h

### 13.2 Support conformité

**Par email**:
- conformite@dentalcloud.fr
- Réponse sous 4h (jours ouvrés)

**Par téléphone**:
- [Numéro de téléphone dédié]
- Lundi au vendredi, 9h-18h

**En cas de contrôle fiscal**:
- Assistance prioritaire
- Réponse immédiate

### 13.3 Documentation en ligne

**Centre d'aide**:
- [URL du centre d'aide]
- Articles, tutoriels, vidéos

**Base de connaissance**:
- [URL de la base de connaissance]
- FAQ complète, guides détaillés

**Tutoriels vidéo**:
- [URL des vidéos]
- Démonstrations pas à pas

### 13.4 Formation

**Webinaires gratuits**:
- Formation mensuelle sur la conformité
- Inscription sur [URL]

**Formation sur site**:
- Sur demande, sous conditions
- Contact: formation@dentalcloud.fr

---

## ANNEXES

### Annexe A: Checklist de conformité

**✅ Quotidien**:
- [ ] Vérifier que toutes les factures sont validées (pas de brouillons qui traînent)
- [ ] Vérifier les badges de signature (tout doit être vert)

**✅ Mensuel (recommandé)**:
- [ ] Clôturer le mois écoulé (entre le 1er et le 5 du mois suivant)
- [ ] Télécharger et archiver le rapport de clôture
- [ ] Vérifier qu'aucune alerte n'est affichée dans le dashboard

**✅ Annuel (obligatoire)**:
- [ ] Clôturer l'année (avant le 31 janvier N+1)
- [ ] Télécharger et archiver le rapport annuel de conformité
- [ ] Vérifier l'intégrité de la chaîne d'audit
- [ ] Exporter une archive annuelle complète (backup perso)

**✅ En cas de contrôle**:
- [ ] Télécharger l'attestation de conformité
- [ ] Exporter les factures de la période contrôlée (Factur-X)
- [ ] Exporter le journal d'audit de la période
- [ ] Télécharger les rapports de clôture
- [ ] Contacter le support DentalCloud

### Annexe B: Glossaire

- **Avoir**: Note de crédit annulant tout ou partie d'une facture
- **Factur-X**: Format de facture hybride PDF+XML
- **Hash**: Empreinte numérique unique d'un document
- **Journal d'audit**: Registre de toutes les opérations effectuées
- **PPF**: Portail Public de Facturation (plateforme de l'État)
- **PDP**: Plateforme de Dématérialisation Partenaire (plateforme privée)
- **RLS**: Row Level Security (sécurité au niveau des lignes de base de données)
- **Scellement**: Verrouillage cryptographique d'une période
- **Signature électronique**: Signature numérique prouvant l'authenticité et l'intégrité
- **Verrouillage**: Empêche la modification d'un document

---

**FIN DE LA DOCUMENTATION**

*Version 1.0 - 8 janvier 2025*
*Cette documentation est mise à jour régulièrement. Consultez la dernière version sur [URL]*
