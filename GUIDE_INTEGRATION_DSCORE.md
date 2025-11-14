# Guide d'intégration DS-Core

## Vue d'ensemble

Ce guide explique comment configurer et utiliser l'intégration DS-Core OAuth2 avec PKCE dans votre application GB Dental.

## Configuration effectuée

### 1. Fichiers créés/modifiés

- **`src/utils/pkce.ts`** : Utilitaire pour générer les codes PKCE (code_verifier et code_challenge)
- **`src/services/dscoreApi.ts`** : Service API DS-Core mis à jour avec le flow OAuth2 PKCE correct
- **`.env`** : Variables d'environnement configurées avec les URLs correctes

### 2. Variables d'environnement

Votre fichier `.env` contient maintenant:

```env
# Votre Client ID DS-Core (déjà configuré)
VITE_DSCORE_CLIENT_ID=8e956fa7-c675-42fc-afe0-01fc58ddeb0b
VITE_DSCORE_CLIENT_SECRET=akAFWoqfNyTC29eiRUMPd5LbUMEFwGkH2IFZ3VKV4g_-Py778Ijhe3MczS56uqebWYuhXSvk62oDUVCHgjxaEQ

# Environnement (sandbox ou production)
VITE_DSCORE_ENVIRONMENT=sandbox

# URLs Sandbox (pour les tests)
VITE_DSCORE_SANDBOX_BASE_HOST=https://api.r2.dscore.com
VITE_DSCORE_SANDBOX_AUTH_HOST=https://r2.dscore.com

# URLs Production (région EU par défaut)
VITE_DSCORE_PRODUCTION_BASE_HOST=https://api.r2.dscore.com
VITE_DSCORE_PRODUCTION_AUTH_HOST=https://r2.dscore.com

# Global Host (pour l'authentification)
VITE_DSCORE_GLOBAL_HOST=https://api.dscore.com

# URL de callback (doit correspondre à celle enregistrée sur DS-Core)
VITE_DSCORE_CALLBACK_URL=http://localhost:5173/settings
```

## Configuration dans DS-Core Developer Portal

### Important: Redirect URL

Vous devez configurer le Redirect URL dans votre application DS-Core Developer Portal:

1. Connectez-vous à [open.dscore.com](https://open.dscore.com)
2. Allez dans "My Apps" > Votre application
3. Assurez-vous que le Redirect URL est configuré comme: `http://localhost:5173/settings`
4. Pour la production, ajoutez aussi votre URL de production (ex: `https://votre-domaine.com/settings`)

**IMPORTANT**: Les Redirect URLs doivent être séparés uniquement par des virgules, sans espaces.

## Comment ça fonctionne maintenant

### Flow OAuth2 avec PKCE

1. **Génération du code_verifier et code_challenge**
   - Lorsque l'utilisateur clique sur "Connecter à DS-Core"
   - Un `code_verifier` aléatoire cryptographique est généré
   - Un `code_challenge` est créé en hashant le `code_verifier` avec SHA-256
   - Le `code_verifier` est stocké dans `sessionStorage`

2. **Redirection vers DS-Core**
   - L'utilisateur est redirigé vers: `https://r2.dscore.com/secureLogin?client_id={CLIENT_ID}&code_challenge={CODE_CHALLENGE}&redirect_uri={CALLBACK_URL}`
   - L'utilisateur se connecte avec ses identifiants DS-Core
   - L'utilisateur autorise votre application

3. **Callback avec le code d'autorisation**
   - DS-Core redirige vers votre `CALLBACK_URL` avec un `code` dans l'URL
   - Votre application détecte le `code` et récupère le `code_verifier` du `sessionStorage`

4. **Échange du code contre des tokens**
   - Une requête POST est envoyée à `https://api.dscore.com/v1beta/auth/token`
   - Avec les paramètres: `code`, `client_id`, `redirect_uri`, `code_verifier`, `client_secret`
   - DS-Core valide que le `code_verifier` correspond au `code_challenge` initial
   - Si valide, DS-Core retourne un `access_token` et un `refresh_token`

5. **Utilisation de l'API**
   - Toutes les requêtes API utilisent le `access_token` dans le header `Authorization: Bearer {token}`
   - Les endpoints API utilisent le Base Host régional: `https://api.r2.dscore.com`

## Changement d'environnement

### Passer en Production

Pour utiliser l'environnement de production:

1. Modifiez `.env`:
   ```env
   VITE_DSCORE_ENVIRONMENT=production
   ```

2. Assurez-vous d'avoir:
   - Un compte DS-Core Production (différent du Sandbox)
   - Un Client ID Production (différent du Sandbox)
   - Configuré l'URL de callback de production dans le Developer Portal

3. Mettez à jour les URLs de production selon votre région:
   - **US**: `https://api.r1.dscore.com` et `https://r1.dscore.com`
   - **EU**: `https://api.r2.dscore.com` et `https://r2.dscore.com`
   - **CA**: `https://api.r3.dscore.com` et `https://r3.dscore.com`
   - **AU**: `https://api.r4.dscore.com` et `https://r4.dscore.com`
   - Etc.

## Utilisation dans l'application

### Interface utilisateur

1. Allez dans **Paramètres** > **Intégrations**
2. Section **Connexion DS-Core**
3. Cliquez sur **"Connecter à DS-Core"**
4. Vous serez redirigé vers la page de connexion DS-Core
5. Connectez-vous et autorisez l'accès
6. Vous serez redirigé vers votre application avec la connexion établie

### Synchronisation des données

Une fois connecté, vous pouvez:
- **Synchronisation manuelle**: Cliquez sur "Synchroniser" pour récupérer les nouvelles photos
- **Synchronisation automatique**: Activez le toggle pour synchroniser toutes les 15 minutes

## Dépannage

### Erreur "Connection refused"

Si vous obtenez cette erreur, vérifiez:

1. **Client ID correct**: Votre Client ID doit être valide et approuvé par DS-Core
2. **Redirect URL**: Doit correspondre exactement à celui configuré dans DS-Core Developer Portal
3. **Environnement**: Assurez-vous d'utiliser le bon environnement (sandbox vs production)
4. **Compte DS-Core**: Vous devez avoir un compte DS-Core actif dans l'environnement approprié

### Erreur "Code verifier not found"

Cela signifie que le `sessionStorage` a été effacé entre la redirection et le callback. Solutions:
- Réessayez la connexion
- Vérifiez que les cookies/sessionStorage ne sont pas bloqués dans votre navigateur

### Token expiré

Les tokens expirent après un certain temps. Le système devrait automatiquement:
- Détecter l'expiration
- Utiliser le `refresh_token` pour obtenir un nouveau `access_token`
- Mettre à jour les credentials dans la base de données

## Endpoints API DS-Core disponibles

### Authentification
- `POST /v1beta/auth/token` - Obtenir/rafraîchir les tokens

### Fichiers
- `GET /v1/files/new` - Récupérer les nouveaux fichiers

### Comptes
- `GET /v1beta/accounts` - Lister les comptes (dentistes)

### Orders
- `GET /v1beta/orders` - Lister les commandes
- `GET /v1beta/orders/{order_id}` - Détails d'une commande
- `PATCH /v1beta/orders/{order_id}` - Mettre à jour une commande

### Digital Impressions
- `GET /v1beta/digitalImpressions` - Lister les impressions numériques
- `GET /v1beta/digitalImpressions/{scan_id}/content` - Télécharger un scan

### Documents
- `GET /v1beta/documents` - Lister les documents
- `GET /v1beta/documents/{document_id}/content` - Télécharger un document

## Sécurité

### PKCE (Proof Key for Code Exchange)

Le PKCE protège contre les attaques d'interception de code d'autorisation:
- Le `code_verifier` n'est jamais envoyé au serveur d'autorisation
- Seul le `code_challenge` (hash du verifier) est envoyé
- Même si un attaquant intercepte le `code`, il ne peut pas l'échanger sans le `code_verifier`

### Stockage des credentials

- Les tokens sont stockés dans la table Supabase `dscore_credentials`
- RLS (Row Level Security) protège l'accès aux credentials
- Chaque utilisateur ne peut accéder qu'à ses propres credentials

## Support

Pour toute question ou problème:
- Documentation DS-Core: [open.dscore.com](https://open.dscore.com)
- Email support DS-Core: DS-Core-API@dentsplysirona.com
