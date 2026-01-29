# Configuration de la réinitialisation de mot de passe

## Problème
Le lien de réinitialisation de mot de passe affiche une erreur `otp_expired` ou "Lien invalide ou expiré".

## Causes possibles
1. **Le lien a expiré** : Par défaut, les liens Supabase expirent après 1 heure
2. **Le lien a déjà été utilisé** : Chaque lien ne peut être utilisé qu'une seule fois
3. **URLs non configurées** : Les URLs de redirection ne sont pas autorisées dans Supabase

## Solution complète

### 1. Accédez au Dashboard Supabase
Connectez-vous à : https://supabase.com/dashboard

### 2. Naviguez vers les paramètres d'authentification
1. Sélectionnez votre projet : `eovmrvtiizyhyzcmpvov`
2. Allez dans **Authentication** (dans le menu de gauche)
3. Cliquez sur **URL Configuration**

### 3. Ajoutez les URLs de redirection
Dans la section **Redirect URLs**, ajoutez les URLs suivantes :

#### Pour la production :
```
https://dentalcloud.fr/reset-password
```

#### Pour le développement local (si nécessaire) :
```
http://localhost:5173/reset-password
```

**IMPORTANT** : Vous devez ajouter EXACTEMENT l'URL où votre application est hébergée. D'après votre lien, c'est `https://dentalcloud.fr`.

### 4. Site URL
Assurez-vous également que le **Site URL** est correctement configuré :

- **Production** : `https://dentalcloud.fr`
- **Développement** (si nécessaire) : `http://localhost:5173`

### 5. Augmenter la durée de validité des liens (RECOMMANDÉ)

Par défaut, les liens expirent après **1 heure**. Pour une meilleure expérience utilisateur :

1. Dans le menu de gauche, allez dans **Authentication** → **Policies**
2. Cherchez la section **Email Auth Token Validity**
3. Changez la valeur de `3600` (1 heure) à `86400` (24 heures)
4. Sauvegardez

**Alternative** : Si cette option n'est pas visible, vous pouvez :
1. Aller dans **Project Settings** → **API**
2. Chercher **JWT expiry** ou **Auth settings**
3. Augmenter la durée de validité

### 6. Sauvegardez les modifications
Cliquez sur **Save** en bas de la page.

## Vérification

Après avoir configuré les URLs :

1. **Demandez un NOUVEAU lien** : Les anciens liens ne fonctionneront pas
2. Allez sur https://dentalcloud.fr
3. Cliquez sur "Mot de passe oublié"
4. Entrez votre email
5. Vérifiez votre boîte mail (et le dossier spam)
6. **Cliquez sur le lien dans les 24 heures** (ou 1 heure si vous n'avez pas modifié la durée)
7. Vous devriez voir le formulaire de réinitialisation

## Points importants

1. **Les liens sont à usage unique** : Une fois cliqué, le lien ne fonctionne plus
2. **Les liens expirent** : Par défaut après 1 heure (24h si vous augmentez la durée)
3. **Chaque demande génère un nouveau lien** : Les anciens liens sont automatiquement invalidés
4. **Ne partagez jamais vos liens de réinitialisation** : C'est un risque de sécurité

## Messages d'erreur améliorés

L'application affiche maintenant des messages d'erreur clairs :

- **OTP Expired** : "Ce lien de réinitialisation a expiré. Les liens sont valides pendant X heures."
- **OTP Disabled** : "Ce lien a déjà été utilisé. Chaque lien ne peut être utilisé qu'une seule fois."
- **Access Denied** : "Accès refusé. Le lien est invalide ou a expiré."

## Logs de débogage

Si le problème persiste, ouvrez la console du navigateur (F12) et recherchez les logs commençant par `[Reset Password]` pour identifier le problème exact.

## Configuration actuelle

- **Supabase URL** : `https://eovmrvtiizyhyzcmpvov.supabase.co`
- **Votre domaine** : `https://dentalcloud.fr`
- **Redirect URL à configurer** : `https://dentalcloud.fr/reset-password`

## En cas de problème persistant

Si après avoir configuré les URLs, le problème persiste :

1. Vérifiez que vous avez bien sauvegardé dans Supabase
2. Attendez 1-2 minutes que les changements se propagent
3. Demandez un **nouveau lien** (les anciens ne fonctionneront pas)
4. Vérifiez la console du navigateur pour les logs
5. Assurez-vous de cliquer sur le lien avant l'expiration
