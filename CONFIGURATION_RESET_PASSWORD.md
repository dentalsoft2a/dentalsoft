# Configuration de la réinitialisation de mot de passe

## Problème
Le lien de réinitialisation de mot de passe affiche "Lien invalide ou expiré" immédiatement.

## Solution

Vous devez configurer les URLs de redirection autorisées dans votre dashboard Supabase :

### 1. Accédez au Dashboard Supabase
Connectez-vous à : https://supabase.com/dashboard

### 2. Naviguez vers les paramètres d'authentification
1. Sélectionnez votre projet : `eovmrvtiizyhyzcmpvov`
2. Allez dans **Authentication** (dans le menu de gauche)
3. Cliquez sur **URL Configuration**

### 3. Ajoutez les URLs de redirection
Dans la section **Redirect URLs**, ajoutez les URLs suivantes :

#### Pour le développement local :
```
http://localhost:5173/reset-password
```

#### Pour la production :
```
https://votre-domaine.com/reset-password
```

**Note** : Remplacez `votre-domaine.com` par votre domaine de production réel.

### 4. Site URL
Assurez-vous également que le **Site URL** est correctement configuré :

- **Développement** : `http://localhost:5173`
- **Production** : `https://votre-domaine.com`

### 5. Sauvegardez les modifications
Cliquez sur **Save** en bas de la page.

## Vérification

Après avoir configuré les URLs :

1. Allez sur la page de connexion
2. Cliquez sur "Mot de passe oublié"
3. Entrez votre email
4. Vous recevrez un email avec un lien
5. Cliquez sur le lien - vous devriez maintenant voir le formulaire de réinitialisation

## Logs de débogage

Si le problème persiste, ouvrez la console du navigateur (F12) et recherchez les logs commençant par `[Reset Password]` pour identifier le problème exact.

## Configuration actuelle

- **Supabase URL** : `https://eovmrvtiizyhyzcmpvov.supabase.co`
- **Redirect URL à configurer** : Le domaine où votre application est hébergée + `/reset-password`
