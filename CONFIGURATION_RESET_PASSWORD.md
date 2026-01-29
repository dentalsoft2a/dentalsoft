# Réinitialisation de mot de passe - SOLUTION FINALE

## PROBLÈME RÉSOLU

Le système de réinitialisation de mot de passe a été **complètement refait** pour utiliser l'API native de Supabase au lieu d'une fonction edge personnalisée.

## Ce qui a été changé

**AVANT** : Utilisait une edge function `send-reset-password-email` qui générait manuellement les liens
**MAINTENANT** : Utilise directement `supabase.auth.resetPasswordForEmail()` qui respecte automatiquement la configuration du dashboard Supabase

## Configuration requise dans Supabase

Vous DEVEZ configurer les URLs dans le dashboard Supabase une seule fois :

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. **Authentication** → **URL Configuration**
4. Dans **Redirect URLs**, ajoutez : `https://dentalcloud.fr/reset-password`
5. Dans **Site URL**, mettez : `https://dentalcloud.fr`
6. Cliquez sur **Save**

## Test complet

1. **Demander un lien** :
   - Allez sur https://dentalcloud.fr
   - Cliquez sur "Mot de passe oublié ?"
   - Entrez votre email
   - Cliquez sur "Envoyer"

2. **Vérifier l'email** :
   - Ouvrez votre boîte email
   - Cherchez l'email de Supabase (peut être dans les spams)
   - Le lien doit ressembler à : `https://dentalcloud.fr/reset-password#access_token=...&type=recovery`
   - **IMPORTANT** : Si vous voyez `error=access_denied`, c'est que la configuration n'est pas faite ou que vous utilisez un vieux lien

3. **Cliquer sur le lien** :
   - Vous arrivez sur la page de réinitialisation
   - Vous voyez le formulaire avec deux champs de mot de passe

4. **Réinitialiser** :
   - Entrez un nouveau mot de passe (minimum 6 caractères)
   - Confirmez-le
   - Cliquez sur "Réinitialiser"
   - Vous êtes déconnecté et redirigé vers la connexion

5. **Se reconnecter** :
   - Utilisez votre nouveau mot de passe

## Messages d'erreur

### "🔴 CONFIGURATION REQUISE"
- **Cause** : Les URLs ne sont pas configurées dans Supabase
- **Solution** : Suivez les étapes de configuration ci-dessus et demandez un NOUVEAU lien

### "Ce lien a expiré"
- **Cause** : Le lien a plus d'1 heure
- **Solution** : Demandez un nouveau lien

### "Ce lien a déjà été utilisé"
- **Cause** : Vous avez déjà cliqué sur ce lien
- **Solution** : Demandez un nouveau lien

### "Pour réinitialiser votre mot de passe, vous devez cliquer sur le lien reçu par email"
- **Cause** : Vous accédez directement à `/reset-password` sans lien
- **Solution** : Demandez un lien depuis la page de connexion

## Débogage

Si ça ne marche toujours pas après la configuration :

1. **Vérifiez la console du navigateur** (F12) et cherchez les messages `[Reset Password]`

2. **Vérifiez l'URL** quand vous cliquez sur le lien :
   - Doit contenir `#access_token=` et `type=recovery`
   - Si vous voyez `error=access_denied&error_code=otp_expired`, la configuration n'est pas appliquée

3. **Attendez 2-3 minutes** après avoir configuré les URLs dans Supabase

4. **Demandez un NOUVEAU lien** après la configuration (les vieux liens ne fonctionnent pas)

5. **Vérifiez que l'email vient bien de Supabase** :
   - L'email est envoyé par Supabase directement
   - Vérifiez vos spams
   - Le template d'email est celui par défaut de Supabase

## Important

- Les liens sont valides 1 heure
- Chaque lien ne peut être utilisé qu'une seule fois
- Après avoir configuré les URLs, attendez 2-3 minutes
- Demandez toujours un NOUVEAU lien après avoir changé la configuration
- Les vieux liens générés avant la configuration ne fonctionneront jamais

## Architecture technique

Le système utilise maintenant :
- `supabase.auth.resetPasswordForEmail()` côté client (LoginPage.tsx)
- Détection automatique des tokens de récupération (ResetPasswordPage.tsx)
- Validation de session avant changement de mot de passe
- Déconnexion automatique après changement
- Messages d'erreur détaillés selon le type d'erreur

Plus besoin de fonction edge pour l'envoi d'emails de réinitialisation.
