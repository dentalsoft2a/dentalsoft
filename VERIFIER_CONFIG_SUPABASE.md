# VÉRIFIER LA CONFIGURATION SUPABASE - ÉTAPE PAR ÉTAPE

## Le problème exact

Tu reçois un lien comme : `auth/v1/verify?token=...&redirect_to=https://dentalcloud.fr/reset-password`

Mais tu arrives sur : `/reset-password#` (sans les tokens)

**Cela signifie que Supabase REFUSE la redirection vers `https://dentalcloud.fr/reset-password`**

## Solution : Vérifier EXACTEMENT la configuration

### 1. Aller dans le Dashboard Supabase

1. Va sur : https://supabase.com/dashboard
2. Connecte-toi
3. Sélectionne ton projet (celui qui contient eovmrvtiizyhyzcmpvov)

### 2. Aller dans URL Configuration

1. Dans le menu de gauche, clique sur **Authentication**
2. En haut, clique sur **URL Configuration** (pas "Email Templates", pas "Providers")

### 3. Vérifier EXACTEMENT ce qui est écrit

Tu vas voir plusieurs champs. Voici ce que tu DOIS avoir :

#### Site URL
```
https://dentalcloud.fr
```
**Attention** : PAS de `/` à la fin, PAS de `/reset-password`

#### Redirect URLs
Tu dois voir une liste. Dans cette liste, il DOIT y avoir EXACTEMENT :
```
https://dentalcloud.fr/reset-password
```

**Attention** :
- Pas d'espace avant ou après
- Pas de `/` à la fin
- Exactement `https://` (pas `http://`)
- Exactement ton domaine
- Exactement `/reset-password` (pas `/reset_password`, pas `/resetpassword`)

### 4. Si l'URL n'est PAS dans la liste

1. Cherche le bouton **"Add URL"** ou un champ pour ajouter une URL
2. Tape EXACTEMENT : `https://dentalcloud.fr/reset-password`
3. Appuie sur Entrée ou clique sur le bouton pour ajouter
4. Tu devrais voir l'URL apparaître dans la liste
5. Clique sur **"Save"** en bas de la page

### 5. Attendre et tester

1. **Attends 2-3 minutes** (important !)
2. Va sur https://dentalcloud.fr
3. Clique sur "Mot de passe oublié ?"
4. Entre ton email
5. Vérifie ton email
6. Clique sur le **NOUVEAU** lien (pas les vieux)
7. Cette fois, tu devrais arriver sur la page avec le formulaire

## Si ça ne marche TOUJOURS pas

### Vérification 1 : Le domaine exact

Peut-être que ton site est accessible via plusieurs URLs :
- `https://dentalcloud.fr`
- `https://www.dentalcloud.fr`
- `http://dentalcloud.fr`

Si tu accèdes au site avec `www.`, alors il faut ajouter :
```
https://www.dentalcloud.fr/reset-password
```

### Vérification 2 : Wildcard

Dans les Redirect URLs, tu peux aussi essayer d'ajouter un wildcard :
```
https://dentalcloud.fr/*
```
ou
```
https://dentalcloud.fr/**
```

Cela autorise toutes les URLs du domaine.

### Vérification 3 : Les deux versions

Ajoute les DEUX versions dans les Redirect URLs :
```
https://dentalcloud.fr/reset-password
https://www.dentalcloud.fr/reset-password
```

### Vérification 4 : Copie exacte

Quand tu es sur ton site, copie EXACTEMENT l'URL dans la barre d'adresse.
Si tu vois `https://www.dentalcloud.fr/`, alors utilise `https://www.dentalcloud.fr/reset-password`
Si tu vois `https://dentalcloud.fr/`, alors utilise `https://dentalcloud.fr/reset-password`

## Screenshot de ce que tu dois voir

Dans Supabase Dashboard > Authentication > URL Configuration, tu devrais voir quelque chose comme :

```
Site URL: [https://dentalcloud.fr                              ]

Redirect URLs:
  ✓ https://dentalcloud.fr/reset-password
  ✓ http://localhost:5173/reset-password (optionnel)

  [Add URL: ________________________________] [Add]
```

## Test final

Une fois configuré :

1. Ouvre une fenêtre de navigation privée / incognito
2. Va sur ton site
3. Demande un reset de mot de passe
4. Vérifie ton email
5. Clique sur le lien
6. L'URL doit maintenant être : `https://dentalcloud.fr/reset-password#access_token=LONG_TOKEN&type=recovery&...`
7. Tu dois voir le formulaire de réinitialisation

Si tu vois encore `/reset-password#` sans token, c'est que la configuration n'est pas correcte.

## Dernière solution : Email Templates

Si vraiment rien ne fonctionne, on peut changer le template d'email dans Supabase :

1. Dashboard Supabase > Authentication > Email Templates
2. Cherche "Reset Password" ou "Magic Link"
3. Dans le template, change `{{ .ConfirmationURL }}` par :
```
{{ .SiteURL }}/reset-password#access_token={{ .Token }}&type=recovery
```

Mais normalement, ça ne devrait pas être nécessaire si les Redirect URLs sont bien configurées.
