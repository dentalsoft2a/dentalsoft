# Configuration de la réinitialisation de mot de passe

## ✅ Problèmes résolus
Le système de réinitialisation de mot de passe a été corrigé. Les problèmes suivants ont été résolus :

1. ✅ **Redirection automatique au dashboard** : L'application ne redirige plus automatiquement vers le dashboard lors de l'utilisation d'un lien de réinitialisation
2. ✅ **Détection des liens expirés** : L'application détecte maintenant les liens expirés et affiche un message d'erreur clair
3. ✅ **Gestion des erreurs** : Messages d'erreur détaillés selon le type de problème
4. ✅ **Déconnexion automatique** : Après changement de mot de passe, l'utilisateur est déconnecté et peut se reconnecter avec le nouveau mot de passe

## Causes possibles d'erreurs (si vous en rencontrez)
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

## Fonctionnement actuel (après les corrections)

Le flux de réinitialisation fonctionne maintenant comme suit :

1. **Demandez un nouveau lien** sur https://dentalcloud.fr via "Mot de passe oublié"
2. Entrez votre email
3. Vérifiez votre boîte mail (et le dossier spam)
4. **Cliquez sur le lien** (valide pendant 1 heure par défaut)
5. **Vous êtes redirigé vers la page de réinitialisation**
   - ✅ Vous ne serez PAS redirigé vers le dashboard
   - ✅ Vous restez sur la page de réinitialisation
6. Entrez votre nouveau mot de passe (minimum 6 caractères)
7. Confirmez votre nouveau mot de passe
8. Cliquez sur "Réinitialiser le mot de passe"
9. **Vous êtes déconnecté automatiquement** et redirigé vers la page de connexion
10. Connectez-vous avec votre nouveau mot de passe

### Options disponibles
- **Bouton "Réinitialiser le mot de passe"** : Change le mot de passe
- **Bouton "Annuler"** : Retourne à la page de connexion sans changer le mot de passe

## Fonctionnalités implémentées

- ✅ Détection automatique des sessions de récupération de mot de passe
- ✅ Blocage de la redirection automatique vers le dashboard
- ✅ Messages d'erreur clairs et détaillés selon le type d'erreur
- ✅ Bouton "Annuler" pour retourner à la connexion
- ✅ Déconnexion automatique après changement de mot de passe
- ✅ Interface responsive et moderne
- ✅ Logs de débogage détaillés dans la console

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
