# Guide : Portail Dentiste - Configuration et Utilisation

## Vue d'ensemble

Le **Portail Dentiste** permet aux laboratoires dentaires d'autoriser leurs dentistes à passer des commandes directement depuis leur compte, sans passer par le laboratoire. Cette fonctionnalité améliore l'efficacité et réduit les délais de traitement.

---

## Configuration pour le Laboratoire

### 1. Accéder aux Paramètres du Portail Dentiste

1. Connectez-vous à votre compte laboratoire
2. Allez dans **Paramètres** (menu latéral)
3. Restez sur l'onglet **Profil**
4. Faites défiler jusqu'à la section **"Portail Dentiste"**

### 2. Options Disponibles

#### ✅ Autoriser les commandes directes
- **Fonction** : Permet aux dentistes de créer des bons de livraison directement
- **Effet** : Les dentistes peuvent passer commande sans attendre votre validation
- **Statut** : Les commandes auront le statut "En attente d'approbation" (`pending_approval`)
- **Recommandation** : Activer si vous faites confiance à vos dentistes réguliers

#### ✅ Autoriser les demandes de devis
- **Fonction** : Permet aux dentistes de demander un devis avant de commander
- **Effet** : Les dentistes peuvent envoyer une demande de devis avec photos et détails
- **Workflow** : Vous recevez la demande → Vous créez un devis → Le dentiste peut accepter
- **Recommandation** : Activer pour les nouveaux dentistes ou travaux complexes

#### 📝 Message d'accueil personnalisé
- **Fonction** : Message affiché aux dentistes sur leur portail
- **Exemples** :
  ```
  Bienvenue sur notre portail ! Pour toute urgence, contactez-nous au 01 23 45 67 89.
  ```
  ```
  Merci de votre confiance. Nos délais de fabrication sont de 5 à 7 jours ouvrés.
  ```

### 3. Enregistrer les Modifications

1. Cochez les options souhaitées
2. Ajoutez votre message personnalisé (optionnel)
3. Cliquez sur **"Enregistrer"** en bas de la section
4. Confirmation : "Modifications enregistrées"

---

## Configuration de la Liaison Dentiste

### 1. Créer une Fiche Dentiste

Avant qu'un dentiste puisse passer commande, vous devez créer sa fiche :

1. Allez dans **Dentistes** (menu latéral)
2. Cliquez sur **"Nouveau dentiste"**
3. Remplissez les informations :
   - **Nom complet** : Dr. Jean Dupont *(requis)*
   - **Email** : jean.dupont@cabinet-dentaire.fr *(requis)*
   - **Téléphone** : +33 1 23 45 67 89
   - **Adresse** : 123 Rue Example, 75001 Paris

⚠️ **IMPORTANT** : L'email doit correspondre EXACTEMENT à l'email que le dentiste utilisera pour créer son compte.

### 2. Liaison Automatique

Le système lie automatiquement les comptes si :
- Le dentiste crée un compte avec le même email
- L'email dans sa fiche correspond à son compte dentiste
- La liaison est insensible à la casse (Jean@example.com = jean@example.com)

### 3. Vérifier la Liaison

Pour vérifier qu'un dentiste est bien lié :
1. Allez dans **Dentistes**
2. Cherchez le dentiste dans la liste
3. Si le compte est lié, vous verrez une icône ✓ ou un indicateur

---

## Utilisation pour le Dentiste

### 1. Création du Compte Dentiste

Le dentiste doit :
1. Aller sur la page d'inscription dentiste
2. S'inscrire avec l'email que vous avez enregistré
3. Se connecter à son compte

### 2. Passer une Commande

Une fois connecté, le dentiste peut :

1. **Sélectionner le laboratoire**
   - Choisir votre laboratoire dans la liste (si lié)

2. **Créer un bon de livraison**
   - Nom du patient
   - Description du travail (ex: Couronne céramique)
   - Numéros de dents (ex: 11, 12)
   - Teinte (ex: A2)
   - Date de livraison souhaitée
   - Notes additionnelles

3. **Envoyer la commande**
   - La commande arrive avec le statut `pending_approval`
   - Vous recevez une notification
   - Vous pouvez approuver ou refuser

---

## Workflow des Commandes

### Statuts des Commandes Dentistes

| Statut | Description | Actions Disponibles |
|--------|-------------|---------------------|
| `pending_approval` | En attente d'approbation du laboratoire | Approuver / Refuser |
| `pending` | Approuvée, en attente de traitement | Démarrer le travail |
| `in_progress` | En cours de fabrication | Marquer comme terminé |
| `completed` | Terminée et livrée | Voir l'historique |
| `refused` | Refusée par le laboratoire | Archivée |

### Processus d'Approbation

1. **Réception de la commande**
   - Notification dans votre interface
   - Email de notification (si configuré)

2. **Révision**
   - Vérifier les détails de la commande
   - Vérifier la disponibilité des ressources
   - Vérifier les délais

3. **Décision**
   - **Approuver** : La commande passe en statut `pending`
   - **Refuser** : La commande passe en statut `refused`
   - Le dentiste est notifié de votre décision

4. **Traitement**
   - Une fois approuvée, traitez comme un bon de livraison normal
   - Le dentiste peut suivre l'avancement

---

## Résolution des Problèmes

### Erreur : "Vous n'êtes pas autorisé à commander auprès de ce laboratoire"

**Causes possibles** :

1. **La fiche dentiste n'existe pas**
   - Solution : Le laboratoire doit créer votre fiche dans leur système

2. **L'email ne correspond pas**
   - Solution : Vérifier que l'email de votre compte correspond à celui dans votre fiche
   - Contacter le laboratoire pour corriger l'email

3. **Les commandes directes sont désactivées**
   - Solution : Le laboratoire doit activer "Autoriser les commandes directes"

4. **Le compte n'est pas lié**
   - Solution : Forcer la liaison en exécutant la fonction `link_existing_dentists()`
   - OU demander au laboratoire de mettre à jour manuellement le champ `linked_dentist_account_id`

### Vérifications pour le Laboratoire

```sql
-- Vérifier si un dentiste est lié
SELECT
  d.id,
  d.name,
  d.email,
  d.linked_dentist_account_id,
  da.name as account_name
FROM dentists d
LEFT JOIN dentist_accounts da ON da.id = d.linked_dentist_account_id
WHERE d.user_id = 'VOTRE_ID_LABORATOIRE';

-- Vérifier les paramètres du laboratoire
SELECT
  allow_dentist_orders,
  allow_dentist_quote_requests,
  dentist_portal_message
FROM user_profiles
WHERE id = 'VOTRE_ID_LABORATOIRE';
```

### Forcer la Liaison Manuelle

Si la liaison automatique ne fonctionne pas :

```sql
-- Exécuter la fonction de liaison
SELECT * FROM link_existing_dentists();

-- OU mettre à jour manuellement
UPDATE dentists
SET linked_dentist_account_id = 'ID_DU_COMPTE_DENTISTE'
WHERE id = 'ID_DE_LA_FICHE_DENTISTE';
```

---

## Sécurité et Politiques RLS

### Politiques de Sécurité en Place

1. **Dentistes ne peuvent voir que leurs propres commandes**
   - RLS (Row Level Security) activée
   - Filtrage automatique par `linked_dentist_account_id`

2. **Laboratoire garde le contrôle**
   - Approbation requise pour toutes les commandes dentistes
   - Possibilité de refuser une commande
   - Accès complet à toutes les commandes

3. **Validation des permissions**
   - Vérification de `allow_dentist_orders` à chaque création
   - Blocage automatique si les commandes sont désactivées
   - Messages d'erreur explicites

---

## Meilleures Pratiques

### Pour les Laboratoires

1. ✅ **Créez les fiches dentistes avec des emails exacts**
2. ✅ **Activez les commandes pour les dentistes réguliers uniquement**
3. ✅ **Utilisez les demandes de devis pour les nouveaux clients**
4. ✅ **Ajoutez un message d'accueil avec vos coordonnées**
5. ✅ **Répondez rapidement aux demandes d'approbation**
6. ✅ **Vérifiez régulièrement les liaisons de comptes**

### Pour les Dentistes

1. ✅ **Utilisez l'email exact fourni par le laboratoire**
2. ✅ **Fournissez des descriptions détaillées**
3. ✅ **Joignez des photos si disponible**
4. ✅ **Indiquez les délais souhaités**
5. ✅ **Contactez le laboratoire en cas de problème**

---

## Questions Fréquentes (FAQ)

### Q : Combien de laboratoires un dentiste peut-il avoir ?
**R :** Un dentiste peut être lié à plusieurs laboratoires. Chaque laboratoire crée une fiche dentiste avec son email.

### Q : Peut-on désactiver les commandes pour un dentiste spécifique ?
**R :** Non directement. Vous devez soit désactiver globalement, soit supprimer la liaison (`linked_dentist_account_id = NULL`).

### Q : Les commandes dentistes déduisent-elles le stock ?
**R :** Oui, comme les bons de livraison normaux, le stock est déduit automatiquement lors de l'approbation.

### Q : Peut-on modifier une commande dentiste après approbation ?
**R :** Oui, vous pouvez modifier tous les détails d'un bon de livraison comme d'habitude.

### Q : Les dentistes peuvent-ils voir les prix ?
**R :** Oui, si vous configurez les prix dans le catalogue et l'activez pour les dentistes.

---

## Support Technique

### Logs et Débogage

Pour déboguer les problèmes d'autorisation, vérifiez :

1. **Console navigateur** : Messages d'erreur JavaScript
2. **Requêtes réseau** : Réponses de l'API Supabase
3. **Logs Supabase** : Erreurs de politiques RLS
4. **Base de données** : État des liaisons et paramètres

### Contact

Pour toute question technique ou problème non résolu :
- Consultez la documentation Supabase RLS
- Vérifiez les migrations appliquées
- Contactez l'administrateur système

---

## Changelog

### Version 1.0 (Décembre 2025)
- ✅ Ajout des paramètres `allow_dentist_orders`
- ✅ Ajout des paramètres `allow_dentist_quote_requests`
- ✅ Ajout du message personnalisé `dentist_portal_message`
- ✅ Interface de configuration dans la page Paramètres
- ✅ Liaison automatique par email
- ✅ Système d'approbation des commandes
- ✅ Politiques RLS sécurisées

---

**Dernière mise à jour** : Décembre 2025
**Version** : 1.0
