# Système de Réinitialisation de Mot de Passe

## Comment ça marche maintenant

Le système de réinitialisation de mot de passe utilise maintenant un système de **codes à 6 chiffres** stockés en base de données. Plus besoin de configuration Supabase compliquée !

### Flux utilisateur

1. L'utilisateur clique sur "Mot de passe oublié ?" sur la page de connexion
2. Il entre son email
3. Il reçoit un email avec un code à 6 chiffres
4. Il va sur `/reset-password`
5. Il entre :
   - Son email
   - Le code à 6 chiffres
   - Son nouveau mot de passe
   - La confirmation du mot de passe
6. Le mot de passe est réinitialisé

### Architecture technique

#### Base de données

Table : `password_reset_tokens`
- `id` : UUID unique
- `user_id` : Référence vers auth.users
- `email` : Email de l'utilisateur
- `token` : Code à 6 chiffres (exemple: "123456")
- `expires_at` : Date d'expiration (15 minutes après création)
- `used_at` : Date d'utilisation (NULL si pas encore utilisé)
- `created_at` : Date de création

#### Edge Functions

**1. send-reset-password-email**
- URL : `/functions/v1/send-reset-password-email`
- Méthode : POST
- Body : `{ "email": "user@example.com" }`
- Fonctionnement :
  1. Vérifie que l'utilisateur existe
  2. Génère un code aléatoire à 6 chiffres
  3. Supprime les anciens tokens pour cet email
  4. Crée un nouveau token en base (expire dans 15 min)
  5. Envoie un email avec le code

**2. verify-reset-code**
- URL : `/functions/v1/verify-reset-code`
- Méthode : POST
- Body : `{ "email": "user@example.com", "code": "123456", "newPassword": "nouveaumdp" }`
- Fonctionnement :
  1. Vérifie que le code existe, n'est pas utilisé et n'est pas expiré
  2. Met à jour le mot de passe de l'utilisateur
  3. Marque le token comme utilisé
  4. Retourne succès

#### Frontend

**LoginPage.tsx**
- Formulaire "Mot de passe oublié"
- Appelle `send-reset-password-email`
- Affiche un message de succès

**ResetPasswordPage.tsx**
- Formulaire avec 4 champs : email, code, nouveau mdp, confirmation
- Valide que le code est bien 6 chiffres
- Valide que les mots de passe correspondent
- Appelle `verify-reset-code`
- Redirige vers la page de connexion en cas de succès

### Sécurité

1. **Expiration** : Les codes expirent après 15 minutes
2. **Usage unique** : Un code ne peut être utilisé qu'une seule fois
3. **Randomisation** : Les codes sont générés aléatoirement
4. **Nettoyage** : Les anciens tokens sont supprimés lors de nouvelles demandes
5. **RLS** : Row Level Security activé sur la table

### Avantages

1. Plus besoin de configurer les URLs de redirection dans Supabase
2. Fonctionne toujours, peu importe le domaine
3. Facile à déboguer (les codes sont en base)
4. Expérience utilisateur simple (code à 6 chiffres)
5. Pas de problème de liens qui ne marchent pas

### Email envoyé

L'utilisateur reçoit un email HTML avec :
- Le logo et nom de la société
- Le code à 6 chiffres en gros et en gras
- Un message expliquant que le code est valide 15 minutes
- Un message de sécurité si ce n'est pas lui qui a demandé

### Tests

Pour tester :
1. Va sur la page de connexion
2. Clique sur "Mot de passe oublié ?"
3. Entre ton email
4. Vérifie ton email
5. Va sur `/reset-password`
6. Entre ton email, le code reçu, et ton nouveau mot de passe
7. Connecte-toi avec le nouveau mot de passe

### Debug

Si ça ne marche pas :
1. Vérifie que les edge functions sont déployées
2. Vérifie les logs dans Supabase Dashboard > Edge Functions
3. Vérifie la console du navigateur (F12)
4. Vérifie que le SMTP est configuré (sinon l'email ne partira pas)
5. Vérifie la table `password_reset_tokens` pour voir si le code est créé

### Migration depuis l'ancien système

L'ancien système utilisait `supabase.auth.resetPasswordForEmail()` qui nécessitait :
- Configuration des URLs de redirection dans Supabase Dashboard
- Gestion des tokens dans l'URL (hash)
- Problèmes de redirection cross-domain

Le nouveau système est complètement indépendant de cette configuration.

### Nettoyage automatique

Pour nettoyer les vieux tokens, tu peux créer un cron job qui appelle :
```sql
SELECT cleanup_expired_reset_tokens();
```

Ou créer une edge function qui appelle cette fonction périodiquement.
