# DIAGNOSTIC RESET PASSWORD - INSTRUCTIONS EXACTES

## Le problème exact

Tu cliques sur le lien : `auth/v1/verify?token=66e7c824...&type=recovery&redirect_to=https://dentalcloud.fr/reset-password`

Tu arrives sur : `/reset-password#` (sans tokens)

## Ce qui DEVRAIT se passer

1. Tu cliques sur le lien
2. Supabase vérifie le token
3. Supabase crée un access_token
4. Supabase te redirige vers : `https://dentalcloud.fr/reset-password#access_token=NOUVEAU_TOKEN&type=recovery`
5. La page détecte le token et affiche le formulaire

## Ce qui SE PASSE

1. Tu cliques sur le lien
2. Supabase vérifie le token (OK)
3. Supabase veut te rediriger vers `https://dentalcloud.fr/reset-password` MAIS...
4. **Supabase REFUSE car l'URL n'est PAS dans la whitelist**
5. Supabase te redirige vers `/reset-password#` sans tokens
6. Tu vois une erreur

## Solution EN 3 ÉTAPES (EXACTEMENT)

### ÉTAPE 1 : Vérifier la configuration Supabase

1. Va sur https://supabase.com/dashboard
2. Connecte-toi
3. Clique sur ton projet (celui avec eovmrvtiizyhyzcmpvov)
4. Dans le menu gauche : **Authentication**
5. En haut : **URL Configuration** (PAS "Email Templates" !)

### ÉTAPE 2 : Vérifier les URLs

Tu vas voir deux sections importantes :

#### Site URL
Doit contenir EXACTEMENT (sans espace, sans slash à la fin) :
```
https://dentalcloud.fr
```

#### Redirect URLs
Tu dois voir une LISTE d'URLs. Dans cette liste, cherche :
```
https://dentalcloud.fr/reset-password
```

**TROIS CAS POSSIBLES :**

**CAS A : L'URL est DÉJÀ dans la liste**
- Clique sur la petite croix (X) pour la SUPPRIMER
- Attends 2 secondes
- Re-tape EXACTEMENT : `https://dentalcloud.fr/reset-password`
- Clique sur "Add" ou appuie sur Entrée
- L'URL doit réapparaître dans la liste
- Clique sur **"Save"** en bas de la page
- Attends **5 minutes** (important!)
- Va à l'ÉTAPE 3

**CAS B : L'URL n'est PAS dans la liste**
- Cherche le champ de texte pour ajouter une URL
- Tape EXACTEMENT : `https://dentalcloud.fr/reset-password`
- Clique sur "Add" ou appuie sur Entrée
- L'URL doit apparaître dans la liste
- Clique sur **"Save"** en bas de la page
- Attends **5 minutes** (important!)
- Va à l'ÉTAPE 3

**CAS C : Tu utilises www dans ton URL**
Si quand tu vas sur ton site tu vois `https://www.dentalcloud.fr` alors il faut ajouter :
```
https://www.dentalcloud.fr/reset-password
```

### ÉTAPE 3 : Demander un NOUVEAU lien

**TRÈS IMPORTANT** : Les anciens liens NE MARCHERONT JAMAIS. Il faut un nouveau lien.

1. Va sur https://dentalcloud.fr
2. Clique sur "Mot de passe oublié ?"
3. Entre ton email
4. Clique sur "Envoyer"
5. Va dans ta boîte email
6. **IGNORE les anciens emails**
7. Ouvre le **NOUVEAU** email (celui que tu viens de recevoir)
8. Clique sur le lien

Cette fois, l'URL devrait être :
```
https://dentalcloud.fr/reset-password#access_token=eyJhbGc...&type=recovery&...
```

Et tu devrais voir le formulaire pour changer ton mot de passe.

## Si ça ne marche TOUJOURS pas

### Vérification BONUS 1 : Template d'email

1. Dashboard Supabase > Authentication > **Email Templates**
2. Clique sur "Reset Password" ou "Password Recovery"
3. Cherche dans le template la ligne avec `{{ .ConfirmationURL }}`
4. Elle doit ressembler à :
```html
<a href="{{ .ConfirmationURL }}">Reset Password</a>
```

5. **NE CHANGE RIEN** sauf si tu vois quelque chose de bizarre

### Vérification BONUS 2 : Wildcard

Si vraiment rien ne marche, dans les Redirect URLs, ajoute aussi :
```
https://dentalcloud.fr/*
```

Cela autorise TOUTES les URLs du domaine.

### Vérification BONUS 3 : Les deux versions

Ajoute les DEUX versions :
```
https://dentalcloud.fr/reset-password
https://www.dentalcloud.fr/reset-password
```

## Test avec debug

J'ai ajouté du debug dans le code. Quand tu cliques sur le lien maintenant :

1. Ouvre la console du navigateur (F12)
2. Va sur l'onglet "Console"
3. Clique sur le lien de reset
4. Tu vas voir des logs qui commencent par `[Reset Password]`
5. Fais un screenshot de ces logs
6. Envoie-moi le screenshot

Les logs vont me dire EXACTEMENT ce qui se passe et pourquoi ça bloque.

## Résumé ultra-rapide

1. Supabase Dashboard > Authentication > URL Configuration
2. Vérifie que `https://dentalcloud.fr/reset-password` est dans "Redirect URLs"
3. Si oui, supprime-la et rajoute-la
4. Save et attends 5 minutes
5. Demande un NOUVEAU lien
6. Clique sur le nouveau lien
7. Si ça marche pas, ouvre la console (F12) et envoie-moi les logs
