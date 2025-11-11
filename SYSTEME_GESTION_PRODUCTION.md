# Système de Gestion de Production

## Vue d'ensemble

Le système de gestion de production est une solution complète intégrée à la page Calendrier qui permet de gérer efficacement tous les aspects de la production d'un laboratoire dentaire.

## Fonctionnalités principales

### 1. Vues multiples du calendrier

#### Vue Mois (Calendrier classique)
- Visualisation mensuelle des livraisons
- Indicateurs de statut colorés par jour
- Alertes pour les livraisons urgentes (48h)
- Accès rapide aux détails de chaque livraison

#### Vue Semaine
- Affichage des 7 jours de la semaine
- Vue détaillée des livraisons par jour
- Identification rapide de la journée en cours
- Cartes compactes avec informations essentielles

#### Vue Tableau Kanban
- Colonnes organisées par statut (En attente, En cours, Terminé)
- Filtres par priorité et par employé
- Statistiques en temps réel
- Cartes enrichies avec informations de progression

### 2. Système de priorisation

Quatre niveaux de priorité disponibles:
- **Urgent** 🔴 : Tâches critiques nécessitant une attention immédiate
- **Élevé** 🟠 : Tâches importantes avec délai court
- **Normal** 🔵 : Tâches standards
- **Faible** ⚪ : Tâches de moindre importance

### 3. Affectation des tâches

- Attribution des livraisons aux employés
- Suivi de la charge de travail par employé
- Historique des affectations
- Statuts d'affectation (assigné, accepté, refusé, terminé)

### 4. Suivi de progression

- Pourcentage d'avancement pour chaque livraison
- Barre de progression visuelle
- Date estimée de complétion
- Temps réel vs temps estimé

### 5. Étapes de production personnalisables

Le gestionnaire d'étapes permet de:
- Définir des étapes personnalisées (Moulage, Cuisson, Finition, etc.)
- Attribuer des couleurs pour une identification rapide
- Définir si une étape nécessite une validation
- Organiser les étapes dans l'ordre souhaité

### 6. Système de notifications et alertes

Types d'alertes disponibles:
- **Échéance proche**: Livraisons prévues dans les 48h
- **En retard**: Livraisons dépassant leur date prévue
- **Problème qualité**: Alertes de contrôle qualité
- **Conflit ressource**: Problèmes d'allocation de ressources

Fonctionnalités:
- Notifications en temps réel
- Badge avec compteur d'alertes non lues
- Panneau latéral pour consultation
- Marquage lu/non lu
- Suppression d'alertes

### 7. Analytics et rapports de production

#### Statistiques principales
- Total de livraisons de la période
- Taux de complétion
- Livraisons en cours et en attente
- Nombre de livraisons en retard

#### Métriques de performance
- Temps moyen de complétion (en jours)
- Taux de livraison à temps
- Nombre total d'articles produits

#### Classement des employés
- Top 5 des employés les plus productifs
- Nombre de livraisons complétées par employé
- Graphiques de performance

## Structure de la base de données

### Nouvelles tables

#### production_stages
Étapes de production personnalisables
- `id`, `user_id`, `name`, `description`
- `order_index`, `color`, `requires_approval`
- `created_at`

#### production_tasks
Tâches de production détaillées
- `id`, `delivery_note_id`, `employee_id`, `stage_id`
- `priority`, `estimated_duration`, `actual_duration`
- `progress_percentage`, `started_at`, `completed_at`
- `notes`, `created_at`, `updated_at`

#### production_time_logs
Journaux de temps de travail
- `id`, `task_id`, `employee_id`
- `clock_in`, `clock_out`, `duration_minutes`
- `notes`, `created_at`

#### production_notes
Notes et commentaires sur les travaux
- `id`, `delivery_note_id`, `user_id`, `employee_id`
- `content`, `is_internal`, `created_at`

#### production_photos
Photos de progression des travaux
- `id`, `delivery_note_id`, `stage_id`, `employee_id`
- `photo_url`, `description`, `created_at`

#### task_assignments
Affectation des tâches aux employés
- `id`, `delivery_note_id`, `employee_id`, `assigned_by`
- `assigned_at`, `status`, `notes`

#### employee_availability
Disponibilité des employés
- `id`, `employee_id`, `date`
- `availability_type`, `notes`, `created_at`

#### production_alerts
Alertes et notifications de production
- `id`, `user_id`, `delivery_note_id`
- `alert_type`, `priority`, `message`
- `is_read`, `created_at`

### Modifications aux tables existantes

#### delivery_notes
Nouvelles colonnes ajoutées:
- `priority`: Niveau de priorité de la livraison
- `assigned_employee_id`: Employé assigné
- `current_stage_id`: Étape actuelle de production
- `progress_percentage`: Pourcentage d'avancement
- `estimated_completion_date`: Date estimée de complétion

## Composants créés

### Composants principaux
- `ProductionBoard.tsx`: Vue tableau Kanban
- `WeekView.tsx`: Vue semaine du calendrier
- `TaskAssignmentPanel.tsx`: Panneau d'affectation des tâches
- `ProductionStagesManager.tsx`: Gestionnaire d'étapes
- `ProductionAlerts.tsx`: Système de notifications
- `ProductionAnalytics.tsx`: Dashboard analytics

### Intégration
Tous les composants sont intégrés dans `CalendarPage.tsx` avec un système de navigation par onglets.

## Utilisation

### Changer de vue
Utilisez les boutons en haut à droite de la page Calendrier:
- **Mois**: Vue calendrier mensuelle classique
- **Semaine**: Vue semaine détaillée
- **Tableau**: Vue Kanban par statut

### Gérer une livraison
1. Cliquez sur une livraison dans n'importe quelle vue
2. Le modal de détails s'ouvre avec toutes les informations
3. Utilisez le panneau "Gestion de production" pour:
   - Définir la priorité
   - Assigner un employé
   - Définir une date de complétion estimée
   - Suivre la progression

### Consulter les alertes
1. Cliquez sur l'icône de cloche (avec badge si alertes non lues)
2. Consultez les alertes dans le panneau latéral
3. Marquez comme lu ou supprimez les alertes traitées

### Analyser la performance
Les statistiques sont disponibles dans la vue Tableau:
- Statistiques en temps réel en haut de page
- Filtres pour affiner l'analyse
- Métriques de performance détaillées

## Sécurité

Toutes les tables sont protégées par Row Level Security (RLS):
- Les laboratoires accèdent uniquement à leurs propres données
- Les employés accèdent selon leurs permissions
- Les super admins ont accès complet

## Performance

- Index créés sur toutes les clés étrangères
- Requêtes optimisées avec select spécifiques
- Chargement progressif des données
- Rafraîchissement intelligent des vues

## Évolutions futures possibles

1. **Drag & drop**: Déplacer les cartes entre colonnes pour changer le statut
2. **Vue jour**: Affichage détaillé heure par heure
3. **Timeline**: Vue chronologique du workflow complet
4. **Notifications push**: Alertes mobiles en temps réel
5. **Rapports PDF**: Export des statistiques
6. **Prévisions**: IA pour estimer les délais de production
7. **Intégration calendrier**: Sync avec Google Calendar, Outlook
8. **Chat par livraison**: Communication en temps réel sur les tâches
9. **Gestion des équipes**: Planification des équipes matin/après-midi/nuit
10. **Scan codes-barres**: Suivi automatique via codes-barres

## Support

Pour toute question ou problème, contactez l'équipe de développement.
