# Configuration de la réinitialisation de mot de passe

## CONFIGURATION OBLIGATOIRE DANS SUPABASE

Pour que la réinitialisation de mot de passe fonctionne, vous DEVEZ configurer les URLs de redirection dans Supabase.

### Étapes de configuration (À FAIRE MAINTENANT)

1. **Connectez-vous au Dashboard Supabase**
   - Allez sur : https://supabase.com/dashboard
   - Sélectionnez votre projet : `eovmrvtiizyhyzcmpvov`

2. **Configurez les URLs de redirection**
   - Dans le menu de gauche, cliquez sur **Authentication**
   - Cliquez sur **URL Configuration**
   - Dans **Redirect URLs**, ajoutez EXACTEMENT ces URLs :
     ```
     https://dentalcloud.fr/reset-password
     http://localhost:5173/reset-password
     ```
   - Dans **Site URL**, mettez : `https://dentalcloud.fr`
   - Cliquez sur **Save**

3. **Attendez 1-2 minutes** que la configuration se propage

4. **Testez avec un nouveau lien**
   - Les anciens liens ne fonctionneront PAS
   - Demandez un nouveau lien de réinitialisation
   - Vérifiez votre email
   - Cliquez sur le nouveau lien

## Comment tester si ça fonctionne

### Test complet :

1. **Demander un lien de réinitialisation**
   - Allez sur https://dentalcloud.fr
   - Cliquez sur "Mot de passe oublié ?"
   - Entrez votre email
   - Cliquez sur "Envoyer"

2. **Vérifier l'email**
   - Ouvrez votre boîte email
   - Cherchez l'email de DentalCloud (vérifiez les spams)
   - Le lien devrait ressembler à :
     ```
     https://dentalcloud.fr/reset-password#access_token=...&type=recovery
     ```

3. **Cliquer sur le lien**
   - Vous devriez arriver sur la page de réinitialisation
   - La page devrait afficher le formulaire avec :
     - "Nouveau mot de passe"
     - "Confirmer le mot de passe"
     - Bouton "Réinitialiser le mot de passe"

4. **Réinitialiser le mot de passe**
   - Entrez votre nouveau mot de passe (minimum 6 caractères)
   - Confirmez-le
   - Cliquez sur "Réinitialiser le mot de passe"
   - Vous devriez voir un message de succès
   - Vous serez automatiquement déconnecté
   - Vous serez redirigé vers la page de connexion

5. **Se connecter avec le nouveau mot de passe**
   - Utilisez votre email
   - Utilisez votre nouveau mot de passe
   - Vous devriez pouvoir vous connecter

## Messages d'erreur possibles

### "Pour réinitialiser votre mot de passe, vous devez cliquer sur le lien reçu par email"
**Cause** : Vous essayez d'accéder à `/reset-password` directement sans lien
**Solution** : Demandez un nouveau lien de réinitialisation

### "Ce lien a expiré"
**Cause** : Le lien a plus d'1 heure (durée par défaut)
**Solution** : Demandez un nouveau lien de réinitialisation

### "Ce lien a déjà été utilisé"
**Cause** : Vous avez déjà cliqué sur ce lien
**Solution** : Demandez un nouveau lien de réinitialisation

### "Lien de réinitialisation invalide"
**Cause** : L'URL de redirection n'est pas configurée dans Supabase
**Solution** : Suivez les étapes de configuration ci-dessus

### "Session expirée"
**Cause** : Vous avez attendu trop longtemps avant de soumettre le formulaire
**Solution** : Demandez un nouveau lien et réinitialisez le mot de passe rapidement

## Vérifications si ça ne fonctionne toujours pas

### 1. Vérifiez dans la console du navigateur (F12)
Ouvrez la console et recherchez les messages commençant par `[Reset Password]`.

Vous devriez voir :
```
[Reset Password] Starting verification...
[Reset Password] Hash parameters: {access_token: "...", type: "recovery", ...}
[Reset Password] Token check: {hasAccessToken: true, type: "recovery", ...}
[Reset Password] Session check: {hasSession: true, userEmail: "...", ...}
[Reset Password] Valid recovery session detected!
```

### 2. Vérifiez l'URL dans la barre d'adresse
Quand vous cliquez sur le lien, l'URL doit contenir :
- `#access_token=` suivi d'une longue chaîne de caractères
- `type=recovery`

Si vous voyez juste `/reset-password#` sans rien après, c'est que les URLs ne sont pas configurées dans Supabase.

### 3. Vérifiez la configuration SMTP (facultatif)
Si vous ne recevez pas d'emails du tout :
- Allez dans le Dashboard Supabase
- **Authentication** → **Email Templates**
- Vérifiez que les templates sont activés
- Vérifiez vos paramètres SMTP dans l'application (Paramètres → SMTP)

## Améliorations apportées au code

1. **Vérification robuste du lien**
   - Vérifie que le hash contient les bons paramètres
   - Vérifie que le type est "recovery"
   - Vérifie que le access_token est présent

2. **Messages d'erreur clairs**
   - Chaque type d'erreur a son propre message explicite
   - Instructions claires sur quoi faire

3. **Validation de session**
   - Vérifie que la session est toujours valide avant de changer le mot de passe
   - Gère le cas où la session expire pendant le remplissage du formulaire

4. **Déconnexion automatique**
   - Après changement de mot de passe, l'utilisateur est déconnecté
   - Il doit se reconnecter avec le nouveau mot de passe

5. **Logs détaillés**
   - Tous les événements sont loggués dans la console
   - Facilite le débogage en cas de problème

## Sécurité

- Les liens sont à usage unique
- Les liens expirent après 1 heure par défaut
- Après changement de mot de passe, l'ancienne session est invalidée
- L'utilisateur doit se reconnecter avec le nouveau mot de passe

## Support

Si le problème persiste après avoir suivi toutes ces étapes :
1. Ouvrez la console du navigateur (F12)
2. Copiez tous les messages commençant par `[Reset Password]`
3. Partagez ces logs pour diagnostic
