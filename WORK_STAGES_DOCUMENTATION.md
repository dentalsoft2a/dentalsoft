# Documentation des étapes de travail

## Vue d'ensemble

Les étapes de travail sont maintenant définies **en dur dans le code** et ne sont plus stockées dans la base de données (table `production_stages`).

## Localisation

Les étapes par défaut sont définies dans le fichier :
```
src/utils/workStages.ts
```

## Étapes par défaut

Le système utilise 6 étapes de travail prédéfinies :

| ID | Nom | Description | Poids | Couleur |
|---|---|---|---|---|
| `reception` | Réception | Travail reçu et enregistré | 10% | Bleu (#3b82f6) |
| `modelisation` | Modélisation | Conception et modélisation 3D | 25% | Violet (#8b5cf6) |
| `production` | Production | Fabrication du produit | 30% | Orange (#f59e0b) |
| `finition` | Finition | Finitions et polissage | 20% | Cyan (#06b6d4) |
| `controle` | Contrôle qualité | Vérification et contrôle | 10% | Vert (#10b981) |
| `pret` | Prêt à livrer | Prêt pour la livraison | 5% | Vert clair (#22c55e) |

## Avantages de cette approche

1. **Simplicité** : Pas besoin de gérer les étapes en base de données
2. **Cohérence** : Toutes les installations utilisent les mêmes étapes
3. **Performance** : Pas de requête à la base de données pour charger les étapes
4. **Maintenance** : Plus facile à modifier et à maintenir

## Personnalisation

Pour modifier les étapes de travail :

1. Ouvrez le fichier `src/utils/workStages.ts`
2. Modifiez l'array `DEFAULT_WORK_STAGES`
3. Vous pouvez :
   - Changer les noms, descriptions, couleurs
   - Ajuster les poids (total doit faire 100%)
   - Ajouter ou supprimer des étapes

**Note** : Si vous ajoutez/supprimez des étapes, assurez-vous de mettre à jour les permissions des employés dans la base de données.

## Permissions des employés

Les permissions d'accès aux étapes pour les employés sont toujours stockées dans la base de données (`laboratory_role_permissions`).

Le champ `allowed_stages` dans les permissions doit contenir les **ID des étapes** (par exemple : `['reception', 'modelisation', 'production']`).

## Migration des données existantes

Les données existantes dans `delivery_note_stages` restent valides. Les IDs des étapes (`current_stage_id`) dans les bons de livraison doivent correspondre aux IDs définis dans `DEFAULT_WORK_STAGES`.

## Composants affectés

Les composants suivants utilisent les étapes de travail :

- `WorkManagementPage.tsx` : Page principale de gestion des travaux
- `WorkKanbanView.tsx` : Vue Kanban des travaux
- `WorkDetailModal.tsx` : Modal de détail d'un travail
- `EmployeeManagement.tsx` : Gestion des permissions des employés
