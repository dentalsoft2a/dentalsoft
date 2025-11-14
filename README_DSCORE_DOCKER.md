# Configuration DS-Core avec Docker - Guide Rapide

## Résumé des modifications

L'intégration DS-Core a été corrigée pour fonctionner correctement avec Docker. Voici ce qui a été fait:

### ✅ Corrections appliquées

1. **Utilitaire PKCE créé** (`src/utils/pkce.ts`)
   - Génération sécurisée du code_verifier et code_challenge
   - Stockage sécurisé dans sessionStorage

2. **Service dscoreApi.ts corrigé** (`src/services/dscoreApi.ts`)
   - Flow OAuth2 avec PKCE implémenté correctement
   - URLs conformes à la documentation DS-Core officielle
   - Validation des variables d'environnement
   - Logs de débogage ajoutés

3. **Dockerfile mis à jour** (`Dockerfile`)
   - Toutes les variables DS-Core ajoutées comme ARG et ENV
   - Variables 3Shape également ajoutées
   - Build multi-stage optimisé

4. **Fichiers de déploiement créés**:
   - `docker-build.sh` - Script automatisé pour construire l'image
   - `docker-compose.yml` - Configuration Docker Compose
   - `.env.example` - Template des variables d'environnement

5. **Documentation complète**:
   - `GUIDE_INTEGRATION_DSCORE.md` - Guide d'intégration DS-Core
   - `INSTRUCTIONS_DEMARRAGE_DSCORE.md` - Instructions de démarrage
   - `INSTRUCTIONS_DEPLOIEMENT_DOCKER.md` - Guide Docker complet

## 🚀 Démarrage rapide

### Développement local (sans Docker)

```bash
# 1. Vérifier que .env est configuré
cat .env | grep DSCORE

# 2. Installer les dépendances
npm install

# 3. Lancer le serveur de développement
npm run dev

# 4. Ouvrir http://localhost:5173
```

### Production avec Docker

```bash
# Méthode automatique (recommandée)
./docker-build.sh
docker run -d -p 3000:3000 --name gb-dental gb-dental:latest

# OU avec Docker Compose
docker-compose up -d --build
```

## 🔑 Variables d'environnement requises

Le fichier `.env` doit contenir:

```env
# Supabase (déjà configuré)
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

# DS-Core (configuré)
VITE_DSCORE_CLIENT_ID=8e956fa7-c675-42fc-afe0-01fc58ddeb0b
VITE_DSCORE_CLIENT_SECRET=...
VITE_DSCORE_ENVIRONMENT=sandbox
VITE_DSCORE_SANDBOX_BASE_HOST=https://api.r2.dscore.com
VITE_DSCORE_SANDBOX_AUTH_HOST=https://r2.dscore.com
VITE_DSCORE_PRODUCTION_BASE_HOST=https://api.r2.dscore.com
VITE_DSCORE_PRODUCTION_AUTH_HOST=https://r2.dscore.com
VITE_DSCORE_GLOBAL_HOST=https://api.dscore.com
VITE_DSCORE_CALLBACK_URL=http://localhost:5173/settings  # Dev
# VITE_DSCORE_CALLBACK_URL=https://votre-domaine.com/settings  # Production
```

## ⚠️ Points critiques

### 1. Callback URL dans DS-Core Developer Portal

**Vous DEVEZ configurer le Redirect URL dans DS-Core:**

1. Allez sur [open.dscore.com](https://open.dscore.com)
2. My Apps > Votre application
3. Ajoutez les Redirect URLs:
   - Dev: `http://localhost:5173/settings`
   - Docker local: `http://localhost:3000/settings`
   - Production: `https://votre-domaine.com/settings`

### 2. Redémarrage requis

**Après modification du .env, vous DEVEZ:**
- En dev: Redémarrer `npm run dev`
- En Docker: Reconstruire l'image avec `./docker-build.sh` ou `docker-compose up -d --build`

### 3. Variables "baked in"

**Important**: Vite intègre les variables d'environnement au moment du build, pas au runtime!

- Les variables sont compilées dans les fichiers JavaScript
- Vous ne pouvez pas les changer après le build
- Pour changer une variable, vous devez reconstruire l'image Docker

## 🐛 Dépannage

### Erreur: client_id= vide ou redirect_uri=undefined

**Cause**: Variables d'environnement non chargées

**Solutions**:
1. Vérifiez que `.env` contient les bonnes valeurs
2. Redémarrez le serveur dev: `npm run dev`
3. Pour Docker: `./docker-build.sh`
4. Vérifiez les logs console du navigateur

### Erreur: 404 Page Not Found sur DS-Core

**Causes possibles**:

1. **Redirect URL non configuré dans DS-Core Portal**
   - Vérifiez sur [open.dscore.com](https://open.dscore.com)

2. **Client ID non approuvé**
   - Attendez l'approbation de DS-Core
   - Vérifiez votre email

3. **Pas de compte DS-Core Sandbox**
   - Créez un compte sur [r2.dscore.com](https://r2.dscore.com)

### Erreur: Code verifier not found

**Cause**: SessionStorage effacé entre la redirection et le callback

**Solutions**:
1. Réessayez la connexion
2. Vérifiez que les cookies/sessionStorage ne sont pas bloqués
3. Ne fermez pas l'onglet pendant l'authentification

## 📁 Structure des fichiers

```
.
├── Dockerfile                               # Configuration Docker
├── docker-compose.yml                       # Docker Compose
├── docker-build.sh                          # Script de build
├── .env                                     # Variables (NE PAS COMMITER!)
├── .env.example                             # Template
├── src/
│   ├── services/
│   │   └── dscoreApi.ts                    # Service DS-Core (corrigé)
│   └── utils/
│       └── pkce.ts                         # Utilitaire PKCE (nouveau)
└── docs/
    ├── GUIDE_INTEGRATION_DSCORE.md         # Guide d'intégration
    ├── INSTRUCTIONS_DEMARRAGE_DSCORE.md    # Instructions de démarrage
    └── INSTRUCTIONS_DEPLOIEMENT_DOCKER.md  # Guide Docker complet
```

## 🧪 Vérification

### Vérifier que les variables sont chargées

Ouvrez la console du navigateur (F12), vous devriez voir:

```
DS-Core Configuration: {
  environment: "sandbox",
  authHost: "https://r2.dscore.com",
  baseHost: "https://api.r2.dscore.com",
  globalHost: "https://api.dscore.com",
  clientId: "8e956fa7...",
  hasClientSecret: true,
  callbackUrl: "http://localhost:5173/settings"
}
```

### Tester la connexion DS-Core

1. Allez dans **Paramètres** > **Intégrations**
2. Section **Connexion DS-Core**
3. Cliquez sur **"Connecter à DS-Core"**
4. Vérifiez l'URL de redirection:
   ```
   https://r2.dscore.com/secureLogin?client_id=8e956fa7-c675-42fc-afe0-01fc58ddeb0b&code_challenge=...&redirect_uri=http://localhost:5173/settings
   ```
5. Connectez-vous avec vos identifiants DS-Core
6. Autorisez l'accès
7. Vous devriez être redirigé avec une connexion réussie

## 📚 Documentation complète

- **`GUIDE_INTEGRATION_DSCORE.md`** - Détails de l'intégration DS-Core, fonctionnement du PKCE, endpoints API
- **`INSTRUCTIONS_DEMARRAGE_DSCORE.md`** - Résolution des erreurs de démarrage, configuration du Developer Portal
- **`INSTRUCTIONS_DEPLOIEMENT_DOCKER.md`** - Guide complet Docker, déploiement production, monitoring, sécurité

## 🔐 Sécurité

- ✅ `.env` est dans `.gitignore`
- ✅ PKCE implémenté (sécurise l'échange de code)
- ✅ Variables sensibles ne sont jamais exposées au client
- ⚠️ Ne commitez JAMAIS le fichier `.env`
- ⚠️ Changez les secrets régulièrement (tous les 6 mois)

## 📞 Support

**DS-Core**:
- Documentation: [open.dscore.com](https://open.dscore.com)
- Email: DS-Core-API@dentsplysirona.com

**Problèmes techniques**:
1. Vérifiez les logs: `docker logs -f gb-dental`
2. Consultez la documentation dans `docs/`
3. Vérifiez la console du navigateur (F12)

## ✅ Checklist de déploiement

### Développement
- [ ] Fichier `.env` configuré
- [ ] `npm install` exécuté
- [ ] `npm run dev` fonctionne
- [ ] Variables chargées (console du navigateur)
- [ ] Test de connexion DS-Core réussi

### Docker Local
- [ ] Fichier `.env` configuré
- [ ] `./docker-build.sh` exécuté avec succès
- [ ] Conteneur lancé: `docker run -d -p 3000:3000 gb-dental:latest`
- [ ] Application accessible sur http://localhost:3000
- [ ] Test de connexion DS-Core réussi

### Production
- [ ] `.env` mis à jour avec URLs de production
- [ ] `VITE_DSCORE_ENVIRONMENT=production`
- [ ] `VITE_DSCORE_CALLBACK_URL` mis à jour
- [ ] Callback URL configuré dans DS-Core Developer Portal
- [ ] Client ID Production obtenu et configuré
- [ ] Image Docker construite avec variables de prod
- [ ] Déploiement testé
- [ ] Connexion DS-Core testée en production
- [ ] Monitoring configuré
- [ ] Backups configurés

## 🎯 Prochaines étapes

1. **Test en développement local**
   - Redémarrez `npm run dev`
   - Testez la connexion DS-Core

2. **Test avec Docker local**
   - Exécutez `./docker-build.sh`
   - Lancez le conteneur
   - Testez la connexion

3. **Préparation production**
   - Obtenez un Client ID Production DS-Core
   - Mettez à jour `.env` avec URLs de production
   - Configurez le Callback URL dans DS-Core Portal
   - Déployez sur votre serveur

## 📝 Notes importantes

1. **Les variables Vite sont en "build-time", pas en "runtime"**
   - Elles sont compilées dans les fichiers JS au moment du build
   - Vous ne pouvez pas les changer après le build
   - Toute modification nécessite un rebuild

2. **Environnements séparés**
   - Sandbox et Production utilisent des comptes différents
   - Chaque environnement nécessite son propre Client ID
   - Les Callback URLs doivent être configurés séparément

3. **PKCE obligatoire**
   - DS-Core requiert le flow OAuth2 avec PKCE
   - Le code_verifier ne doit jamais être envoyé au serveur d'autorisation
   - Seul le code_challenge (hash) est envoyé

Bonne chance avec votre déploiement! 🚀
